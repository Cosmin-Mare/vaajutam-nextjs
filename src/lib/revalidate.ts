/**
 * ISR interval for pages that read a whole Firestore collection.
 * 60s revalidation re-reads every document on each warm page; the CMS does not
 * change that often, and those reads are what pushes the project past the free quota.
 */
export const LIST_REVALIDATE = 60 * 30;

/** Static HTML fragments, partners page, and similar. */
export const FRAGMENT_REVALIDATE = 60 * 30;

/** Team / about page. */
export const MEMBERS_REVALIDATE = 60 * 30;
