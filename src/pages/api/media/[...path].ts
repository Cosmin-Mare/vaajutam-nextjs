import type { NextApiRequest, NextApiResponse } from "next";
import { firebaseDownloadUrl, isSafeObjectName } from "@/lib/cached-media-url";

const MAX_BYTES = 8 * 1024 * 1024;

function objectNameFromQuery(path: string | string[] | undefined): string | null {
  const parts = Array.isArray(path) ? path : path ? [path] : [];
  if (parts.length === 0) return null;
  let name = "";
  try {
    name = parts.map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return null;
  }
  return isSafeObjectName(name) ? name : null;
}

/** Same-origin cache for Firebase Storage images. Browsers and the CDN hit this, not Storage. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  const objectName = objectNameFromQuery(req.query.path);
  if (!objectName) return res.status(400).end();

  let upstream: Response;
  try {
    upstream = await fetch(firebaseDownloadUrl(objectName), { redirect: "error" });
  } catch (e) {
    console.error("[media] fetch", objectName, e);
    return res.status(502).end();
  }

  if (!upstream.ok) {
    return res.status(upstream.status === 404 ? 404 : 502).end();
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim() || "";
  if (!contentType.startsWith("image/")) return res.status(415).end();

  const lengthHeader = upstream.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_BYTES) return res.status(413).end();

  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.length > MAX_BYTES) return res.status(413).end();

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("CDN-Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(200);
  if (req.method === "HEAD") return res.end();
  return res.send(bytes);
}
