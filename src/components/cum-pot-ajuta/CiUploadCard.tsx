"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CiPhoneQr } from "@/components/cum-pot-ajuta/CiPhoneQr";
import { ciOcrHasAnyField, recognizeCiImage } from "@/lib/ci-recognize";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

type Stage = "idle" | "reading" | "done" | "error";

type Props = {
  sessionId?: string;
  onExtracted: (data: CiOcrResult) => void;
  hidePhoneQr?: boolean;
  showSteps?: boolean;
  autoOpenCamera?: boolean;
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
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [qrWaiting, setQrWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bits, setBits] = useState<string[]>([]);
  const [fromPhone, setFromPhone] = useState(false);
  const [paired, setPaired] = useState(false);
  const [hint, setHint] = useState(READ_HINTS[0]);
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

  useEffect(() => {
    if (!phoneOpen) {
      setQrWaiting(false);
      return;
    }
    const t = window.setTimeout(() => setQrWaiting(true), 2200);
    return () => window.clearTimeout(t);
  }, [phoneOpen]);

  const finishOk = useCallback(
    async (parsed: CiOcrResult, viaPhone: boolean) => {
      let sent = false;
      if (afterRecognize) sent = Boolean(await afterRecognize(parsed));
      onExtracted(parsed);
      setBits(foundBits(parsed));
      setFromPhone(viaPhone);
      setPaired(sent);
      setStage("done");
      setError(null);
      setPhoneOpen(false);
    },
    [afterRecognize, onExtracted]
  );

  const readFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Alege o fotografie (JPG sau PNG).");
      setStage("error");
      return;
    }
    clearPreview();
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
    setStage("reading");
    setError(null);
    setPhoneOpen(false);
    const wait = new Promise((r) => window.setTimeout(r, 900));
    try {
      const parsed = await recognizeCiImage(file);
      await wait;
      if (!ciOcrHasAnyField(parsed)) {
        setStage("error");
        setError(
          "Nu am citit numele sau CNP-ul. Mai aproape, pe lumină, cu cele două rânduri de jos vizibile."
        );
        return;
      }
      await finishOk(parsed, false);
    } catch (err) {
      console.error("[ci-upload]", err);
      await wait;
      setStage("error");
      setError("Nu am putut citi poza. Încearcă din nou sau completează manual mai jos.");
    }
  };

  const reset = () => {
    clearPreview();
    setStage("idle");
    setError(null);
    setBits([]);
    setFromPhone(false);
    setPaired(false);
  };

  const openPrimary = () => {
    if (showQr) galleryRef.current?.click();
    else cameraRef.current?.click();
  };

  const dropzone = stage === "idle" || stage === "error";
  const stepIdle = stage === "idle" || stage === "error";

  return (
    <div
      className={
        "ci-card" +
        (stage === "reading" ? " ci-card-busy" : "") +
        (stage === "done" ? " ci-card-ok" : "") +
        (stage === "error" ? " ci-card-err" : "")
      }
      aria-busy={stage === "reading"}
    >
      {showSteps ? (
        <ol className="ci-steps" aria-label="Pașii fotografiei">
          <li className={stepIdle ? "is-now" : "is-done"}>Pregătește</li>
          <li className={stage === "reading" ? "is-now" : stage === "done" ? "is-done" : ""}>Citește</li>
          <li className={stage === "done" ? "is-now is-done" : ""}>Gata</li>
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
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        aria-label="Fotografiază CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void readFile(file);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        aria-label="Alege o poză cu CI-ul"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void readFile(file);
        }}
      />

      {dropzone ? (
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
            <button type="button" className="ci-preview ci-preview-static" onClick={openPrimary}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Poza aleasă — apasă ca să schimbi" />
            </button>
          ) : (
            <button type="button" className="ci-drop-art" onClick={openPrimary}>
              <span className="ci-id-float">
                <CiIdArt />
              </span>
              <span className="ci-drop-hint">
                {dragOver
                  ? "Lasă poza aici"
                  : showQr
                    ? "Trage poza buletinului aici"
                    : "Ține buletinul drept, pe lumină"}
              </span>
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
                <button type="button" className="btn btn-secondary-pink" onClick={() => cameraRef.current?.click()}>
                  Fotografiază
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary-pink-round ci-drop-primary"
                  onClick={() => cameraRef.current?.click()}
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

      {stage === "done" ? (
        <div className="ci-success" aria-live="polite">
          {preview ? (
            <div className="ci-preview ci-preview-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" />
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
            </div>
          ) : (
            <span className="ci-success-mark ci-success-mark-solo" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22">
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
          )}
          <div className="ci-success-copy">
            <p className="ci-success-title">
              {fromPhone ? "Am preluat datele de pe telefon" : "Gata — am completat câmpurile"}
            </p>
            {bits.length ? (
              <ul className="ci-chips">
                {bits.map((b) => (
                  <li key={b} className="ci-chip">
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="ci-card-help">
              {hidePhoneQr
                ? "Poți continua pe telefon sau pe calculator."
                : "Verifică-le mai jos, apoi semnează."}
            </p>
            {doneExtra ? doneExtra({ paired }) : null}
            <button type="button" className="ci-text-btn" onClick={reset}>
              Folosește altă poză
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="ci-scan-err">{error}</p> : null}

      {showQr && stage !== "reading" && stage !== "done" ? (
        <div className={"ci-phone-panel" + (phoneOpen ? " ci-phone-panel-open" : "")}>
          <button
            type="button"
            className="ci-text-btn ci-phone-toggle"
            aria-expanded={phoneOpen}
            onClick={() => setPhoneOpen((o) => !o)}
          >
            {phoneOpen ? "Ascunde codul QR" : "Sau fotografiază de pe telefon"}
          </button>
          {phoneOpen ? (
            <div className="ci-phone-panel-body">
              <CiPhoneQr
                sessionId={sessionId}
                waiting={qrWaiting}
                onExtracted={(data) => void finishOk(data, true)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
