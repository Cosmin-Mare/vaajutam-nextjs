import type { NextApiRequest, NextApiResponse } from "next";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { firestoreInsertNewsletterEmail } from "@/lib/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const email = String(req.body?.email ?? "").trim();
  if (email) {
    try {
      if (isFirebaseConfigured()) {
        await firestoreInsertNewsletterEmail(email);
      }
    } catch (e) {
      console.error("newsletter", e);
    }
  }

  return res.redirect(303, "/noutati?subscribed=1");
}
