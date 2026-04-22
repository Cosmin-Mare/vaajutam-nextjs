import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { buildForm230FieldData, textAndCoordinates } from "@/lib/cnp";

const fontSize = 11;

const assetsDir = path.join(process.cwd(), "assets");

function templatePath() {
  return path.join(assetsDir, "Formular_donatie.pdf");
}

function getHelvetica() {
  return StandardFonts.Helvetica;
}

type Body = Parameters<typeof buildForm230FieldData>[0];

export async function generateDonationPdf(semnaturaBase64: string, body: Body): Promise<Uint8Array> {
  const pdfBytes = fs.readFileSync(templatePath());
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0]!;
  const pageHeight = firstPage.getHeight();
  const helveticaFont = await pdfDoc.embedFont(getHelvetica());
  const data = buildForm230FieldData(body);

  for (const key of Object.keys(textAndCoordinates)) {
    const k = key as keyof typeof textAndCoordinates;
    const [x, y] = textAndCoordinates[k]!;
    const text = (data as Record<string, string>)[k] ?? "";
    firstPage.drawText(String(text), {
      x,
      y: pageHeight - y,
      size: fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  }

  const signature = semnaturaBase64.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(signature, "base64");
  const sigImage = await pdfDoc.embedPng(buf);
  firstPage.drawImage(sigImage, { x: 140, y: 102, width: 150, height: 10 });
  return pdfDoc.save();
}
