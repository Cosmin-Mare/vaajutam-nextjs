import type { Post, Project } from "@/lib/types";

export const CMS_MEDIA_FALLBACK = "/images/logo.png";

export function resolvePostGallery(post: Post): { thumbnail: string; photos: string[] } {
  return {
    thumbnail: post.thumbnailUrl ?? CMS_MEDIA_FALLBACK,
    photos: post.galleryUrls ?? [],
  };
}

export function resolveProjectGallery(project: Project): { thumbnail: string; photos: string[] } {
  return {
    thumbnail: project.thumbnailUrl ?? CMS_MEDIA_FALLBACK,
    photos: project.galleryUrls ?? [],
  };
}
