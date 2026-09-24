import { CumPotAjutaForm } from "@/components/cum-pot-ajuta/CumPotAjutaForm";
import { SeoHead } from "@/components/site/SeoHead";
import { FORM230_ORG, form230TaxYear } from "@/lib/form230-config";
import { SITE_NAME } from "@/lib/seo";

export default function Formular230Page() {
  const taxYear = form230TaxYear();
  return (
    <>
      <SeoHead
        title={`Formular 230 | ${SITE_NAME}`}
        description={`Redirecționează 3,5% din impozitul pe venit din ${taxYear} către ${FORM230_ORG.nameDisplay}. Completează Formularul 230 de pe telefon.`}
        path="/230"
      />
      <section className="page-230-hero">
        <h1 className="projects-title">Formular 230</h1>
        <p className="lead">
          Redirecționezi 3,5% din impozitul pe venitul din <strong>{taxYear}</strong> către{" "}
          {FORM230_ORG.nameDisplay}. Nu te costă nimic extra. Poți fotografia buletinul — citirea e
          pe dispozitivul tău, poza nu se trimite.
        </p>
        <p className="page-230-cif">
          Beneficiar: {FORM230_ORG.nameDisplay} · CIF {FORM230_ORG.cui}
        </p>
      </section>
      <CumPotAjutaForm variant="standalone" />
    </>
  );
}
