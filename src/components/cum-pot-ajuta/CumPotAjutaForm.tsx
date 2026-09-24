"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CiUploadCard } from "@/components/cum-pot-ajuta/CiUploadCard";
import {
  MobileSignaturePad,
  type MobileSignaturePadHandle,
} from "@/components/cum-pot-ajuta/MobileSignaturePad";
import type { CiOcrResult } from "@/lib/ci-id-ocr";
import { clearCiOcrLocal, readCiOcrLocal } from "@/lib/ci-ocr-local";
import { newCiSessionId } from "@/lib/ci-session-id";
import { cnpFieldStatus, normalizeCnp } from "@/lib/cnp";
import { prefersForm230MobileUi } from "@/lib/form230-mobile";

type Props = {
  variant?: "embedded" | "standalone";
};

const BUSY_HINTS = [
  "Pregătesc PDF-ul…",
  "Verific datele…",
  "Trimit către asociație…",
  "Încă puțin…",
];

/** Two real steps: fill data (CI optional) → sign & send. */
const STEPS = [
  { id: "f230-date", label: "Date" },
  { id: "f230-sign", label: "Semnează" },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CumPotAjutaForm({ variant = "embedded" }: Props) {
  const padRef = useRef<MobileSignaturePadHandle | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const cnpCheckGen = useRef(0);
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [cnp, setCnp] = useState("");
  const [localitate, setLocalitate] = useState("");
  const [judet, setJudet] = useState("");
  const [ani, setAni] = useState("2");
  const [gdpr, setGdpr] = useState(false);
  const [signed, setSigned] = useState(false);
  const [ciFilled, setCiFilled] = useState(false);
  const [cnpDuplicate, setCnpDuplicate] = useState(false);
  const [cnpChecking, setCnpChecking] = useState(false);
  const [semnaturaInvalida, setSemnaturaInvalida] = useState(false);
  const [gdprInvalid, setGdprInvalid] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyHint, setBusyHint] = useState(BUSY_HINTS[0]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ciSessionId, setCiSessionId] = useState("");
  const [filledFlash, setFilledFlash] = useState({ nume: false, prenume: false, cnp: false });
  const [shake, setShake] = useState(false);
  const [mobileUi, setMobileUi] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const cnpStatus = cnpFieldStatus(cnp);
  const cnpBlocked = cnpStatus === "invalid";
  const identityDone = Boolean(
    nume.trim() && prenume.trim() && cnpStatus === "valid" && localitate.trim() && judet.trim()
  );
  const finishDone = identityDone && signed && gdpr;
  const doneFlags = [identityDone || ciFilled, finishDone];
  const currentStep = mobileUi ? wizardStep : identityDone ? 1 : 0;

  useEffect(() => {
    const sync = () => setMobileUi(prefersForm230MobileUi());
    sync();
    const mq = window.matchMedia("(max-width: 720px)");
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const goStep = useCallback((step: number) => {
    const next = Math.max(0, Math.min(1, step));
    setWizardStep(next);
    window.setTimeout(() => {
      scrollToId("formular-230");
      window.dispatchEvent(new Event("resize"));
      padRef.current?.resize();
    }, 60);
  }, []);

  const checkCnpDuplicate = useCallback(async (value: string) => {
    if (cnpFieldStatus(value) !== "valid") return;
    const gen = ++cnpCheckGen.current;
    setCnpChecking(true);
    try {
      const res = await fetch("/api/form230/check-cnp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnp: normalizeCnp(value) }),
      });
      const j = (await res.json()) as { duplicate?: boolean };
      if (gen !== cnpCheckGen.current) return;
      setCnpDuplicate(Boolean(j.duplicate));
    } catch {
      /* submit will re-check */
    } finally {
      if (gen === cnpCheckGen.current) setCnpChecking(false);
    }
  }, []);

  const applyOcr = useCallback(
    (data: CiOcrResult) => {
      const flash = { nume: false, prenume: false, cnp: false };
      if (data.nume) {
        setNume(data.nume);
        flash.nume = true;
      }
      if (data.prenume) {
        setPrenume(data.prenume);
        flash.prenume = true;
      }
      if (data.cnp) {
        setCnp(data.cnp);
        setCnpDuplicate(false);
        flash.cnp = true;
        void checkCnpDuplicate(data.cnp);
      }
      if (data.nume || data.prenume || data.cnp) setCiFilled(true);
      setFilledFlash(flash);
      window.setTimeout(() => setFilledFlash({ nume: false, prenume: false, cnp: false }), 1600);
      goStep(0);
      window.setTimeout(() => {
        if (!prefersForm230MobileUi()) scrollToId("f230-date");
        else document.getElementById("nume")?.focus();
      }, 350);
    },
    [checkCnpDuplicate, goStep]
  );

  useEffect(() => {
    const local = readCiOcrLocal();
    if (local) applyOcr(local);
  }, [applyOcr]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const id = newCiSessionId();
      setCiSessionId(id);
      void fetch("/api/form230/ci-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => undefined);
    } catch {
      /* pairing optional */
    }
  }, []);

  useEffect(() => {
    if (!submitting) {
      setBusyHint(BUSY_HINTS[0]);
      return;
    }
    let i = 0;
    const t = window.setInterval(() => {
      i = (i + 1) % BUSY_HINTS.length;
      setBusyHint(BUSY_HINTS[i]);
    }, 1400);
    return () => window.clearInterval(t);
  }, [submitting]);

  useEffect(() => {
    if (!pdfDataUrl) return;
    document.getElementById("formular-pdf")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pdfDataUrl]);

  const failValidation = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 500);
    window.setTimeout(() => {
      const el = formRef.current?.querySelector(
        ".is-invalid, .signature-wrap-invalid, .gdpr-consent-invalid, .form-submit-error"
      ) as HTMLElement | null;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const onSignedChange = useCallback((next: boolean) => {
    setSigned(next);
    if (next) setSemnaturaInvalida(false);
  }, []);

  const continueFromDate = () => {
    if (!identityDone) {
      formRef.current?.classList.add("was-validated");
      failValidation();
      return;
    }
    goStep(1);
  };

  if (pdfDataUrl) {
    return (
      <section id="formular-pdf" className="f230-done" tabIndex={-1} aria-live="polite">
        <div className="f230-done-mark" aria-hidden>
          <svg viewBox="0 0 24 24" width="36" height="36">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 12.5 10 17.5 19 7"
            />
          </svg>
        </div>
        <h2 className="f230-done-title">Am primit formularul</h2>
        <p className="f230-done-copy">
          Mulțumim. Formularul 230 e salvat. Păstrează PDF-ul — asociația se ocupă de rest.
        </p>
        <div className="f230-done-actions">
          <a className="btn btn-primary-pink-round" href={pdfDataUrl} download="formular-230.pdf">
            Descarcă PDF-ul
          </a>
          <a className="btn btn-secondary-pink" href={pdfDataUrl} target="_blank" rel="noreferrer">
            Deschide PDF-ul
          </a>
        </div>
        <div className="f230-pdf">
          <iframe title="Formular 230" src={pdfDataUrl} />
        </div>
      </section>
    );
  }

  return (
    <section
      id="formular-230"
      data-step={wizardStep}
      className={
        "f230 f230-simple" +
        (variant === "standalone" ? " formular-230-standalone" : "") +
        (mobileUi ? " f230-mobile-wizard" : "")
      }
    >
      {variant === "embedded" ? <h2 className="projects-title">Formular 230</h2> : null}

      <ol className="f230-progress f230-progress-2" aria-label="Pașii formularului">
        {STEPS.map((step, i) => {
          const done = doneFlags[i];
          const now = i === currentStep;
          return (
            <li key={step.id} className={done ? "is-done" : now ? "is-now" : ""}>
              <button
                type="button"
                className="f230-progress-btn"
                aria-current={now ? "step" : undefined}
                onClick={() => {
                  goStep(i);
                  if (!prefersForm230MobileUi()) scrollToId(step.id);
                }}
              >
                <span className="f230-progress-n" aria-hidden>
                  {done ? "✓" : i + 1}
                </span>
                <span className="f230-progress-label">{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <form
        ref={formRef}
        method="post"
        action="#formular-230"
        className={"row needs-validation f230-form" + (shake ? " f230-shake" : "")}
        aria-busy={submitting}
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitError(null);
          const form = e.currentTarget;
          const pad = padRef.current;
          const gdprBox = form.elements.namedItem("gdpr") as HTMLInputElement | null;
          const nextGdprInvalid = !gdprBox?.checked;
          const nextSigInvalid = !pad || pad.isEmpty();
          const cnpBad = cnpStatus !== "valid";
          setGdprInvalid(nextGdprInvalid);
          setSemnaturaInvalida(nextSigInvalid);
          if (nextGdprInvalid || nextSigInvalid || cnpBad || !form.checkValidity()) {
            form.classList.add("was-validated");
            if (cnpBad || !nume.trim() || !prenume.trim() || !localitate.trim() || !judet.trim()) {
              goStep(0);
            } else {
              goStep(1);
            }
            failValidation();
            return;
          }
          if (!pad) return;
          const dataUrl = pad.toDataURL();
          setSubmitting(true);
          const fd = new FormData(form);
          fd.set("cnp", normalizeCnp(cnp));
          fd.set("signature", dataUrl);
          fd.set("source", variant === "standalone" ? "230" : "web");
          try {
            const res = await fetch("/api/cum-pot-ajuta", { method: "POST", body: fd });
            const j = (await res.json()) as {
              ok?: boolean;
              error?: string;
              pdfBase64?: string;
            };
            if (!res.ok) {
              if (j.error === "duplicate") {
                setCnpDuplicate(true);
                goStep(0);
                if (!prefersForm230MobileUi()) scrollToId("f230-date");
                return;
              }
              if (j.error === "cnp") setCnpDuplicate(false);
              if (j.error === "semnatura") {
                setSemnaturaInvalida(true);
                goStep(1);
              }
              if (j.error === "gdpr") {
                setGdprInvalid(true);
                goStep(1);
              }
              setSubmitError(
                j.error === "cnp"
                  ? "CNP-ul nu este valid."
                  : "Nu am putut trimite formularul. Verifică datele și încearcă din nou."
              );
              failValidation();
              return;
            }
            if (j.pdfBase64) {
              clearCiOcrLocal();
              setPdfDataUrl(`data:application/pdf;base64,${j.pdfBase64}`);
            }
          } finally {
            setSubmitting(false);
          }
        }}
        noValidate
      >
        <div
          id="f230-date"
          className={
            "col-12 f230-panel" +
            (identityDone ? " f230-panel-ok" : "") +
            (wizardStep === 0 ? " f230-panel-active" : "")
          }
          data-f230-panel="0"
        >
          <p className="f230-panel-kicker">{identityDone ? "Completat" : "Pasul 1 din 2"}</p>
          <h3 className="f230-panel-title">Datele tale</h3>
          <p className="f230-panel-help">
            {ciFilled
              ? "Verifică datele preluate de pe CI, apoi continuă."
              : "Completează câmpurile de mai jos."}
          </p>

          <div className="f230-date-stack">
            <div className="f230-ci-inline">
              <CiUploadCard
                sessionId={ciSessionId}
                onExtracted={applyOcr}
                compact={mobileUi}
                kicker="Opțional"
                title="Mai rapid cu poza CI"
              />
            </div>

            <div className="row f230-fields">
              <div className="col-12 col-sm-6 pb-2">
                <label htmlFor="nume" className="form-label">
                  Nume(*)
                </label>
                <input
                  type="text"
                  className={"form-control form-control-lg" + (filledFlash.nume ? " ci-field-in" : "")}
                  id="nume"
                  name="nume"
                  required
                  value={nume}
                  onChange={(e) => setNume(e.target.value)}
                  autoComplete="family-name"
                  enterKeyHint="next"
                />
                <div className="invalid-feedback">Completează câmpul cu numele tău.</div>
              </div>
              <div className="col-12 col-sm-6 pb-2">
                <label htmlFor="prenume" className="form-label">
                  Prenume(*)
                </label>
                <input
                  type="text"
                  className={"form-control form-control-lg" + (filledFlash.prenume ? " ci-field-in" : "")}
                  id="prenume"
                  name="prenume"
                  required
                  value={prenume}
                  onChange={(e) => setPrenume(e.target.value)}
                  autoComplete="given-name"
                  enterKeyHint="next"
                />
                <div className="invalid-feedback">Completează câmpul cu prenumele tău.</div>
              </div>
              <div className="col-12 col-sm-6 pb-2 has-validation">
                <label htmlFor="cnp" className="form-label">
                  CNP(*)
                </label>
                <div className="f230-cnp-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className={
                      "form-control form-control-lg" +
                      (cnpStatus === "valid" ? " is-valid" : "") +
                      (cnpBlocked ? " is-invalid" : "") +
                      (cnpDuplicate && cnpStatus === "valid" ? " f230-cnp-warn-field" : "") +
                      (filledFlash.cnp ? " ci-field-in" : "")
                    }
                    id="cnp"
                    name="cnp"
                    required
                    maxLength={13}
                    value={cnp}
                    onChange={(e) => {
                      cnpCheckGen.current += 1;
                      setCnpChecking(false);
                      setCnp(normalizeCnp(e.target.value));
                      setCnpDuplicate(false);
                    }}
                    onBlur={() => void checkCnpDuplicate(cnp)}
                    enterKeyHint="next"
                  />
                  {cnpChecking ? (
                    <span className="f230-spinner f230-spinner-inline" aria-label="Verific CNP-ul" />
                  ) : null}
                </div>
                {cnpStatus === "empty" ? (
                  <div className="invalid-feedback">Completează câmpul cu CNP-ul tău.</div>
                ) : null}
                {cnpStatus === "incomplete" ? (
                  <div className="cnp-live-hint">CNP-ul are 13 cifre.</div>
                ) : null}
                {cnpStatus === "invalid" ? (
                  <div className="invalid-feedback d-block">CNP-ul nu este valid.</div>
                ) : null}
                {cnpStatus === "valid" && !cnpChecking ? (
                  <div className="valid-feedback d-block">CNP valid.</div>
                ) : null}
                {cnpDuplicate ? (
                  <p className="cnp-duplicate-warn" role="status">
                    Există deja un formular 230 cu acest CNP pentru anul fiscal curent.
                  </p>
                ) : null}
                {cnpChecking ? <div className="cnp-live-hint">Verific dacă e deja trimis…</div> : null}
              </div>
              <div className="col-sm-6 d-none d-sm-block" aria-hidden="true" />
              <div className="col-12 col-sm-6 pb-2">
                <label htmlFor="localitate" className="form-label">
                  Localitate(*)
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  id="localitate"
                  name="localitate"
                  required
                  value={localitate}
                  onChange={(e) => setLocalitate(e.target.value)}
                  autoComplete="address-level2"
                  enterKeyHint="next"
                />
                <div className="invalid-feedback">Completează câmpul cu localitatea ta.</div>
              </div>
              <div className="col-12 col-sm-6 pb-2">
                <label htmlFor="judet" className="form-label">
                  Județ(*)
                </label>
                <input
                  type="text"
                  className="form-control form-control-lg"
                  id="judet"
                  name="judet"
                  required
                  value={judet}
                  onChange={(e) => setJudet(e.target.value)}
                  autoComplete="address-level1"
                  enterKeyHint="done"
                />
                <div className="invalid-feedback">Completează câmpul cu județul tău.</div>
              </div>
            </div>

            <div className="f230-step-nav">
              <button
                type="button"
                className="btn btn-primary-pink-round f230-next-btn"
                onClick={continueFromDate}
              >
                Continuă — semnează
              </button>
            </div>
          </div>
        </div>

        <div
          id="f230-sign"
          className={
            "col-12 f230-panel" +
            (finishDone ? " f230-panel-ok" : "") +
            (wizardStep === 1 ? " f230-panel-active" : "")
          }
          data-f230-panel="1"
        >
          <p className="f230-panel-kicker">{finishDone ? "Gata de trimis" : "Pasul 2 din 2"}</p>
          <h3 className="f230-panel-title">Semnează și trimite</h3>
          <p className="f230-panel-help">Semnează cu degetul, bifează acordul, apoi apasă Trimite.</p>

          <MobileSignaturePad ref={padRef} invalid={semnaturaInvalida} onSignedChange={onSignedChange} />

          <fieldset className="col-12 pb-2 duration-fieldset">
            <legend className="form-label">Perioada(*)</legend>
            <div className="f230-choice f230-choice-compact">
              <label className={"f230-choice-opt" + (ani === "2" ? " is-on" : "")}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="an"
                  id="ani"
                  value="2"
                  checked={ani === "2"}
                  onChange={() => setAni("2")}
                  required
                />
                <span className="f230-choice-copy">
                  <strong>2 ani</strong>
                  <span>Recomandat</span>
                </span>
              </label>
              <label className={"f230-choice-opt" + (ani === "1" ? " is-on" : "")}>
                <input
                  className="form-check-input"
                  type="radio"
                  name="an"
                  id="an"
                  value="1"
                  checked={ani === "1"}
                  onChange={() => setAni("1")}
                  required
                />
                <span className="f230-choice-copy">
                  <strong>1 an</strong>
                  <span>Doar anul ăsta</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="col-12 gdpr-block">
            <label className={"gdpr-consent" + (gdprInvalid ? " gdpr-consent-invalid" : "")}>
              <input
                type="checkbox"
                id="gdpr"
                name="gdpr"
                required
                checked={gdpr}
                onChange={(e) => {
                  setGdpr(e.target.checked);
                  if (e.target.checked) setGdprInvalid(false);
                }}
              />
              <span>
                Sunt de acord cu prelucrarea datelor pentru Formularul 230 (*){" "}
                <Link href="/230/confidentialitate">Detalii</Link>
              </span>
            </label>
            {gdprInvalid ? (
              <p className="invalid-feedback d-block">
                Acest acord este obligatoriu pentru trimiterea formularului.
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="form-submit-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="f230-step-nav f230-step-nav-submit">
            <button type="button" className="btn btn-secondary-pink f230-mobile-only" onClick={() => goStep(0)}>
              Înapoi
            </button>
            <button
              type="submit"
              className="btn btn-primary-pink-round submit-button f230-next-btn"
              id="save"
              disabled={submitting || cnpBlocked || cnpChecking}
            >
              {submitting ? "Se trimite…" : "Trimite formularul"}
            </button>
          </div>
        </div>
      </form>

      {submitting ? (
        <div className="f230-busy" role="status" aria-live="assertive" aria-labelledby="f230-busy-title">
          <div className="f230-busy-card">
            <span className="f230-spinner" aria-hidden />
            <p id="f230-busy-title" className="f230-busy-title">
              Se trimite Formularul 230
            </p>
            <p className="f230-busy-hint">{busyHint}</p>
            <p className="f230-busy-stay">Nu închide pagina.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
