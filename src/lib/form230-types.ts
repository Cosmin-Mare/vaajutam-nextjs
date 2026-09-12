export const FORM230_STATUSES = [
  "nou",
  "verificat",
  "cu_eroare",
  "inclus_in_borderou",
  "depus_anaf",
] as const;

export type Form230Status = (typeof FORM230_STATUSES)[number];

export type Form230Duration = "1" | "2";
