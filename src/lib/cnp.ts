export function validCNP(p_cnp: string): boolean {
  let i = 0;
  let year = 0;
  let hashResult = 0;
  const cnp: number[] = [];
  const hashTable = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
  if (p_cnp.length !== 13) {
    return false;
  }
  for (i = 0; i < 13; i++) {
    cnp[i] = parseInt(p_cnp.charAt(i), 10);
    if (isNaN(cnp[i]!)) {
      return false;
    }
    if (i < 12) {
      hashResult = hashResult + cnp[i]! * hashTable[i]!;
    }
  }
  hashResult = hashResult % 11;
  if (hashResult === 10) {
    hashResult = 1;
  }
  year = cnp[1]! * 10 + cnp[2]!;
  switch (cnp[0]) {
    case 1:
    case 2: {
      year += 1900;
      break;
    }
    case 3:
    case 4: {
      year += 1800;
      break;
    }
    case 5:
    case 6: {
      year += 2000;
      break;
    }
    case 7:
    case 8:
    case 9: {
      year += 2000;
      if (year > (new Date().getFullYear() - 1900) - 14) {
        year -= 100;
      }
      break;
    }
    default:
      return false;
  }
  if (year < 1800 || year > 2099) {
    return false;
  }
  return cnp[12] === hashResult;
}

/** SQL Server `bit` / `buffer` as returned by `tedious` (varies by driver version). */
export function bufferToBinary(v: unknown): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "number") return v === 1;
  if (!v || !Buffer.isBuffer(v)) return false;
  return parseInt(v.toString("hex"), 16).toString(2) === "1";
}

function stripDiacritics(input: string): string {
  return input
    .replaceAll("ă", "a")
    .replaceAll("î", "i")
    .replaceAll("â", "a")
    .replaceAll("ș", "s")
    .replaceAll("ț", "t")
    .replaceAll("Ă", "A")
    .replaceAll("Î", "I")
    .replaceAll("Â", "A")
    .replaceAll("Ș", "S")
    .replaceAll("Ț", "T");
}

const textAndCoordinates: Record<string, [number, number]> = {
  nume: [65, 172],
  prenume: [65, 194],
  strada: [65, 217],
  numar: [287, 217],
  initialaTatalui: [295, 172],
  cnp: [337, 180],
  email: [364, 206],
  telefon: [365, 232],
  judet: [254, 239],
  localitate: [67, 261],
  doiAni: [325, 425],
  date: [31, 534],
};

export function buildForm230FieldData(body: {
  nume: string;
  prenume: string;
  email: string;
  telefon: string;
  initiala: string;
  cnp: string;
  judet: string;
  localitate: string;
  strada: string;
  numar: string;
  an: string;
  date: string;
}): Record<string, string> {
  let cnpSpaced = "";
  for (let i = 0; i < body.cnp.length; i++) {
    cnpSpaced += body.cnp[i] + "    ";
  }
  // Legacy: req.body.an === "on" (first radio, one year) marked doiAni field in the PDF
  return {
    nume: stripDiacritics(body.nume),
    prenume: stripDiacritics(body.prenume),
    strada: stripDiacritics(body.strada),
    numar: stripDiacritics(body.numar),
    initialaTatalui: stripDiacritics(body.initiala),
    cnp: cnpSpaced,
    email: stripDiacritics(body.email),
    telefon: body.telefon,
    judet: stripDiacritics(body.judet),
    localitate: stripDiacritics(body.localitate),
    doiAni: body.an === "on" ? "X" : "",
    date: body.date === "on" ? "X" : "",
  };
}

export { textAndCoordinates };
