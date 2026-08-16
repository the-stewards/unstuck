"use client";

import { useState, useTransition, type FormEvent } from "react";
import { SUPPORT_EMAIL } from "@/lib/support";

interface PurchaseButtonProps {
  initialEmail?: string;
  className?: string;
}

export function PurchaseButton({ initialEmail = "", className = "mt-6 flex flex-col gap-3" }: PurchaseButtonProps) {
  const [email, setEmail] = useState(initialEmail);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      window.location.href = data.url;
    });
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@email.com"
        required
        className="border border-border bg-card px-4 py-3 font-body text-base text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
      />
      <label className="flex items-start gap-2 font-body text-base font-light text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          required
          className="mt-1 h-4 w-4 shrink-0 border-border accent-accent"
        />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={isPending || !agreed}
        className="w-full bg-accent px-4 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : "Get instant access — $47"}
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
