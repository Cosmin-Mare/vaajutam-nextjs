"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { CONTACT_EMAIL } from "@/lib/site-contact";

export function DonationSections() {
  const recurrentRef = useRef<HTMLInputElement>(null);

  const redirectToDonationPage = useCallback((amount: number) => {
    const isReccurent = recurrentRef.current?.checked ?? false;
    switch (amount) {
      case 200:
        if (isReccurent) {
          window.open("https://buy.stripe.com/9AQ29LbOr8LI3qEfZ8", "_blank");
        } else {
          window.open("https://donate.stripe.com/8wM3dP9Gj0fc8KY004", "_blank");
        }
        break;
      case 100:
        if (isReccurent) {
          window.open("https://buy.stripe.com/dR64hTdWz7HE9P2bIR", "_blank");
        } else {
          window.open("https://donate.stripe.com/fZeeWxbOrgea3qE147", "_blank");
        }
        break;
      case 50:
        if (isReccurent) {
          window.open("https://buy.stripe.com/dR6cOpg4Hd1Y0es008", "_blank");
        } else {
          window.open("https://donate.stripe.com/9AQ15H3hVbXUgdqcMO", "_blank");
        }
        break;
      case 25:
        if (isReccurent) {
          window.open("https://buy.stripe.com/5kAbKl9Gj0fc0es4gn", "_blank");
        } else {
          window.open("https://donate.stripe.com/dR6g0B19NbXUf9m8wx", "_blank");
        }
        break;
      case 10:
        if (isReccurent) {
          window.open("https://buy.stripe.com/14k7u54lZaTQe5i14a", "_blank");
        } else {
          window.open("https://donate.stripe.com/aEU3dP9Gj2nkf9m144", "_blank");
        }
        break;
      default:
        if (isReccurent) {
          window.alert("Nu puteți face donații recurente pentru alte sume");
        } else {
          window.open("https://donate.stripe.com/6oE8y9g4H7HE8KY9AF", "_blank");
        }
        break;
    }
  }, []);

  return (
    <>
      <section id="donez">
        <div className="px-4 my-5">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt=""
            width={100}
            height={100}
          />
          <h1 className="display-5 fw-bold text-body-emphasis projects-title text-center">
            Împreună dăruim zâmbete 😊
          </h1>
          <div className="col-lg-10 mx-auto text-center mb-5 pb-5">
            <p className="lead mb-4">
              Bun venit pe Pagina de Donații, un loc special unde fiecare gest de
              generozitate aduce un zâmbet și contribuie la modelarea unui viitor
              mai luminos pentru comunitatea noastră.
            </p>
            <div className="donation-options-container">
              <h2 className="display-5 fw-bold text-body-emphasis donation-subtitle">
                Alege cu cat vrei sa contribui
              </h2>
              <div className="form-check recurent-form">
                <input
                  className="form-check-input recurent-check"
                  ref={recurrentRef}
                  type="checkbox"
                  id="flexCheckDefault"
                />
                <label className="form-check-label" htmlFor="flexCheckDefault">
                  Donație recurentă
                </label>
              </div>
              {[200, 100, 50, 25, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-primary-pink-round donation-option"
                  onClick={() => redirectToDonationPage(n)}
                >
                  {n} RON
                </button>
              ))}
              <button
                type="button"
                className="btn btn-primary-pink-round donation-option"
                onClick={() => redirectToDonationPage(-1)}
              >
                Altă sumă
              </button>
            </div>
          </div>
          <div className="col-sm-10 col-xl-12 mx-auto mx-xl-3" id="transfer">
            <div className="external-donation-container">
              <div>
                <h1 className="display-5 fw-bold text-body-emphasis projects-title" style={{ fontSize: "2rem" }}>
                  Doneaza prin transfer bancar
                </h1>
                <p className="lead mb-0">ASOCIAȚIA VĂ AJUTĂM DIN DEJ,</p>
                <p className="lead mb-0">CIF: 42960042</p>
                <p className="lead mb-0">Cont RON: RO37BTRLRONCRT0565463401</p>
                <p className="lead mb-0">Cont EURO: RO84BTRLEURCRT0565463401</p>
              </div>
              <div>
                <h1 className="display-5 fw-bold text-body-emphasis projects-title" style={{ fontSize: "2rem" }}>
                  Doneaza prin BT Pay
                </h1>
                <p className="lead">
                  <a href="tel:+40723290245">0723290245</a>
                </p>
              </div>
              <div>
                <h1 className="display-5 fw-bold text-body-emphasis projects-title" style={{ fontSize: "2rem" }}>
                  Donează prin Revolut
                </h1>
                <button
                  type="button"
                  className="btn btn-primary-pink-round btn-lg external-payment-button"
                  onClick={() => window.open("https://revolut.me/cristimare", "_blank")}
                >
                  Donează
                </button>
              </div>
              <div>
                <h1 className="display-5 fw-bold text-body-emphasis projects-title" style={{ fontSize: "2rem" }}>
                  Donează prin Paypal
                </h1>
                <button
                  type="button"
                  className="btn btn-primary-pink-round btn-lg external-payment-button"
                  onClick={() =>
                    window.open("https://www.paypal.com/donate?hosted_button_id=9U6DZGHKFV2LE", "_blank")
                  }
                >
                  Donează
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="companii">
        <hr />
        <div className="px-4 my-5">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt=""
            width={100}
            height={100}
          />
          <div className="col-lg-10 mx-auto">
            <h1 className="display-5 fw-bold text-body-emphasis projects-title">Pentru companii</h1>
            <p className="lead projects-title" style={{ fontSize: "1.2rem" }}>
              DIRECȚIONEAZĂ 20% DIN IMPOZIT CĂTRE COPII, FĂRĂ NICIUN COST PENTRU TINE!
            </p>
            <p className="lead">Este foarte simplu să te implici: 20% din impozitul pe profit sau venit
              datorat statului poți direcționa fără niciun cost către Asociația Vă Ajutăm din Dej.
            </p>
            <p className="lead">Care sunt pașii sponsorizării?</p>
            <ol>
              <li>Calculați suma aferentă celor 20% din impozitul pe venit/profit al companiei, în
                limita a 0,75% din cifra de afaceri
              </li>
              <li>
                Desărcați și completați{" "}
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://docs.google.com/document/d/1X6phA3AZVLeSxdtzyncSnLscWUiGPNXq/edit#heading=h.gjdgxs"
                  style={{ fontSize: "1.3rem" }}
                >
                  Contractul de sponsorizare
                </a>{" "}
                în 2 exemplare și trimiteți-l la{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontSize: "1.3rem" }}>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                Efectuați plata prin{" "}
                <a href="#transfer" style={{ fontSize: "1.3rem" }}>
                  transfer bancar
                </a>
                .
              </li>
            </ol>
          </div>
        </div>
        <hr />
      </section>

      <section id="voluntar">
        <div className="px-4 my-5 text-center">
          <Image
            className="d-block mx-auto mb-4"
            src="/images/logo.png"
            alt=""
            width={100}
            height={100}
          />
          <h1 className="display-5 fw-bold text-body-emphasis projects-title">Fii voluntar</h1>
          <div className="col-lg-10 mx-auto mb-5 pb-5">
            <p className="lead">
              Dacă dorești să ne ajuți și să te alături echipei noastre de voluntari, te așteptăm
              cu drag. Trimite-ne un e-mail la{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ fontSize: "1.3rem" }}>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
