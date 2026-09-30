import { cachedMediaUrl } from "@/lib/cached-media-url";
import type { Post, Project } from "@/lib/types";

export const CMS_MEDIA_FALLBACK = "/images/logo.png";

export function resolvePostGallery(post: Post): { thumbnail: string; photos: string[] } {
  return {
    thumbnail: cachedMediaUrl(post.thumbnailUrl) || CMS_MEDIA_FALLBACK,
    photos: (post.galleryUrls ?? []).map((url) => cachedMediaUrl(url)).filter(Boolean),
  };
}

export function resolveProjectGallery(project: Project): { thumbnail: string; photos: string[] } {
  return {
    thumbnail: cachedMediaUrl(project.thumbnailUrl) || CMS_MEDIA_FALLBACK,
    photos: (project.galleryUrls ?? []).map((url) => cachedMediaUrl(url)).filter(Boolean),
  };
}
