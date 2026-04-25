import { SeoHead } from "@/components/site/SeoHead";
import { SITE_NAME } from "@/lib/seo";

const PAGE_DESCRIPTION =
  "Contact Asociația Vă Ajutăm din Dej — adresă pe strada Unirii, telefon, email și rețele sociale.";

export default function ContactPage() {
  return (
    <>
      <SeoHead
        title={`Contact | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/contact"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `@media screen and (min-width: 769px) { footer { position: fixed; bottom: 0; width: 100%; } }`,
        }}
      />
      <section id="main">
        <div className="contact-grid">
          <div className="contact-info">
            <div className="contact-text">
              <p>
                Asociația Vă Ajutăm din Dej, cu sediul principal în Dej, strada
                Unirii, nr. 13, Bl. D1, Ap. 11, Jud. Cluj.
              </p>
              <p>
                Facebook:{" "}
                <a href="https://www.facebook.com/VoluntariDejeni" target="_blank" rel="noreferrer">
                  Asociația &quot;Vă ajutăm din Dej&quot;
                </a>
              </p>
              <p>
                Email: <a href="mailto:vaajutamdindej@gmail.com">vaajutamdindej@gmail.com</a>
              </p>
              <p>
                Telefon: <a href="tel:+40723290245">+40723290245</a>
              </p>
            </div>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2714.203889298232!2d23.885043788884076!3d47.13427143386159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4749b8a34bcf8e1b%3A0x7ed9145ecd419435!2sStrada%20Unirii%2013%2C%20Dej%20405200!5e0!3m2!1sro!2sro!4v1701691135945!5m2!1sro!2sro"
              className="map"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Hartă"
            />
          </div>
          <div className="contact-form">
            <h2 className="projects-title">Contactează-ne (pagină în lucru)</h2>
            <form className="row g-3">
              <div className="col-12 col-md-6">
                <label htmlFor="Nume" className="form-label">
                  Nume
                </label>
                <input type="text" className="form-control" id="Nume" disabled />
              </div>
              <div className="col-12 col-md-6">
                <label htmlFor="Prenume" className="form-label">
                  Prenume
                </label>
                <input type="text" className="form-control" id="Prenume" disabled />
              </div>
              <div className="col-12">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input type="text" className="form-control" id="email" disabled />
              </div>
              <div className="col-12">
                <label htmlFor="tel" className="form-label">
                  Număr de telefon
                </label>
                <input type="text" className="form-control" id="tel" disabled />
              </div>
              <div className="col-12">
                <label htmlFor="mesaj" className="form-label">
                  Mesaj
                </label>
                <textarea className="form-control" id="mesaj" rows={3} disabled />
              </div>
              <div className="col-12">
                <button
                  type="button"
                  className="btn btn-primary-pink-round"
                  style={{ width: "100%", fontSize: 20 }}
                  disabled
                >
                  Trimite
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
