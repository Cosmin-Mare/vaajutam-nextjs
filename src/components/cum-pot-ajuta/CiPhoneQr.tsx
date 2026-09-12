"use client";

import { useEffect, useRef, useState } from "react";
import type { CiOcrResult } from "@/lib/ci-id-ocr";
import { isCiSessionId } from "@/lib/ci-session-id";

type Props = {
  sessionId: string;
  onExtracted: (data: CiOcrResult) => void;
};

export function CiPhoneQr({ sessionId, onExtracted }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [received, setReceived] = useState(false);
  const onExtractedRef = useRef(onExtracted);
  onExtractedRef.current = onExtracted;

  useEffect(() => {
    if (!isCiSessionId(sessionId)) return;
    const origin = window.location.origin;
    const url = `${origin}/230/ci?s=${encodeURIComponent(sessionId)}`;
    setHref(url);
    let cancelled = false;
    void import("qrcode").then(async (QRCode) => {
      const markup = await QRCode.toString(url, {
        type: "svg",
        margin: 1,
        width: 144,
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setSvg(markup.replace(/^<\?xml[^>]*>\s*/i, ""));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!isCiSessionId(sessionId) || received) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/form230/ci-session?id=${encodeURIComponent(sessionId)}`);
        const j = (await res.json()) as CiOcrResult & { ready?: boolean; pairing?: boolean };
        if (stopped) return;
        if (j.ready && (j.nume || j.prenume || j.cnp)) {
          setReceived(true);
          onExtractedRef.current({
            ...(j.nume ? { nume: j.nume } : {}),
            ...(j.prenume ? { prenume: j.prenume } : {}),
            ...(j.cnp ? { cnp: j.cnp } : {}),
          });
        }
      } catch {
        /* next tick */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 1600);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [sessionId, received]);

  return (
    <aside className="ci-phone-qr" aria-label="Cod QR pentru fotografia CI pe telefon">
      {received ? (
        <p className="ci-scan-ok">Am preluat datele de pe telefon. Verifică-le mai jos.</p>
      ) : (
        <>
          {svg ? (
            <div
              className="ci-phone-qr-code"
              role="img"
              aria-label="Cod QR către fotografia CI pe telefon"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="ci-phone-qr-placeholder" aria-hidden="true" />
          )}
          <p className="ci-phone-qr-caption">Scanează ca să fotografiezi CI-ul pe telefon</p>
          {href ? (
            <p className="ci-phone-qr-link">
              <a href={href}>Deschide fotografia</a>
            </p>
          ) : null}
        </>
      )}
    </aside>
  );
}
