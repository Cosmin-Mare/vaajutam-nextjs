import type { NextApiRequest, NextApiResponse } from "next";
import { insertEmail, isDbConfigured } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const email = String(req.body?.email ?? "").trim();
  if (email) {
    try {
      if (isDbConfigured()) {
        await insertEmail(email);
      }
    } catch (e) {
      console.error("newsletter", e);
    }
  }

  return res.redirect(303, "/noutati?subscribed=1");
}
