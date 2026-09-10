import { FieldValue, getFirestore, type DocumentData } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import {
  facebookPageId,
  facebookPostImageUrls,
  facebookPostPermalink,
  fetchFacebookPagePosts,
  type FacebookPost,
} from "@/lib/facebook";
import { storageRootPrefix, uploadImageBuffer } from "@/lib/storage-upload";

export type FacebookSyncResult = {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  createdIds: number[];
  errors: string[];
};

function postsCollection(): string {
  return process.env.FIRESTORE_POSTS_COLLECTION?.trim() || "posts";
}

function postThumbField(): string {
  return process.env.FIRESTORE_POST_THUMBNAIL_FIELD?.trim() || "thumbnailStorageUrl";
}

function postGalleryField(): string {
  return process.env.FIRESTORE_POST_GALLERY_FIELD?.trim() || "galleryStorageUrls";
}

function db() {
  return getFirestore(getAdminApp());
}

function syncLimit(): number {
  const n = Number(process.env.FACEBOOK_SYNC_LIMIT ?? "25");
  if (!Number.isFinite(n)) return 25;
  return Math.min(Math.max(Math.trunc(n), 1), 100);
}

function isDryRun(): boolean {
  const v = process.env.FACEBOOK_SYNC_DRY_RUN?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function isWeakTitleLine(line: string): boolean {
  const stripped = line
    .replace(/[#@][\p{L}\p{N}_]+/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\s.,!?„”"':;()\-–—]+/g, "");
  return stripped.length < 8;
}

export function titleFromFacebookMessage(message: string): string {
  const lines = message
    .split(/\r?\n/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chosen =
    lines.find((line) => !isWeakTitleLine(line)) ?? lines[0] ?? "";
  if (!chosen) return "Noutate";
  if (chosen.length <= 90) return chosen;
  const cut = chosen.slice(0, 87);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function numericPostIdFromGraphId(facebookPostId: string): string {
  return facebookPostId.includes("_") ? facebookPostId.split("_").pop() || facebookPostId : facebookPostId;
}

function contentFromFacebookPost(post: FacebookPost): string {
  const message = post.message?.trim() ?? "";
  if (message) return message;
  const story = post.story?.trim() ?? "";
  if (story) return story;
  return "Vezi postarea pe Facebook.";
}

function guessImageContentType(url: string, fallback: string): string {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".gif")) return "image/gif";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  return fallback || "image/jpeg";
}

function extForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "image/*,*/*;q=0.8" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").split(";")[0]?.trim() || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32) return null;
    return { buffer: buf, contentType: guessImageContentType(url, contentType) };
  } catch {
    return null;
  }
}

async function uploadPostImages(
  sitePostId: number,
  imageUrls: string[]
): Promise<{ thumbnailUrl?: string; galleryUrls: string[] }> {
  const cap = Math.min(imageUrls.length, 10);
  const prefix = storageRootPrefix();
  const galleryUrls: string[] = [];
  let thumbnailUrl: string | undefined;

  for (let i = 0; i < cap; i++) {
    const src = imageUrls[i]!;
    const downloaded = await downloadImage(src);
    if (!downloaded) continue;
    const ext = extForContentType(downloaded.contentType);
    const name = i === 0 ? `facebook-thumb.${ext}` : `facebook-${i}.${ext}`;
    const objectPath = `${prefix}posts/${sitePostId}/${name}`;
    const url = await uploadImageBuffer(objectPath, downloaded.buffer, downloaded.contentType);
    if (i === 0) thumbnailUrl = url;
    else galleryUrls.push(url);
  }

  return { thumbnailUrl, galleryUrls };
}

type ExistingPost = {
  docId: string;
  numericId: number;
  facebookPostId: string;
  facebookLink: string;
  importedFrom: string;
  hasThumbnail: boolean;
  title: string;
  date: Date;
};

function socialUrlFromDoc(data: DocumentData): string {
  const fb = data.facebookLink;
  const legacy = data.link;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "");
  return pick(fb) || pick(legacy);
}

function coerceDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date(0);
}

function existingFromDoc(docId: string, data: DocumentData): ExistingPost {
  const n = Number.parseInt(docId, 10);
  return {
    docId,
    numericId: Number.isNaN(n) ? 0 : n,
    facebookPostId: typeof data.facebookPostId === "string" ? data.facebookPostId : "",
    facebookLink: socialUrlFromDoc(data),
    importedFrom: typeof data.importedFrom === "string" ? data.importedFrom : "",
    hasThumbnail: typeof data[postThumbField()] === "string" && String(data[postThumbField()]).trim() !== "",
    title: String(data.title ?? ""),
    date: coerceDate(data.date),
  };
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function alreadyImported(existing: ExistingPost[], post: FacebookPost, permalink: string): ExistingPost | undefined {
  const numeric = numericPostIdFromGraphId(post.id);
  const incomingTitle = normalizeTitle(titleFromFacebookMessage(contentFromFacebookPost(post)));
  const incomingDate = new Date(post.created_time);
  return existing.find((row) => {
    if (row.facebookPostId && row.facebookPostId === post.id) return true;
    if (permalink && row.facebookLink && row.facebookLink === permalink) return true;
    if (numeric && row.facebookLink && row.facebookLink.includes(numeric)) return true;
    if (
      incomingTitle &&
      normalizeTitle(row.title) === incomingTitle &&
      Math.abs(row.date.getTime() - incomingDate.getTime()) < 72 * 3600 * 1000
    ) {
      return true;
    }
    return false;
  });
}

export async function syncFacebookPosts(): Promise<FacebookSyncResult> {
  const result: FacebookSyncResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    createdIds: [],
    errors: [],
  };

  const posts = await fetchFacebookPagePosts(syncLimit());
  result.fetched = posts.length;

  const snap = await db().collection(postsCollection()).get();
  const existing = snap.docs.map((d) => existingFromDoc(d.id, d.data()));
  let nextId = existing.reduce((max, row) => Math.max(max, row.numericId), 0) + 1;
  const dryRun = isDryRun();

  for (const post of posts) {
    try {
      const permalink = facebookPostPermalink(post);
      const match = alreadyImported(existing, post, permalink);
      if (match) {
        if (match.importedFrom === "facebook") {
          if (!dryRun) {
            const payload: Record<string, unknown> = {
              title: titleFromFacebookMessage(contentFromFacebookPost(post)),
              content: contentFromFacebookPost(post),
              date: new Date(post.created_time),
              facebookLink: permalink,
              facebookPostId: post.id,
              facebookPageId: facebookPageId(),
              importedFrom: "facebook",
              facebookSyncedAt: FieldValue.serverTimestamp(),
            };
            if (!match.hasThumbnail) {
              const images = facebookPostImageUrls(post);
              if (images.length > 0) {
                const media = await uploadPostImages(match.numericId || Number(match.docId), images);
                if (media.thumbnailUrl) payload[postThumbField()] = media.thumbnailUrl;
                if (media.galleryUrls.length > 0) payload[postGalleryField()] = media.galleryUrls;
              }
            }
            await db().collection(postsCollection()).doc(match.docId).set(payload, { merge: true });
          }
          result.updated += 1;
        } else {
          result.skipped += 1;
        }
        continue;
      }

      const title = titleFromFacebookMessage(contentFromFacebookPost(post));
      const content = contentFromFacebookPost(post);
      const id = nextId;

      if (!dryRun) {
        const payload: Record<string, unknown> = {
          title,
          content,
          date: new Date(post.created_time),
          facebookLink: permalink,
          facebookPostId: post.id,
          facebookPageId: facebookPageId(),
          importedFrom: "facebook",
          facebookSyncedAt: FieldValue.serverTimestamp(),
        };
        const images = facebookPostImageUrls(post);
        if (images.length > 0) {
          const media = await uploadPostImages(id, images);
          if (media.thumbnailUrl) payload[postThumbField()] = media.thumbnailUrl;
          if (media.galleryUrls.length > 0) payload[postGalleryField()] = media.galleryUrls;
        }
        await db().collection(postsCollection()).doc(String(id)).set(payload);
      }

      existing.push({
        docId: String(id),
        numericId: id,
        facebookPostId: post.id,
        facebookLink: permalink,
        importedFrom: "facebook",
        hasThumbnail: true,
        title,
        date: new Date(post.created_time),
      });
      result.created += 1;
      result.createdIds.push(id);
      nextId += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      result.errors.push(`${post.id}: ${msg}`);
    }
  }

  return result;
}
