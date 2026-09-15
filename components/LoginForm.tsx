"use client";

import { useTransition, useState } from "react";
import { requestMagicLink } from "@/app/actions/auth";
import { SUPPORT_EMAIL } from "@/lib/support";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // A successful call redirects server-side and never returns here —
      // only a failure resolves with a result to show inline.
      const result = await requestMagicLink(formData);
      if (!result.success) {
        setError(result.error ?? "Something went wrong. Try again in a moment.");
      }
    });
  }

  return (
    <form action={submit} className="mt-6 flex flex-col gap-3">
      <input
        type="email"
        name="email"
        placeholder="you@email.com"
        required
        className="border border-border bg-card px-4 py-3 font-body text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-accent px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Entering…" : "Enter Unstuck"}
      </button>
      {error && (
        <p className="font-body text-base text-red-700">
          {error} Still stuck?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            Email us
          </a>
          .
        </p>
      )}
    </form>
  );
}
