/** Firebase Storage objects for this project. Downloads are billed as Cloud Storage egress. */
const STORAGE_BUCKET = "vaajutamdindej-92a2d.firebasestorage.app";

const FIREBASE_DOWNLOAD =
  /^\/v0\/b\/([^/]+)\/o\/(.+)$/;

/**
 * Rewrite a Firebase download URL to a same-origin path.
 * The site CDN caches that path, so visitors do not each pull the file from Storage.
 * Non-Firebase URLs (local `/images/...`) are returned unchanged.
 */
export function cachedMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== "firebasestorage.googleapis.com") return url;
  const match = FIREBASE_DOWNLOAD.exec(parsed.pathname);
  if (!match) return url;
  const bucket = decodeURIComponent(match[1]);
  if (bucket !== STORAGE_BUCKET) return url;
  let objectName = "";
  try {
    objectName = decodeURIComponent(match[2]);
  } catch {
    return url;
  }
  if (!isSafeObjectName(objectName)) return url;
  const encoded = objectName.split("/").map(encodeURIComponent).join("/");
  return `/api/media/${encoded}`;
}

export function isSafeObjectName(objectName: string): boolean {
  if (!objectName || objectName.length > 512) return false;
  if (objectName.startsWith("/") || objectName.includes("\\") || objectName.includes("\0")) return false;
  const parts = objectName.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) return false;
  return true;
}

export function firebaseDownloadUrl(objectName: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(objectName)}?alt=media`;
}
