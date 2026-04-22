"use client";

import { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export function CumPotAjutaForm() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [cnpInvalid, setCnpInvalid] = useState(false);
  const [semnaturaInvalida, setSemnaturaInvalida] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pdfDataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pad = new SignaturePad(canvas, { backgroundColor: "rgba(0, 0, 0, 0)" });
    padRef.current = pad;
    return () => {
      padRef.current = null;
    };
  }, [pdfDataUrl]);

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
        <section id="formular-230">
        <h2 className="projects-title">Formular 230</h2>
          <form
            className="row needs-validation"
            onSubmit={async (e) => {
              e.preventDefault();
              setCnpInvalid(false);
              setSemnaturaInvalida(false);
              const form = e.currentTarget;
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
              fd.set("signature", dataUrl);
              try {
                const res = await fetch("/api/cum-pot-ajuta", { method: "POST", body: fd });
                const j = (await res.json()) as { ok?: boolean; error?: string; pdfBase64?: string };
                if (!res.ok) {
                  if (j.error === "cnp") setCnpInvalid(true);
                  if (j.error === "semnatura") setSemnaturaInvalida(true);
                  return;
                }
                if (j.pdfBase64) {
                  setPdfDataUrl(`data:application/pdf;base64,${j.pdfBase64}`);
                }
              } finally {
                setSubmitting(false);
              }
            }}
            noValidate
          >
            <div className="col-12 col-sm-6 col-md-4 pb-2">
              <label htmlFor="nume" className="form-label">
                Nume(*)
              </label>
              <input type="text" className="form-control" id="nume" name="nume" required />
              <div className="invalid-feedback">Completează câmpul cu numele tău.</div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 pb-2">
              <label htmlFor="initiala" className="form-label">
                Inițiala tatălui
              </label>
              <input type="text" className="form-control" id="initiala" name="initiala" />
            </div>
            <div className="col-12 col-sm-6 col-md-4 pb-2">
              <label htmlFor="prenume" className="form-label">
                Prenume(*)
              </label>
              <input type="text" className="form-control" id="prenume" name="prenume" required />
              <div className="invalid-feedback">Completează câmpul cu prenumele tău.</div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 pb-2 has-validation">
              <label htmlFor="cnp" className="form-label">
                CNP(*)
              </label>
              <input
                type="text"
                className={"form-control" + (cnpInvalid ? " is-invalid" : "")}
                id="cnp"
                name="cnp"
                required
              />
              <div className="invalid-feedback">Completează câmpul cu CNP-ul tău.</div>
            </div>
            <div className="col-12 col-sm-6 col-md-4 pb-2">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input type="text" className="form-control" id="email" name="email" />
            </div>
            <div className="col-12 col-sm-6 col-md-4 pb-2">
              <label htmlFor="telefon" className="form-label">
                Telefon
              </label>
              <input type="text" className="form-control" id="telefon" name="telefon" />
            </div>
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
              />
              <div className="invalid-feedback">Completează câmpul cu localitatea ta.</div>
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="judet" className="form-label">
                Județ(*)
              </label>
              <input type="text" className="form-control" id="judet" name="judet" required />
              <div className="invalid-feedback">Completează câmpul cu județul tău.</div>
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="strada" className="form-label">
                Strada
              </label>
              <input type="text" className="form-control" id="strada" name="strada" />
            </div>
            <div className="col-12 col-sm-6 pb-2">
              <label htmlFor="numar" className="form-label">
                Număr
              </label>
              <input type="text" className="form-control" id="numar" name="numar" />
            </div>
            <div className="col-12 pb-2 col-sm-6">
              <label htmlFor="signature-canvas" className="form-label">
                Semnătura(*)
              </label>
              <div
                style={{
                  backgroundColor: "rgb(227, 227, 227)",
                  height: "fit-content",
                  width: "fit-content",
                }}
              >
                <canvas
                  id="signature-canvas"
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className={semnaturaInvalida ? "border border-danger" : ""}
                />
              </div>
              <input type="hidden" id="signature" name="signature" />
              <div className="invalid-feedback d-block">Completează câmpul cu semnătura ta.</div>
            </div>
            <div className="clear-btn col-12 pb-2">
              <button
                type="button"
                id="clear"
                className="btn btn-primary-pink-round"
                onClick={() => padRef.current?.clear()}
              >
                Șterge semnătura
              </button>
            </div>
            <div className="form-check col-12 col-sm-6">
              <input className="form-check-input" type="radio" name="an" id="an" value="on" />
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
              />
              <label className="form-check-label" htmlFor="ani">
                Vreau să redirecționez timp de 2 ani
              </label>
            </div>
            <div className="form-check col-12">
              <div className="col-12">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="gdpr"
                  name="gdpr"
                  required
                  defaultChecked
                />
                <label className="form-check-label" htmlFor="gdpr">
                  Sunt de acord cu prelucrarea datelor mele personale în conformitate cu
                  Regulamentul (UE) 2016/679 (*)
                </label>
              </div>
              <div className="invalid-feedback">Trebuie să fii de acord.</div>
            </div>
            <div className="form-check col-12">
              <div className="col-12">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="date"
                  id="date"
                  value="on"
                  defaultChecked
                />
                <label className="form-check-label" htmlFor="date">
                  Sunt de acord ca datele de identificare (nume, prenume și CNP) să fie comunicate
                  entității beneficiare.
                </label>
              </div>
            </div>
            <div className="form-check col-12 pb-1" style={{ justifyContent: "flex-start" }}>
              <input
                className="form-check-input"
                type="checkbox"
                id="emailAccept"
                name="emailAccept"
                defaultChecked
              />
              <label className="form-check-label" htmlFor="emailAccept">
                Sunt de acord să primesc emailuri de la Asociația Vă Ajutăm din Dej
              </label>
            </div>
            <p>Completarea căsuțelor anotate cu (*) este obligatorie</p>
            <div className="col-12 pb-2 submit-button-wrapper">
              <button
                type="submit"
                className="btn btn-primary-pink-round submit-button"
                id="save"
                disabled={submitting}
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
