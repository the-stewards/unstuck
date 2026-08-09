"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertModule, deleteModule } from "@/app/actions/content";
import type { Module } from "@/lib/types";

const EMPTY = { title: "", description: "", dubbUrl: "", durationSeconds: 0, displayOrder: 0 };

export function ModuleForm({ module: existingModule }: { module?: Module }) {
  const router = useRouter();
  const [title, setTitle] = useState(existingModule?.title ?? EMPTY.title);
  const [description, setDescription] = useState(existingModule?.description ?? EMPTY.description);
  const [dubbUrl, setDubbUrl] = useState(existingModule?.dubb_url ?? EMPTY.dubbUrl);
  const [durationSeconds, setDurationSeconds] = useState(
    existingModule?.duration_seconds ?? EMPTY.durationSeconds
  );
  const [displayOrder, setDisplayOrder] = useState(existingModule?.display_order ?? EMPTY.displayOrder);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await upsertModule({
          id: existingModule?.id,
          title,
          description,
          dubb_url: dubbUrl,
          duration_seconds: durationSeconds,
          display_order: displayOrder,
        });

        if (!existingModule) {
          setTitle(EMPTY.title);
          setDescription(EMPTY.description);
          setDubbUrl(EMPTY.dubbUrl);
          setDurationSeconds(EMPTY.durationSeconds);
          setDisplayOrder(EMPTY.displayOrder);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleDelete() {
    if (!existingModule) return;
    if (!confirm(`Delete "${existingModule.title}"? This also deletes its resources.`)) return;

    startTransition(async () => {
      try {
        await deleteModule(existingModule.id);
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
          Dubb embed URL
          <input
            value={dubbUrl}
            onChange={(event) => setDubbUrl(event.target.value)}
            required
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
        <label className="flex flex-col gap-1 text-sm text-muted">
          Duration (seconds)
          <input
            type="number"
            min={0}
            value={durationSeconds}
            onChange={(event) => setDurationSeconds(Number(event.target.value))}
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
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-3 flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {existingModule ? "Save" : "Add module"}
        </button>
        {existingModule && (
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
