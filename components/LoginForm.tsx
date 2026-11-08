"use client";

import { useTransition, useState } from "react";
import { requestMagicLink } from "@/app/actions/auth";
import { SUPPORT_EMAIL } from "@/lib/support";

export function LoginForm({ signupRef = null }: { signupRef?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    startTransition(async () => {
      // A successful instant login redirects server-side and never returns here;
      // only a failure, or a new signup's "link emailed" result, resolves.
      const result = await requestMagicLink(formData);
      if (result.success && result.emailed) {
        setSentTo(email);
      } else if (!result.success) {
        setError(result.error ?? "Something went wrong. Try again in a moment.");
      }
    });
  }

  if (sentTo) {
    return (
      <div className="mt-6 border-l-4 border-accent bg-card px-4 py-4 font-body text-base text-foreground">
        <p className="font-heading text-lg font-bold uppercase tracking-wide">Check your email</p>
        <p className="mt-2 text-muted">
          We sent a link to <span className="text-foreground">{sentTo}</span>. Open it on this device
          to get started. Can&apos;t find it? Check spam, or{" "}
          <button type="button" onClick={() => setSentTo(null)} className="underline">
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="mt-6 flex flex-col gap-3">
      {signupRef && <input type="hidden" name="ref" value={signupRef} />}
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
        {isPending ? "Sending…" : "Email Me My Link"}
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
