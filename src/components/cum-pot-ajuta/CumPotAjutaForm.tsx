"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CiIdScanner } from "@/components/cum-pot-ajuta/CiIdScanner";
import { CiPhoneQr } from "@/components/cum-pot-ajuta/CiPhoneQr";
import {
  MobileSignaturePad,
  type MobileSignaturePadHandle,
} from "@/components/cum-pot-ajuta/MobileSignaturePad";
import type { CiOcrResult } from "@/lib/ci-id-ocr";
import { clearCiOcrLocal, readCiOcrLocal } from "@/lib/ci-ocr-local";
import { newCiSessionId } from "@/lib/ci-session-id";
import { cnpFieldStatus, normalizeCnp } from "@/lib/cnp";

type Props = {
  variant?: "embedded" | "standalone";
};

export function CumPotAjutaForm({ variant = "embedded" }: Props) {
  const padRef = useRef<MobileSignaturePadHandle | null>(null);
  const [nume, setNume] = useState("");
  const [prenume, setPrenume] = useState("");
  const [cnp, setCnp] = useState("");
  const [cnpDuplicate, setCnpDuplicate] = useState(false);
  const [semnaturaInvalida, setSemnaturaInvalida] = useState(false);
  const [gdprInvalid, setGdprInvalid] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ciSessionId, setCiSessionId] = useState("");
  const cnpStatus = cnpFieldStatus(cnp);
  const cnpBlocked = cnpStatus === "invalid" || cnpDuplicate;

  const applyOcr = useCallback((data: CiOcrResult) => {
    if (data.nume) setNume(data.nume);
    if (data.prenume) setPrenume(data.prenume);
    if (data.cnp) {
      setCnp(data.cnp);
      setCnpDuplicate(false);
    }
  }, []);

  useEffect(() => {
    const local = readCiOcrLocal();
    if (local) applyOcr(local);
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const id = newCiSessionId();
    setCiSessionId(id);
    void fetch("/api/form230/ci-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  }, [applyOcr]);

  return (
    <>
      {pdfDataUrl && (
        <section id="formular-pdf">
          <iframe
            title="Formular 230"
            src={pdfDataUrl}
            style={{ width: "100%", height: 1200 }}
          />
        </section>
      )}
      {!pdfDataUrl && (
        <section id="formular-230" className={variant === "standalone" ? "formular-230-standalone" : ""}>
          {variant === "embedded" ? <h2 className="projects-title">Formular 230</h2> : null}
          <form
            className="row needs-validation"
            onSubmit={async (e) => {
              e.preventDefault();
              setSemnaturaInvalida(false);
              setGdprInvalid(false);
              setSubmitError(null);
              const form = e.currentTarget;
              const gdpr = form.elements.namedItem("gdpr") as HTMLInputElement | null;
              if (!gdpr?.checked) {
                setGdprInvalid(true);
                form.classList.add("was-validated");
                return;
              }
              if (cnpStatus !== "valid" || cnpDuplicate) {
                form.classList.add("was-validated");
                return;
              }
              if (!form.checkValidity()) {
                form.classList.add("was-validated");
                return;
              }
              const pad = padRef.current;
              if (!pad || pad.isEmpty()) {
                setSemnaturaInvalida(true);
                return;
              }
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
                  if (j.error === "cnp") setCnpDuplicate(false);
                  if (j.error === "duplicate") setCnpDuplicate(true);
                  if (j.error === "semnatura") setSemnaturaInvalida(true);
                  if (j.error === "gdpr") setGdprInvalid(true);
                  setSubmitError(
                    j.error === "duplicate"
                      ? "Ai mai trimis deja Formularul 230 pentru acest an fiscal, cu același CNP."
                      : j.error === "cnp"
                        ? "CNP-ul nu este valid."
                        : "Nu am putut trimite formularul. Verifică datele și încearcă din nou."
                  );
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
            <div className="col-12 pb-3">
              <div className="ci-scan-row">
                <CiIdScanner onExtracted={applyOcr} />
                {ciSessionId ? <CiPhoneQr sessionId={ciSessionId} onExtracted={applyOcr} /> : null}
              </div>
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="nume" className="form-label">
                Nume(*)
              </label>
              <input
                type="text"
                className="form-control"
                id="nume"
                name="nume"
                required
                value={nume}
                onChange={(e) => setNume(e.target.value)}
                autoComplete="family-name"
              />
              <div className="invalid-feedback">Completează câmpul cu numele tău.</div>
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="prenume" className="form-label">
                Prenume(*)
              </label>
              <input
                type="text"
                className="form-control"
                id="prenume"
                name="prenume"
                required
                value={prenume}
                onChange={(e) => setPrenume(e.target.value)}
                autoComplete="given-name"
              />
              <div className="invalid-feedback">Completează câmpul cu prenumele tău.</div>
            </div>
            <div className="col-12 col-sm-6 pb-2 has-validation">
              <label htmlFor="cnp" className="form-label">
                CNP(*)
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={
                  "form-control" +
                  (cnpStatus === "valid" && !cnpDuplicate ? " is-valid" : "") +
                  (cnpBlocked ? " is-invalid" : "")
                }
                id="cnp"
                name="cnp"
                required
                maxLength={13}
                value={cnp}
                onChange={(e) => {
                  setCnp(normalizeCnp(e.target.value));
                  setCnpDuplicate(false);
                }}
                onBlur={async () => {
                  if (cnpFieldStatus(cnp) !== "valid") return;
                  try {
                    const res = await fetch("/api/form230/check-cnp", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ cnp: normalizeCnp(cnp) }),
                    });
                    const j = (await res.json()) as { duplicate?: boolean };
                    setCnpDuplicate(Boolean(j.duplicate));
                  } catch {
                    /* submit will re-check */
                  }
                }}
              />
              {cnpStatus === "empty" ? (
                <div className="invalid-feedback">Completează câmpul cu CNP-ul tău.</div>
              ) : null}
              {cnpStatus === "incomplete" ? (
                <div className="cnp-live-hint">CNP-ul are 13 cifre.</div>
              ) : null}
              {cnpStatus === "invalid" ? (
                <div className="invalid-feedback d-block">CNP-ul nu este valid.</div>
              ) : null}
              {cnpDuplicate ? (
                <div className="invalid-feedback d-block">
                  Există deja un formular 230 cu acest CNP pentru anul fiscal curent.
                </div>
              ) : null}
              {cnpStatus === "valid" && !cnpDuplicate ? (
                <div className="valid-feedback d-block">CNP valid.</div>
              ) : null}
            </div>
            <div className="col-sm-6 d-none d-sm-block" aria-hidden="true" />
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="localitate" className="form-label">
                Localitate(*)
              </label>
              <input
                type="text"
                className="form-control"
                id="localitate"
                name="localitate"
                required
                autoComplete="address-level2"
              />
              <div className="invalid-feedback">Completează câmpul cu localitatea ta.</div>
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="judet" className="form-label">
                Județ(*)
              </label>
              <input
                type="text"
                className="form-control"
                id="judet"
                name="judet"
                required
                autoComplete="address-level1"
              />
              <div className="invalid-feedback">Completează câmpul cu județul tău.</div>
            </div>
            <div className="col-12 pb-3">
              <MobileSignaturePad ref={padRef} invalid={semnaturaInvalida} />
            </div>
            <fieldset className="col-12 pb-2 duration-fieldset">
              <legend className="form-label">Perioada de redirecționare(*)</legend>
              <div className="form-check col-12 col-sm-6">
                <input className="form-check-input" type="radio" name="an" id="an" value="1" required />
                <label className="form-check-label" htmlFor="an">
                  Vreau să redirecționez timp de 1 an
                </label>
              </div>
              <div className="form-check col-12 col-sm-6">
                <input
                  className="form-check-input"
                  type="radio"
                  name="an"
                  id="ani"
                  value="2"
                  defaultChecked
                  required
                />
                <label className="form-check-label" htmlFor="ani">
                  Vreau să redirecționez timp de 2 ani
                </label>
              </div>
            </fieldset>
            <div className="col-12 gdpr-block">
              <p className="gdpr-short">
                Folosim datele doar pentru Formularul 230 către ANAF, în favoarea Asociației Vă
                Ajutăm din Dej. Poza CI nu părăsește dispozitivul tău.{" "}
                <a href="/230/confidentialitate">Informare privind datele personale</a>
              </p>
              <label className={"gdpr-consent" + (gdprInvalid ? " gdpr-consent-invalid" : "")}>
                <input type="checkbox" id="gdpr" name="gdpr" required />
                <span>
                  Am citit informarea și sunt de acord cu prelucrarea datelor pentru Formularul 230
                  (*)
                </span>
              </label>
              {gdprInvalid ? (
                <p className="invalid-feedback d-block">
                  Acest acord este obligatoriu pentru trimiterea formularului.
                </p>
              ) : null}
            </div>
            <p className="form-required-hint">Câmpurile marcate cu (*) sunt obligatorii.</p>
            {submitError ? <p className="form-submit-error">{submitError}</p> : null}
            <div className="col-12 pb-2 submit-button-wrapper">
              <button
                type="submit"
                className="btn btn-primary-pink-round submit-button"
                id="save"
                disabled={submitting || cnpBlocked}
              >
                {submitting ? "Se generează…" : "Generează și Trimite"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
