"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertBonus, deleteBonus } from "@/app/actions/content";
import type { Bonus, ContentStatus } from "@/lib/types";

const EMPTY = {
  title: "",
  description: "",
  valueProp: "",
  contentUrl: "",
  displayOrder: 0,
  status: "published" as ContentStatus,
};
const LABEL = "flex flex-col gap-1 font-heading text-base font-bold uppercase tracking-wide text-muted-light";
const INPUT = "border border-border bg-background px-3 py-2 font-body text-base text-foreground focus:border-accent focus:outline-none";

export function BonusForm({ bonus: existingBonus }: { bonus?: Bonus }) {
  const router = useRouter();
  const [title, setTitle] = useState(existingBonus?.title ?? EMPTY.title);
  const [description, setDescription] = useState(existingBonus?.description ?? EMPTY.description);
  const [valueProp, setValueProp] = useState(existingBonus?.value_prop ?? EMPTY.valueProp);
  const [contentUrl, setContentUrl] = useState(existingBonus?.content_url ?? EMPTY.contentUrl);
  const [displayOrder, setDisplayOrder] = useState(existingBonus?.display_order ?? EMPTY.displayOrder);
  const [status, setStatus] = useState<ContentStatus>(existingBonus?.status ?? EMPTY.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await upsertBonus({
        id: existingBonus?.id,
        title,
        description,
        value_prop: valueProp,
        content_url: contentUrl,
        display_order: displayOrder,
        status,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (!existingBonus) {
        setTitle(EMPTY.title);
        setDescription(EMPTY.description);
        setValueProp(EMPTY.valueProp);
        setContentUrl(EMPTY.contentUrl);
        setDisplayOrder(EMPTY.displayOrder);
        setStatus(EMPTY.status);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!existingBonus) return;
    if (!confirm(`Delete "${existingBonus.title}"?`)) return;

    startTransition(async () => {
      const result = await deleteBonus(existingBonus.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={LABEL}>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} required className={INPUT} />
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
        <label className={`${LABEL} sm:col-span-2`}>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className={INPUT}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Value prop (shown on the lock/reactivate card)
          <input value={valueProp} onChange={(event) => setValueProp(event.target.value)} className={INPUT} />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Content URL (where the unlocked bonus actually lives — PDF, video, external link)
          <input
            value={contentUrl}
            onChange={(event) => setContentUrl(event.target.value)}
            placeholder="https://..."
            className={INPUT}
          />
        </label>
        <label className={LABEL}>
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
            className={INPUT}
          >
            <option value="published">Published</option>
            <option value="coming_soon">Coming soon</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-3 font-body text-base text-red-700">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="bg-accent px-4 py-2 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {existingBonus ? "Save" : "Add bonus"}
        </button>
        {existingBonus && (
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
