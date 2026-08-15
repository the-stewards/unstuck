"use client";

import { useEffect } from "react";
import { SUPPORT_EMAIL } from "@/lib/support";

// Route-level error boundary — catches anything thrown while rendering a
// page inside the root layout (AppHeader etc. may not have loaded yet, so
// this stays self-contained rather than assuming any app chrome is present).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md border-l-4 border-accent bg-band-bg px-6 py-8 sm:px-8">
        <p className="font-heading text-base font-bold uppercase tracking-[0.4em] text-accent">
          Something Broke
        </p>
        <h1 className="mt-2 font-heading text-2xl font-bold uppercase leading-tight text-band-text sm:text-3xl">
          Not Your <span className="text-accent">Fault</span>
        </h1>
        <p className="mt-3 font-body text-lg font-light text-band-text/70">
          Something went wrong loading this page. Try again, or email us if it keeps happening.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="bg-accent px-6 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-heading text-base font-bold uppercase tracking-wide text-band-text/70 hover:text-accent"
          >
            Email us →
          </a>
        </div>
      </div>
    </div>
  );
}
