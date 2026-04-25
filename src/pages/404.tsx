import Link from "next/link";
import { SeoHead } from "@/components/site/SeoHead";
import { SITE_NAME } from "@/lib/seo";

export default function NotFoundPage() {
  return (
    <>
      <SeoHead
        title={`Pagină negăsită (404) | ${SITE_NAME}`}
        description="Pagina căutată nu există pe site-ul Asociației Vă Ajutăm din Dej."
        path="/"
        noindex
      />
      <div className="px-4 py-5 my-5 text-center">
        <h1 className="display-5 fw-bold text-body-emphasis projects-title">Eroare 404</h1>
        <div className="col-lg-6 mx-auto">
          <p className="lead mb-4">Din păcate, pagina pe care doriți să o accesați nu există.</p>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <Link className="btn btn-primary-pink-round btn-lg" href="/">
              Revino la pagina principală
            </Link>
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `footer { position: absolute; bottom: 0; width: 100%; }`,
          }}
        />
      </div>
    </>
  );
}
