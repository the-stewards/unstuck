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
const LABEL = "flex flex-col gap-1 font-heading text-base font-bold uppercase tracking-wide text-muted-light";
const INPUT = "border border-border bg-background px-3 py-2 font-body text-base text-foreground focus:border-accent focus:outline-none";

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
    <form onSubmit={handleSubmit} className="border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Client name
          <input value={clientName} onChange={(event) => setClientName(event.target.value)} required className={INPUT} />
        </label>
        <label className={LABEL}>
          Result / stat line
          <input value={resultStat} onChange={(event) => setResultStat(event.target.value)} className={INPUT} />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Quote
          <textarea
            value={quote}
            onChange={(event) => setQuote(event.target.value)}
            rows={2}
            required
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          Photo URL
          <input value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className={INPUT} />
        </label>
        <label className={LABEL}>
          Order
          <input
            type="number"
            value={displayOrder}
            onChange={(event) => setDisplayOrder(Number(event.target.value))}
            className={INPUT}
          />
        </label>
        <label className="flex items-center gap-2 font-body text-base text-muted">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="h-4 w-4 border-border"
          />
          Active (shown to students)
        </label>
      </div>

      {error && <p className="mt-3 font-body text-base text-red-700">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent px-4 py-2 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {existing ? "Save" : "Add testimonial"}
        </button>
        {existing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="font-heading text-base font-bold uppercase tracking-wide text-red-700 hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
