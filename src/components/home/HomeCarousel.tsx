"use client";

import { useEffect, useState } from "react";

const LANDSCAPE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
  (n) => `/images/carousel/landscape/carousel-img-${n}.webp`
);
const PORTRAIT = [9, 1, 2, 3, 4, 5, 7, 8, 10].map(
  (n) => `/images/carousel/portrait/carousel-img-${n}.webp`
);

const ALT = "Voluntariat și proiecte sociale — Vă Ajutăm din Dej";

export function HomeCarousel() {
  const [portrait, setPortrait] = useState<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<number[]>([0, 1]);
  const slides = portrait ? PORTRAIT : portrait === false ? LANDSCAPE : [];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 989px)");
    const apply = () => {
      setPortrait(mq.matches);
      setIndex(0);
      setShown([0, 1]);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 10000);
    return () => window.clearInterval(id);
  }, [slides.length]);

  useEffect(() => {
    if (!slides.length) return;
    const upcoming = (index + 1) % slides.length;
    setShown((prev) => {
      if (prev.includes(index) && prev.includes(upcoming)) return prev;
      return [...new Set([...prev, index, upcoming])];
    });
  }, [index, slides.length]);

  return (
    <section id="main">
      <div
        className="container-fluid carousel-container bg-white"
        style={{ ["--bs-bg-opacity" as string]: 0.65 }}
      >
        <h1 className="carousel-title">Vă Ajutăm din Dej</h1>
        <h2 className="carousel-subtitle">Împreună dăruim zâmbete</h2>
      </div>
      {portrait === null ? (
        <div className="home-carousel-skeleton" aria-label="Se încarcă caruselul" />
      ) : (
        <div
          id="home-carousel"
          className={`carousel slide ${portrait ? "portrait" : "landscape"}`}
        >
          <div className="carousel-inner">
            {slides.map((src, i) => (
              <div className={`carousel-item${i === index ? " active" : ""}`} key={src}>
                {shown.includes(i) ? (
                  <img
                    src={src}
                    className="d-block w-100"
                    alt={i === 0 ? ALT : ""}
                    decoding="async"
                    fetchPriority={i === index ? "high" : "low"}
                    loading={i === index ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="home-carousel-slide-hold" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
