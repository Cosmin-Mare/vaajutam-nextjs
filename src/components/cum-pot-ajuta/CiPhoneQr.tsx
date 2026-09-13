"use client";

import { useEffect, useRef, useState } from "react";
import type { CiKind, CiOcrResult } from "@/lib/ci-id-ocr";
import { isCiSessionId } from "@/lib/ci-session-id";

type Props = {
  sessionId: string;
  kind?: CiKind;
  onExtracted: (data: CiOcrResult) => void;
};

async function qrOrigin(): Promise<string> {
  const here = window.location.origin;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return here;
  try {
    const res = await fetch("/api/form230/lan-origin");
    const j = (await res.json()) as { origin?: string | null };
    if (j.origin) return j.origin;
  } catch {
    /* stay on localhost */
  }
  return here;
}

export function CiPhoneQr({ sessionId, kind, onExtracted }: Props) {
  const [svg, setSvg] = useState<string | null>(null);
  const [href, setHref] = useState("");
  const [received, setReceived] = useState(false);
  const lastPayload = useRef("");
  const onExtractedRef = useRef(onExtracted);
  onExtractedRef.current = onExtracted;

  useEffect(() => {
    if (!isCiSessionId(sessionId)) return;
    let cancelled = false;
    void qrOrigin().then(async (origin) => {
      const q = new URLSearchParams({ s: sessionId });
      if (kind) q.set("t", kind);
      const url = `${origin}/230/ci?${q.toString()}`;
      if (cancelled) return;
      setHref(url);
      const QRCode = await import("qrcode");
      const markup = await QRCode.toString(url, {
        type: "svg",
        margin: 1,
        width: 168,
        errorCorrectionLevel: "M",
      });
      if (!cancelled) setSvg(markup.replace(/^<\?xml[^>]*>\s*/i, ""));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, kind]);

  useEffect(() => {
    if (!isCiSessionId(sessionId) || received) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/form230/ci-session?id=${encodeURIComponent(sessionId)}`);
        const j = (await res.json()) as CiOcrResult & { ready?: boolean; pairing?: boolean };
        if (stopped) return;
        if (j.ready && (j.nume || j.prenume || j.cnp)) {
          const payload = JSON.stringify({ nume: j.nume ?? "", prenume: j.prenume ?? "", cnp: j.cnp ?? "" });
          if (payload !== lastPayload.current) {
            lastPayload.current = payload;
            onExtractedRef.current({
              ...(j.nume ? { nume: j.nume } : {}),
              ...(j.prenume ? { prenume: j.prenume } : {}),
              ...(j.cnp ? { cnp: j.cnp } : {}),
            });
          }
          if (j.nume && j.prenume && j.cnp) setReceived(true);
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

  if (received) return null;

  return (
    <aside className="ci-phone-qr" aria-label="Cod QR pentru fotografia CI pe telefon">
      <p className="ci-phone-qr-kicker">De pe telefon</p>
      <div className="ci-qr-ring ci-qr-ring-wait">
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
      </div>
      <p className="ci-phone-qr-caption">Scanează, apoi fotografiază buletinul</p>
      <p className="ci-phone-wait">Aștept fotografia…</p>
      {href ? (
        <p className="ci-phone-qr-link">
          <a href={href}>Deschide pe telefon</a>
        </p>
      ) : null}
    </aside>
  );
}
