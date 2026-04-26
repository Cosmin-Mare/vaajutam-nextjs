import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type Timestamp,
} from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase-admin";
import type { Member, Post, Project, SponsorPartner } from "@/lib/types";

function postsCollection(): string {
  return process.env.FIRESTORE_POSTS_COLLECTION?.trim() || "posts";
}
function projectsCollection(): string {
  return process.env.FIRESTORE_PROJECTS_COLLECTION?.trim() || "projects";
}
function membersCollection(): string {
  return process.env.FIRESTORE_MEMBERS_COLLECTION?.trim() || "members";
}
function newsletterCollection(): string {
  return process.env.FIRESTORE_NEWSLETTER_COLLECTION?.trim() || "newsletter_emails";
}
function sponsorPartnersCollection(): string {
  return process.env.FIRESTORE_SPONSOR_PARTNERS_COLLECTION?.trim() || "sponsor_partners";
}
function sponsorLogoField(): string {
  return process.env.FIRESTORE_SPONSOR_LOGO_FIELD?.trim() || "logoStorageUrl";
}

function postThumbField(): string {
  return process.env.FIRESTORE_POST_THUMBNAIL_FIELD?.trim() || "thumbnailStorageUrl";
}
function postGalleryField(): string {
  return process.env.FIRESTORE_POST_GALLERY_FIELD?.trim() || "galleryStorageUrls";
}
function projectThumbField(): string {
  return process.env.FIRESTORE_PROJECT_THUMBNAIL_FIELD?.trim() || "thumbnailStorageUrl";
}
function projectGalleryField(): string {
  return process.env.FIRESTORE_PROJECT_GALLERY_FIELD?.trim() || "galleryStorageUrls";
}
function memberPhotoField(): string {
  return process.env.FIRESTORE_MEMBER_PHOTO_FIELD?.trim() || "photoStorageUrl";
}

function db() {
  return getFirestore(getAdminApp());
}

function coerceDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === "object" && "toDate" in v && typeof (v as Timestamp).toDate === "function") {
    return (v as Timestamp).toDate();
  }
  if (typeof v === "string" || typeof v === "number") return new Date(v);
  return new Date();
}

function coerceBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  return false;
}

/** Firestore field is `facebookLink`; older docs may use `link`. */
function socialUrlFromDoc(data: DocumentData): string {
  const fb = data.facebookLink;
  const legacy = data.link;
  const pick = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : "");
  const a = pick(fb);
  if (a) return a;
  return pick(legacy);
}

function docToPost(id: string, data: DocumentData): Post {
  const thumbKey = postThumbField();
  const galleryKey = postGalleryField();
  const thumb = data[thumbKey];
  const gallery = data[galleryKey];
  return {
    id: Number(id),
    title: String(data.title ?? ""),
    content: String(data.content ?? ""),
    date: coerceDate(data.date),
    link: socialUrlFromDoc(data),
    thumbnailUrl: typeof thumb === "string" ? thumb : undefined,
    galleryUrls: Array.isArray(gallery)
      ? gallery.filter((u): u is string => typeof u === "string")
      : undefined,
  };
}

function docToProject(id: string, data: DocumentData): Project {
  const thumbKey = projectThumbField();
  const galleryKey = projectGalleryField();
  const thumb = data[thumbKey];
  const gallery = data[galleryKey];
  return {
    id: Number(id),
    title: String(data.title ?? ""),
    content: String(data.content ?? ""),
    type: (data.type as string) ?? "p",
    thumbnailUrl: typeof thumb === "string" ? thumb : undefined,
    galleryUrls: Array.isArray(gallery)
      ? gallery.filter((u): u is string => typeof u === "string")
      : undefined,
  };
}

function pickNonEmptyString(...candidates: unknown[]): string {
  for (const v of candidates) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return "";
}

function sponsorRoleFromDoc(data: DocumentData): "sponsor" | "partner" {
  const raw = data.kind ?? data.category ?? data.role ?? data.group;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "partner" || s === "partener" || s === "p") return "partner";
    if (s === "sponsor" || s === "s") return "sponsor";
  }
  if (data.isPartner === true || data.partener === true) return "partner";
  return "sponsor";
}

function websiteUrlFromDoc(data: DocumentData): string | null {
  const u = pickNonEmptyString(
    data.websiteUrl,
    data.website,
    data.url,
    data.externalUrl,
    data.link
  );
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return null;
}

function docToSponsorPartner(id: string, data: DocumentData): SponsorPartner {
  const logoKey = sponsorLogoField();
  const logoRaw = data[logoKey];
  const name = pickNonEmptyString(data.name, data.title, data.companyName) || `ID ${id}`;
  const orderRaw = data.order ?? data.sortOrder ?? data.rank;
  const sortKey =
    typeof orderRaw === "number" && !Number.isNaN(orderRaw)
      ? orderRaw
      : typeof orderRaw === "string" && orderRaw.trim() !== ""
        ? Number.parseFloat(orderRaw) || Number.MAX_SAFE_INTEGER
        : Number.MAX_SAFE_INTEGER;
  return {
    id: Number(id),
    name,
    logoUrl: typeof logoRaw === "string" && logoRaw.trim() !== "" ? logoRaw.trim() : undefined,
    websiteUrl: websiteUrlFromDoc(data),
    role: sponsorRoleFromDoc(data),
    sortKey,
  };
}

function docToMember(id: string, data: DocumentData): Member {
  const photoKey = memberPhotoField();
  const photo = data[photoKey];
  return {
    id: Number(id),
    name: String(data.name ?? ""),
    status: String(data.status ?? ""),
    is_council: coerceBool(data.is_council ?? data.isCouncil),
    link: (() => {
      const u = socialUrlFromDoc(data);
      return u === "" ? null : u;
    })(),
    photoUrl: typeof photo === "string" ? photo : undefined,
  };
}

export async function firestoreGetPosts(): Promise<Post[]> {
  const snap = await db().collection(postsCollection()).get();
  const posts = snap.docs.map((d) => docToPost(d.id, d.data()));
  posts.sort((a, b) => b.date.getTime() - a.date.getTime());
  return posts;
}

export async function firestoreGetPostById(id: number): Promise<Post | undefined> {
  const snap = await db().collection(postsCollection()).doc(String(id)).get();
  if (!snap.exists) return undefined;
  return docToPost(snap.id, snap.data()!);
}

export async function firestoreGetProjects(): Promise<Project[]> {
  const snap = await db().collection(projectsCollection()).get();
  const projects = snap.docs.map((d) => docToProject(d.id, d.data()));
  projects.sort((a, b) => a.id - b.id);
  return projects;
}

export async function firestoreGetProjectById(id: number): Promise<Project | undefined> {
  const snap = await db().collection(projectsCollection()).doc(String(id)).get();
  if (!snap.exists) return undefined;
  return docToProject(snap.id, snap.data()!);
}

export async function firestoreGetMembers(): Promise<Member[]> {
  const snap = await db().collection(membersCollection()).get();
  const members = snap.docs.map((d) => docToMember(d.id, d.data()));
  members.sort((a, b) => a.id - b.id);
  return members;
}

export async function firestoreGetSponsorPartners(): Promise<SponsorPartner[]> {
  const snap = await db().collection(sponsorPartnersCollection()).get();
  const rows = snap.docs.map((d) => docToSponsorPartner(d.id, d.data()));
  rows.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return a.id - b.id;
  });
  return rows;
}

export async function firestoreInsertNewsletterEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) return;
  await db().collection(newsletterCollection()).add({
    email: trimmed,
    createdAt: FieldValue.serverTimestamp(),
    source: "website",
  });
}
