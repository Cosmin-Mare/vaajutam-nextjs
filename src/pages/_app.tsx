import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { RouteProgress } from "@/components/site/RouteProgress";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import "bootstrap/dist/css/bootstrap.min.css";
import "@/styles/globals.css";
import "@/styles/skeletons.css";
import "@/styles/site.css";

export default function App({ Component, pageProps }: AppProps) {
  const siteStructuredData = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(), websiteJsonLd()],
  };

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#cb0069" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
      </Head>
      <Script
        src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
        integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-11476948418"
        strategy="afterInteractive"
      />
      <Script id="gtag-config" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-11476948418');
            gtag('event', 'conversion', { send_to: 'AW-11476948418/duUdCILElIoZEMKr0eAq' });
          `}
      </Script>
      <Header />
      <RouteProgress />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}
