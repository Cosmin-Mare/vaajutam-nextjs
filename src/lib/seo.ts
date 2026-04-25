/** Canonical base URL for production (sitemap, OG, JSON-LD). Override with `NEXT_PUBLIC_SITE_URL` if needed. */
export const PRODUCTION_SITE_URL = "https://vaajutamdindej.ro";

export const SITE_NAME = "Vă ajutăm din Dej";

export const DEFAULT_DESCRIPTION =
  "Asociația Vă Ajutăm din Dej — proiecte sociale, educație și sănătate în comunitate. Donează sau voluntariat în Dej, județul Cluj.";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (raw) return raw;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") {
    const host = process.env.VERCEL_URL?.replace(/\/$/, "");
    if (host) return `https://${host}`;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  const host = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (host) return `https://${host}`;

  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getSiteUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Short meta description from plain body text (DB post/project content). */
export function excerptFromPlainText(text: string, maxLen = 155): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const cut = normalized.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 48 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

export function organizationJsonLd() {
  const url = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: "Asociația Vă Ajutăm din Dej",
    alternateName: SITE_NAME,
    url,
    logo: absoluteUrl("/images/logo.png"),
    image: absoluteUrl("/images/logo.png"),
    description: DEFAULT_DESCRIPTION,
    sameAs: ["https://www.facebook.com/VoluntariDejeni"],
    email: "vaajutamdindej@gmail.com",
    telephone: "+40723290245",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Strada Unirii 13, Bl. D1, Ap. 11",
      addressLocality: "Dej",
      postalCode: "405200",
      addressRegion: "Cluj",
      addressCountry: "RO",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    description: DEFAULT_DESCRIPTION,
    publisher: { "@type": "Organization", name: "Asociația Vă Ajutăm din Dej" },
  };
}

export function newsArticleJsonLd(opts: {
  headline: string;
  url: string;
  imageUrls: string[];
  datePublished: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: opts.headline,
    datePublished: opts.datePublished,
    image: opts.imageUrls,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    publisher: {
      "@type": "Organization",
      name: "Asociația Vă Ajutăm din Dej",
      logo: { "@type": "ImageObject", url: absoluteUrl("/images/logo.png") },
    },
  };
}

export function projectCreativeWorkJsonLd(opts: {
  name: string;
  url: string;
  image: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: opts.name,
    url: opts.url,
    image: opts.image,
    ...(opts.description ? { description: opts.description } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${base}${it.path.startsWith("/") ? it.path : `/${it.path}`}`,
    })),
  };
}
