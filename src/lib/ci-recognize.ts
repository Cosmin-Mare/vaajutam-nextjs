import { parseRomanianIdText, type CiOcrResult } from "@/lib/ci-id-ocr";

async function downscaleForOcr(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const maxW = 1600;
  const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas;
}

/** Client-only: Tesseract reads the image in the browser. The photo is not uploaded. */
export async function recognizeCiImage(file: File | HTMLCanvasElement): Promise<CiOcrResult> {
  const source = file instanceof File ? await downscaleForOcr(file).catch(() => file) : file;
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(source);
    return parseRomanianIdText(text);
  } finally {
    await worker.terminate();
  }
}

export function ciOcrHasAnyField(data: CiOcrResult): boolean {
  return Boolean(data.cnp || data.nume || data.prenume);
}
