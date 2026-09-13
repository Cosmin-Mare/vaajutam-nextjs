import { normalizeCnp, stripDiacritics, validCNP } from "@/lib/cnp";

export type CiOcrResult = {
  nume?: string;
  prenume?: string;
  cnp?: string;
};

/** New polycarbonate eID (2021+) vs old laminated CI with MRZ on the front. */
export type CiKind = "new" | "old";

export function isCiKind(value: unknown): value is CiKind {
  return value === "new" || value === "old";
}

const HEADER =
  /\b(?:ROMANIA|ROMÂNIA|ROUMANIE|CARTE DE IDENTITATE|CARTE D['’]?IDENTITE|IDENTITY CARD|IDENTITE)\b/i;

const LABELISH =
  /\b(?:NUME|PRENUME|SURNAME|SUMAME|SURNANE|GIVEN\s*NAMES?|LAST\s*NAMES?|FIRST\s*NAMES?|NOM|PRENOM|NAMES?)\b/i;

const STOP =
  /^(?:SEX|SEXE|SEXUL|CETATENIE|NATIONALITY|NATIONALITE|CNP|PIN|DATA|DATE|NASTERE|BIRTH|EXPIR|DOCUMENT|SERIA|SERIES|NR|NO|ROU|M|F|SEMNATURA|SIGNATURE|HOLDER|IDENTITATE|CARTE|CARD|ROMANA|ROMANIAN|ROUMAIN|ROUMAINE)$/i;

const PLACEISH =
  /\b(?:STR|JUD|MUN|NR|CARD|IDENTITY|CARTE|IDENTITE|SPCLEP|DEJ|CLUJ|BISTR|DOMICILIU|ADRESSE|ADDRESS|ROUMANIE|ROMANIA|VALIDITE|VALIDITY|EMISA|ISSUED|ROMANA|ROMANIAN|ROUMAIN|ROUMAINE|NATIONALITE|NATIONALITY|CETATENIE|EMOTION|EXPIRY|HOLDER|SIGNATURE|DOCUMENT)\b/i;

const BILINGUAL_PREFIX =
  /^(?:SURNAME|GIVEN\s*NAMES?|LAST\s*NAMES?|FIRST\s*NAMES?|NOM|PRENOM)\s+/i;

const NUME_LABEL =
  /^(?:[\d.•\-\s]+)?(?:NUME|NOM|LAST\s*NAME|SURNAME)\b\s*(?:\/\s*(?:NOM|SURNAME|LAST\s*NAME)\b\s*)*[:/.-]?\s*/i;

const PRENUME_LABEL =
  /(?:^|[\s/:|-])(?:PRENUME|PRENOM|FIRST\s*NAME|GIVEN\s*NAMES?)\b\s*(?:\/\s*(?:PRENOM|FIRST\s*NAME|GIVEN\s*NAMES?)\b\s*)*[:/.-]?\s*/i;

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
    const first = p
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

function namesFromMrzParts(surname: string, given: string): { nume?: string; prenume?: string } {
  const nume = mrzNameToDisplay(surname, false);
  const prenume = mrzNameToDisplay(given, true);
  const out: { nume?: string; prenume?: string } = {};
  if (nume.length >= 2) out.nume = nume;
  if (prenume.length >= 2) out.prenume = prenume;
  return out;
}

/** Old laminated front: TD2 `IDROU SURNAME<<GIVEN`. New eID back: TD1 name line `SURNAME<<GIVEN<<<`. */
function parseMrzNames(text: string): { nume?: string; prenume?: string } {
  const lines = text.split(/\r?\n/).map((l) => repairMrzChevrons(compactMrz(l)));
  let td1: { nume?: string; prenume?: string } = {};
  for (const line of lines) {
    const td2 = line.match(/(?:ID|I<)ROU([A-Z]+)<<([A-Z<]+)/);
    if (td2) {
      const out = namesFromMrzParts(td2[1]!, td2[2]!);
      if (out.nume || out.prenume) return out;
    }
    if (/^(?:I<|P<)/.test(line)) continue;
    if (line.length < 16 || line.length > 40) continue;
    if (!/^[A-Z<]+$/.test(line) || !line.includes("<<")) continue;
    const fillers = (line.match(/</g) ?? []).length;
    if (fillers < 2) continue;
    const td1m = line.match(/^([A-Z]{2,20})<<([A-Z<]{2,})$/);
    if (!td1m || /^(?:ID|I|P)$/.test(td1m[1]!)) continue;
    const out = namesFromMrzParts(td1m[1]!, td1m[2]!);
    if (out.nume || out.prenume) td1 = out;
  }
  return td1;
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

function stripLabelJunk(s: string): string {
  let t = s.replace(/^[\s:/.|-]+/, "");
  for (let n = 0; n < 6; n++) {
    const next = t
      .replace(
        /^(?:NUME|PRENUME|NOM|PRENOM|SURNAME|GIVEN\s*NAMES?|LAST\s*NAMES?|FIRST\s*NAMES?)\s*/i,
        ""
      )
      .replace(/^[/:|.-]+\s*/, "");
    if (next === t) break;
    t = next;
  }
  return t.replace(BILINGUAL_PREFIX, "").trim();
}

function cleanNameCandidate(raw: string): string | null {
  let t = raw.toUpperCase().replace(/[0-9]/g, " ").replace(/[^A-ZĂÂÎȘȚ -]/g, " ");
  t = normalizeHyphen(t.replace(BILINGUAL_PREFIX, ""));
  while (/\s[A-ZĂÂÎȘȚ]$/.test(t)) t = t.slice(0, -2).trim();
  if (t.length < 2 || t.length > 40) return null;
  const ascii = stripDiacritics(t);
  if (STOP.test(t) || STOP.test(ascii) || HEADER.test(t) || LABELISH.test(t) || PLACEISH.test(t) || PLACEISH.test(ascii)) {
    return null;
  }
  const tokens = t.split(/[ -]/).filter(Boolean).filter((tok) => tok.length >= 3);
  if (!tokens.length) return null;
  if (tokens.some((tok) => /[WQ]/i.test(tok))) return null;
  if (tokens.some((tok) => {
    const a = stripDiacritics(tok);
    return STOP.test(tok) || STOP.test(a) || PLACEISH.test(tok) || PLACEISH.test(a);
  })) {
    return null;
  }
  t = tokens.join(t.includes("-") && tokens.length <= 2 ? "-" : " ");
  if (raw.includes("-") && tokens.length === 2) t = `${tokens[0]}-${tokens[1]}`;
  if (!/^[A-ZĂÂÎȘȚ]+(?:[ -][A-ZĂÂÎȘȚ]+)*$/.test(t)) return null;
  const named = titleCaseRo(t);
  if (isLabelRemnant(named)) return null;
  return named;
}

function lineLooksLikeCnp(line: string): boolean {
  return /[1-8](?:\s*\d){12}/.test(line);
}

function looksLikeDateLine(line: string): boolean {
  return /\d{2}[./-]\d{2}[./-]\d{2,4}/.test(line) && !lineLooksLikeCnp(line);
}

function letterCount(name: string): number {
  return name.replace(/[^A-Za-zĂÂÎȘȚăâîșț]/g, "").length;
}

function looksLikeMrzLine(line: string): boolean {
  const u = repairMrzChevrons(compactMrz(line));
  if (/(?:ID|I<)ROU/.test(u)) return true;
  if (/^I</.test(u) && u.length >= 20) return true;
  if (u.length >= 28 && (u.match(/</g)?.length ?? 0) >= 6) return true;
  if (u.length >= 22 && (u.includes("<") || (u.match(/K/g)?.length ?? 0) >= 3)) return true;
  return false;
}

function isHarvestStopLine(line: string): boolean {
  const u = repairMrzChevrons(compactMrz(line));
  if (/(?:ID|I<)ROU/.test(u) || /^I<ROU/.test(u)) return true;
  if (u.length >= 28 && (u.match(/</g)?.length ?? 0) >= 6) return true;
  if (/\b(?:DOMICILIU|ADRESSE|ADDRESS)\b/i.test(line)) return true;
  return false;
}

/** Names sit above CNP on the new card, below CNP on the old one. */
function isNameZoneEnd(line: string, kind?: CiKind): boolean {
  if (
    /\b(?:SEX|SEXE|SEXUL|CETATENIE|NATIONALITY|NATIONALITE|HOLDER|SIGNATURE|SEMNATURA)\b/i.test(
      line
    )
  ) {
    return true;
  }
  if (kind === "new" && (/\b(?:CNP|PIN)\b/i.test(line) || lineLooksLikeCnp(line))) {
    return true;
  }
  return isHarvestStopLine(line);
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
  if (looksLikeOcrJunk(name)) score -= 20;
  return score;
}

function looksLikeOcrJunk(name: string): boolean {
  const tokens = name.split(/[ -]/).filter(Boolean);
  if (tokens.length >= 3) return true;
  if (tokens.filter((t) => t.length <= 3).length >= 2) return true;
  if (tokens.some((t) => /[bcdfghjklmnpqrstvwxyz]{5,}/i.test(t))) return true;
  if (/\s/.test(name) && !name.includes("-")) {
    if (tokens.some((t) => t.length <= 4 && !/^[AEIOUĂÂÎ]/i.test(t))) return true;
  }
  return false;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const prev = Array.from({ length: n + 1 }, (_, j) => j);
  const cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]!;
  }
  return prev[n]!;
}

/** OCR often turns "Surname" into "Sumame", "Surnane", etc. */
function isLabelRemnant(name: string): boolean {
  const t = stripDiacritics(name).replace(/[^A-Za-z]/g, "").toUpperCase();
  if (t.length < 4 || t.length > 12) return false;
  if (/(?:NAMES?)$/.test(t)) return true;
  return ["SURNAME", "GIVEN", "PRENOM", "PRENUME", "LASTNAME", "FIRSTNAME", "SUMAME"].some(
    (label) => levenshtein(t, label) <= 2
  );
}

function isAcceptableName(name: string | undefined): name is string {
  if (!name) return false;
  if (isLabelRemnant(name)) return false;
  if (looksLikeOcrJunk(name)) return false;
  return nameScore(name) >= 4;
}

function namesEqual(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const key = (s: string) => stripDiacritics(s).toLowerCase().replace(/[^a-z]/g, "");
  return key(a) === key(b);
}

function looksLikeGivenName(name: string): boolean {
  return name.includes("-") || /\s/.test(name);
}

function pickBestNames(
  cands: { name: string; index: number; score: number }[]
): { nume?: string; prenume?: string } {
  if (!cands.length) return {};
  const ranked = [...cands].sort((a, b) => b.score - a.score || a.index - b.index);
  const chosen = ranked.filter((c) => c.score > 0).slice(0, 2);
  if (chosen.length < 2 && ranked[0] && ranked[0].score > 0) {
    const only = ranked[0].name;
    return looksLikeGivenName(only) ? { prenume: only } : { nume: only };
  }
  if (chosen.length < 2) return {};
  chosen.sort((a, b) => a.index - b.index);
  return { nume: chosen[0]!.name, prenume: chosen[1]!.name };
}

function inlineLabelValue(rawRest: string): string | undefined {
  const cleaned = cleanNameCandidate(stripLabelJunk(rawRest));
  if (!cleaned || !isAcceptableName(cleaned)) return undefined;
  const crumbs = stripLabelJunk(rawRest)
    .toUpperCase()
    .replace(/[^A-ZĂÂÎȘȚ -]/g, " ");
  if (/\b[A-ZĂÂÎȘȚ]{1,2}\b/.test(crumbs)) return undefined;
  return cleaned;
}

function findAfterLabel(
  lines: string[],
  label: RegExp,
  opts?: { skip?: string; stop?: RegExp; preferGiven?: boolean }
): string | undefined {
  const skipKey = opts?.skip?.toLocaleLowerCase("ro-RO");
  const consider = (found: string[], value?: string) => {
    if (value && isAcceptableName(value) && value.toLocaleLowerCase("ro-RO") !== skipKey) {
      found.push(value);
    }
  };
  const pick = (found: string[]) => {
    if (!found.length) return undefined;
    if (opts?.preferGiven) return found.find(looksLikeGivenName) ?? found[found.length - 1];
    return found[0];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = line.match(label);
    if (!m) continue;
    const restRaw = line.slice((m.index ?? 0) + m[0].length);
    if (opts?.stop?.test(restRaw.trim())) continue;
    const found: string[] = [];
    consider(found, inlineLabelValue(restRaw));
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = lines[j]!;
      if (opts?.stop?.test(next)) break;
      if (lineLooksLikeCnp(next) || STOP.test(next.trim()) || PLACEISH.test(next)) break;
      if (looksLikeDateLine(next) || looksLikeMrzLine(next)) continue;
      if (LABELISH.test(next) && !inlineLabelValue(next.replace(LABELISH, ""))) {
        continue;
      }
      consider(found, cleanNameCandidate(next) ?? undefined);
    }
    const chosen = pick(found);
    if (chosen) return chosen;
  }
  return undefined;
}

function harvestNames(lines: string[], kind?: CiKind): { nume?: string; prenume?: string } {
  const headerAt = lines.findIndex((l) => HEADER.test(l));
  const from = headerAt >= 0 ? headerAt + 1 : 0;
  let to = lines.length;
  for (let i = from; i < lines.length; i++) {
    if (isNameZoneEnd(lines[i]!, kind)) {
      to = i;
      break;
    }
  }
  const cands: { name: string; index: number; score: number }[] = [];
  for (let i = from; i < to; i++) {
    const line = lines[i]!;
    if (lineLooksLikeCnp(line) || looksLikeDateLine(line)) continue;
    if (LABELISH.test(line) || HEADER.test(line) || PLACEISH.test(line) || looksLikeMrzLine(line)) {
      continue;
    }
    const name = cleanNameCandidate(line);
    if (!name || looksLikeOcrJunk(name) || isLabelRemnant(name)) continue;
    cands.push({ name, index: i, score: nameScore(name) });
  }
  return pickBestNames(cands);
}

export function ocrResultScore(result: CiOcrResult, text: string, kind?: CiKind): number {
  let s = 0;
  if (result.cnp) s += 10;
  if (result.nume) s += Math.max(0, Math.min(8, nameScore(result.nume)));
  if (result.prenume) s += Math.max(0, Math.min(10, nameScore(result.prenume)));
  const u = repairMrzChevrons(text.toUpperCase().replace(/\s/g, ""));
  if (kind !== "new") {
    if (/(?:ID|I<)ROU[A-Z]+<</.test(u)) s += 6;
    else if (/[A-Z]{2,}<<[A-Z]/.test(u)) s += 4;
  }
  if (kind !== "old" && /\b(?:NUME|SURNAME|GIVEN\s*NAMES?|LAST\s*NAME)\b/i.test(text)) s += 2;
  return s;
}

function firstAcceptable(cands: (string | undefined)[]): string | undefined {
  for (const c of cands) {
    if (isAcceptableName(c)) return c;
  }
  return undefined;
}

function finalizeNames(nume?: string, prenume?: string): { nume?: string; prenume?: string } {
  const n = isAcceptableName(nume) ? nume : undefined;
  const p = isAcceptableName(prenume) ? prenume : undefined;
  if (n && p && namesEqual(n, p)) {
    return looksLikeGivenName(n) || looksLikeGivenName(p) ? { prenume: p } : { nume: n };
  }
  return { ...(n ? { nume: n } : {}), ...(p ? { prenume: p } : {}) };
}

function mrzNamesTrustworthy(mrz: { nume?: string; prenume?: string }): boolean {
  if (!mrz.nume || !mrz.prenume) return false;
  if (nameScore(mrz.nume) <= 0 || nameScore(mrz.prenume) <= 0) return false;
  if (!mrz.prenume.includes("-") && letterCount(mrz.prenume) > 12) return false;
  return true;
}

/** Parse Tesseract / MRZ text from a Romanian ID (old laminated TD2 or new eID visual / TD1). */
export function parseRomanianIdText(text: string, kind?: CiKind): CiOcrResult {
  const result: CiOcrResult = {};
  const upper = text.toUpperCase();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[«»]/g, "<").trim())
    .filter(Boolean);

  const mrzCnp = parseMrzCnp(text);
  const spaced = text.match(/\b[1-8](?:\s*\d){12}\b/g) ?? [];
  const packed = upper.match(/(?<!\d)[1-8]\d{12}(?!\d)/g) ?? [];
  const visualFirst = kind === "new";
  result.cnp = pickValidCnp(
    visualFirst
      ? [...spaced, ...packed, ...allDigitCnps(text), mrzCnp ?? ""]
      : [...spaced, ...packed, mrzCnp ?? "", ...allDigitCnps(text)]
  );

  const mrz = parseMrzNames(text);
  const labeledNume = findAfterLabel(lines, NUME_LABEL, { stop: PRENUME_LABEL });
  const labeledPrenume = findAfterLabel(lines, PRENUME_LABEL, {
    skip: labeledNume,
    stop: /^(?:SEX|CETATENIE|NATIONALITY|NATIONALITE)\b/i,
    preferGiven: true,
  });
  const harvested = harvestNames(lines, kind);
  const trustMrz = kind !== "new" && mrzNamesTrustworthy(mrz);

  if (trustMrz) {
    Object.assign(result, finalizeNames(mrz.nume, mrz.prenume));
  } else {
    const prenumeOrder =
      kind === "old"
        ? [mrz.prenume, labeledPrenume, harvested.prenume]
        : [labeledPrenume, harvested.prenume, mrz.prenume];
    const numeOrder =
      kind === "old"
        ? [mrz.nume, labeledNume, harvested.nume]
        : [labeledNume, harvested.nume, mrz.nume];
    const prenume = firstAcceptable(prenumeOrder);
    const nume = firstAcceptable(numeOrder.filter((n) => !namesEqual(n, prenume)));
    Object.assign(result, finalizeNames(nume, prenume));
  }

  return result;
}

export function mergeCiOcr(base: CiOcrResult, extra: CiOcrResult): CiOcrResult {
  const prenume =
    firstAcceptable([base.prenume, extra.prenume]) ?? base.prenume ?? extra.prenume;
  const nume = firstAcceptable(
    [base.nume, extra.nume].filter((n) => !namesEqual(n, prenume))
  );
  const cnp = base.cnp || extra.cnp;
  const names = finalizeNames(nume, prenume);
  return {
    ...(cnp ? { cnp } : {}),
    ...names,
  };
}
