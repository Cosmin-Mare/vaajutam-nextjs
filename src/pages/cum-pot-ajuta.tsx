import Head from "next/head";
import { CumPotAjutaForm } from "@/components/cum-pot-ajuta/CumPotAjutaForm";
import { CumPotIntro } from "@/components/cum-pot-ajuta/CumPotIntro";
import { DonationSections } from "@/components/cum-pot-ajuta/DonationSections";

export default function CumPotAjutaPage() {
  return (
    <>
      <Head>
        <title>Cum poți ajuta | Vă ajutam din Dej</title>
      </Head>
      <CumPotIntro />
      <CumPotAjutaForm />
      <hr />
      <DonationSections />
    </>
  );
}
