/** Narrow layout where Form 230 should use the one-step wizard UI. */
export function prefersForm230MobileUi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Width only — do not use (pointer: coarse); that hides desktop QR on touch laptops /
    // automation environments that report a coarse pointer at any width.
    return window.matchMedia("(max-width: 720px)").matches;
  } catch {
    return window.innerWidth <= 720;
  }
}

/** Live getUserMedia overlays are fragile on phones; native capture is more reliable. */
export function preferNativeCiCapture(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(max-width: 720px)").matches) return true;
  } catch {
    if (window.innerWidth <= 720) return true;
  }
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}
