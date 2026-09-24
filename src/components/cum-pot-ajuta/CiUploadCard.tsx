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
import type { CiKind, CiOcrResult } from "@/lib/ci-id-ocr";
import { preferNativeCiCapture, prefersForm230MobileUi } from "@/lib/form230-mobile";

type Stage = "idle" | "picking" | "reading" | "done" | "partial" | "error";

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

function CiIdArt({ kind }: { kind?: CiKind }) {
  const old = kind === "old";
  return (
    <svg className="ci-id-art" viewBox="0 0 220 132" aria-hidden="true">
      <rect className="ci-id-art-body" x="4" y="8" width="212" height="116" rx="10" />
      {old ? (
        <>
          <rect x="16" y="20" width="58" height="70" rx="6" />
          <circle cx="45" cy="46" r="14" />
          <rect className="ci-id-art-cnp" x="88" y="22" width="78" height="10" rx="5" />
          <rect x="88" y="40" width="108" height="8" rx="4" />
          <rect x="88" y="56" width="96" height="8" rx="4" />
          <rect className="ci-id-art-mrz" x="16" y="100" width="188" height="5" rx="2" />
          <rect className="ci-id-art-mrz" x="16" y="110" width="188" height="5" rx="2" />
        </>
      ) : (
        <>
          <rect x="16" y="22" width="58" height="90" rx="6" />
          <circle cx="45" cy="52" r="14" />
          <rect x="88" y="26" width="108" height="9" rx="4" />
          <rect x="88" y="42" width="96" height="8" rx="4" />
          <rect x="88" y="58" width="72" height="6" rx="3" />
          <rect className="ci-id-art-cnp" x="88" y="88" width="86" height="10" rx="5" />
        </>
      )}
    </svg>
  );
}

function CiKindPicker({
  selected,
  onPick,
  legend,
  showLegend,
}: {
  selected?: CiKind;
  onPick: (kind: CiKind) => void;
  legend: string;
  showLegend?: boolean;
}) {
  return (
    <fieldset className="ci-kind ci-kind-flow">
      <legend id="ci-kind-legend" className={showLegend ? "ci-kind-legend" : "visually-hidden"}>
        {legend}
      </legend>
      <div className="ci-kind-opts" role="radiogroup" aria-labelledby="ci-kind-legend">
        <button
          type="button"
          className="ci-kind-opt"
          role="radio"
          aria-checked={selected === "new"}
          onClick={() => onPick("new")}
        >
          <span className="ci-kind-opt-art">
            <CiIdArt kind="new" />
          </span>
          <span className="ci-kind-opt-copy">
            <strong>CI nou</strong>
            <span>Plastic, din 2021. Nume sus dreapta, CNP mai jos. Fără rânduri jos.</span>
          </span>
        </button>
        <button
          type="button"
          className="ci-kind-opt"
          role="radio"
          aria-checked={selected === "old"}
          onClick={() => onPick("old")}
        >
          <span className="ci-kind-opt-art">
            <CiIdArt kind="old" />
          </span>
          <span className="ci-kind-opt-copy">
            <strong>CI vechi</strong>
            <span>Laminat. CNP sus lângă poză, nume sub el, două rânduri jos.</span>
          </span>
        </button>
      </div>
    </fieldset>
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
  const pendingRef = useRef<File | null>(null);
  const camFailed = useRef(false);
  const askKindFirst = Boolean(hidePhoneQr);
  const [kind, setKind] = useState<CiKind | undefined>();
  const [hasPending, setHasPending] = useState(false);
  const kindRef = useRef(kind);
  kindRef.current = kind;
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
  const [isPhoneUi, setIsPhoneUi] = useState(false);
  const [nativeCapture, setNativeCapture] = useState(false);
  const showQr = Boolean(sessionId) && !hidePhoneQr && !isPhoneUi;
  const choosingKindFirst = askKindFirst && !kind && (stage === "idle" || stage === "error") && !hasPending;
  const dropzone = !choosingKindFirst && (stage === "idle" || (stage === "error" && !hasPending));

  useEffect(() => {
    const sync = () => {
      setIsPhoneUi(prefersForm230MobileUi());
      setNativeCapture(preferNativeCiCapture());
    };
    sync();
    const mqNarrow = window.matchMedia("(max-width: 720px)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    mqNarrow.addEventListener("change", sync);
    mqCoarse.addEventListener("change", sync);
    return () => {
      mqNarrow.removeEventListener("change", sync);
      mqCoarse.removeEventListener("change", sync);
    };
  }, []);
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
        setError(ciOcrWarning(parsed, kindRef.current));
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
      setError(ciOcrWarning(parsed, kindRef.current));
    },
    [afterRecognize, onExtracted]
  );

  const runOcr = async (photo: File, nextKind: CiKind) => {
    setStage("reading");
    setError(null);
    const wait = new Promise((r) => window.setTimeout(r, 900));
    try {
      const parsed = await recognizeCiImage(photo, nextKind);
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

  const acceptPhoto = async (file: File) => {
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
    pendingRef.current = photo;
    setHasPending(true);
    const url = URL.createObjectURL(photo);
    previewRef.current = url;
    setPreview(url);
    setError(null);
    if (kindRef.current) {
      void runOcr(photo, kindRef.current);
      return;
    }
    setStage("picking");
  };

  const openNativeCamera = () => {
    // Direct user gesture → label/input is more reliable than .click() on iOS Safari.
    cameraRef.current?.click();
  };

  const startCamera = () => {
    setError(null);
    // Phones: native OS camera is more reliable than getUserMedia overlays
    // (permissions, black preview, clipped shutter, iOS quirks).
    if (nativeCapture || !canUseLiveCamera() || camFailed.current) {
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
  const pickKind = (next: CiKind) => {
    setKind(next);
    kindRef.current = next;
    const pending = pendingRef.current;
    if (pending) {
      void runOcr(pending, next);
      return;
    }
    if (askKindFirst) startCamera();
  };

  const reset = () => {
    pendingRef.current = null;
    setHasPending(false);
    clearPreview();
    setKind(undefined);
    kindRef.current = undefined;
    setStage("idle");
    setError(null);
    setBits([]);
    setMissing([]);
    setFromPhone(false);
    setPaired(false);
  };

  const retryCamera = () => {
    startCamera();
  };
  const flowTitle = choosingKindFirst
    ? "Ce fel de carte de identitate ai?"
    : stage === "picking"
      ? "Ce fel de CI este în poză?"
      : title;
  const flowHelp =
    choosingKindFirst ? (
      <>
        Alege tipul, apoi fotografiem fața cardului.{" "}
        <strong>Poza nu se trimite și nu se salvează.</strong>
      </>
    ) : stage === "picking" ? (
      "Ca să citesc corect numele și CNP-ul."
    ) : (
      <>
        Citirea se face pe dispozitivul tău. <strong>Poza nu se trimite și nu se salvează.</strong>
      </>
    );

  const showFlowSteps = showSteps || stage === "picking" || stage === "reading";

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
      {showFlowSteps ? (
        <ol className="ci-steps" aria-label="Pașii fotografiei">
          {askKindFirst ? (
            <>
              <li className={!kind ? "is-now" : "is-done"}>Tipul</li>
              <li
                className={
                  kind && (stage === "idle" || stage === "error" || stage === "picking")
                    ? "is-now"
                    : kind
                      ? "is-done"
                      : ""
                }
              >
                Poză
              </li>
              <li className={stage === "reading" ? "is-now" : stage === "done" || stage === "partial" ? "is-done" : ""}>
                Citește
              </li>
              <li className={stage === "done" ? "is-now is-done" : stage === "partial" ? "is-now" : ""}>Gata</li>
            </>
          ) : (
            <>
              <li className={stage === "idle" || stage === "error" ? "is-now" : "is-done"}>Poză</li>
              <li className={stage === "picking" ? "is-now" : stage === "reading" || stage === "done" || stage === "partial" ? "is-done" : ""}>
                Tipul
              </li>
              <li className={stage === "reading" ? "is-now" : stage === "done" || stage === "partial" ? "is-done" : ""}>
                Citește
              </li>
            </>
          )}
        </ol>
      ) : null}

      <div className="ci-card-head">
        <p className="ci-card-kicker">{kicker}</p>
        <p className="ci-card-title">{flowTitle}</p>
        <p className="ci-card-help">{flowHelp}</p>
      </div>

      {choosingKindFirst ? (
        <CiKindPicker selected={kind} onPick={pickKind} legend="Alege tipul, apoi fotografiem" />
      ) : null}

      {stage === "picking" ? (
        <div className="ci-pick">
          {preview ? (
            <div className="ci-pick-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Poza încărcată" />
            </div>
          ) : null}
          <CiKindPicker selected={kind} onPick={pickKind} legend="Alege tipul de CI din poză" />
          <button type="button" className="ci-text-btn" onClick={reset}>
            Altă poză
          </button>
        </div>
      ) : null}

      <input
        ref={cameraRef}
        id="ci-camera-input"
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        capture="environment"
        className="ci-file-input"
        aria-label="Fotografiază CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          setCamGuide(false);
          if (file) void acceptPhoto(file);
        }}
      />
      <input
        ref={galleryRef}
        id="ci-gallery-input"
        type="file"
        accept="image/*,.heic,.heif,image/heic,image/heif"
        className="ci-file-input"
        aria-label="Alege o poză cu CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void acceptPhoto(file);
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
              if (file) void acceptPhoto(file);
            }}
          >
            {preview && stage === "error" ? (
              <button type="button" className="ci-preview ci-preview-static" onClick={retryCamera}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Poza aleasă — apasă ca să schimbi" />
              </button>
            ) : (
              <button type="button" className="ci-drop-art" onClick={retryCamera}>
                <span className="ci-id-float">
                  <CiIdArt kind={kind} />
                </span>
                <span className="ci-drop-hint">
                  {dragOver
                    ? "Lasă poza aici"
                    : kind === "old"
                      ? "Așază buletinul vechi în cadru, pe lumină"
                      : kind === "new"
                        ? "Așază CI-ul nou în cadru, pe lumină"
                        : "Așază buletinul în cadru, pe lumină"}
                </span>
                <ul className="ci-guide">
                  {kind === "old" ? (
                    <>
                      <li>CNP-ul (roșu) sus, lângă fotografie</li>
                      <li>Numele și prenumele sub CNP</li>
                      <li>Cele două rânduri de jos vizibile</li>
                    </>
                  ) : kind === "new" ? (
                    <>
                      <li>Fotografia în stânga, tot cardul drept</li>
                      <li>Numele și prenumele sus în dreapta</li>
                      <li>CNP-ul mai jos, tot în dreapta — fără spate</li>
                    </>
                  ) : (
                    <>
                      <li>Fața cu fotografia, tot cardul drept</li>
                      <li>Fără reflexii pe plastic</li>
                      <li>Apoi ne spui dacă e CI nou sau vechi</li>
                    </>
                  )}
                </ul>
              </button>
            )}
            <div className={"ci-drop-actions" + (isPhoneUi ? " ci-drop-actions-stack" : "")}>
              {/* On phone: camera first. On desktop with QR: gallery first (phone does the photo). */}
              {isPhoneUi || !showQr ? (
                <>
                  <label htmlFor="ci-camera-input" className="btn btn-primary-pink-round ci-drop-primary">
                    Fotografiază
                  </label>
                  <label htmlFor="ci-gallery-input" className="btn btn-secondary-pink">
                    Alege din galerie
                  </label>
                </>
              ) : (
                <>
                  <label htmlFor="ci-gallery-input" className="btn btn-primary-pink-round ci-drop-primary">
                    Alege o poză
                  </label>
                  <button type="button" className="btn btn-secondary-pink" onClick={retryCamera}>
                    Fotografiază
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
                {hasPending ? (
                  <CiKindPicker
                    selected={kind}
                    onPick={pickKind}
                    legend="Poate e celălalt tip de CI?"
                    showLegend
                  />
                ) : null}
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
          {hasPending ? (
            <CiKindPicker selected={kind} onPick={pickKind} legend="Poate e celălalt tip de CI?" showLegend />
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

      {camGuide ? (
        <CiCameraGuide
          kind={kind}
          preferNative={nativeCapture || camFailed.current || !canUseLiveCamera()}
          onShoot={() => {
            setCamGuide(false);
            // Keep this in the same turn as the tap so iOS allows the file picker.
            openNativeCamera();
          }}
          onClose={() => setCamGuide(false)}
        />
      ) : null}

      {camStream ? (
        <CiLiveCamera
          stream={camStream}
          kind={kind}
          onCapture={(file) => {
            setCamStream(null);
            void acceptPhoto(file);
          }}
          onClose={() => setCamStream(null)}
        />
      ) : null}
    </div>
  );
}
