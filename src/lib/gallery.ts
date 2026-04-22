import fs from "node:fs";
import path from "node:path";

export function getNumberOfFilesInFolder(folder: string): number {
  try {
    return fs.readdirSync(folder).length;
  } catch {
    return 0;
  }
}

export function postPhotoPaths(postId: number, publicRoot: string) {
  const base = path.join(publicRoot, "images", "posts", String(postId));
  const n = Math.max(0, getNumberOfFilesInFolder(base) - 1);
  const photos: string[] = [];
  for (let i = 0; i < n; i++) {
    photos.push(`/images/posts/${postId}/${i}.webp`);
  }
  return {
    photos,
    thumbnail: `/images/posts/${postId}/thumbnail.webp`,
  };
}

export function projectPhotoPaths(projectId: number, publicRoot: string) {
  const base = path.join(publicRoot, "images", "projects", String(projectId));
  const n = Math.max(0, getNumberOfFilesInFolder(base) - 1);
  const photos: string[] = [];
  for (let i = 0; i < n; i++) {
    photos.push(`/images/projects/${projectId}/${i}.webp`);
  }
  return {
    photos,
    thumbnail: `/images/projects/${projectId}/thumbnail.webp`,
  };
}
