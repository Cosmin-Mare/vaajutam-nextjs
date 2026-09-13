"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { CiUploadCard } from "@/components/cum-pot-ajuta/CiUploadCard";
import { ciOcrHasAnyField } from "@/lib/ci-recognize";
import { saveCiOcrLocal } from "@/lib/ci-ocr-local";
import { isCiSessionId } from "@/lib/ci-session-id";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

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
  const sessionParam = router.isReady
    ? Array.isArray(router.query.s)
      ? router.query.s[0]
      : router.query.s
    : undefined;
  const sessionId = isCiSessionId(sessionParam) ? sessionParam : "";

  const goToForm = (data?: CiOcrResult) => {
    if (data && ciOcrHasAnyField(data)) saveCiOcrLocal(data);
    void router.push("/230");
  };

  return (
    <div className="ci-capture">
      <CiUploadCard
        showSteps
        hidePhoneQr
        kicker="Pe telefon, în câteva secunde"
        title="Fotografiază cartea de identitate"
        onExtracted={() => undefined}
        afterRecognize={async (data) => {
          saveCiOcrLocal(data);
          if (!sessionId) return false;
          return publishToSession(sessionId, data);
        }}
        doneExtra={({ paired }) => (
          <>
            {paired ? (
              <p className="ci-card-help">Datele apar deja în formularul de pe calculator.</p>
            ) : null}
            <button type="button" className="btn btn-primary-pink-round ci-capture-next-btn" onClick={() => goToForm()}>
              Continuă formularul pe telefon
            </button>
          </>
        )}
      />
      <p className="ci-capture-back">
        <Link href="/230">Înapoi la Formularul 230</Link>
      </p>
    </div>
  );
}
