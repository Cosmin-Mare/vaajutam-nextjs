import { normalizeCnp, validCNP } from "@/lib/cnp";

export type CiOcrResult = {
  nume?: string;
  prenume?: string;
  cnp?: string;
};

function titleCaseRo(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => {
      if (part === " " || part === "-") return part;
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

function mrzNameToDisplay(raw: string): string {
  return titleCaseRo(raw.replace(/</g, " ").replace(/\s+/g, " ").trim());
}

function pickValidCnp(candidates: string[]): string | undefined {
  for (const c of candidates) {
    const n = normalizeCnp(c);
    if (validCNP(n)) return n;
  }
  return undefined;
}

/** Parse Tesseract / MRZ text from a Romanian ID. Address is ignored (not printed on new cards). */
export function parseRomanianIdText(text: string): CiOcrResult {
  const result: CiOcrResult = {};
  const upper = text.toUpperCase();

  const spaced = text.match(/\b[1-8](?:\s*\d){12}\b/g) ?? [];
  const packed = upper.match(/[1-8]\d{12}/g) ?? [];
  result.cnp = pickValidCnp([...spaced, ...packed]);

  const mrzLines = upper
    .split(/\r?\n/)
    .map((l) => l.replace(/[\s]/g, "").replace(/[«»]/g, "<"))
    .filter((l) => l.includes("<<") || (l.length >= 28 && l.includes("<") && /[A-Z]/.test(l)));

  for (const line of mrzLines) {
    const m = line.match(/^([A-Z]+)<<([A-Z<]+)$/);
    if (m) {
      const nume = mrzNameToDisplay(m[1]!);
      const prenume = mrzNameToDisplay(m[2]!);
      if (nume.length >= 2) result.nume = nume;
      if (prenume.length >= 2) result.prenume = prenume;
      break;
    }
  }

  if (!result.nume) {
    const nm = upper.match(
      /(?:NUME|NOM|LAST\s*NAME|SURNAME)\s*[:/.-]?\s*([A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚ\s-]{1,40})/
    );
    if (nm) result.nume = titleCaseRo(nm[1]!.replace(/\s+/g, " ").trim());
  }
  if (!result.prenume) {
    const pn = upper.match(
      /(?:PRENUME|PRENOM|FIRST\s*NAME|GIVEN\s*NAMES?)\s*[:/.-]?\s*([A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚ\s-]{1,50})/
    );
    if (pn) result.prenume = titleCaseRo(pn[1]!.replace(/\s+/g, " ").trim());
  }

  return result;
}
