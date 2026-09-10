export type Post = {
  id: number;
  title: string;
  content: string;
  date: Date;
  link: string;
  /** Firebase Storage download URL; `null` when missing (JSON-safe for SSG). */
  thumbnailUrl: string | null;
  galleryUrls: string[];
};

export type Member = {
  id: number;
  name: string;
  status: string;
  is_council: boolean;
  link: string | null;
  /** Firebase Storage member portrait; `null` when absent (JSON-serializable for SSG props). */
  photoUrl: string | null;
};

export type Project = {
  id: number;
  title: string;
  content: string;
  type: "a" | "r" | (string & {});
  thumbnailUrl: string | null;
  galleryUrls: string[];
};

/** Row from `sponsor_partners` (or env collection); shown on /parteneri. */
export type SponsorPartner = {
  id: number;
  name: string;
  /** Firebase Storage download URL (`logoStorageUrl` in Firestore). */
  logoUrl: string | null;
  websiteUrl: string | null;
  role: "sponsor" | "partner";
  /** Sort order when field `order` / `sortOrder` exists; lower first. */
  sortKey: number;
};
