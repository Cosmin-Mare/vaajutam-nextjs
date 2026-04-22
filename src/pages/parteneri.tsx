import fs from "node:fs";
import path from "node:path";
import type { GetServerSideProps } from "next";
import Head from "next/head";

type Props = { html: string };

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const html = fs.readFileSync(
    path.join(process.cwd(), "content", "parteneri-fragment.html"),
    "utf8"
  );
  return { props: { html } };
};

export default function ParteneriPage({ html }: Props) {
  return (
    <>
      <Head>
        <title>Parteneri | Vă ajutam din Dej</title>
      </Head>
      <div className="parteneri-legacy" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
