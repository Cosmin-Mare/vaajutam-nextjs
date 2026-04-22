import Head from "next/head";
import Link from "next/link";
import { HomeCarousel } from "@/components/home/HomeCarousel";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Va ajutam din Dej</title>
      </Head>
      <HomeCarousel />
      <section id="donate">
        <div className="container d-flex button-container flex-wrap">
          <Link className="btn btn-primary-pink btn-donate" href="/cum-pot-ajuta#donez">
            Donează acum
          </Link>
          <Link className="btn btn-primary-teal" href="/noutati">
            Noutăți
          </Link>
          <Link className="btn btn-primary-teal" href="/despre-noi">
            Află mai multe
          </Link>
          <div className="motive-container">
            <Link className="motive" href="/motive">
              5 motive să donezi
            </Link>
          </div>
        </div>
      </section>
      <hr />
      <section id="projects">
        <section className="text-center container" id="call-to-action">
          <div className="row pt-5">
            <div className="col-lg-8 col-md-8 mx-auto">
              <h1 className="fw-light projects-title">Proiectele noastre</h1>
              <p className="lead text-body-secondary">
                Suntem bucuroși să împărtășim cu voi inițiativele noastre, create cu
                dragoste pentru a aduce schimbări pozitive în comunitatea noastră.
              </p>
            </div>
          </div>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center py-5 pt-2">
            <Link
              className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5"
              href="/proiecte"
            >
              Proiectele noastre
            </Link>
            <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/noutati">
              Noutăți
            </Link>
          </div>
        </section>
      </section>
      <section id="newsletter" />
    </>
  );
}
