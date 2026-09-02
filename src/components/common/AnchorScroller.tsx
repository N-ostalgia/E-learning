"use client";

import { useEffect } from "react";

export default function AnchorScroller() {
  useEffect(() => {
    // Wait a tick for DOM to render comments
    setTimeout(() => {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#comment-")) {
        const el = document.getElementById(hash.replace("#", ""));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring", "ring-amber-300");
          setTimeout(() => el.classList.remove("ring", "ring-amber-300"), 2500);
        }
      }
    }, 50);
  }, []);

  return null;
}
