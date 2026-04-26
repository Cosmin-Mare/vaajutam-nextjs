"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";

function web3formsAccessKey(): string {
  return (process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY ?? "").trim();
}

type Web3FormsResult = {
  success?: boolean;
  message?: string;
  body?: { message?: string };
};

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const keyConfigured = web3formsAccessKey().length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const accessKey = web3formsAccessKey();
    if (!accessKey) {
      setErrorMsg(
        "Formularul nu este configurat (lipsește cheia Web3Forms). Folosiți adresa de e-mail din stânga."
      );
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    const telefon = String(fd.get("telefon") ?? "").trim();

    if (!name || !email || !message) {
      setErrorMsg("Completați numele, e-mailul și mesajul.");
      setStatus("error");
      return;
    }

    const payload: Record<string, string> = {
      access_key: accessKey,
      subject: `Mesaj site — ${name}`.slice(0, 200),
      name: name.slice(0, 200),
      email,
      message: message.slice(0, 10000),
    };
    if (telefon) {
      payload.telefon = telefon.slice(0, 40);
    }

    try {
      const r = await fetch(WEB3FORMS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await r.json().catch(() => ({}))) as Web3FormsResult;

      if (r.ok && data.success) {
        setStatus("success");
        form.reset();
        form.classList.remove("was-validated");
        return;
      }

      const apiMsg = data.message ?? data.body?.message;
      if (r.status === 429) {
        setErrorMsg("Prea multe încercări. Încercați mai târziu.");
      } else if (apiMsg) {
        setErrorMsg(apiMsg);
      } else {
        setErrorMsg(
          "Nu am putut trimite mesajul. Încercați din nou sau scrieți-ne direct la e-mail."
        );
      }
      setStatus("error");
    } catch {
      setErrorMsg("Eroare de rețea. Încercați din nou.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="contact-form contact-form-panel">
        <h2 className="projects-title contact-form-heading">Mesaj trimis</h2>
        <p className="contact-form-intro mb-0" role="status">
          Vă mulțumim — vă vom răspunde cât putem de curând.
        </p>
        <button
          type="button"
          className="btn btn-outline-secondary mt-3"
          onClick={() => {
            setStatus("idle");
            setErrorMsg(null);
          }}
        >
          Trimite alt mesaj
        </button>
      </div>
    );
  }

  const req = <span className="text-muted fw-normal">(obligatoriu)</span>;
  const opt = <span className="text-muted fw-normal">(opțional)</span>;

  return (
    <div className="contact-form contact-form-panel">
      <h2 className="projects-title contact-form-heading">Scrie-ne un mesaj</h2>
      {!keyConfigured ? (
        <p className="text-secondary mb-3" role="status">
          Formularul online nu este încă activat. Ne puteți scrie la adresa de e-mail din stânga.
        </p>
      ) : null}
      {keyConfigured ? (
        <p className="contact-form-intro mb-3 mb-lg-4">
          Ne bucurăm să primim vești de la voi. Etichetele (obligatoriu) și (opțional) de la fiecare
          câmp arată ce trebuie completat; dacă ne lași un număr de telefon, uneori e mai ușor să
          revenim.
        </p>
      ) : null}
      {errorMsg ? (
        <p className="text-danger mb-3" role="alert">
          {errorMsg}
        </p>
      ) : null}
      <form className="row g-3 needs-validation" onSubmit={onSubmit} noValidate>
        <div className="col-12">
          <label htmlFor="contact-name" className="form-label">
            Nume {req}
          </label>
          <input
            type="text"
            className="form-control"
            id="contact-name"
            name="name"
            required
            maxLength={200}
            disabled={status === "submitting" || !keyConfigured}
            autoComplete="name"
          />
          <div className="invalid-feedback">Introduceți numele.</div>
        </div>
        <div className="col-12">
          <label htmlFor="contact-email" className="form-label">
            Email {req}
          </label>
          <input
            type="email"
            className="form-control"
            id="contact-email"
            name="email"
            required
            maxLength={254}
            disabled={status === "submitting" || !keyConfigured}
            autoComplete="email"
          />
          <div className="invalid-feedback">Introduceți o adresă de e-mail validă.</div>
        </div>
        <div className="col-12">
          <label htmlFor="contact-tel" className="form-label">
            Număr de telefon {opt}
          </label>
          <input
            type="tel"
            className="form-control"
            id="contact-tel"
            name="telefon"
            maxLength={40}
            disabled={status === "submitting" || !keyConfigured}
            autoComplete="tel"
          />
        </div>
        <div className="col-12">
          <label htmlFor="contact-message" className="form-label">
            Mesaj {req}
          </label>
          <textarea
            className="form-control"
            id="contact-message"
            name="message"
            rows={5}
            required
            maxLength={10000}
            disabled={status === "submitting" || !keyConfigured}
          />
          <div className="invalid-feedback">Scrieți mesajul.</div>
        </div>
        <div className="col-12">
          <button
            type="submit"
            className="btn btn-primary-pink-round"
            style={{ width: "100%", fontSize: 20 }}
            disabled={status === "submitting" || !keyConfigured}
          >
            {status === "submitting" ? "Se trimite…" : "Trimite"}
          </button>
        </div>
      </form>
    </div>
  );
}
