import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import { form230TaxYear } from "@/lib/form230-config";
import type { Form230Duration, Form230Status } from "@/lib/form230-types";

function form230Collection(): string {
  return process.env.FIRESTORE_FORM230_COLLECTION?.trim() || "form230_submissions";
}

function db() {
  return getFirestore(getAdminApp());
}

export type Form230Insert = {
  nume: string;
  prenume: string;
  initiala: string;
  cnp: string;
  email: string;
  telefon: string;
  localitate: string;
  judet: string;
  strada: string;
  numar: string;
  durationYears: Form230Duration;
  consentGdpr: boolean;
  consentAnafShare: boolean;
  consentNewsletter: boolean;
  signaturePng: string;
  pdfBase64: string;
  driveFileId?: string;
  source: "web" | "230";
};

export async function form230CnpExistsForTaxYear(cnp: string, taxYear?: number): Promise<boolean> {
  const year = taxYear ?? form230TaxYear();
  const snap = await db().collection(form230Collection()).where("cnp", "==", cnp).limit(25).get();
  return snap.docs.some((d) => Number(d.data().taxYear) === year);
}

export async function firestoreInsertForm230(input: Form230Insert): Promise<string> {
  const taxYear = form230TaxYear();
  const ref = db().collection(form230Collection()).doc();
  const status: Form230Status = "nou";
  await ref.set({
    taxYear,
    campaignYear: new Date().getFullYear(),
    nume: input.nume,
    prenume: input.prenume,
    initiala: input.initiala,
    cnp: input.cnp,
    email: input.email,
    telefon: input.telefon,
    localitate: input.localitate,
    judet: input.judet,
    strada: input.strada,
    numar: input.numar,
    durationYears: input.durationYears,
    consentGdpr: input.consentGdpr,
    consentAnafShare: input.consentAnafShare,
    consentNewsletter: input.consentNewsletter,
    signaturePng: input.signaturePng,
    pdfBase64: input.pdfBase64,
    hasPdf: true,
    ...(input.driveFileId ? { driveFileId: input.driveFileId } : {}),
    status,
    source: input.source,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}
