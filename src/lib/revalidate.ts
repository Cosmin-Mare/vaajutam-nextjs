/**
 * These pages re-read Firestore on this interval. The Hobby plan only includes
 * 4 CPU-hours a month for every project together, and rebuilding the same pages
 * every 30 minutes was often enough to crowd that allowance.
 */
export const LIST_REVALIDATE = 60 * 60 * 6;

/** Static HTML fragments, partners page, and similar. */
export const FRAGMENT_REVALIDATE = 60 * 60 * 6;

/** Team / about page. */
export const MEMBERS_REVALIDATE = 60 * 60 * 6;
