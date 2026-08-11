"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks prefers-reduced-motion at the JS level. The app already has a
 * blanket CSS rule (globals.css) that zeroes out CSS transition/animation
 * durations, which is enough for anything driven by a CSS transition. This
 * hook exists for the cases that aren't — a Wall zoom driven by direct state
 * updates, a Constellation requestAnimationFrame loop — where there's no CSS
 * transition for the media query to intercept.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mql.matches);

    const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}
