import fs from "node:fs";
import path from "node:path";
import type { GetStaticProps } from "next";
import { ParteneriGrids } from "@/components/parteneri/ParteneriGrids";
import { SeoHead } from "@/components/site/SeoHead";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { loadSponsorPartners } from "@/lib/queries";
import { FRAGMENT_REVALIDATE, LIST_REVALIDATE } from "@/lib/revalidate";
import { SITE_NAME } from "@/lib/seo";
import type { SponsorPartner } from "@/lib/types";

type Props =
  | { mode: "static"; html: string }
  | {
      mode: "firebase";
      introHtml: string;
      sponsors: SponsorPartner[];
      partners: SponsorPartner[];
    };

const PAGE_DESCRIPTION =
  "Parteneri și sponsori care susțin proiectele asociației Vă Ajutăm din Dej — mulțumim comunității și firmelor din Dej și Cluj.";

const contentDir = (...segments: string[]) => path.join(process.cwd(), "content", ...segments);

export const getStaticProps: GetStaticProps<Props> = async () => {
  const staticHtml = fs.readFileSync(contentDir("parteneri-fragment.html"), "utf8");

  if (!isFirebaseConfigured()) {
    return { props: { mode: "static" as const, html: staticHtml }, revalidate: FRAGMENT_REVALIDATE };
  }

  let rows: SponsorPartner[] = [];
  try {
    rows = await loadSponsorPartners();
  } catch (e) {
    console.error("[parteneri] loadSponsorPartners", e);
  }

  if (rows.length === 0) {
    return { props: { mode: "static" as const, html: staticHtml }, revalidate: FRAGMENT_REVALIDATE };
  }

  const introHtml = fs.readFileSync(contentDir("parteneri-intro.html"), "utf8");
  const sponsors = rows.filter((r) => r.role === "sponsor");
  const partners = rows.filter((r) => r.role === "partner");

  return {
    props: {
      mode: "firebase" as const,
      introHtml,
      sponsors,
      partners,
    },
    revalidate: LIST_REVALIDATE,
  };
};

export default function ParteneriPage(props: Props) {
  return (
    <>
      <SeoHead
        title={`Parteneri | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/parteneri"
      />
      {props.mode === "static" ? (
        <div className="parteneri-legacy" dangerouslySetInnerHTML={{ __html: props.html }} />
      ) : (
        <div className="parteneri-legacy">
          <section id="main" className="">
            <div dangerouslySetInnerHTML={{ __html: props.introHtml }} />
            <ParteneriGrids sponsors={props.sponsors} partners={props.partners} />
          </section>
        </div>
      )}
    </>
  );
}

