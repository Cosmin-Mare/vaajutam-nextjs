import { normalizeCnp, validCNP } from "@/lib/cnp";

export type CiOcrResult = {
  nume?: string;
  prenume?: string;
  cnp?: string;
};

const HEADER =
  /\b(?:ROMANIA|ROMÂNIA|ROUMANIE|CARTE DE IDENTITATE|IDENTITY CARD|IDENTITE)\b/i;

const LABELISH =
  /\b(?:NUME|PRENUME|SURNAME|GIVEN\s*NAMES?|LAST\s*NAMES?|FIRST\s*NAMES?|NOM|PRENOM|NAMES?)\b/i;

const STOP =
  /^(?:SEX|CETATENIE|NATIONALITY|CNP|PIN|DATA|DATE|NASTERE|BIRTH|EXPIR|DOCUMENT|SERIA|SERIES|NR|NO|ROU|M|F|SEMNATURA|SIGNATURE|HOLDER|IDENTITATE|CARTE|CARD)$/i;

const PLACEISH =
  /\b(?:STR|JUD|MUN|NR|CARD|IDENTITY|CARTE|IDENTITE|SPCLEP|DEJ|CLUJ|BISTR|DOMICILIU|ADRESSE|ADDRESS|ROUMANIE|ROMANIA|VALIDITE|VALIDITY|EMISA|ISSUED)\b/i;

const BILINGUAL_PREFIX =
  /^(?:SURNAME|GIVEN\s*NAMES?|LAST\s*NAMES?|FIRST\s*NAMES?|NOM|PRENOM)\s+/i;

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

function repairMrzChevrons(compact: string): string {
  let s = compact;
  for (let n = 0; n < 8; n++) {
    const next = s
      .replace(/K</g, "<<")
      .replace(/<K/g, "<<")
      .replace(/KK+/g, (run) => "<".repeat(run.length));
    if (next === s) break;
    s = next;
  }
  return s;
}

function isMrzNameToken(p: string): boolean {
  if (p.length < 2 || p.length > 14) return false;
  if (/^[LKC]+$/.test(p)) return false;
  const ells = (p.match(/L/g) ?? []).length;
  if (p.length >= 4 && ells / p.length >= 0.5) return false;
  if (!/[AEIOUĂÂÎ]/.test(p)) return false;
  return true;
}

const GIVEN_SECONDS = [
  "ALEXANDRA",
  "ALEXANDRU",
  "CONSTANTIN",
  "GABRIELA",
  "ANDREEA",
  "CRISTIAN",
  "GABRIEL",
  "ANDREI",
  "IOANA",
  "IULIA",
  "ELENA",
  "MARIA",
  "MIHAI",
  "TUDOR",
  "IOAN",
];

function expandMashedGiven(tokens: string[]): string[] {
  if (tokens.length !== 1) return tokens;
  const p = tokens[0]!;
  for (const sec of GIVEN_SECONDS) {
    if (!p.endsWith(sec) || p.length < sec.length + 3) continue;
    let first = p
      .slice(0, -sec.length)
      .replace(/K$/, "")
      .replace(/^S(?=L[AEIOU])/, "");
    if (isMrzNameToken(first)) return [first, sec];
  }
  return tokens;
}

function mrzNameToDisplay(raw: string, hyphenate: boolean): string {
  let parts = raw
    .replace(/<+$/g, "")
    .split(/<+/)
    .map((p) => p.trim().replace(/^S(?=L[AEIOU])/, ""))
    .filter(isMrzNameToken);
  if (hyphenate) parts = expandMashedGiven(parts).slice(0, 3);
  else parts = parts.slice(0, 2);
  const joined = parts.join(hyphenate ? "-" : " ");
  return titleCaseRo(joined.replace(/\s+/g, " ").trim());
}

function pickValidCnp(candidates: string[]): string | undefined {
  for (const c of candidates) {
    const n = normalizeCnp(c);
    if (plausibleCnp(n)) return n;
  }
  return undefined;
}

function plausibleCnp(cnp: string): boolean {
  if (!validCNP(cnp)) return false;
  const mm = parseInt(cnp.slice(3, 5), 10);
  const dd = parseInt(cnp.slice(5, 7), 10);
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31;
}

function allDigitCnps(text: string): string[] {
  const digits = text.replace(/\D/g, "");
  const found: string[] = [];
  const birth = mrzBirthDate(text);
  for (let i = 0; i <= digits.length - 13; i++) {
    const slice = digits.slice(i, i + 13);
    if (!slice[0] || !"12345678".includes(slice[0])) continue;
    if (birth && slice.slice(1, 7) !== birth) continue;
    if (plausibleCnp(slice)) found.push(slice);
  }
  return found;
}

function mrzBirthDate(text: string): string | undefined {
  const compact = compactMrz(text).replace(/R[O0]+U/g, "ROU");
  const m = compact.match(/ROU([O0-9]{6})[O0-9][MF]/i);
  if (!m) return undefined;
  const birth = m[1]!.replace(/O/g, "0");
  const mm = parseInt(birth.slice(2, 4), 10);
  const dd = parseInt(birth.slice(4, 6), 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return birth;
}

function compactMrz(text: string): string {
  return text
    .toUpperCase()
    .replace(/1DROU/g, "IDROU")
    .replace(/[\s]/g, "")
    .replace(/[«»]/g, "<");
}

function parseMrzNames(text: string): { nume?: string; prenume?: string } {
  const lines = text.split(/\r?\n/).map((l) => repairMrzChevrons(compactMrz(l)));
  for (const line of lines) {
    const m = line.match(/(?:ID|I<)ROU([A-Z]+)<<([A-Z<]+)/);
    if (!m) continue;
    const nume = mrzNameToDisplay(m[1]!, false);
    const prenume = mrzNameToDisplay(m[2]!, true);
    const out: { nume?: string; prenume?: string } = {};
    if (nume.length >= 2) out.nume = nume;
    if (prenume.length >= 2) out.prenume = prenume;
    if (out.nume || out.prenume) return out;
  }
  return {};
}

/** TD2 line 2: optional field is CNP[0] + CNP[7..12] and birth is YYMMDD. */
function parseMrzCnp(text: string): string | undefined {
  const compact = compactMrz(text).replace(/R[O0]+U/g, "ROU");
  const m = compact.match(/ROU([O0-9]{6})[O0-9][MF][O0-9]{6}[O0-9]([O0-9]{7})/i);
  if (!m) return undefined;
  const birth = m[1]!.replace(/O/g, "0");
  const optional = m[2]!.replace(/O/g, "0");
  const cnp = `${optional[0]}${birth}${optional.slice(1)}`;
  return plausibleCnp(cnp) ? cnp : undefined;
}

function normalizeHyphen(s: string): string {
  return s.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

function cleanNameCandidate(raw: string): string | null {
  let t = raw.toUpperCase().replace(/[0-9]/g, " ").replace(/[^A-ZĂÂÎȘȚ -]/g, " ");
  t = normalizeHyphen(t.replace(BILINGUAL_PREFIX, ""));
  while (/\s[A-ZĂÂÎȘȚ]$/.test(t)) t = t.slice(0, -2).trim();
  if (t.length < 2 || t.length > 40) return null;
  if (STOP.test(t) || HEADER.test(t) || LABELISH.test(t) || PLACEISH.test(t)) return null;
  const tokens = t.split(/[ -]/).filter(Boolean).filter((tok) => tok.length >= 3);
  if (!tokens.length) return null;
  if (tokens.some((tok) => /[WQ]/i.test(tok))) return null;
  if (tokens.some((tok) => STOP.test(tok) || PLACEISH.test(tok))) return null;
  t = tokens.join(t.includes("-") && tokens.length <= 2 ? "-" : " ");
  if (raw.includes("-") && tokens.length === 2) t = `${tokens[0]}-${tokens[1]}`;
  if (!/^[A-ZĂÂÎȘȚ]+(?:[ -][A-ZĂÂÎȘȚ]+)*$/.test(t)) return null;
  return titleCaseRo(t);
}

function lineLooksLikeCnp(line: string): boolean {
  return /[1-8](?:\s*\d){12}/.test(line);
}

function letterCount(name: string): number {
  return name.replace(/[^A-Za-zĂÂÎȘȚăâîșț]/g, "").length;
}

function looksLikeMrzLine(line: string): boolean {
  const u = line.toUpperCase().replace(/\s/g, "");
  if (/(?:ID|I<)ROU/.test(u)) return true;
  if (u.length >= 22 && (u.includes("<") || (u.match(/K/g)?.length ?? 0) >= 3)) return true;
  return false;
}

function nameScore(name: string): number {
  const tokens = name.split(/[ -]/).filter(Boolean);
  if (tokens.length > 3) return -20;
  const n = letterCount(name);
  let score = n;
  if (name.includes("-")) score += 4;
  if (/\s/.test(name)) score += 2;
  if (n <= 3) score -= 10;
  if (n > 12 && !name.includes("-") && !/\s/.test(name)) score -= 8;
  if (tokens.some((t) => t.length <= 2) && tokens.length > 1) score -= 6;
  return score;
}

function pickBestNames(
  cands: { name: string; index: number; score: number }[]
): { nume?: string; prenume?: string } {
  if (!cands.length) return {};
  const ranked = [...cands].sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = ranked.filter((c) => c.score > 0).slice(0, 2);
  if (chosen.length < 2 && ranked[0] && ranked[0].score > 0) {
    return { nume: ranked[0].name };
  }
  if (chosen.length < 2) return {};
  chosen.sort((a, b) => a.index - b.index);
  return { nume: chosen[0]!.name, prenume: chosen[1]!.name };
}

function findAfterLabel(lines: string[], label: RegExp): string | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(label);
    if (!m) continue;
    const rest = line.slice(m[0].length).replace(/^[\s:/.-]+/, "").replace(BILINGUAL_PREFIX, "");
    const restName = cleanNameCandidate(rest);
    if (restName && nameScore(restName) > 0) return restName;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = lines[j]!;
      if (lineLooksLikeCnp(next) || STOP.test(next.trim()) || PLACEISH.test(next)) break;
      if (LABELISH.test(next) && !cleanNameCandidate(next.replace(LABELISH, ""))) continue;
      const value = cleanNameCandidate(next);
      if (value && nameScore(value) > 0) return value;
    }
  }
  return undefined;
}

function harvestNames(lines: string[]): { nume?: string; prenume?: string } {
  const headerAt = lines.findIndex((l) => HEADER.test(l));
  const cnpAt = lines.findIndex(lineLooksLikeCnp);
  const from = headerAt >= 0 ? headerAt + 1 : 0;
  const to = cnpAt >= 0 ? cnpAt : lines.length;
  const cands: { name: string; index: number; score: number }[] = [];
  for (let i = from; i < to; i++) {
    const line = lines[i]!;
    if (LABELISH.test(line) || HEADER.test(line) || PLACEISH.test(line) || looksLikeMrzLine(line)) continue;
    const name = cleanNameCandidate(line);
    if (!name) continue;
    cands.push({ name, index: i, score: nameScore(name) });
  }
  return pickBestNames(cands);
}

export function ocrResultScore(result: CiOcrResult, text: string): number {
  let s = 0;
  if (result.cnp) s += 10;
  if (result.nume) s += Math.max(0, Math.min(8, nameScore(result.nume)));
  if (result.prenume) s += Math.max(0, Math.min(10, nameScore(result.prenume)));
  const u = repairMrzChevrons(text.toUpperCase().replace(/\s/g, ""));
  if (/(?:ID|I<)ROU[A-Z]+<</.test(u)) s += 6;
  return s;
}

/** Parse Tesseract / MRZ text from a Romanian ID. Address is ignored on the new electronic CI. */
export function parseRomanianIdText(text: string): CiOcrResult {
  const result: CiOcrResult = {};
  const upper = text.toUpperCase();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[«»]/g, "<").trim())
    .filter(Boolean);

  const spaced = text.match(/\b[1-8](?:\s*\d){12}\b/g) ?? [];
  const packed = upper.match(/(?<!\d)[1-8]\d{12}(?!\d)/g) ?? [];
  result.cnp = pickValidCnp([
    ...spaced,
    ...packed,
    parseMrzCnp(text) ?? "",
    ...allDigitCnps(text),
  ]);

  const mrz = parseMrzNames(text);
  const labeledNume = findAfterLabel(lines, /^(?:NUME|NOM|LAST\s*NAME)\b\s*[:/.-]?\s*/i);
  const labeledPrenume = findAfterLabel(
    lines,
    /^(?:PRENUME|PRENOM|FIRST\s*NAME|GIVEN\s*NAMES?)\b\s*[:/.-]?\s*/i
  );
  const harvested = harvestNames(lines);
  if (mrzNamesTrustworthy(mrz)) {
    result.nume = mrz.nume;
    result.prenume = mrz.prenume;
  } else if (harvested.nume && harvested.prenume) {
    result.nume = harvested.nume;
    result.prenume = harvested.prenume;
  } else {
    result.nume = pickBestString([mrz.nume, harvested.nume, labeledNume]);
    result.prenume = pickBestString([mrz.prenume, harvested.prenume, labeledPrenume]);
  }

  return result;
}

function mrzNamesTrustworthy(mrz: { nume?: string; prenume?: string }): boolean {
  if (!mrz.nume || !mrz.prenume) return false;
  if (nameScore(mrz.nume) <= 0 || nameScore(mrz.prenume) <= 0) return false;
  if (!mrz.prenume.includes("-") && letterCount(mrz.prenume) > 12) return false;
  return true;
}

function pickBestString(cands: (string | undefined)[]): string | undefined {
  let best: string | undefined;
  let bestScore = 0;
  for (const c of cands) {
    if (!c) continue;
    const s = nameScore(c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
