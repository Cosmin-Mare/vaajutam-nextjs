import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

const items = [
  {
    title: "Impact durabil",
    text: "Contribuția ta are un impact durabil, susținând proiecte și inițiative care aduc schimbări reale.",
    img: "/images/motive/Impact.webp",
  },
  {
    title: "Transparență și responsabilitate",
    text: "Ne angajăm să fim transparenți în utilizarea resurselor primite.",
    img: "/images/motive/Transparenta.webp",
  },
  {
    title: "Solidaritate în comunitate",
    text: "Prin sprijinirea asociației noastre, te alături unei comunități de oameni care împărtășesc aceleași valori.",
    img: "/images/motive/Solidaritate.webp",
  },
  {
    title: "Proiecte inovatoare",
    text: "Susținem proiecte inovatoare și soluții creative pentru comunitatea noastră.",
    img: "/images/motive/Proiecte.webp",
  },
  {
    title: "Recunoștință și recompense",
    text: "În semn de recunoștință pentru sprijinul tău, ne străduim să oferim beneficii pentru susținători.",
    img: "/images/motive/Recunostinta.webp",
  },
];

export default function MotivePage() {
  return (
    <>
      <Head>
        <title>Motive să ajuți | Vă ajutam din Dej</title>
      </Head>
      <section id="main">
        <div
          className="container-fluid carousel-container bg-white"
          style={{ ["--bs-bg-opacity" as string]: 0.65 }}
        >
          <h1 className="header-title">5 Motive Să Ajuți</h1>
        </div>
        <img
          src="/images/carousel/landscape/carousel-img-2.webp"
          className="d-block w-100 header-img"
          alt=""
        />
      </section>
      <section id="motive">
        <section className="pt-5 mt-5 motive-flex">
          {items.map((m) => (
            <div className="motiv" key={m.title}>
              <div className="motiv-text">
                <h1 className="fw-light projects-title">{m.title}</h1>
                <p className="lead text-body-secondary">{m.text}</p>
              </div>
              <img src={m.img} alt="" />
            </div>
          ))}
        </section>
        <section id="call-to-action">
          <div className="px-4 my-5 text-center">
            <Image
              className="d-block mx-auto mb-4"
              src="/images/logo.png"
              alt=""
              width={100}
              height={100}
            />
            <h1 className="display-5 fw-bold text-body-emphasis projects-title">
              Ești gata să faci un bine?
            </h1>
            <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
              <Link className="btn btn-primary-pink-round btn-lg px-4 gap-3 mx-5" href="/cum-pot-ajuta#donez">
                Donează
              </Link>
              <Link className="btn btn-secondary-pink btn-lg px-4 mx-5" href="/cum-pot-ajuta">
                Cum poți ajuta
              </Link>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
