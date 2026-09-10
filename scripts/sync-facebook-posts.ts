/**
 * Import new Facebook Page posts into Firestore (`posts`).
 *
 * Env (.env.local or GitHub Actions secrets):
 *   FACEBOOK_PAGE_ACCESS_TOKEN   Page token (pages_read_engagement, pages_read_user_content)
 *   FACEBOOK_PAGE_ID             default 109177514349706 (VoluntariDejeni)
 *   FACEBOOK_SYNC_LIMIT          default 25
 *   FACEBOOK_SYNC_DRY_RUN       1 to log without writing
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS
 *
 *   npm run facebook:sync
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(repoRoot, ".env.local") });
dotenv.config({ path: path.join(repoRoot, ".env") });

async function main() {
  const { syncFacebookPosts } = await import("../src/lib/facebook-sync");
  const result = await syncFacebookPosts();
  console.log(
    JSON.stringify(
      {
        ok: result.errors.length === 0,
        fetched: result.fetched,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        createdIds: result.createdIds,
        errors: result.errors,
      },
      null,
      2
    )
  );
  if (result.errors.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
