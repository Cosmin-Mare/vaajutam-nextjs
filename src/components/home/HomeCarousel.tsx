"use client";

import { useCallback, useEffect } from "react";

function buildCarouselHtml(isPortrait: boolean) {
  if (isPortrait) {
    return `<div
          class="carousel slide portrait"
          data-bs-ride="carousel"
          data-interval="10000"
        >
          <div class="carousel-inner">
            <div class="carousel-item active">
              <img
                src="images/carousel/portrait/carousel-img-9.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-1.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-2.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-3.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-4.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-5.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-7.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-8.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/portrait/carousel-img-10.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
          </div>
        </div>`;
  }
  return `<div
          class="carousel slide landscape"
          data-bs-ride="carousel"
          data-interval="10000"
          data-bs-pause="false"
        >
          <div class="carousel-inner">
            <div class="carousel-item active">
              <img
                src="/images/carousel/landscape/carousel-img-1.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-2.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-3.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-4.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-5.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-6.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-7.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-8.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-9.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
            <div class="carousel-item">
              <img
                src="images/carousel/landscape/carousel-img-10.webp"
                class="d-block w-100"
                id="carousel-img-1"
                alt="..."
              />
            </div>
          </div>
        </div>`;
}

function onResize() {
  void import("jquery").then((mod) => {
    const $ = mod.default;
    $(".carousel").remove();
    if (window.innerWidth < 990) {
      $("#main").append(buildCarouselHtml(true));
    } else {
      $("#main").append(buildCarouselHtml(false));
    }
  });
}

export function HomeCarousel() {
  const resize = useCallback(() => onResize(), []);

  useEffect(() => {
    onResize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [resize]);

  return (
    <section id="main" style={{ position: "relative" }}>
      <div
        className="container-fluid carousel-container bg-white"
        style={{ ["--bs-bg-opacity" as string]: 0.65 }}
      >
        <h1 className="carousel-title">Vă Ajutăm din Dej</h1>
        <h2 className="carousel-subtitle">Împreună dăruim zâmbete</h2>
      </div>
    </section>
  );
}
