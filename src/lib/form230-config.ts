/** Tax year reported to ANAF (`an` in B230). Defaults to previous calendar year. */
export function form230TaxYear(now = new Date()): number {
  const raw = (
    process.env.NEXT_PUBLIC_FORM230_TAX_YEAR ||
    process.env.FORM230_TAX_YEAR ||
    ""
  ).trim();
  if (/^\d{4}$/.test(raw)) return Number(raw);
  return now.getFullYear() - 1;
}

export const FORM230_ORG = {
  nameXml: "ASOCIATIA VA AJUTAM DIN DEJ",
  nameDisplay: "Asociația Vă Ajutăm din Dej",
  cui: "42960042",
  ibanRon: "RO37BTRLRONCRT0565463401",
  email: "contact@vaajutamdindej.ro",
  phone: "0723290245",
  address: "Strada Unirii 13, Bl. D1, Ap. 11, Dej, 405200, Cluj",
} as const;
