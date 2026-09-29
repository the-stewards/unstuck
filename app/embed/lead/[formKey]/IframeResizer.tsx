"use client";

import { useEffect } from "react";

// Posts the content height to the parent frame on load and on every size
// change (the widget builds asynchronously and swaps to a success state), so
// the host can size the iframe to fit. Measures the content element, not
// <html>, which renders at least viewport-tall and would only ever ratchet up.
//
// Host side (only needed for the iframe fallback):
//   window.addEventListener("message", function (e) {
//     if (e.origin !== "https://unstuck.stewards.loan") return;
//     if (e.data && e.data.type === "unstuck-lead-resize") iframe.style.height = e.data.height + "px";
//   });
export function IframeResizer({ targetId }: { targetId: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    const el = document.getElementById(targetId);
    if (!el) return;

    const post = () =>
      window.parent.postMessage(
        { type: "unstuck-lead-resize", height: Math.ceil(el.getBoundingClientRect().height) },
        "*"
      );

    post();
    const observer = new ResizeObserver(post);
    observer.observe(el);
    document.fonts?.ready.then(post).catch(() => {});
    return () => observer.disconnect();
  }, [targetId]);

  return null;
}
