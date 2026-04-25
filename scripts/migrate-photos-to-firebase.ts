/**
 * Upload local WebP assets to Firebase Storage and merge URLs into existing Firestore docs.
 *
 * Layout (defaults):
 * - Posts:    deploy/public/images/posts/{id}/   (fallback: public/images/posts) — thumbnail.webp, 0.webp, …
 * - Projects: deploy/public/images/projects/{id}/ (fallback: public/images/projects)
 * - Members:  public/images/members/{Name_With_underscores}.webp — matched to Firestore by `name` on each doc
 *
 * Posts/projects: Firestore doc id = numeric id as string (`"12"`). Members: uses each doc’s `.id` (whatever
 * Firestore uses); local file is derived from field `name` (env: FIRESTORE_MEMBER_NAME_FIELD).
 *
 * Run:
 *   npm run migrate:photos:firebase -- --dry-run
 *   npm run migrate:photos:firebase -- --members-only
 *   npm run migrate:photos:firebase -- --posts-only --dry-run
 *
 * Env (.env.local):
 *   GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH
 *   MIGRATE_IMAGES_POSTS_DIR     — override posts folder (absolute or repo-relative)
 *   MIGRATE_IMAGES_PROJECTS_DIR  — override projects folder
 *   MIGRATE_IMAGES_MEMBERS_DIR   — override members folder (default public/images/members)
 *   FIREBASE_STORAGE_BUCKET, FIREBASE_STORAGE_ROOT
 *   FIRESTORE_POSTS_COLLECTION, FIRESTORE_PROJECTS_COLLECTION, FIRESTORE_MEMBERS_COLLECTION
 *   FIRESTORE_POST_THUMBNAIL_FIELD, FIRESTORE_POST_GALLERY_FIELD (defaults: thumbnailStorageUrl, galleryStorageUrls)
 *   FIRESTORE_PROJECT_THUMBNAIL_FIELD, FIRESTORE_PROJECT_GALLERY_FIELD
 *   FIRESTORE_MEMBER_PHOTO_FIELD (default photoStorageUrl), FIRESTORE_MEMBER_NAME_FIELD (default name)
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

type Args = {
  dryRun: boolean;
  storageOnly: boolean;
  includePosts: boolean;
  includeProjects: boolean;
  includeMembers: boolean;
};

function parseArgs(argv: string[]): Args {
  const postsOnly = argv.includes("--posts-only");
  const projectsOnly = argv.includes("--projects-only");
  const membersOnly = argv.includes("--members-only");
  const anyOnly = postsOnly || projectsOnly || membersOnly;

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: tsx scripts/migrate-photos-to-firebase.ts [options]

Options:
  --dry-run          Log actions only (no Storage uploads, no Firestore writes)
  --storage-only     Upload to Storage only; do not update Firestore
  --posts-only       Only post galleries
  --projects-only    Only project galleries
  --members-only     Only member photos (walks Firestore member docs + local files)
  --help, -h         This message

Default (no *-only flags): posts, projects, and members.
`);
    process.exit(0);
  }

  return {
    dryRun: argv.includes("--dry-run"),
    storageOnly: argv.includes("--storage-only"),
    includePosts: !anyOnly || postsOnly,
    includeProjects: !anyOnly || projectsOnly,
    includeMembers: !anyOnly || membersOnly,
  };
}

function loadServiceAccount(): Record<string, unknown> {
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  const p = explicit || gac;
  if (!p) {
    throw new Error(
      "Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_PATH to your Firebase service account JSON file."
    );
  }
  const abs = path.isAbsolute(p) ? p : path.join(repoRoot, p);
  const raw = fs.readFileSync(abs, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function resolveRepoPath(envKey: string, primaryRelative: string, fallbackRelative: string): string {
  const explicit = process.env[envKey]?.trim();
  if (explicit) {
    return path.isAbsolute(explicit) ? explicit : path.join(repoRoot, explicit);
  }
  const primary = path.join(repoRoot, primaryRelative);
  if (fs.existsSync(primary)) return primary;
  return path.join(repoRoot, fallbackRelative);
}

function numericDirs(root: string): number[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => parseInt(d.name, 10))
    .sort((a, b) => a - b);
}

function listWebpGallery(dir: string): { thumbnail: string | null; photos: string[] } {
  const thumb = path.join(dir, "thumbnail.webp");
  const photos: string[] = [];
  for (let i = 0; ; i++) {
    const f = path.join(dir, `${i}.webp`);
    if (!fs.existsSync(f)) break;
    photos.push(f);
  }
  return {
    thumbnail: fs.existsSync(thumb) ? thumb : null,
    photos,
  };
}

/** Same long-lived download URL style as Firebase client uploads. */
function storageDownloadUrl(bucketName: string, objectPath: string, downloadToken: string): string {
  const encoded = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${downloadToken}`;
}

function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

/** Resolve bucket: env override, else probe Firebase default names (newer *.firebasestorage.app vs *.appspot.com). */
async function resolveStorageBucketName(app: App, projectId: string): Promise<string> {
  const storage = getStorage(app);
  const explicit = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  const candidates = explicit
    ? [explicit]
    : [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`];

  for (const name of candidates) {
    const [ok] = await storage.bucket(name).exists();
    if (ok) return name;
  }

  const hint = explicit
    ? `FIREBASE_STORAGE_BUCKET=${explicit} was not found. Check the bucket id in Firebase Console → Storage.`
    : `No default bucket for project "${projectId}". Enable Storage (Firebase Console → Build → Storage) or set FIREBASE_STORAGE_BUCKET. Tried: ${candidates.join(", ")}.`;

  throw new Error(hint);
}

async function uploadFile(
  app: App,
  bucketName: string,
  objectPath: string,
  localPath: string,
  dryRun: boolean
): Promise<string> {
  if (dryRun) {
    return `[dry-run] gs://${bucketName}/${objectPath}`;
  }
  const bucket = getStorage(app).bucket(bucketName);
  const dest = bucket.file(objectPath);
  const buf = fs.readFileSync(localPath);
  const downloadToken = randomUUID();
  const contentType = guessContentType(localPath);

  await dest.save(buf, {
    resumable: false,
    metadata: {
      contentType,
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadToken: downloadToken,
      },
    },
  });

  return storageDownloadUrl(bucketName, objectPath, downloadToken);
}

async function migrateKind(
  app: App,
  args: Args,
  bucketName: string,
  kind: "posts" | "projects",
  publicImagesDir: string,
  collection: string,
  thumbField: string,
  galleryField: string,
  storageRoot: string
): Promise<void> {
  const ids = numericDirs(publicImagesDir);
  const root = storageRoot.replace(/^\/+|\/+$/g, "");
  const prefix = root ? `${root}/` : "";

  console.log(`\n=== ${kind} (${ids.length} folders) ← ${publicImagesDir}\n`);

  for (const id of ids) {
    const dir = path.join(publicImagesDir, String(id));
    const { thumbnail, photos } = listWebpGallery(dir);
    if (!thumbnail && photos.length === 0) {
      console.log(`#${id}: skip (no thumbnail.webp and no numbered .webp)`);
      continue;
    }

    const thumbUrl = thumbnail
      ? await uploadFile(
          app,
          bucketName,
          `${prefix}${kind}/${id}/thumbnail.webp`,
          thumbnail,
          args.dryRun
        )
      : null;

    const galleryUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i]!;
      const objectPath = `${prefix}${kind}/${id}/${i}.webp`;
      galleryUrls.push(await uploadFile(app, bucketName, objectPath, p, args.dryRun));
    }

    const payload: Record<string, unknown> = {};
    if (thumbUrl) payload[thumbField] = thumbUrl;
    payload[galleryField] = galleryUrls;

    console.log(`#${id}: thumbnail=${!!thumbUrl} gallery=${galleryUrls.length} → ${collection}/${id}`);

    if (!args.storageOnly && !args.dryRun) {
      await getFirestore(app)
        .collection(collection)
        .doc(String(id))
        .set(payload, { merge: true });
    } else if (args.dryRun && !args.storageOnly) {
      console.log(`  [dry-run] would merge Firestore ${collection}/${id}:`, Object.keys(payload));
    }
  }
}

/**
 * Strip line breaks and trim ends. Intentionally does NOT collapse internal spaces — filenames follow
 * `name.replaceAll(" ", "_")` like the site, so "Bogdan  X" must stay two spaces → `Bogdan__X.webp`.
 */
function normalizeMemberDisplayName(raw: string): string {
  return raw.replace(/\r?\n/g, "").trim();
}

/** Member image basename matches `despre-noi`: name with spaces → underscores. */
function memberPhotoBasename(displayName: string): string {
  return `${normalizeMemberDisplayName(displayName).replaceAll(" ", "_")}.webp`;
}

async function migrateMembers(
  app: App,
  args: Args,
  bucketName: string,
  membersDir: string,
  collection: string,
  nameField: string,
  photoField: string,
  storageRoot: string
): Promise<void> {
  const root = storageRoot.replace(/^\/+|\/+$/g, "");
  const prefix = root ? `${root}/` : "";

  console.log(`\n=== members (Firestore → files) ← ${membersDir}\n`);

  if (!fs.existsSync(membersDir)) {
    console.log("Members image directory missing; skip.");
    return;
  }

  const db = getFirestore(app);
  const snap = await db.collection(collection).get();
  let matched = 0;
  let skippedNoName = 0;
  let skippedNoFile = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const name = data[nameField];
    if (typeof name !== "string" || !normalizeMemberDisplayName(name)) {
      skippedNoName++;
      continue;
    }

    const basename = memberPhotoBasename(name);
    const localPath = path.join(membersDir, basename);
    if (!fs.existsSync(localPath)) {
      skippedNoFile++;
      console.log(`doc ${doc.id}: no file ${basename}`);
      continue;
    }

    const objectPath = `${prefix}members/${doc.id}/photo.webp`;
    const url = await uploadFile(app, bucketName, objectPath, localPath, args.dryRun);
    matched++;

    console.log(`doc ${doc.id} (${name}): → ${photoField}`);

    if (!args.storageOnly && !args.dryRun) {
      await doc.ref.set({ [photoField]: url }, { merge: true });
    } else if (args.dryRun && !args.storageOnly) {
      console.log(`  [dry-run] would merge ${collection}/${doc.id}: ${photoField}`);
    }
  }

  console.log(
    `\nMembers summary: updated/found ${matched}, skipped (no ${nameField}) ${skippedNoName}, skipped (no file) ${skippedNoFile}, total docs ${snap.size}`
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const sa = loadServiceAccount();
  const projectId = sa.project_id as string | undefined;
  if (!projectId) throw new Error("Service account JSON must include project_id.");

  const storageRoot = (process.env.FIREBASE_STORAGE_ROOT || "").trim();

  const postsCollection = process.env.FIRESTORE_POSTS_COLLECTION?.trim() || "posts";
  const projectsCollection = process.env.FIRESTORE_PROJECTS_COLLECTION?.trim() || "projects";
  const membersCollection = process.env.FIRESTORE_MEMBERS_COLLECTION?.trim() || "members";

  const postThumbField = process.env.FIRESTORE_POST_THUMBNAIL_FIELD?.trim() || "thumbnailStorageUrl";
  const postGalleryField = process.env.FIRESTORE_POST_GALLERY_FIELD?.trim() || "galleryStorageUrls";
  const projectThumbField =
    process.env.FIRESTORE_PROJECT_THUMBNAIL_FIELD?.trim() || "thumbnailStorageUrl";
  const projectGalleryField =
    process.env.FIRESTORE_PROJECT_GALLERY_FIELD?.trim() || "galleryStorageUrls";
  const memberPhotoField = process.env.FIRESTORE_MEMBER_PHOTO_FIELD?.trim() || "photoStorageUrl";
  const memberNameField = process.env.FIRESTORE_MEMBER_NAME_FIELD?.trim() || "name";

  let app: App;
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(sa as Parameters<typeof cert>[0]),
      projectId,
    });
  } else {
    app = getApps()[0]!;
  }

  const bucketName = await resolveStorageBucketName(app, projectId);

  const postsDir = resolveRepoPath(
    "MIGRATE_IMAGES_POSTS_DIR",
    "deploy/public/images/posts",
    "public/images/posts"
  );
  const projectsDir = resolveRepoPath(
    "MIGRATE_IMAGES_PROJECTS_DIR",
    "deploy/public/images/projects",
    "public/images/projects"
  );
  const membersDir = resolveRepoPath(
    "MIGRATE_IMAGES_MEMBERS_DIR",
    "public/images/members",
    "public/images/members"
  );

  console.log("Bucket:", bucketName);
  console.log("Storage prefix:", storageRoot || "(none)");
  console.log("Posts dir:", postsDir);
  console.log("Projects dir:", projectsDir);
  console.log("Members dir:", membersDir);
  console.log("Dry run:", args.dryRun);
  console.log("Storage only (no Firestore):", args.storageOnly);
  console.log(
    "Scope:",
    [
      args.includePosts && "posts",
      args.includeProjects && "projects",
      args.includeMembers && "members",
    ]
      .filter(Boolean)
      .join(", ") || "(none)"
  );

  if (args.includePosts) {
    await migrateKind(
      app,
      args,
      bucketName,
      "posts",
      postsDir,
      postsCollection,
      postThumbField,
      postGalleryField,
      storageRoot
    );
  }
  if (args.includeProjects) {
    await migrateKind(
      app,
      args,
      bucketName,
      "projects",
      projectsDir,
      projectsCollection,
      projectThumbField,
      projectGalleryField,
      storageRoot
    );
  }
  if (args.includeMembers) {
    await migrateMembers(
      app,
      args,
      bucketName,
      membersDir,
      membersCollection,
      memberNameField,
      memberPhotoField,
      storageRoot
    );
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
