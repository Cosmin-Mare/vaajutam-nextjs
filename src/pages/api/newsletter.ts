import type { NextApiRequest, NextApiResponse } from "next";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { firestoreInsertNewsletterEmail } from "@/lib/firestore";

const DEFAULT_THANKS = "/noutati?subscribed=1";

/**
 * Only same-origin path redirects (e.g. `/`, `/noutati`); disallows `//` and `..`.
 */
function safeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (t.length < 1 || t.length > 200) return null;
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("..") || t.includes("://")) {
    return null;
  }
  if (t.includes("?") || t.includes("#") || t.includes("\0") || /[\r\n]/.test(t)) {
    return null;
  }
  return t;
}

function redirectWithSubscribed(res: NextApiResponse, path: string) {
  const u = new URL("https://internal.invalid" + (path === "/" ? "/" : path));
  u.searchParams.set("subscribed", "1");
  const next = (u.pathname === "" ? "/" : u.pathname) + (u.search || "");
  return res.redirect(303, next);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const returnPath = safeReturnPath(req.body?.return_to);

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

  if (returnPath) {
    return redirectWithSubscribed(res, returnPath);
  }
  return res.redirect(303, DEFAULT_THANKS);
}
