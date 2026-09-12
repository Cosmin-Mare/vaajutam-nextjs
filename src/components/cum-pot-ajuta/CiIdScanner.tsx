"use client";

import { useRef, useState } from "react";
import { ciOcrHasAnyField, recognizeCiImage } from "@/lib/ci-recognize";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

type Props = {
  onExtracted: (data: CiOcrResult) => void;
};

export function CiIdScanner({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="ci-scan">
      <p className="ci-scan-title">Scanează cartea de identitate</p>
      <p className="ci-scan-help">
        Poza se citește doar pe dispozitivul tău. <strong>Nu o trimitem și nu o salvăm.</strong>{" "}
        Adresa o completezi tu.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden"
        aria-label="Fotografiază sau încarcă CI-ul"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          input.value = "";
          if (!file) return;
          setBusy(true);
          setError(null);
          setMessage("Se citesc datele…");
          try {
            const parsed = await recognizeCiImage(file);
            if (!ciOcrHasAnyField(parsed)) {
              setError(
                "Nu am putut citi datele. Încearcă o poză mai clară, pe lumină, sau completează manual."
              );
              setMessage(null);
              return;
            }
            onExtracted(parsed);
            const bits: string[] = [];
            if (parsed.nume) bits.push("nume");
            if (parsed.prenume) bits.push("prenume");
            if (parsed.cnp) bits.push("CNP");
            setMessage(`Am completat: ${bits.join(", ")}. Verifică dacă sunt corecte.`);
          } catch (err) {
            console.error("[ci-scan]", err);
            setError("Scanarea nu a reușit. Completează câmpurile manual.");
            setMessage(null);
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        className="btn btn-secondary-pink"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Se citește CI-ul…" : "Fotografiază sau încarcă CI-ul"}
      </button>
      {message ? <p className="ci-scan-ok">{message}</p> : null}
      {error ? <p className="ci-scan-err">{error}</p> : null}
    </div>
  );
}
