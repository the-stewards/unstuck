"use client";

import { useEffect, useState } from "react";
import { checkOrderStatus } from "@/app/actions/purchase";

interface PurchaseSuccessStatusProps {
  sessionId: string;
  initialFound: boolean;
  initialEmail: string | null;
}

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30; // ~60s of polling before giving up and showing the fallback

// The webhook (not this page) is what actually grants access — see
// app/api/stripe/webhook/route.ts. Stripe redirects here immediately after
// payment, but webhook delivery is async and often lands a second or two
// later, so the order row this page needs frequently doesn't exist yet on
// first render. Polling removes the "did it break?" moment: the page just
// updates itself the instant the webhook finishes, no manual refresh needed.
export function PurchaseSuccessStatus({
  sessionId,
  initialFound,
  initialEmail,
}: PurchaseSuccessStatusProps) {
  const [found, setFound] = useState(initialFound);
  const [email, setEmail] = useState(initialEmail);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (found) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const result = await checkOrderStatus(sessionId);
        if (result.found) {
          setFound(true);
          setEmail(result.email);
          clearInterval(interval);
          return;
        }
      } catch {
        // Best-effort — a dropped poll just tries again in 2s.
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
        setTimedOut(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [found, sessionId]);

  if (found) {
    return (
      <>
        <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
          You&apos;re in
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
          Check your <span className="text-accent">email</span>
        </h1>
        <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
        <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
          We&apos;ve sent your login link to {email}. It drops you straight into the Starter Kit.
        </p>
      </>
    );
  }

  if (timedOut) {
    return (
      <>
        <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
          You&apos;re in
        </p>
        <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
          Taking <span className="text-accent">longer</span> than usual
        </h1>
        <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
        <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
          Your payment went through, but access is taking longer than normal to set up. Refresh
          this page in a minute — if it's still stuck, reply to your receipt email and we&apos;ll
          sort it manually.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="font-heading text-base font-bold uppercase tracking-[0.3em] text-muted-light">
        You&apos;re in
      </p>
      <h1 className="mt-2 font-heading text-4xl font-bold uppercase leading-none tracking-tight text-foreground">
        Almost <span className="text-accent">there</span>
      </h1>
      <hr className="mx-auto mt-4 w-16 border-t-2 border-accent" />
      <p className="mt-4 font-body text-lg font-light leading-relaxed text-muted">
        Your payment went through — we&apos;re finishing setting up your access. This page will
        update itself in a few seconds.
      </p>
    </>
  );
}
