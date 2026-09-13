import {
  mergeCiOcr,
  ocrResultScore,
  parseRomanianIdText,
  type CiKind,
  type CiOcrResult,
} from "@/lib/ci-id-ocr";

export function isCiPhotoFile(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t.startsWith("image/")) return true;
  if (t && t !== "application/octet-stream") return false;
  return /\.(heic|heif|jpe?g|png|webp|gif|bmp)$/i.test(file.name);
}

function looksLikeHeic(file: File): boolean {
  const t = file.type.toLowerCase();
  return t === "image/heic" || t === "image/heif" || /\.hei[cf]$/i.test(file.name);
}

async function bitmapFromImg(file: File): Promise<ImageBitmap> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("img"));
      img.src = url;
    });
    if (img.decode) await img.decode().catch(() => undefined);
    return createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodePhotoBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    /* some browsers reject the orientation option */
  }
  try {
    return await createImageBitmap(file);
  } catch {
    /* Safari often decodes HEIC via <img> */
  }
  try {
    return await bitmapFromImg(file);
  } catch {
    /* wasm fallback */
  }
  const { heicTo, isHeic } = await import("heic-to");
  if (looksLikeHeic(file) || (await isHeic(file))) {
    return heicTo({ blob: file, type: "bitmap" });
  }
  throw new Error("unsupported-image");
}

async function bitmapToJpegFile(bitmap: ImageBitmap): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.9);
  });
  return new File([blob], "ci.jpg", { type: "image/jpeg" });
}

/** HEIC/HEIF (iPhone) → JPEG so preview and Tesseract can read it. */
export async function prepareCiPhoto(file: File): Promise<File> {
  if (file.type.startsWith("image/") && !looksLikeHeic(file)) return file;
  const bitmap = await decodePhotoBitmap(file);
  try {
    return await bitmapToJpegFile(bitmap);
  } finally {
    bitmap.close();
  }
}

async function downscaleForOcr(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await decodePhotoBitmap(file);
  const maxW = 2400;
  const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d");
  if (!sctx) throw new Error("canvas");
  sctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const box = cardBounds(sctx, w, h);
  const canvas = document.createElement("canvas");
  canvas.width = box.w;
  canvas.height = box.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  const img = ctx.getImageData(0, 0, box.w, box.h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    /* min-channel: red CNP and black print both stay dark on white */
    const dark = Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
    const v = Math.max(0, Math.min(255, (dark - 128) * 1.35 + 128));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function rotateCanvas(src: HTMLCanvasElement, deg: 90 | 180 | 270): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  if (deg === 90 || deg === 270) {
    dst.width = src.height;
    dst.height = src.width;
  } else {
    dst.width = src.width;
    dst.height = src.height;
  }
  const ctx = dst.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.translate(dst.width / 2, dst.height / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return dst;
}

function ocrOrientations(base: HTMLCanvasElement): HTMLCanvasElement[] {
  if (base.height > base.width * 1.08) {
    return [rotateCanvas(base, 90), rotateCanvas(base, 270)];
  }
  return [base];
}

function mrzStrip(src: HTMLCanvasElement): HTMLCanvasElement {
  const h = Math.max(24, Math.round(src.height * 0.24));
  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = h;
  const ctx = dst.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(src, 0, src.height - h, src.width, h, 0, 0, src.width, h);
  return dst;
}

/** Right-hand visual zone: names + CNP on both old laminated and new eID fronts. */
function visualDataBand(src: HTMLCanvasElement): HTMLCanvasElement {
  const x = Math.round(src.width * 0.26);
  const y = Math.round(src.height * 0.06);
  const w = Math.max(1, src.width - x - Math.round(src.width * 0.03));
  const h = Math.max(1, Math.round(src.height * 0.58));
  const dst = document.createElement("canvas");
  dst.width = w;
  dst.height = h;
  const ctx = dst.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
  return dst;
}

function considerParse(
  current: { result: CiOcrResult; text: string; canvas: HTMLCanvasElement; score: number },
  extraText: string,
  kind?: CiKind
): { result: CiOcrResult; text: string; canvas: HTMLCanvasElement; score: number } {
  const extra = parseRomanianIdText(extraText, kind);
  const comboText = `${current.text}\n${extraText}`;
  const combo = parseRomanianIdText(comboText, kind);
  const filled = mergeCiOcr(current.result, extra);
  const comboScore = ocrResultScore(combo, comboText, kind);
  const filledScore = ocrResultScore(filled, comboText, kind);
  if (comboScore > current.score && comboScore >= filledScore) {
    return { result: combo, text: comboText, canvas: current.canvas, score: comboScore };
  }
  if (filledScore > current.score) {
    return { result: filled, text: comboText, canvas: current.canvas, score: filledScore };
  }
  return current;
}

function cardBounds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): { x: number; y: number; w: number; h: number } {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let hits = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i]!;
      const g = d[i + 1]!;
      const b = d[i + 2]!;
      const grey = 0.299 * r + 0.587 * g + 0.114 * b;
      if (grey > 165 && r - b < 42) {
        hits++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  const area = (bw * bh) / (w * h);
  if (hits < 400 || area < 0.12 || area > 0.92 || bw < 80 || bh < 50) {
    return { x: 0, y: 0, w, h };
  }
  const padX = Math.round(bw * 0.04);
  const padY = Math.round(bh * 0.06);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  return {
    x,
    y,
    w: Math.min(w - x, bw + padX * 2),
    h: Math.min(h - y, bh + padY * 2),
  };
}

/** Client-only: Tesseract reads the image in the browser. The photo is not uploaded. */
export async function recognizeCiImage(
  file: File | HTMLCanvasElement,
  kind?: CiKind
): Promise<CiOcrResult> {
  const source = file instanceof File ? await downscaleForOcr(file) : file;
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
    let best: { result: CiOcrResult; text: string; canvas: HTMLCanvasElement; score: number } | null =
      null;
    for (const canvas of ocrOrientations(source)) {
      const {
        data: { text },
      } = await worker.recognize(canvas);
      const result = parseRomanianIdText(text, kind);
      const score = ocrResultScore(result, text, kind);
      if (!best || score > best.score) best = { result, text, canvas, score };
    }
    if (best && best.score < 10 && source.width >= source.height) {
      const flipped = rotateCanvas(source, 180);
      const {
        data: { text },
      } = await worker.recognize(flipped);
      const result = parseRomanianIdText(text, kind);
      const score = ocrResultScore(result, text, kind);
      if (score > best.score) best = { result, text, canvas: flipped, score };
    }
    if (best) {
      if (kind !== "new") {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        const {
          data: { text: mrzText },
        } = await worker.recognize(mrzStrip(best.canvas));
        best = considerParse(best, mrzText, kind);
      }
      if (!best.result.nume || !best.result.prenume || !best.result.cnp) {
        await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
        const {
          data: { text: bandText },
        } = await worker.recognize(visualDataBand(best.canvas));
        best = considerParse(best, bandText, kind);
      }
      return best.result;
    }
    return {};
  } finally {
    await worker.terminate();
  }
}

export function ciOcrHasAnyField(data: CiOcrResult): boolean {
  return Boolean(data.cnp || data.nume || data.prenume);
}

export function ciOcrComplete(data: CiOcrResult): boolean {
  return Boolean(data.nume && data.prenume && data.cnp);
}

export function ciOcrMissing(data: CiOcrResult): string[] {
  const missing: string[] = [];
  if (!data.nume) missing.push("Nume");
  if (!data.prenume) missing.push("Prenume");
  if (!data.cnp) missing.push("CNP");
  return missing;
}

export function ciOcrWarning(data: CiOcrResult, kind?: CiKind): string | null {
  const miss: string[] = [];
  if (!data.nume) miss.push("numele");
  if (!data.prenume) miss.push("prenumele");
  if (!data.cnp) miss.push("CNP-ul");
  if (!miss.length) return null;
  if (miss.length === 3) {
    return "Nu am recunoscut buletinul. Așază-l complet în cadru, pe lumină, fără reflexii, și fotografiază din nou.";
  }
  const list =
    miss.length === 1 ? miss[0]! : miss.length === 2 ? `${miss[0]} și ${miss[1]}` : `${miss[0]}, ${miss[1]} și ${miss[2]}`;
  if (kind === "old") {
    return `Nu am citit ${list}. Ține buletinul vechi drept în cadru, cu numele, CNP-ul și cele două rânduri de jos vizibile.`;
  }
  if (kind === "new") {
    return `Nu am citit ${list}. Ține CI-ul nou drept în cadru, cu numele și CNP-ul vizibile pe față (coloana din dreapta).`;
  }
  return `Nu am citit ${list}. Ține buletinul drept în cadru, cu numele și CNP-ul vizibile (la CI-ul vechi și rândurile de jos), și încearcă din nou.`;
}
