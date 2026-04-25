import type { GetServerSideProps } from "next";
import { getSiteUrl } from "@/lib/seo";
import { loadPosts, loadProjects } from "@/lib/queries";

function xmlEscape(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const STATIC_PATHS = [
  "/",
  "/noutati",
  "/proiecte",
  "/despre-noi",
  "/parteneri",
  "/contact",
  "/cum-pot-ajuta",
  "/motive",
];

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const base = getSiteUrl();
  const [projects, posts] = await Promise.all([loadProjects(), loadPosts()]);
  const urls: string[] = [
    ...STATIC_PATHS.map((p) => `${base}${p}`),
    ...projects.map((p) => `${base}/proiect/${p.id}`),
    ...posts.map((p) => `${base}/noutate/${p.id}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (loc) => `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
  res.setHeader("Content-Type", "text/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.write(body);
  res.end();
  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
