import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeCnp, validCNP } from "@/lib/cnp";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { firestoreInsertForm230 } from "@/lib/firestore-form230";
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

  const nume = field(fields, "nume").trim();
  const prenume = field(fields, "prenume").trim();
  const cnp = normalizeCnp(field(fields, "cnp"));
  const judet = field(fields, "judet").trim();
  const localitate = field(fields, "localitate").trim();
  const anRaw = field(fields, "an");
  const an = anRaw === "2" ? "2" : anRaw === "1" ? "1" : "";
  const semnatura = field(fields, "signature");
  const gdpr = field(fields, "gdpr");
  const source = field(fields, "source") === "230" ? "230" : "web";

  if (gdpr !== "on") {
    return res.status(400).json({ ok: false, error: "gdpr" });
  }
  if (!nume || !prenume || !localitate || !judet) {
    return res.status(400).json({ ok: false, error: "fields" });
  }
  if (an !== "1" && an !== "2") {
    return res.status(400).json({ ok: false, error: "an" });
  }
  if (!validCNP(cnp)) {
    return res.status(400).json({ ok: false, error: "cnp" });
  }
  if (semnatura === "" || semnatura === "undefined" || !semnatura.startsWith("data:image/")) {
    return res.status(400).json({ ok: false, error: "semnatura" });
  }

  const fieldBody = {
    nume,
    prenume,
    email: "",
    telefon: "",
    initiala: "",
    cnp,
    judet,
    localitate,
    strada: "",
    numar: "",
    an,
    date: "",
  };

  let pdfBuffer: Uint8Array;
  try {
    pdfBuffer = await generateDonationPdf(semnatura, fieldBody);
  } catch (e) {
    console.error("[cum-pot-ajuta] pdf", e);
    return res.status(400).json({ ok: false, error: "semnatura" });
  }
  const pdfBase64 = Buffer.from(pdfBuffer).toString("base64");
  const fileBase = `${nume}_${prenume}`.replace(/[^\w\-.]+/g, "_");
  const fileName = fileBase + ".pdf";

  let driveFileId: string | undefined;
  if (isDriveUploadConfigured()) {
    try {
      const driveResult = await uploadPdfToDrive(pdfBuffer, fileName);
      if (driveResult.ok) {
        driveFileId = driveResult.fileId;
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

  if (isFirebaseConfigured()) {
    try {
      await firestoreInsertForm230({
        nume,
        prenume,
        initiala: "",
        cnp,
        email: "",
        telefon: "",
        localitate,
        judet,
        strada: "",
        numar: "",
        durationYears: an,
        consentGdpr: true,
        consentAnafShare: false,
        consentNewsletter: false,
        signaturePng: semnatura,
        pdfBase64,
        driveFileId,
        source,
      });
    } catch (e) {
      console.error("[cum-pot-ajuta] firestore insert", e);
      return res.status(500).json({ ok: false, error: "save" });
    }
  }

  return res.status(200).json({
    ok: true,
    pdfBase64,
  });
}
