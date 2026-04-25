export type Post = {
  id: number;
  title: string;
  content: string;
  date: Date;
  link: string;
  /** Firebase Storage download URL (optional fallback to local asset in UI). */
  thumbnailUrl?: string;
  galleryUrls?: string[];
};

export type Member = {
  id: number;
  name: string;
  status: string;
  is_council: boolean;
  link: string | null;
  /** Firebase Storage member portrait. */
  photoUrl?: string;
};

export type Project = {
  id: number;
  title: string;
  content: string;
  type: "a" | "r" | (string & {});
  thumbnailUrl?: string;
  galleryUrls?: string[];
};
