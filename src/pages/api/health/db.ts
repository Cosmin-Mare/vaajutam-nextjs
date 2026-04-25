import type { NextApiRequest, NextApiResponse } from "next";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { firestoreGetPosts } from "@/lib/firestore";

/** GET /api/health/db — Firestore connectivity (name kept for existing monitors). */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!isFirebaseConfigured()) {
    return res.status(200).json({
      status: "not_configured",
      message:
        "Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS.",
    });
  }
  try {
    const posts = await firestoreGetPosts();
    return res.status(200).json({
      status: "ok",
      postCount: posts.length,
      backend: "firestore",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const body = {
      status: "error",
      message: msg,
      ...(process.env.NODE_ENV === "development" && {
        hint: "Check Firebase credentials, Firestore API enabled, and rules for the service account.",
      }),
    };
    if (process.env.NODE_ENV === "development") {
      console.error("[api/health/db]", e);
    }
    return res.status(500).json(body);
  }
}
