"use client";

import { useState, useTransition } from "react";
import { requestMagicLink, type MagicLinkResult } from "@/app/actions/auth";

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
      <div className="mt-6 flex flex-col gap-3 rounded-md border border-accent bg-card px-4 py-4 text-sm">
        <p className="text-foreground">Check your email — your login link is on its way to {email}.</p>
        <button
          type="button"
          onClick={resend}
          disabled={isPending}
          className="self-start text-accent underline disabled:opacity-50"
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
        className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send my login link"}
      </button>
      {result?.error && <p className="text-sm text-red-400">{result.error}</p>}
    </form>
  );
}
