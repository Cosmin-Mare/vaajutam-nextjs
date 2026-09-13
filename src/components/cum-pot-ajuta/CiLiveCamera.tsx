"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type LiveProps = {
  stream: MediaStream;
  onCapture: (file: File) => void;
  onClose: () => void;
};

type GuideProps = {
  onShoot: () => void;
  onClose: () => void;
};

/** Live preview needs HTTPS (or localhost). Phone QR over http://192.168… cannot use getUserMedia. */
export function canUseLiveCamera(): boolean {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

export async function requestCiCamera(): Promise<MediaStream> {
  if (!canUseLiveCamera()) throw new Error("no-camera");
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("no-camera");
}

function FrameGhost() {
  return (
    <svg className="ci-cam-ghost" viewBox="0 0 220 138" aria-hidden="true">
      <rect x="8" y="10" width="52" height="64" rx="6" />
      <circle cx="34" cy="34" r="12" />
      <rect x="72" y="16" width="132" height="9" rx="4" />
      <rect x="72" y="32" width="108" height="8" rx="4" />
      <rect x="72" y="48" width="118" height="8" rx="4" />
      <rect x="72" y="64" width="88" height="8" rx="4" />
      <rect className="ci-cam-ghost-mrz" x="8" y="96" width="204" height="7" rx="2" />
      <rect className="ci-cam-ghost-mrz" x="8" y="110" width="204" height="7" rx="2" />
    </svg>
  );
}

function cropVideoToFrame(video: HTMLVideoElement, frame: HTMLElement): HTMLCanvasElement {
  const vRect = video.getBoundingClientRect();
  const oRect = frame.getBoundingClientRect();
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(vRect.width / vw, vRect.height / vh);
  const dispW = vw * scale;
  const dispH = vh * scale;
  const offX = (vRect.width - dispW) / 2;
  const offY = (vRect.height - dispH) / 2;
  const pad = 0.04;
  let sx = (oRect.left - vRect.left - offX) / scale;
  let sy = (oRect.top - vRect.top - offY) / scale;
  let sw = oRect.width / scale;
  let sh = oRect.height / scale;
  sx -= sw * pad;
  sy -= sh * pad;
  sw += sw * pad * 2;
  sh += sh * pad * 2;
  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(vw - sx, sw);
  sh = Math.min(vh - sy, sh);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToFile(canvas: HTMLCanvasElement): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("blob"));
        else resolve(new File([blob], "ci.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

function CameraShell({
  onClose,
  onSnap,
  snapDisabled,
  extraTips,
  children,
}: {
  onClose: () => void;
  onSnap: () => void;
  snapDisabled?: boolean;
  extraTips?: ReactNode;
  children?: ReactNode;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="ci-cam" role="dialog" aria-modal="true" aria-labelledby="ci-cam-title">
      {children}
      <div className="ci-cam-stage">
        <p id="ci-cam-title" className="ci-cam-title">
          Așază buletinul în cadru
        </p>
        <div className="ci-cam-frame">
          <span className="ci-cam-corner ci-cam-tl" aria-hidden />
          <span className="ci-cam-corner ci-cam-tr" aria-hidden />
          <span className="ci-cam-corner ci-cam-bl" aria-hidden />
          <span className="ci-cam-corner ci-cam-br" aria-hidden />
          <FrameGhost />
          <span className="ci-cam-mrz-tag">Rândurile de jos</span>
        </div>
        <ul className="ci-cam-tips">
          <li>Fața CI-ului, drept, tot cardul în dreptunghi</li>
          <li>Lumină din față, fără reflexii pe plastic</li>
          <li>Se văd numele, CNP-ul și cele două rânduri de jos</li>
          {extraTips}
        </ul>
      </div>
      <div className="ci-cam-bar">
        <button type="button" className="ci-cam-cancel" onClick={onClose}>
          Anulează
        </button>
        <button
          type="button"
          className="ci-cam-shutter"
          disabled={snapDisabled}
          onClick={onSnap}
          aria-label="Fotografiază"
        />
        <span className="ci-cam-bar-spacer" aria-hidden />
      </div>
    </div>
  );
}

export function CiCameraGuide({ onShoot, onClose }: GuideProps) {
  return (
    <CameraShell
      onClose={onClose}
      onSnap={onShoot}
      extraTips={<li>Apoi potrivește buletinul ca în dreptunghiul alb</li>}
    />
  );
}

export function CiLiveCamera({ stream, onCapture, onClose }: LiveProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      void video.play().then(() => setReady(true)).catch(() => setReady(true));
    }
    return () => {
      stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const snap = async () => {
    const video = videoRef.current;
    const frame = video?.parentElement?.querySelector(".ci-cam-frame") as HTMLElement | null;
    if (!video || !frame || !ready || busy || !video.videoWidth) return;
    setBusy(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    try {
      const canvas = cropVideoToFrame(video, frame);
      const file = await canvasToFile(canvas);
      stream.getTracks().forEach((t) => t.stop());
      onCapture(file);
    } catch {
      setBusy(false);
    }
  };

  return (
    <CameraShell onClose={onClose} onSnap={() => void snap()} snapDisabled={!ready || busy}>
      <video
        ref={videoRef}
        className="ci-cam-video"
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setReady(true)}
      />
      <div className={"ci-cam-flash" + (flash ? " is-on" : "")} aria-hidden />
    </CameraShell>
  );
}
