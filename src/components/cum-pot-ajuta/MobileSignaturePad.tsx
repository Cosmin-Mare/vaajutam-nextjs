"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import SignaturePad from "signature_pad";

export type MobileSignaturePadHandle = {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
  resize: () => void;
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
  const drawingRef = useRef(false);
  const resizeRef = useRef<() => void>(() => undefined);
  const [blank, setBlank] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const narrow = Math.max(wrap.clientWidth, window.innerWidth) < 520;
    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(248, 249, 250)",
      penColor: "rgb(20, 20, 20)",
      minWidth: narrow ? 2 : 1.2,
      maxWidth: narrow ? 4 : 2.8,
      minDistance: 1,
      velocityFilterWeight: 0.7,
    });
    padRef.current = pad;

    const syncBlank = () => setBlank(pad.isEmpty());
    const onBegin = () => {
      drawingRef.current = true;
      setBlank(false);
    };
    const onEnd = () => {
      drawingRef.current = false;
      syncBlank();
    };
    pad.addEventListener("beginStroke", onBegin);
    pad.addEventListener("endStroke", onEnd);

    let lastW = -1;
    let lastH = -1;
    let resizeTimer = 0;

    const resizeNow = () => {
      if (drawingRef.current) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = Math.max(1, Math.floor(wrap.clientWidth || canvas.clientWidth || 0));
      if (width < 2) return;
      const height = width < 520 ? 240 : 168;
      if (width === lastW && height === lastH && canvas.width > 0) return;
      lastW = width;
      lastH = height;
      const data = pad.toData();
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      const ctx = canvas.getContext("2d");
      // Reset transform then scale — matches Signature Pad high-DPI guidance.
      if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      pad.clear();
      if (data.length) pad.fromData(data);
      syncBlank();
    };

    resizeRef.current = resizeNow;

    const scheduleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resizeNow, 50);
    };

    resizeNow();
    const ro = new ResizeObserver(scheduleResize);
    ro.observe(wrap);
    window.addEventListener("orientationchange", scheduleResize);
    window.addEventListener("resize", scheduleResize);
    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("orientationchange", scheduleResize);
      window.removeEventListener("resize", scheduleResize);
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
    resize: () => resizeRef.current(),
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
