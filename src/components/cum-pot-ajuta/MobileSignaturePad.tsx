"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export type MobileSignaturePadHandle = {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
};

type Props = {
  invalid?: boolean;
  onSignedChange?: (signed: boolean) => void;
};

export const MobileSignaturePad = forwardRef<MobileSignaturePadHandle, Props>(function MobileSignaturePad(
  { invalid, onSignedChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [blank, setBlank] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(248, 249, 250)",
      penColor: "rgb(20, 20, 20)",
      minWidth: 1.2,
      maxWidth: 2.8,
    });
    padRef.current = pad;

    const syncBlank = () => setBlank(pad.isEmpty());
    pad.addEventListener("beginStroke", () => setBlank(false));
    pad.addEventListener("endStroke", syncBlank);

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = wrap.clientWidth;
      const height = width < 520 ? 148 : 168;
      const data = pad.toData();
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(ratio, ratio);
      pad.clear();
      if (data.length) pad.fromData(data);
      syncBlank();
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, []);

  useEffect(() => {
    onSignedChange?.(!blank);
  }, [blank, onSignedChange]);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: () => padRef.current?.toDataURL("image/png") ?? "",
    clear: () => {
      padRef.current?.clear();
      setBlank(true);
    },
  }));

  return (
    <div className="signature-field">
      <label htmlFor="signature-canvas" className="form-label">
        Semnătura(*)
      </label>
      <p className="signature-hint">Semnează cu degetul sau cu mouse-ul, în chenar.</p>
      <div
        ref={wrapRef}
        className={
          "signature-wrap" +
          (invalid ? " signature-wrap-invalid" : "") +
          (!blank ? " signature-wrap-ok" : "")
        }
      >
        <canvas id="signature-canvas" ref={canvasRef} />
        {blank ? <p className="signature-placeholder">Semnează aici</p> : null}
      </div>
      <button
        type="button"
        className="btn btn-secondary-pink signature-clear"
        onClick={() => {
          padRef.current?.clear();
          setBlank(true);
        }}
      >
        Șterge semnătura
      </button>
      {invalid ? (
        <div className="invalid-feedback d-block">Semnătura este obligatorie.</div>
      ) : null}
    </div>
  );
});
