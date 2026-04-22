import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { validCNP } from "@/lib/cnp";
import { insertEmail, isDbConfigured } from "@/lib/db";
import { generateDonationPdf } from "@/lib/pdf-donation";
import {
  driveEnvPresence,
  isDriveUploadConfigured,
  uploadPdfToDrive,
} from "@/lib/google-drive";

export const config = {
  api: {
    bodyParser: false,
  },
};

function field(fields: Record<string, string | string[] | undefined>, name: string): string {
  const v = fields[name];
  if (v == null) return "";
  const first = Array.isArray(v) ? v[0] : v;
  return typeof first === "string" ? first : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const form = formidable({});
  let fields: Record<string, string | string[] | undefined>;
  try {
    [fields] = await form.parse(req);
  } catch (e) {
    console.error("[cum-pot-ajuta] parse", e);
    return res.status(400).json({ ok: false, error: "parse" });
  }

  const nume = field(fields, "nume");
  const prenume = field(fields, "prenume");
  const email = field(fields, "email");
  const telefon = field(fields, "telefon");
  const initiala = field(fields, "initiala");
  const cnp = field(fields, "cnp");
  const judet = field(fields, "judet");
  const localitate = field(fields, "localitate");
  const strada = field(fields, "strada");
  const numar = field(fields, "numar");
  const an = field(fields, "an");
  const dateConsent = field(fields, "date") === "on" ? "on" : "";
  const semnatura = field(fields, "signature");
  const emailAccept = field(fields, "emailAccept");

  if (!validCNP(cnp)) {
    return res.status(400).json({ ok: false, error: "cnp" });
  }
  if (semnatura === "" || semnatura === "undefined") {
    return res.status(400).json({ ok: false, error: "semnatura" });
  }

  if (emailAccept === "on" && email) {
    try {
      if (isDbConfigured()) {
        await insertEmail(email);
      }
    } catch (e) {
      console.error("email insert", e);
    }
  }

  const fieldBody = {
    nume,
    prenume,
    email,
    telefon,
    initiala,
    cnp,
    judet,
    localitate,
    strada,
    numar,
    an,
    date: dateConsent,
  };

  const pdfBuffer = await generateDonationPdf(semnatura, fieldBody);
  const fileBase = `${nume}_${prenume}`.replace(/[^\w\-.]+/g, "_");
  const fileName = fileBase + ".pdf";

  if (isDriveUploadConfigured()) {
    try {
      const driveResult = await uploadPdfToDrive(pdfBuffer, fileName);
      if (driveResult.ok) {
        console.info("[cum-pot-ajuta] Drive backup ok", {
          fileId: driveResult.fileId,
          fileName: driveResult.fileName,
        });
      } else if (!driveResult.skipped) {
        console.error("[cum-pot-ajuta] Drive backup failed (PDF still returned)", {
          fileName,
          error: driveResult.error,
        });
      }
    } catch (e) {
      console.error("[cum-pot-ajuta] Drive upload unexpected error", {
        fileName,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  } else {
    const g = globalThis as typeof globalThis & { __vaajutamDriveDisabledLog?: boolean };
    if (!g.__vaajutamDriveDisabledLog) {
      g.__vaajutamDriveDisabledLog = true;
      console.info(
        "[cum-pot-ajuta] Drive backup disabled (once per process)",
        driveEnvPresence()
      );
    }
  }

  return res.status(200).json({
    ok: true,
    pdfBase64: Buffer.from(pdfBuffer).toString("base64"),
  });
}
