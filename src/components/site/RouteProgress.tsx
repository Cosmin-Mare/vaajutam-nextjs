"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

/**
 * Shown only during client-side route transitions (after first paint of the new page is requested).
 * Does not run on the initial full page load.
 */
export function RouteProgress() {
  const router = useRouter();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onStart = () => setActive(true);
    const onDone = () => setActive(false);
    router.events.on("routeChangeStart", onStart);
    router.events.on("routeChangeComplete", onDone);
    router.events.on("routeChangeError", onDone);
    return () => {
      router.events.off("routeChangeStart", onStart);
      router.events.off("routeChangeComplete", onDone);
      router.events.off("routeChangeError", onDone);
    };
  }, [router]);

  return (
    <div
      className="route-progress"
      hidden={!active}
      role="progressbar"
      aria-hidden={!active}
    />
  );
}
