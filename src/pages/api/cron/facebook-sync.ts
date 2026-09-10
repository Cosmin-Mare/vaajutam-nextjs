import type { NextApiRequest, NextApiResponse } from "next";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { syncFacebookPosts } from "@/lib/facebook-sync";

export const config = {
  maxDuration: 120,
};

function authorized(req: NextApiRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.authorization ?? "";
  return header === `Bearer ${secret}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end();
  }

  if (!authorized(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!isFirebaseConfigured()) {
    return res.status(500).json({ message: "Firebase is not configured." });
  }

  try {
    const result = await syncFacebookPosts();
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("[api/cron/facebook-sync]", message);
    return res.status(500).json({ ok: false, message });
  }
}
