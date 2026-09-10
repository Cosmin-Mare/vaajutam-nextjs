import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase-admin";

function storageDownloadUrl(bucketName: string, objectPath: string, downloadToken: string): string {
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${downloadToken}`;
}

let cachedBucketName: string | null = null;

export async function resolveStorageBucketName(): Promise<string> {
  if (cachedBucketName) return cachedBucketName;
  const app = getAdminApp();
  const storage = getStorage(app);
  const projectId = app.options.projectId;
  if (!projectId) throw new Error("Firebase projectId is missing.");

  const explicit = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  const candidates = explicit
    ? [explicit]
    : [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`];

  for (const name of candidates) {
    const [ok] = await storage.bucket(name).exists();
    if (ok) {
      cachedBucketName = name;
      return name;
    }
  }

  throw new Error(
    explicit
      ? `FIREBASE_STORAGE_BUCKET=${explicit} was not found.`
      : `No Storage bucket for project "${projectId}". Tried: ${candidates.join(", ")}.`
  );
}

export async function uploadImageBuffer(objectPath: string, buffer: Buffer, contentType: string): Promise<string> {
  const bucketName = await resolveStorageBucketName();
  const dest = getStorage(getAdminApp()).bucket(bucketName).file(objectPath);
  const downloadToken = randomUUID();
  await dest.save(buffer, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
      metadata: { firebaseStorageDownloadToken: downloadToken },
    },
  });
  return storageDownloadUrl(bucketName, objectPath, downloadToken);
}

export function storageRootPrefix(): string {
  const root = process.env.FIREBASE_STORAGE_ROOT?.trim().replace(/^\/+|\/+$/g, "") || "";
  return root ? `${root}/` : "";
}
