import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

const repoRoot = process.cwd();

function readServiceAccount(): Record<string, unknown> | null {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      return JSON.parse(inline) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const p =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.join(repoRoot, p);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  const sa = readServiceAccount();
  return Boolean(sa && typeof sa.project_id === "string" && sa.project_id.length > 0);
}

let warnedMissingFirebase = false;

export function warnIfNoFirebase(): void {
  if (warnedMissingFirebase) return;
  if (process.env.NODE_ENV === "development" && !isFirebaseConfigured()) {
    warnedMissingFirebase = true;
    console.warn(
      "[firebase] Missing credentials: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env.local."
    );
  }
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const sa = readServiceAccount();
  if (!sa?.project_id) {
    throw new Error(
      "Firebase Admin: set FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS (path to JSON)."
    );
  }

  return initializeApp({
    credential: cert(sa as Parameters<typeof cert>[0]),
    projectId: String(sa.project_id),
  });
}
