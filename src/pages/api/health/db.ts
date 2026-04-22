import type { NextApiRequest, NextApiResponse } from "next";
import { getPosts, isDbConfigured } from "@/lib/db";

/** Quick check: GET /api/health/db — only detailed in development. */
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (!isDbConfigured()) {
    return res.status(200).json({
      status: "not_configured",
      message:
        "Set DB_USER, DB_HOST, and DB_PASSWORD in .env.local (root of this app).",
    });
  }
  try {
    const posts = await getPosts();
    return res.status(200).json({
      status: "ok",
      postCount: posts.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    const body = {
      status: "error",
      message: msg,
      ...(process.env.NODE_ENV === "development" && {
        hint: "Try DB_TRUST_SERVER_CERT=1, check Azure firewall allows your IP, and DB_NAME.",
      }),
    };
    if (process.env.DB_DEBUG === "1" || process.env.NODE_ENV === "development") {
      console.error("[api/health/db]", e);
    }
    return res.status(500).json(body);
  }
}
