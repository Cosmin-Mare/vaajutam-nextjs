"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  canUseLiveCamera,
  CiCameraGuide,
  CiLiveCamera,
  requestCiCamera,
} from "@/components/cum-pot-ajuta/CiLiveCamera";
import { CiPhoneQr } from "@/components/cum-pot-ajuta/CiPhoneQr";
import {
  ciOcrComplete,
  ciOcrHasAnyField,
  ciOcrMissing,
  ciOcrWarning,
  isCiPhotoFile,
  prepareCiPhoto,
  recognizeCiImage,
} from "@/lib/ci-recognize";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

type Stage = "idle" | "reading" | "done" | "partial" | "error";

type Props = {
  sessionId?: string;
  onExtracted: (data: CiOcrResult) => void;
  hidePhoneQr?: boolean;
  showSteps?: boolean;
  kicker?: string;
  title?: string;
  afterRecognize?: (data: CiOcrResult) => Promise<boolean | void>;
  doneExtra?: (ctx: { paired: boolean }) => ReactNode;
};

const READ_HINTS = ["Pregătesc poza…", "Citesc textul de pe CI…", "Caut numele și CNP-ul…"];

function foundBits(data: CiOcrResult) {
  const bits: string[] = [];
  if (data.nume) bits.push("Nume");
  if (data.prenume) bits.push("Prenume");
  if (data.cnp) bits.push("CNP");
  return bits;
}

function CiIdArt() {
  return (
    <svg className="ci-id-art" viewBox="0 0 220 132" aria-hidden="true">
      <rect className="ci-id-art-body" x="4" y="8" width="212" height="116" rx="10" />
      <rect x="16" y="24" width="58" height="72" rx="6" />
      <circle cx="45" cy="50" r="14" />
      <rect x="88" y="28" width="108" height="10" rx="5" />
      <rect x="88" y="46" width="86" height="8" rx="4" />
      <rect x="88" y="62" width="96" height="8" rx="4" />
      <rect x="16" y="104" width="188" height="4" rx="2" />
      <rect x="16" y="112" width="188" height="4" rx="2" />
    </svg>
  );
}

export function CiUploadCard({
  sessionId = "",
  onExtracted,
  hidePhoneQr,
  showSteps,
  kicker = "Opțional — ca să meargă mai repede",
  title = "Fotografiază cartea de identitate",
  afterRecognize,
  doneExtra,
}: Props) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<string | null>(null);
  const camFailed = useRef(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bits, setBits] = useState<string[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [fromPhone, setFromPhone] = useState(false);
  const [paired, setPaired] = useState(false);
  const [hint, setHint] = useState(READ_HINTS[0]);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);
  const [camPending, setCamPending] = useState(false);
  const [camGuide, setCamGuide] = useState(false);
  const showQr = Boolean(sessionId) && !hidePhoneQr;

  const clearPreview = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  };

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  useEffect(() => {
    if (stage !== "reading") return;
    let i = 0;
    setHint(READ_HINTS[0]);
    const t = window.setInterval(() => {
      i = (i + 1) % READ_HINTS.length;
      setHint(READ_HINTS[i]);
    }, 1100);
    return () => window.clearInterval(t);
  }, [stage]);

  const applyParsed = useCallback(
    async (parsed: CiOcrResult, viaPhone: boolean) => {
      if (!ciOcrHasAnyField(parsed)) {
        setBits([]);
        setMissing(ciOcrMissing(parsed));
        setStage("error");
        setError(ciOcrWarning(parsed));
        return;
      }
      let sent = false;
      if (afterRecognize) sent = Boolean(await afterRecognize(parsed));
      onExtracted(parsed);
      setBits(foundBits(parsed));
      setMissing(ciOcrMissing(parsed));
      setFromPhone(viaPhone);
      setPaired(sent);
      if (ciOcrComplete(parsed)) {
        setStage("done");
        setError(null);
        return;
      }
      setStage("partial");
      setError(ciOcrWarning(parsed));
    },
    [afterRecognize, onExtracted]
  );

  const readFile = async (file: File) => {
    if (!isCiPhotoFile(file)) {
      setError("Alege o fotografie (JPG, PNG sau HEIC).");
      setStage("error");
      return;
    }
    clearPreview();
    let photo = file;
    try {
      photo = await prepareCiPhoto(file);
    } catch {
      setError("Nu am putut deschide poza HEIC. Încearcă JPG sau fotografiază din nou.");
      setStage("error");
      return;
    }
    const url = URL.createObjectURL(photo);
    previewRef.current = url;
    setPreview(url);
    setStage("reading");
    setError(null);
    const wait = new Promise((r) => window.setTimeout(r, 900));
    try {
      const parsed = await recognizeCiImage(photo);
      await wait;
      await applyParsed(parsed, false);
    } catch (err) {
      console.error("[ci-upload]", err);
      await wait;
      setStage("error");
      setMissing(["Nume", "Prenume", "CNP"]);
      setError("Nu am putut citi poza. Fotografiază din nou, cu buletinul în cadru.");
    }
  };

  const reset = () => {
    clearPreview();
    setStage("idle");
    setError(null);
    setBits([]);
    setMissing([]);
    setFromPhone(false);
    setPaired(false);
  };

  const openNativeCamera = () => {
    cameraRef.current?.click();
  };

  const retryCamera = () => {
    setError(null);
    if (!canUseLiveCamera() || camFailed.current) {
      setCamGuide(true);
      return;
    }
    setCamPending(true);
    void requestCiCamera()
      .then((stream) => {
        setCamPending(false);
        setCamStream(stream);
      })
      .catch(() => {
        setCamPending(false);
        camFailed.current = true;
        setCamGuide(true);
      });
  };

  const dropzone = stage === "idle" || stage === "error";
  const stepIdle = stage === "idle" || stage === "error";

  return (
    <div
      className={
        "ci-card" +
        (stage === "reading" ? " ci-card-busy" : "") +
        (stage === "done" ? " ci-card-ok" : "") +
        (stage === "partial" || stage === "error" ? " ci-card-err" : "")
      }
      aria-busy={stage === "reading"}
    >
      {showSteps ? (
        <ol className="ci-steps" aria-label="Pașii fotografiei">
          <li className={stepIdle ? "is-now" : "is-done"}>Pregătește</li>
          <li className={stage === "reading" ? "is-now" : stage === "done" || stage === "partial" ? "is-done" : ""}>
            Citește
          </li>
          <li className={stage === "done" ? "is-now is-done" : stage === "partial" ? "is-now" : ""}>Gata</li>
        </ol>
      ) : null}

      <div className="ci-card-head">
        <p className="ci-card-kicker">{kicker}</p>
        <p className="ci-card-title">{title}</p>
        <p className="ci-card-help">
          Citirea se face pe dispozitivul tău. <strong>Poza nu se trimite și nu se salvează.</strong>
        </p>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        capture="environment"
        className="visually-hidden"
        aria-label="Fotografiază CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          setCamGuide(false);
          if (file) void readFile(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        className="visually-hidden"
        aria-label="Alege o poză cu CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void readFile(file);
        }}
      />

      {dropzone ? (
        <div className={"ci-card-split" + (showQr ? " ci-card-split-qr" : "")}>
          <div
            className={
              "ci-drop" + (dragOver ? " ci-drop-hot" : "") + (stage === "error" ? " ci-drop-err" : "")
            }
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
          >
            {preview ? (
              <button type="button" className="ci-preview ci-preview-static" onClick={retryCamera}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Poza aleasă — apasă ca să schimbi" />
              </button>
            ) : (
              <button type="button" className="ci-drop-art" onClick={retryCamera}>
                <span className="ci-id-float">
                  <CiIdArt />
                </span>
                <span className="ci-drop-hint">
                  {dragOver ? "Lasă poza aici" : "Așază buletinul în cadru, pe lumină"}
                </span>
                <ul className="ci-guide">
                  <li>Tot cardul, drept, în dreptunghi</li>
                  <li>Fără reflexii pe nume sau CNP</li>
                  <li>Cele două rânduri de jos vizibile</li>
                </ul>
              </button>
            )}
            <div className="ci-drop-actions">
              {showQr ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary-pink-round ci-drop-primary"
                    onClick={() => galleryRef.current?.click()}
                  >
                    Alege o poză
                  </button>
                  <button type="button" className="btn btn-secondary-pink" onClick={retryCamera}>
                    Fotografiază
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-primary-pink-round ci-drop-primary"
                    onClick={retryCamera}
                  >
                    Fotografiază
                  </button>
                  <button type="button" className="btn btn-secondary-pink" onClick={() => galleryRef.current?.click()}>
                    Alege din galerie
                  </button>
                </>
              )}
            </div>
          </div>
          {showQr ? (
            <div className="ci-phone-panel ci-phone-panel-open">
              <CiPhoneQr sessionId={sessionId} onExtracted={(data) => void applyParsed(data, true)} />
            </div>
          ) : null}
        </div>
      ) : null}

      {stage === "reading" && preview ? (
        <div className="ci-preview ci-preview-live" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" />
          <span className="ci-scan-veil" aria-hidden />
          <span className="ci-scan-frame" aria-hidden />
          <span className="ci-scan-beam" aria-hidden />
          <p className="ci-preview-status">{hint}</p>
        </div>
      ) : null}

      {stage === "done" || stage === "partial" ? (
        <div className={"ci-success" + (stage === "partial" ? " ci-success-warn" : "")} aria-live="polite">
          {preview ? (
            <div className="ci-preview ci-preview-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" />
              {stage === "done" ? (
                <span className="ci-success-mark" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12.5 10 17.5 19 7"
                    />
                  </svg>
                </span>
              ) : (
                <span className="ci-success-mark ci-success-mark-warn" aria-hidden>
                  !
                </span>
              )}
            </div>
          ) : null}
          <div className="ci-success-copy">
            <p className="ci-success-title">
              {stage === "partial"
                ? "Nu am citit tot — încearcă din nou"
                : fromPhone
                  ? "Am preluat datele de pe telefon"
                  : "Gata — am completat câmpurile"}
            </p>
            {bits.length ? (
              <ul className="ci-chips">
                {bits.map((b) => (
                  <li key={b} className="ci-chip">
                    {b}
                  </li>
                ))}
                {missing.map((b) => (
                  <li key={b} className="ci-chip ci-chip-miss">
                    Lipsește {b}
                  </li>
                ))}
              </ul>
            ) : null}
            {stage === "partial" ? (
              <div className="ci-warn" role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn-primary-pink-round" onClick={retryCamera}>
                  Fotografiază din nou
                </button>
              </div>
            ) : (
              <p className="ci-card-help">
                {hidePhoneQr ? "Poți continua pe telefon sau pe calculator." : "Verifică-le mai jos, apoi semnează."}
              </p>
            )}
            {doneExtra ? doneExtra({ paired }) : null}
            <button type="button" className="ci-text-btn" onClick={reset}>
              {stage === "partial" ? "Completez manual" : "Folosește altă poză"}
            </button>
          </div>
        </div>
      ) : null}

      {stage === "error" && error ? (
        <div className="ci-warn ci-warn-block" role="alert">
          <p className="ci-scan-err">{error}</p>
          {missing.length ? (
            <ul className="ci-chips">
              {missing.map((b) => (
                <li key={b} className="ci-chip ci-chip-miss">
                  Lipsește {b}
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" className="btn btn-primary-pink-round" onClick={retryCamera}>
            Fotografiază din nou
          </button>
        </div>
      ) : null}

      {camPending ? (
        <div className="ci-cam ci-cam-pending" role="status">
          <p className="ci-cam-title">Deschid camera…</p>
        </div>
      ) : null}

      {camGuide ? <CiCameraGuide onShoot={openNativeCamera} onClose={() => setCamGuide(false)} /> : null}

      {camStream ? (
        <CiLiveCamera
          stream={camStream}
          onCapture={(file) => {
            setCamStream(null);
            void readFile(file);
          }}
          onClose={() => setCamStream(null)}
        />
      ) : null}
    </div>
  );
}
