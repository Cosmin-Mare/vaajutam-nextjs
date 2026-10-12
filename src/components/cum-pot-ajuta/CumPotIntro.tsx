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
          Cum poți ajuta
        </h1>
        <div className="col-lg-8 mx-auto">
          <p className="lead mb-4">
            Cel mai folosit gest este Formularul 230: redirecționezi 3,5% din impozit, fără niciun
            cost în plus pentru tine.
          </p>
        </div>
        <div className="help-paths">
          <a className="help-path-main" href="#formular-230">
            <span className="help-path-kicker">Începe aici</span>
            <span className="help-path-title">Completează formularul 230</span>
            <span className="help-path-text">
              Nume, CNP, localitate și o semnătură. Cam un minut, apoi noi ne ocupăm de depunere.
            </span>
          </a>
          <div className="help-path-secondary">
            <a href="#donez">Donează</a>
            <a href="#companii">Pentru companii</a>
            <a href="#voluntar">Fii voluntar</a>
          </div>
        </div>
      </div>
    </section>
  );
}
