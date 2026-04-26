import { ContactForm } from "@/components/contact/ContactForm";
import { SeoHead } from "@/components/site/SeoHead";
import { SITE_NAME } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site-contact";

const PAGE_DESCRIPTION =
  "Ne găsești la Dej (str. Unirii) sau scrie-ne online: telefon, e-mail, Facebook. Trimite un mesaj din formular — răspundem cât de curând putem.";

export default function ContactPage() {
  return (
    <>
      <SeoHead
        title={`Contact | ${SITE_NAME}`}
        description={PAGE_DESCRIPTION}
        path="/contact"
      />
      <section id="main" className="contact-page">
        <div className="container py-4 py-lg-5">
          <header className="contact-page-header text-center mx-auto mb-4 mb-lg-5">
            <h1 className="projects-title contact-page-title mb-2">Contact</h1>
            <p className="contact-page-lead text-muted mb-0">
              Ne găsiți la Dej, pe rețelele sociale sau prin mesaj mai jos — vă răspundem cât de curând
              putem.
            </p>
          </header>

          <div className="contact-grid">
            <div className="contact-panel contact-panel--info">
              <h2 className="h5 text-uppercase letter-spacing-tight text-muted mb-3">Date de contact</h2>
              <div className="contact-text">
                <div className="contact-detail">
                  <span className="contact-detail-label">Adresă</span>
                  <p className="contact-detail-body">
                    Asociația Vă Ajutăm din Dej — Dej, str. Unirii nr. 13, bl. D1, ap. 11, jud. Cluj
                  </p>
                </div>
                <div className="contact-detail">
                  <span className="contact-detail-label">Facebook</span>
                  <p className="contact-detail-body mb-0">
                    <a
                      href="https://www.facebook.com/VoluntariDejeni"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Asociația &quot;Vă ajutăm din Dej&quot;
                    </a>
                  </p>
                </div>
                <div className="contact-detail">
                  <span className="contact-detail-label">E-mail</span>
                  <p className="contact-detail-body mb-0">
                    <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  </p>
                </div>
                <div className="contact-detail">
                  <span className="contact-detail-label">Telefon</span>
                  <p className="contact-detail-body mb-0">
                    <a href="tel:+40723290245">+40 723 290 245</a>
                  </p>
                </div>
              </div>
              <div className="contact-map-wrap mt-3 mt-lg-4">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2714.203889298232!2d23.885043788884076!3d47.13427143386159!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4749b8a34bcf8e1b%3A0x7ed9145ecd419435!2sStrada%20Unirii%2013%2C%20Dej%20405200!5e0!3m2!1sro!2sro!4v1701691135945!5m2!1sro!2sro"
                  className="map"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Locația Asociației Vă Ajutăm din Dej pe hartă"
                />
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
