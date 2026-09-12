import type { CiOcrResult } from "@/lib/ci-id-ocr";
import { FORM230_CI_OCR_KEY } from "@/lib/ci-session-id";

export function saveCiOcrLocal(data: CiOcrResult): void {
  try {
    sessionStorage.setItem(FORM230_CI_OCR_KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota */
  }
}

export function readCiOcrLocal(): CiOcrResult | null {
  try {
    const raw = sessionStorage.getItem(FORM230_CI_OCR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CiOcrResult;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCiOcrLocal(): void {
  try {
    sessionStorage.removeItem(FORM230_CI_OCR_KEY);
  } catch {
    /* ignore */
  }
}
