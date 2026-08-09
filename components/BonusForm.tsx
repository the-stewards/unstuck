"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertBonus, deleteBonus } from "@/app/actions/content";
import type { Bonus } from "@/lib/types";

const EMPTY = { title: "", description: "", valueProp: "", displayOrder: 0 };

export function BonusForm({ bonus: existingBonus }: { bonus?: Bonus }) {
  const router = useRouter();
  const [title, setTitle] = useState(existingBonus?.title ?? EMPTY.title);
  const [description, setDescription] = useState(existingBonus?.description ?? EMPTY.description);
  const [valueProp, setValueProp] = useState(existingBonus?.value_prop ?? EMPTY.valueProp);
  const [displayOrder, setDisplayOrder] = useState(existingBonus?.display_order ?? EMPTY.displayOrder);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await upsertBonus({
          id: existingBonus?.id,
          title,
          description,
          value_prop: valueProp,
          display_order: displayOrder,
        });

        if (!existingBonus) {
          setTitle(EMPTY.title);
          setDescription(EMPTY.description);
          setValueProp(EMPTY.valueProp);
          setDisplayOrder(EMPTY.displayOrder);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleDelete() {
    if (!existingBonus) return;
    if (!confirm(`Delete "${existingBonus.title}"?`)) return;

    startTransition(async () => {
      try {
        await deleteBonus(existingBonus.id);
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
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
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
        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
          Value prop (shown on the lock/reactivate card)
          <input
            value={valueProp}
            onChange={(event) => setValueProp(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {existingBonus ? "Save" : "Add bonus"}
        </button>
        {existingBonus && (
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
