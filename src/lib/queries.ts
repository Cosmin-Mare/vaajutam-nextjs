import { getMembers, getPosts, getProjects, isDbConfigured } from "@/lib/db";
import type { Member, Post, Project } from "@/lib/types";

let dbEnvWarned = false;
function warnIfNoDb() {
  if (dbEnvWarned) return;
  if (process.env.NODE_ENV === "development" && !isDbConfigured()) {
    dbEnvWarned = true;
    console.warn(
      "[db] No DB_USER / DB_HOST / DB_PASSWORD in .env.local — database features are disabled."
    );
  }
}

export async function loadPosts(): Promise<Post[]> {
  if (!isDbConfigured()) {
    warnIfNoDb();
    return [];
  }
  try {
    return await getPosts();
  } catch (e) {
    console.error("loadPosts", e);
    return [];
  }
}

export async function loadMembers(): Promise<Member[]> {
  if (!isDbConfigured()) {
    warnIfNoDb();
    return [];
  }
  try {
    return await getMembers();
  } catch (e) {
    console.error("loadMembers", e);
    return [];
  }
}

export async function loadProjects(): Promise<Project[]> {
  if (!isDbConfigured()) {
    warnIfNoDb();
    return [];
  }
  try {
    return await getProjects();
  } catch (e) {
    console.error("loadProjects", e);
    return [];
  }
}

export async function getPostById(id: number): Promise<Post | undefined> {
  const posts = await loadPosts();
  return posts.find((p) => p.id === id);
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const projects = await loadProjects();
  return projects.find((p) => p.id === id);
}
