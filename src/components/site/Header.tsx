"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/despre-noi", label: "Despre noi" },
  { href: "/proiecte", label: "Proiecte" },
  { href: "/noutati", label: "Noutăți" },
  { href: "/parteneri", label: "Parteneri" },
  { href: "/motive", label: "Motive să ajuți" },
  { href: "/contact", label: "Contact" },
];

function isNavLinkActive(href: string, pathname: string) {
  if (href === "/proiecte")
    return pathname === "/proiecte" || /^\/proiect\/[^/]+/.test(pathname);
  if (href === "/noutati")
    return pathname === "/noutati" || /^\/noutate\/[^/]+/.test(pathname);
  return pathname === href;
}

export function Header() {
  const { pathname, isReady } = useRouter();

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
            <Link className="btn btn-primary-pink-round portrait" href="/cum-pot-ajuta#donez">
              Donează
            </Link>
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
                {NAV_LINKS.map(({ href, label }) => {
                  const active = isReady && isNavLinkActive(href, pathname);
                  return (
                    <li className="nav-item" key={href}>
                      <Link
                        className={`nav-link${active ? " active" : ""}`}
                        href={href}
                        aria-current={active ? "page" : undefined}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
                <li className="nav-item d-lg-none">
                  <Link className="btn btn-secondary-pink w-100" href="/cum-pot-ajuta">
                    Cum poți ajuta
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <Link className="btn btn-secondary-pink landscape" href="/cum-pot-ajuta">
            Cum Poți Ajuta
          </Link>
          <Link
            className="btn btn-primary-pink-round landscape"
            href="/cum-pot-ajuta#donez"
          >
            Donează
          </Link>
        </nav>
      </div>
    </section>
  );
}
