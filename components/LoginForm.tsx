"use client";

import { useState, useTransition } from "react";
import { requestMagicLink, type MagicLinkResult } from "@/app/actions/auth";
import { SUPPORT_EMAIL } from "@/lib/support";

export function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<MagicLinkResult | null>(null);

  function submit(formData: FormData) {
    setEmail(String(formData.get("email") ?? ""));
    startTransition(async () => {
      setResult(await requestMagicLink(formData));
    });
  }

  function resend() {
    const formData = new FormData();
    formData.set("email", email);
    startTransition(async () => {
      setResult(await requestMagicLink(formData));
    });
  }

  if (result?.success) {
    return (
      <div className="mt-6 flex flex-col gap-3 border-l-4 border-accent bg-card px-4 py-4">
        <p className="font-body text-base text-foreground">
          Check your email — your login link is on its way to {email}.
        </p>
        <button
          type="button"
          onClick={resend}
          disabled={isPending}
          className="self-start font-heading text-base font-bold uppercase tracking-wide text-accent hover:underline disabled:opacity-50"
        >
          {isPending ? "Resending…" : "Didn't get it? Resend"}
        </button>
      </div>
    );
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
        {isPending ? "Sending…" : "Send my login link"}
      </button>
      {result?.error && (
        <p className="font-body text-base text-red-700">
          {result.error} Still stuck?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            Email us
          </a>
          .
        </p>
      )}
    </form>
  );
}
