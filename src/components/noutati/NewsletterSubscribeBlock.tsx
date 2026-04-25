"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/**
 * Success message from `?subscribed=1` is read on the client so `/noutati` can use static generation (ISR).
 */
export function NewsletterSubscribeBlock() {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    setSubscribed(router.query.subscribed === "1");
  }, [router.isReady, router.query.subscribed]);

  if (!router.isReady) {
    return (
      <div
        className="skeleton-bars mx-auto"
        style={{ height: 48, maxWidth: 480 }}
        aria-hidden
      />
    );
  }

  if (subscribed) {
    return (
      <div className="projects-title">
        <p className="h3 mb-0" role="status">
          V-ați abonat cu succes la newsletter! Vă mulțumim pentru interes!
        </p>
      </div>
    );
  }

  return (
    <form
      className="row d-flex justify-content-center email-form"
      action="/api/newsletter"
      method="post"
    >
      <div className="col-sm-12 col-lg-5">
        <input
          type="email"
          className="form-control"
          placeholder="Email"
          id="email"
          name="email"
          required
        />
      </div>
      <div className="col-sm-12 col-lg-4">
        <button type="submit" className="btn btn-primary-pink-round btn-lg px-4">
          Abonează-te pentru noutăți
        </button>
      </div>
    </form>
  );
}
