"use client";

import { useState, useTransition, type FormEvent } from "react";
import { checkExistingAccess, grantManualAccess } from "@/app/actions/admin";
import type { AccessGrant } from "@/lib/types";

export function AdminGrantForm() {
  const [email, setEmail] = useState("");
  const [existing, setExisting] = useState<AccessGrant | null | undefined>(undefined);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCheck(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setGranted(false);

    startTransition(async () => {
      try {
        setExisting(await checkExistingAccess(email));
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleGrant() {
    startTransition(async () => {
      try {
        const result = await grantManualAccess(email);
        setGranted(result.granted);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <h2 className="text-sm font-medium text-foreground">Grant access</h2>
      {/* Always checks for an existing grant first — a sales call should
          never result in an accidental double-grant. */}
      <form onSubmit={handleCheck} className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setExisting(undefined);
            setGranted(false);
          }}
          placeholder="student@email.com"
          required
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-accent disabled:opacity-50"
        >
          Check
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {granted && <p className="mt-3 text-sm text-accent">Access granted — email sent.</p>}

      {!granted && existing !== undefined && (
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          {existing ? (
            <p className="text-muted">
              This email already has access —{" "}
              {existing.source === "stripe_purchase" ? "purchased" : "granted"}{" "}
              {new Date(existing.granted_at).toLocaleDateString()}.
            </p>
          ) : (
            <>
              <p className="text-muted">No access on file yet.</p>
              <button
                type="button"
                onClick={handleGrant}
                disabled={isPending}
                className="shrink-0 rounded-md bg-accent px-4 py-2 font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Grant access
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
