"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertTestimonial, deleteTestimonial } from "@/app/actions/content";
import type { Testimonial } from "@/lib/types";

const EMPTY = {
  clientName: "",
  quote: "",
  resultStat: "",
  photoUrl: "",
  displayOrder: 0,
  active: true,
};

export function TestimonialForm({ testimonial: existing }: { testimonial?: Testimonial }) {
  const router = useRouter();
  const [clientName, setClientName] = useState(existing?.client_name ?? EMPTY.clientName);
  const [quote, setQuote] = useState(existing?.quote ?? EMPTY.quote);
  const [resultStat, setResultStat] = useState(existing?.result_stat ?? EMPTY.resultStat);
  const [photoUrl, setPhotoUrl] = useState(existing?.photo_url ?? EMPTY.photoUrl);
  const [displayOrder, setDisplayOrder] = useState(existing?.display_order ?? EMPTY.displayOrder);
  const [active, setActive] = useState(existing?.active ?? EMPTY.active);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await upsertTestimonial({
          id: existing?.id,
          client_name: clientName,
          quote,
          result_stat: resultStat,
          photo_url: photoUrl,
          display_order: displayOrder,
          active,
        });

        if (!existing) {
          setClientName(EMPTY.clientName);
          setQuote(EMPTY.quote);
          setResultStat(EMPTY.resultStat);
          setPhotoUrl(EMPTY.photoUrl);
          setDisplayOrder(EMPTY.displayOrder);
          setActive(EMPTY.active);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleDelete() {
    if (!existing) return;
    if (!confirm(`Delete this testimonial from ${existing.client_name}?`)) return;

    startTransition(async () => {
      try {
        await deleteTestimonial(existing.id);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Client name
          <input
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Result / stat line
          <input
            value={resultStat}
            onChange={(event) => setResultStat(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Quote
          <textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            rows={2}
            required
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Photo URL
          <input
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Order
          <input
            type="number"
            value={displayOrder}
            onChange={(event) => setDisplayOrder(Number(event.target.value))}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Active (shown to students)
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {existing ? "Save" : "Add testimonial"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm text-red-400 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
