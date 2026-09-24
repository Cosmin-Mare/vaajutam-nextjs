/** Narrow / touch layouts where Form 230 should prefer native camera & step UI. */
export function prefersForm230MobileUi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(max-width: 720px)").matches ||
      window.matchMedia("(pointer: coarse)").matches
    );
  } catch {
    return window.innerWidth <= 720;
  }
}

/** Live getUserMedia overlays are fragile on phones; native capture is more reliable. */
export function preferNativeCiCapture(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(max-width: 720px)").matches) return true;
    if (window.matchMedia("(pointer: coarse)").matches) return true;
  } catch {
    if (window.innerWidth <= 720) return true;
  }
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android/i.test(ua);
}
