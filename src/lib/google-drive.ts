import fs from "node:fs";
import path from "node:path";
import { JWT } from "google-auth-library";
import { google } from "googleapis";

const LOG_PREFIX = "[google-drive]";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

function normalizePrivateKey(k: string): string {
  return k.replace(/\\n/g, "\n");
}

function getPrivateKeyFromEnv(): string | null {
  const k =
    process.env.GOOGLE_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? null;
  if (!k) return null;
  return normalizePrivateKey(k);
}

function getClientEmailFromEnv(): string | undefined {
  return (
    process.env.GOOGLE_CLIENT_EMAIL ??
    process.env.CLIENT_EMAIL ??
    undefined
  );
}

type ServiceAccountJson = {
  client_email?: string;
  private_key?: string;
};

/** `GOOGLE_APPLICATION_CREDENTIALS`, else `./key.json` in the app root (Next cwd). */
function resolveCredentialsFilePath(): string | null {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  const fallback = path.join(process.cwd(), "key.json");
  if (fs.existsSync(fallback)) {
    return fallback;
  }
  return null;
}

function readServiceAccountFromCredentialsFile(): {
  email: string;
  privateKey: string;
} | null {
  const p = resolveCredentialsFilePath();
  if (!p) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    const j = JSON.parse(raw) as ServiceAccountJson;
    const email = j.client_email?.trim();
    const privateKey = j.private_key?.trim();
    if (!email || !privateKey) return null;
    return { email, privateKey: normalizePrivateKey(privateKey) };
  } catch (err) {
    console.warn(`${LOG_PREFIX} could not read service account JSON`, {
      path: p,
      detail: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Prefer explicit env key+email; otherwise use standard GCP JSON key file. */
function resolveJwtCredentials(): { email: string; privateKey: string } | null {
  const envEmail = getClientEmailFromEnv();
  const envKey = getPrivateKeyFromEnv();
  if (envEmail && envKey) {
    return { email: envEmail, privateKey: envKey };
  }
  const fromFile = readServiceAccountFromCredentialsFile();
  if (fromFile) {
    return fromFile;
  }
  return null;
}

function getFolderId(): string | undefined {
  return (
    process.env.GOOGLE_DRIVE_FOLDER_ID ??
    process.env.DRIVE_FOLDER_ID ??
    undefined
  );
}

/** Which env knobs are set (no secret values). */
export function driveEnvPresence(): {
  clientEmail: boolean;
  privateKey: boolean;
  folderId: boolean;
  googleApplicationCredentialsSet: boolean;
  serviceAccountJsonFound: boolean;
  serviceAccountResolvable: boolean;
} {
  const envEmail = Boolean(getClientEmailFromEnv());
  const envKey = Boolean(getPrivateKeyFromEnv());
  const jwt = resolveJwtCredentials();
  const credPath = resolveCredentialsFilePath();
  return {
    clientEmail: envEmail || Boolean(jwt),
    privateKey: envKey || Boolean(jwt),
    folderId: Boolean(getFolderId()),
    googleApplicationCredentialsSet: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
    ),
    serviceAccountJsonFound: Boolean(credPath),
    serviceAccountResolvable: Boolean(jwt),
  };
}

export function isDriveUploadConfigured(): boolean {
  return Boolean(resolveJwtCredentials() && getFolderId());
}

function formatDriveError(err: unknown): string {
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = typeof o.message === "string" ? o.message : String(err);
    const code = typeof o.code === "string" ? o.code : undefined;
    const response = o.response as Record<string, unknown> | undefined;
    const data = response?.data;
    if (data !== undefined) {
      try {
        return `${msg}${code ? ` (${code})` : ""} — ${JSON.stringify(data)}`;
      } catch {
        return `${msg}${code ? ` (${code})` : ""}`;
      }
    }
    return code ? `${msg} (${code})` : msg;
  }
  return String(err);
}

export type DriveUploadResult =
  | { ok: true; fileId: string; fileName: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

export async function uploadPdfToDrive(
  pdf: Buffer | Uint8Array,
  fileName: string
): Promise<DriveUploadResult> {
  const jwtCreds = resolveJwtCredentials();
  const parentId = getFolderId();
  const presence = driveEnvPresence();

  if (!jwtCreds || !parentId) {
    const reason = `missing env: serviceAccountResolvable=${presence.serviceAccountResolvable} folderId=${presence.folderId}`;
    console.info(`${LOG_PREFIX} upload skipped (${reason})`);
    return { ok: false, skipped: true, reason };
  }

  const { email, privateKey: key } = jwtCreds;
  const body = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);

  console.info(`${LOG_PREFIX} starting upload`, {
    fileName,
    parentFolderId: parentId,
    clientEmail: email,
    byteLength: body.byteLength,
  });

  try {
    const auth = new JWT({
      email,
      key,
      scopes: SCOPES,
    });
    await auth.authorize();
    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentId],
      },
      media: {
        body,
        mimeType: "application/pdf",
      },
      fields: "id,name",
      supportsAllDrives: true,
    });

    const fileId = res.data.id;
    if (!fileId) {
      console.error(`${LOG_PREFIX} create succeeded but no file id`, {
        fileName,
        responseKeys: res.data ? Object.keys(res.data) : [],
      });
      return {
        ok: false,
        skipped: false,
        error: "Drive API returned no file id",
      };
    }

    console.info(`${LOG_PREFIX} upload ok`, {
      fileId,
      fileName,
      driveName: res.data.name ?? fileName,
    });
    return { ok: true, fileId, fileName };
  } catch (err) {
    const detail = formatDriveError(err);
    console.error(`${LOG_PREFIX} upload failed`, { fileName, detail });
    return { ok: false, skipped: false, error: detail };
  }
}
