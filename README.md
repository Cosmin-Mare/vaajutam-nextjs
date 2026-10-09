# Asociația Vă Ajutăm din Dej

Website for Vă Ajutăm din Dej, a non-profit association in Dej, Romania. It presents the association's news, projects, partners and supporters, and lets people support it online, including a guided **Formular 230** flow that redirects part of their income tax to the association.

**Live:** [vaajutamdindej.ro](https://vaajutamdindej.ro)

## Highlights

**Formular 230, end to end**

Romanian taxpayers can redirect 3.5% of their income tax to an NGO by filing Form 230. The site turns that paperwork into a short online flow:

- **ID card scan with OCR.** Visitors photograph their Romanian ID card and the form fills in their details. Recognition runs in the browser with Tesseract.js, and HEIC photos from iPhones are converted first.
- **Continue on your phone.** On desktop, a QR code opens the camera step on the visitor's phone, linked to the same session.
- **On-screen signature** with signature_pad.
- **Validation.** CNP (personal numeric code) checksum validation, plus a check that the same CNP hasn't already submitted for the current tax year.
- **PDF generation.** The completed, signed form is generated with pdf-lib, recorded in Firestore and uploaded to Google Drive for the association's volunteers.

**Content and data**

- Members, posts and projects migrated from the association's previous Azure SQL database to Firestore, with photos moved to Firebase Storage by a scripted migration (`npm run migrate:photos:firebase`, supports `--dry-run`)
- Cached media proxy, on-demand revalidation, sitemap and robots generated from content, and per-page SEO tags
- Newsletter sign-up and contact form

## Stack

Next.js 15 (Pages Router) · React 19 · TypeScript · Firebase Admin (Firestore, Storage) · Google Drive API · Tesseract.js · pdf-lib · signature_pad · Bootstrap

## Running locally

```bash
npm install
cp .env.example .env.local   # Firebase service account, storage bucket, Form 230 settings
npm run dev                  # http://localhost:3000
```

The Google Drive upload is optional and is skipped when its credentials are not set.

## Project structure

```
src/pages/          pages and API routes (form230, newsletter, media, health)
src/pages/230/      Formular 230 flow, ID card step and privacy page
src/components/     UI, including the camera, QR and signature components
src/lib/            Firestore access, OCR parsing, CNP validation, PDF and Drive helpers
scripts/            photo migration to Firebase Storage
content/            static HTML fragments
```

---

Built pro bono by [Cosmin Mare](https://mare-cosmin.ro/en/).
