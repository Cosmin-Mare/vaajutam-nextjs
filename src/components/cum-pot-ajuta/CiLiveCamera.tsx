"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CiKind } from "@/lib/ci-id-ocr";

type LiveProps = {
  stream: MediaStream;
  kind: CiKind;
  onCapture: (file: File) => void;
  onClose: () => void;
};

type GuideProps = {
  kind: CiKind;
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
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } } },
    { audio: false, video: { facingMode: { ideal: "environment" } } },
    { audio: false, video: { facingMode: "environment" } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      await bumpTrackResolution(stream);
      return stream;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("no-camera");
}

async function bumpTrackResolution(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track?.applyConstraints) return;
  const caps = track.getCapabilities?.() as
    | { width?: { max?: number }; height?: { max?: number } }
    | undefined;
  const widthIdeal = Math.min(caps?.width?.max ?? 1920, 3840);
  const heightIdeal = Math.min(caps?.height?.max ?? 1080, 2160);
  try {
    await track.applyConstraints({
      width: { ideal: widthIdeal },
      height: { ideal: heightIdeal },
    });
  } catch {
    try {
      await track.applyConstraints({ width: { ideal: 1920 } });
    } catch {
      /* keep whatever the stream already is */
    }
  }
}

function FrameGhost({ kind }: { kind: CiKind }) {
  if (kind === "old") {
    return (
      <svg className="ci-cam-ghost" viewBox="0 0 220 138" aria-hidden="true">
        <rect x="8" y="10" width="52" height="64" rx="6" />
        <circle cx="34" cy="34" r="12" />
        <rect x="72" y="16" width="132" height="8" rx="4" />
        <rect x="72" y="32" width="108" height="8" rx="4" />
        <rect x="72" y="48" width="88" height="8" rx="4" />
        <rect className="ci-cam-ghost-mrz" x="8" y="96" width="204" height="7" rx="2" />
        <rect className="ci-cam-ghost-mrz" x="8" y="110" width="204" height="7" rx="2" />
      </svg>
    );
  }
  return (
    <svg className="ci-cam-ghost" viewBox="0 0 220 138" aria-hidden="true">
      <rect x="8" y="10" width="52" height="64" rx="6" />
      <circle cx="34" cy="34" r="12" />
      <rect className="ci-cam-ghost-cnp" x="72" y="14" width="96" height="8" rx="4" />
      <rect x="72" y="32" width="132" height="8" rx="4" />
      <rect x="72" y="48" width="118" height="8" rx="4" />
      <rect x="72" y="64" width="108" height="8" rx="4" />
    </svg>
  );
}

function overlayCrop(
  sourceW: number,
  sourceH: number,
  video: HTMLVideoElement,
  frame: HTMLElement
): { sx: number; sy: number; sw: number; sh: number } {
  const mappedW = video.videoWidth || sourceW;
  const mappedH = video.videoHeight || sourceH;
  const vRect = video.getBoundingClientRect();
  const oRect = frame.getBoundingClientRect();
  const cover = Math.max(vRect.width / mappedW, vRect.height / mappedH);
  const dispW = mappedW * cover;
  const dispH = mappedH * cover;
  const offX = (vRect.width - dispW) / 2;
  const offY = (vRect.height - dispH) / 2;
  const pad = 0.1;
  let sx = (oRect.left - vRect.left - offX) / cover;
  let sy = (oRect.top - vRect.top - offY) / cover;
  let sw = oRect.width / cover;
  let sh = oRect.height / cover;
  sx -= sw * pad;
  sy -= sh * pad;
  sw += sw * pad * 2;
  sh += sh * pad * 2;
  const scaleX = sourceW / mappedW;
  const scaleY = sourceH / mappedH;
  sx *= scaleX;
  sy *= scaleY;
  sw *= scaleX;
  sh *= scaleY;
  sx = Math.max(0, sx);
  sy = Math.max(0, sy);
  sw = Math.min(sourceW - sx, sw);
  sh = Math.min(sourceH - sy, sh);
  return { sx, sy, sw, sh };
}

function drawCrop(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  video: HTMLVideoElement,
  frame: HTMLElement
): HTMLCanvasElement {
  const { sx, sy, sw, sh } = overlayCrop(sourceW, sourceH, video, frame);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
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
      0.95
    );
  });
}

type ImageCaptureLike = { takePhoto: () => Promise<Blob> };

async function stillFromTrack(track: MediaStreamTrack): Promise<ImageBitmap | null> {
  const Ctor = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => ImageCaptureLike })
    .ImageCapture;
  if (!Ctor) return null;
  try {
    const blob = await new Ctor(track).takePhoto();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function CameraShell({
  kind,
  onClose,
  onSnap,
  snapDisabled,
  extraTips,
  children,
}: {
  kind: CiKind;
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
          {kind === "old" ? "Așază buletinul vechi în cadru" : "Așază CI-ul nou în cadru"}
        </p>
        <div className="ci-cam-frame">
          <span className="ci-cam-corner ci-cam-tl" aria-hidden />
          <span className="ci-cam-corner ci-cam-tr" aria-hidden />
          <span className="ci-cam-corner ci-cam-bl" aria-hidden />
          <span className="ci-cam-corner ci-cam-br" aria-hidden />
          <FrameGhost kind={kind} />
          {kind === "new" ? <span className="ci-cam-data-tag">Nume · CNP</span> : null}
          {kind === "old" ? <span className="ci-cam-mrz-tag">Rândurile de jos</span> : null}
        </div>
        <ul className="ci-cam-tips">
          {kind === "old" ? (
            <>
              <li>Fața cu fotografia, tot cardul în dreptunghi</li>
              <li>Se văd numele, CNP-ul și cele două rânduri de jos</li>
              <li>Lumină din față, fără reflexii pe plastic</li>
            </>
          ) : (
            <>
              <li>Fața cu fotografia, tot cardul în dreptunghi</li>
              <li>Numele, prenumele și CNP-ul se citesc în dreapta</li>
              <li>Fără reflexii pe plastic — nu e nevoie de spate</li>
            </>
          )}
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

export function CiCameraGuide({ kind, onShoot, onClose }: GuideProps) {
  return (
    <CameraShell
      kind={kind}
      onClose={onClose}
      onSnap={onShoot}
      extraTips={<li>Apoi potrivește buletinul ca în dreptunghiul alb</li>}
    />
  );
}

export function CiLiveCamera({ stream, kind, onCapture, onClose }: LiveProps) {
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
    const track = stream.getVideoTracks()[0];
    if (!video || !frame || !ready || busy || !video.videoWidth) return;
    setBusy(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);
    try {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        if ("requestVideoFrameCallback" in video) {
          (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(
            done
          );
        } else {
          requestAnimationFrame(() => requestAnimationFrame(() => done()));
        }
      });
      const still = track ? await stillFromTrack(track) : null;
      const canvas = still
        ? drawCrop(still, still.width, still.height, video, frame)
        : drawCrop(video, video.videoWidth, video.videoHeight, video, frame);
      still?.close();
      const file = await canvasToFile(canvas);
      stream.getTracks().forEach((t) => t.stop());
      onCapture(file);
    } catch {
      setBusy(false);
    }
  };

  return (
    <CameraShell kind={kind} onClose={onClose} onSnap={() => void snap()} snapDisabled={!ready || busy}>
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
