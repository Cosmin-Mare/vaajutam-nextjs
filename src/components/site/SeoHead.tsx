import Head from "next/head";
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/seo";

export type SeoHeadProps = {
  title: string;
  description: string;
  path: string;
  /** Path starting with `/` or absolute image URL for Open Graph. */
  ogImagePath?: string;
  ogType?: "website" | "article";
  articlePublishedTime?: string;
  articleModifiedTime?: string;
  noindex?: boolean;
};

export function SeoHead({
  title,
  description,
  path,
  ogImagePath = "/images/logo.png",
  ogType = "website",
  articlePublishedTime,
  articleModifiedTime,
  noindex,
}: SeoHeadProps) {
  const canonicalPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${getSiteUrl()}${canonicalPath === "/" ? "" : canonicalPath}`;
  const ogImage = absoluteUrl(ogImagePath);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {!noindex ? <link rel="canonical" href={canonical} /> : null}
      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {!noindex ? <meta property="og:url" content={canonical} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ro_RO" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {articlePublishedTime ? (
        <meta property="article:published_time" content={articlePublishedTime} />
      ) : null}
      {articleModifiedTime ? (
        <meta property="article:modified_time" content={articleModifiedTime} />
      ) : null}
    </Head>
  );
}
