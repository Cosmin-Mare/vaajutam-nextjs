import {
  firestoreGetMembers,
  firestoreGetPostById,
  firestoreGetPosts,
  firestoreGetProjectById,
  firestoreGetProjects,
} from "@/lib/firestore";
import { isFirebaseConfigured, warnIfNoFirebase } from "@/lib/firebase-admin";
import type { Member, Post, Project } from "@/lib/types";

export async function loadPosts(): Promise<Post[]> {
  if (!isFirebaseConfigured()) {
    warnIfNoFirebase();
    return [];
  }
  try {
    return await firestoreGetPosts();
  } catch (e) {
    console.error("loadPosts", e);
    return [];
  }
}

export async function loadMembers(): Promise<Member[]> {
  if (!isFirebaseConfigured()) {
    warnIfNoFirebase();
    return [];
  }
  try {
    return await firestoreGetMembers();
  } catch (e) {
    console.error("loadMembers", e);
    return [];
  }
}

export async function loadProjects(): Promise<Project[]> {
  if (!isFirebaseConfigured()) {
    warnIfNoFirebase();
    return [];
  }
  try {
    return await firestoreGetProjects();
  } catch (e) {
    console.error("loadProjects", e);
    return [];
  }
}

export async function getPostById(id: number): Promise<Post | undefined> {
  if (!isFirebaseConfigured()) return undefined;
  try {
    return await firestoreGetPostById(id);
  } catch (e) {
    console.error("getPostById", e);
    return undefined;
  }
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  if (!isFirebaseConfigured()) return undefined;
  try {
    return await firestoreGetProjectById(id);
  } catch (e) {
    console.error("getProjectById", e);
    return undefined;
  }
}
