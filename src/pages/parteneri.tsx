import fs from "node:fs";
import path from "node:path";
import type { GetStaticProps } from "next";
import { SeoHead } from "@/components/site/SeoHead";
import { FRAGMENT_REVALIDATE } from "@/lib/revalidate";
import { SITE_NAME } from "@/lib/seo";

type Props = { html: string };

const PAGE_DESCRIPTION =
  "Parteneri și sponsori care susțin proiectele asociației Vă Ajutăm din Dej — mulțumim comunității și firmelor din Dej și Cluj.";

export const getStaticProps: GetStaticProps<Props> = async () => {
  const html = fs.readFileSync(
    path.join(process.cwd(), "content", "parteneri-fragment.html"),
    "utf8"
  );
  return { props: { html }, revalidate: FRAGMENT_REVALIDATE };
};

export default function ParteneriPage({ html }: Props) {
  return (
    <>
      <SeoHead
        title={`Parteneri | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/parteneri"
      />
      <div className="parteneri-legacy" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
