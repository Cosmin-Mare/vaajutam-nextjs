import { CumPotAjutaForm } from "@/components/cum-pot-ajuta/CumPotAjutaForm";
import { CumPotIntro } from "@/components/cum-pot-ajuta/CumPotIntro";
import { DonationSections } from "@/components/cum-pot-ajuta/DonationSections";
import { SeoHead } from "@/components/site/SeoHead";
import { SITE_NAME } from "@/lib/seo";

const PAGE_DESCRIPTION =
  "Cum poți ajuta: donează online, devino voluntar sau sprijină proiectele asociației Vă Ajutăm din Dej.";

export default function CumPotAjutaPage() {
  return (
    <>
      <SeoHead
        title={`Cum poți ajuta | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/cum-pot-ajuta"
      />
      <CumPotIntro />
      <CumPotAjutaForm />
      <hr />
      <DonationSections />
    </>
  );
}
