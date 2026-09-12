import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import type { CiOcrResult } from "@/lib/ci-id-ocr";

type SessionDoc = {
  ready?: unknown;
  expiresAt?: unknown;
  nume?: unknown;
  prenume?: unknown;
  cnp?: unknown;
};

const SESSION_TTL_MS = 15 * 60 * 1000;

function ciSessionCollection(): string {
  return process.env.FIRESTORE_FORM230_CI_SESSIONS_COLLECTION?.trim() || "form230_ci_sessions";
}

function db() {
  return getFirestore(getAdminApp());
}

export type CiSessionPayload = {
  ready: boolean;
  nume?: string;
  prenume?: string;
  cnp?: string;
};

function isExpired(data: SessionDoc): boolean {
  const expires = data.expiresAt;
  if (expires instanceof Timestamp) return expires.toMillis() <= Date.now();
  return true;
}

export async function ciSessionCreate(id: string): Promise<void> {
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_TTL_MS);
  await db()
    .collection(ciSessionCollection())
    .doc(id)
    .set({
      ready: false,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });
}

export async function ciSessionGet(id: string): Promise<CiSessionPayload | null> {
  const ref = db().collection(ciSessionCollection()).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = (snap.data() ?? {}) as SessionDoc;
  if (isExpired(data)) {
    await ref.delete().catch(() => undefined);
    return null;
  }
  if (data.ready !== true) return { ready: false };
  return {
    ready: true,
    ...(typeof data.nume === "string" && data.nume ? { nume: data.nume } : {}),
    ...(typeof data.prenume === "string" && data.prenume ? { prenume: data.prenume } : {}),
    ...(typeof data.cnp === "string" && data.cnp ? { cnp: data.cnp } : {}),
  };
}

export async function ciSessionPut(id: string, result: CiOcrResult): Promise<boolean> {
  const ref = db().collection(ciSessionCollection()).doc(id);
  const snap = await ref.get();
  if (snap.exists) {
    const data = (snap.data() ?? {}) as SessionDoc;
    if (isExpired(data)) {
      await ref.delete().catch(() => undefined);
      return false;
    }
  }
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_TTL_MS);
  await ref.set(
    {
      ready: true,
      nume: result.nume ?? "",
      prenume: result.prenume ?? "",
      cnp: result.cnp ?? "",
      filledAt: FieldValue.serverTimestamp(),
      ...(!snap.exists
        ? { createdAt: FieldValue.serverTimestamp(), expiresAt }
        : {}),
    },
    { merge: true }
  );
  return true;
}
