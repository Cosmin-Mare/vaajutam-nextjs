import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeCnp, validCNP } from "@/lib/cnp";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { form230CnpExistsForTaxYear } from "@/lib/firestore-form230";
import { form230TaxYear } from "@/lib/form230-config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const body = req.body as { cnp?: unknown };
  const cnp = normalizeCnp(typeof body.cnp === "string" ? body.cnp : "");
  if (!validCNP(cnp)) {
    return res.status(200).json({ ok: true, duplicate: false, taxYear: form230TaxYear() });
  }

  if (!isFirebaseConfigured()) {
    return res.status(200).json({ ok: true, duplicate: false, taxYear: form230TaxYear() });
  }

  try {
    const duplicate = await form230CnpExistsForTaxYear(cnp);
    return res.status(200).json({ ok: true, duplicate, taxYear: form230TaxYear() });
  } catch (e) {
    console.error("[form230/check-cnp]", e);
    return res.status(200).json({ ok: true, duplicate: false, taxYear: form230TaxYear() });
  }
}
