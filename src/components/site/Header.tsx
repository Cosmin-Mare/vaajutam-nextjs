"use client";

import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <section id="header" className="x-bar">
      <div className="container-fluid navbar-container">
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
          <div className="container-fluid">
            <Link className="navbar-brand" href="/">
              <Image
                src="/images/logo.png"
                className="img-fluid"
                alt="logo"
                width={44}
                height={44}
                priority
              />
            </Link>
            <button
              type="button"
              className="btn btn-primary-pink-round portrait"
              onClick={() => {
                window.location.href = "/cum-pot-ajuta#donez";
              }}
            >
              Donează
            </button>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNavDropdown"
              aria-controls="navbarNavDropdown"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon" />
            </button>
            <div className="collapse navbar-collapse" id="navbarNavDropdown">
              <ul className="navbar-nav">
                <li className="nav-item">
                  <Link className="nav-link" href="/despre-noi">
                    Despre noi
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href="/proiecte">
                    Proiecte
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href="/noutati">
                    Noutăți
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href="/parteneri">
                    Parteneri
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href="/motive">
                    Motive să ajuți
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" href="/contact">
                    Contact
                  </Link>
                </li>
                <li className="nav-item d-lg-none">
                  <button
                    type="button"
                    className="btn btn-secondary-pink w-100"
                    onClick={() => {
                      window.location.href = "/cum-pot-ajuta";
                    }}
                  >
                    Cum poți ajuta
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary-pink landscape"
            onClick={() => {
              window.location.href = "/cum-pot-ajuta";
            }}
          >
            Cum Poți Ajuta
          </button>
          <button
            type="button"
            className="btn btn-primary-pink-round landscape"
            onClick={() => {
              window.location.href = "/cum-pot-ajuta#donez";
            }}
          >
            Donează
          </button>
        </nav>
      </div>
    </section>
  );
}
