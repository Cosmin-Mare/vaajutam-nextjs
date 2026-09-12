import { SeoHead } from "@/components/site/SeoHead";
import { CiCameraCapture } from "@/components/cum-pot-ajuta/CiCameraCapture";
import { SITE_NAME } from "@/lib/seo";

export default function Formular230CiPage() {
  return (
    <>
      <SeoHead
        title={`Fotografiază CI-ul | ${SITE_NAME}`}
        description="Fotografiază cartea de identitate pe telefon. Poza se citește doar pe dispozitiv, nu este trimisă."
        path="/230/ci"
        noindex
      />
      <section className="page-230-hero page-230-ci">
        <CiCameraCapture />
      </section>
    </>
  );
}
