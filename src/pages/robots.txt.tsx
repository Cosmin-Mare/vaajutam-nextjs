import type { GetServerSideProps } from "next";
import { getSiteUrl } from "@/lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const base = getSiteUrl();
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
  res.write(body);
  res.end();
  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
