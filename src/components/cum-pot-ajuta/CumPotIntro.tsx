import Image from "next/image";

export function CumPotIntro() {
  return (
    <section id="page-intro" className="ajut">
      <div className="px-4 my-5 text-center">
        <Image
          className="d-block mx-auto mb-4"
          src="/images/logo.png"
          alt=""
          width={100}
          height={100}
        />
        <h1 className="display-5 fw-bold text-body-emphasis projects-title">
          Mulțumim pentru susținere!
        </h1>
        <div className="col-lg-8 mx-auto">
          <p className="lead mb-4">
            Bine ai venit pe pagina noastră dedicată sprijinului comunitar! Aici, fiecare gest
            mic sau mare al tău are un impact semnificativ. Poți contribui prin donații online sau
            completând formularul 230.
          </p>
        </div>
        <div className="donation-buttons">
          <a className="btn btn-primary-pink-round btn-lg donation-button-element" href="#formular-230">
            Completează formularul 230
          </a>
          <a className="btn btn-secondary-pink btn-lg donation-button-element" href="#donez">
            Donează
          </a>
          <a className="btn btn-secondary-pink btn-lg donation-button-element" href="#companii">
            Pentru companii
          </a>
          <a className="btn btn-secondary-pink btn-lg donation-button-element" href="#voluntar">
            Fii voluntar
          </a>
        </div>
      </div>
    </section>
  );
}
