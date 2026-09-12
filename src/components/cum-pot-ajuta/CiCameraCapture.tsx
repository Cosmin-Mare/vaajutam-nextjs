"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ciOcrHasAnyField, recognizeCiImage } from "@/lib/ci-recognize";
import { saveCiOcrLocal } from "@/lib/ci-ocr-local";
import { isCiSessionId } from "@/lib/ci-session-id";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

type Phase = "ready" | "reading" | "done" | "error";

async function publishToSession(sessionId: string, data: CiOcrResult): Promise<boolean> {
  try {
    const res = await fetch("/api/form230/ci-session", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sessionId,
        nume: data.nume ?? "",
        prenume: data.prenume ?? "",
        cnp: data.cnp ?? "",
      }),
    });
    const j = (await res.json()) as { ok?: boolean; pairing?: boolean };
    return Boolean(res.ok && j.ok && j.pairing !== false);
  } catch {
    return false;
  }
}

export function CiCameraCapture() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autoOpened = useRef(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const sessionParam = router.isReady
    ? Array.isArray(router.query.s)
      ? router.query.s[0]
      : router.query.s
    : undefined;
  const sessionId = isCiSessionId(sessionParam) ? sessionParam : "";

  useEffect(() => {
    if (!router.isReady || autoOpened.current) return;
    const openCamera =
      window.matchMedia("(max-width: 767px)").matches ||
      window.matchMedia("(pointer: coarse)").matches;
    if (!openCamera) return;
    autoOpened.current = true;
    const t = window.setTimeout(() => inputRef.current?.click(), 250);
    return () => window.clearTimeout(t);
  }, [router.isReady]);

  const goToForm = (data?: CiOcrResult) => {
    if (data && ciOcrHasAnyField(data)) saveCiOcrLocal(data);
    void router.push("/230");
  };

  return (
    <div className="ci-capture">
      <h1 className="projects-title">Fotografiază CI-ul</h1>
      <p className="lead">
        Folosește camera din spate, pe lumină, cu MRZ-ul (cele două rânduri de jos) vizibil. Poza se
        citește doar pe telefon — <strong>nu o trimitem și nu o salvăm</strong>.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        aria-label="Fotografiază cartea de identitate"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          input.value = "";
          if (!file) return;
          setPhase("reading");
          setMessage("Se citesc datele…");
          setPaired(false);
          try {
            const parsed = await recognizeCiImage(file);
            if (!ciOcrHasAnyField(parsed)) {
              setPhase("error");
              setMessage(
                "Nu am putut citi datele. Încearcă o poză mai clară, pe lumină, sau completează manual."
              );
              return;
            }
            saveCiOcrLocal(parsed);
            let sent = false;
            if (sessionId) {
              sent = await publishToSession(sessionId, parsed);
            }
            setPaired(sent);
            setPhase("done");
            const bits: string[] = [];
            if (parsed.nume) bits.push("nume");
            if (parsed.prenume) bits.push("prenume");
            if (parsed.cnp) bits.push("CNP");
            setMessage(
              sent
                ? `Am citit ${bits.join(", ")} și le-am trimis pe calculator. Poți continua acolo sau aici.`
                : `Am citit ${bits.join(", ")}. Continuă formularul pe telefon.`
            );
            if (!sessionId) {
              goToForm(parsed);
            }
          } catch (err) {
            console.error("[ci-capture]", err);
            setPhase("error");
            setMessage("Scanarea nu a reușit. Încearcă din nou sau completează manual.");
          }
        }}
      />

      {phase !== "done" ? (
        <button
          type="button"
          className="btn btn-primary-pink-round ci-capture-shutter"
          disabled={phase === "reading"}
          onClick={() => inputRef.current?.click()}
        >
          {phase === "reading" ? "Se citește CI-ul…" : "Fotografiază CI-ul"}
        </button>
      ) : null}

      {message ? (
        <p className={phase === "error" ? "ci-scan-err" : "ci-scan-ok"}>{message}</p>
      ) : null}

      {phase === "done" ? (
        <div className="ci-capture-next">
          {paired ? (
            <p className="ci-scan-help">Datele apar în formularul deschis pe calculator.</p>
          ) : null}
          <button type="button" className="btn btn-secondary-pink" onClick={() => goToForm()}>
            Continuă formularul pe telefon
          </button>
          <button
            type="button"
            className="btn btn-secondary-pink"
            onClick={() => {
              setPhase("ready");
              setMessage(null);
              inputRef.current?.click();
            }}
          >
            Fotografiază din nou
          </button>
        </div>
      ) : null}

      <p className="ci-capture-back">
        <Link href="/230">Înapoi la Formularul 230</Link>
      </p>
    </div>
  );
}
