import type { NextApiRequest, NextApiResponse } from "next";
import { normalizeCnp, validCNP } from "@/lib/cnp";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { isCiSessionId } from "@/lib/ci-session-id";
import { ciSessionCreate, ciSessionGet, ciSessionPut } from "@/lib/firestore-ci-session";

function clipName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function sessionIdFrom(req: NextApiRequest): string | null {
  if (req.method === "GET") {
    const q = req.query.id;
    const raw = Array.isArray(q) ? q[0] : q;
    return isCiSessionId(raw) ? raw : null;
  }
  const body = req.body as { id?: unknown };
  return isCiSessionId(body?.id) ? body.id : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, POST, PUT");
    return res.status(405).json({ ok: false, error: "method" });
  }

  const id = sessionIdFrom(req);
  if (!id) {
    return res.status(400).json({ ok: false, error: "id" });
  }

  if (!isFirebaseConfigured()) {
    return res.status(200).json({ ok: true, pairing: false, ready: false });
  }

  try {
    if (req.method === "POST") {
      await ciSessionCreate(id);
      return res.status(200).json({ ok: true, pairing: true });
    }

    if (req.method === "GET") {
      const session = await ciSessionGet(id);
      if (!session) {
        return res.status(200).json({ ok: true, pairing: true, ready: false });
      }
      return res.status(200).json({ ok: true, pairing: true, ...session });
    }

    const body = req.body as { nume?: unknown; prenume?: unknown; cnp?: unknown };
    const nume = clipName(body.nume);
    const prenume = clipName(body.prenume);
    const cnpRaw = typeof body.cnp === "string" ? normalizeCnp(body.cnp) : "";
    const cnp = validCNP(cnpRaw) ? cnpRaw : "";
    if (!nume && !prenume && !cnp) {
      return res.status(400).json({ ok: false, error: "empty" });
    }
    const saved = await ciSessionPut(id, { nume, prenume, cnp });
    if (!saved) {
      return res.status(404).json({ ok: false, error: "session" });
    }
    return res.status(200).json({ ok: true, pairing: true });
  } catch (e) {
    console.error("[form230/ci-session]", e);
    return res.status(500).json({ ok: false, error: "server" });
  }
}
