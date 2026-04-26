"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Props = {
  /**
   * Path to append `?subscribed=1` after form POST (no query/hash).
   * Must be stable for SSR: do not read `useRouter` here for the initial tree.
   */
  returnTo?: string;
};

/**
 * Success from `?subscribed=1` is applied in `useEffect` so the first paint
 * always matches the server and avoids hydration mismatches with ISR.
 */
export function NewsletterSubscribeBlock({ returnTo = "/" }: Props) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    setSubscribed(router.query.subscribed === "1");
  }, [router.isReady, router.query.subscribed]);

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
      <input type="hidden" name="return_to" value={returnTo} />
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
