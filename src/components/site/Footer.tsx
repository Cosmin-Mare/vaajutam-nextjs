import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

export function Footer() {
  return (
    <>
      <footer className="d-flex flex-nowrap justify-content-around py-3 mt-auto footer">
        <div className="col-md-4 d-flex align-items-center">
          <Link
            href="/"
            className="mb-3 me-2 mb-md-0 text-body-secondary text-decoration-none lh-1"
          >
            <Image
              src="/images/logo.png"
              height={30}
              width={30}
              className="footer-logo"
              alt=""
            />
          </Link>
          <span className="mb-3 mb-md-0">
            © 2026 Vă Ajutăm din Dej | Proiect realizat de{" "}
            <a
              className="footer-credit-link"
              href="https://mare-cosmin.ro"
              target="_blank"
              rel="noopener noreferrer"
            >
              Mare Cosmin
            </a>
          </span>
        </div>
        <a
          className="text-body-secondary"
          href="https://www.facebook.com/VoluntariDejeni"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="30px"
            height="24px"
            viewBox="0 0 50 50"
            style={{ fill: "#ffffff", marginRight: 10 }}
          >
            <path d="M25,3C12.85,3,3,12.85,3,25c0,11.03,8.125,20.137,18.712,21.728V30.831h-5.443v-5.783h5.443v-3.848 c0-6.371,3.104-9.168,8.399-9.168c2.536,0,3.877,0.188,4.512,0.274v5.048h-3.612c-2.248,0-3.033,2.131-3.033,4.533v3.161h6.588 l-0.894,5.783h-5.694v15.944C38.716,45.318,47,36.137,47,25C47,12.85,37.15,3,25,3z" />
          </svg>
        </a>
      </footer>
      <Script src="/js/main.js" strategy="afterInteractive" />
    </>
  );
}
