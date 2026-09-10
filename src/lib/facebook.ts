const DEFAULT_GRAPH_VERSION = "v21.0";
const DEFAULT_PAGE_ID = "109177514349706";

export type FacebookAttachment = {
  media_type?: string;
  type?: string;
  url?: string;
  media?: { image?: { src?: string } };
  subattachments?: { data?: FacebookAttachment[] };
};

export type FacebookPost = {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  updated_time?: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: { data?: FacebookAttachment[] };
};

type GraphErrorBody = {
  error?: { message?: string; type?: string; code?: number };
};

function graphVersion(): string {
  return process.env.FACEBOOK_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
}

export function facebookPageId(): string {
  return process.env.FACEBOOK_PAGE_ID?.trim() || DEFAULT_PAGE_ID;
}

export function facebookPageAccessToken(): string {
  const token =
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() ||
    process.env.FACEBOOK_ACCESS_TOKEN?.trim() ||
    "";
  if (!token) {
    throw new Error("Set FACEBOOK_PAGE_ACCESS_TOKEN (Page access token with pages_read_engagement).");
  }
  return token;
}

function graphUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = graphUrl(path, params);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = (await res.json()) as T & GraphErrorBody;
  if (!res.ok || body.error) {
    const msg = body.error?.message || `Facebook Graph HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

function walkAttachmentImages(atts: FacebookAttachment[] | undefined, into: string[]): void {
  for (const a of atts ?? []) {
    const src = a.media?.image?.src;
    if (src && /^https?:\/\//i.test(src) && !into.includes(src)) into.push(src);
    walkAttachmentImages(a.subattachments?.data, into);
  }
}

export function facebookPostImageUrls(post: FacebookPost): string[] {
  const urls: string[] = [];
  if (post.full_picture && /^https?:\/\//i.test(post.full_picture)) urls.push(post.full_picture);
  walkAttachmentImages(post.attachments?.data, urls);
  return urls;
}

export function facebookPostPermalink(post: FacebookPost): string {
  if (post.permalink_url?.trim()) return post.permalink_url.trim();
  const numeric = post.id.includes("_") ? post.id.split("_").pop() : post.id;
  return `https://www.facebook.com/${facebookPageId()}/posts/${numeric}`;
}

const POST_FIELDS = [
  "id",
  "message",
  "story",
  "created_time",
  "updated_time",
  "permalink_url",
  "full_picture",
  "attachments{media_type,type,media,url,subattachments}",
].join(",");

export async function fetchFacebookPagePosts(limit: number): Promise<FacebookPost[]> {
  const token = facebookPageAccessToken();
  const pageId = facebookPageId();
  const wanted = Math.min(Math.max(limit, 1), 100);
  const posts: FacebookPost[] = [];
  let after: string | undefined;

  while (posts.length < wanted) {
    const params: Record<string, string> = {
      access_token: token,
      fields: POST_FIELDS,
      limit: String(Math.min(25, wanted - posts.length)),
    };
    if (after) params.after = after;
    const page = await graphGet<{
      data?: FacebookPost[];
      paging?: { cursors?: { after?: string }; next?: string };
    }>(`/${encodeURIComponent(pageId)}/published_posts`, params);
    const batch = page.data ?? [];
    if (batch.length === 0) break;
    posts.push(...batch);
    after = page.paging?.cursors?.after;
    if (!page.paging?.next || !after) break;
  }

  return posts.slice(0, wanted);
}
