"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertResource, deleteResource } from "@/app/actions/content";
import type { Resource, ResourceType } from "@/lib/types";

const TYPES: ResourceType[] = ["checklist", "toolkit", "guide", "script"];
const EMPTY = { title: "", type: "checklist" as ResourceType, fileUrl: "", displayOrder: 0 };
const LABEL = "flex flex-col gap-1 font-heading text-base font-bold uppercase tracking-wide text-muted-light";
const INPUT = "border border-border bg-card px-2 py-1 font-body text-base text-foreground focus:border-accent focus:outline-none";

export function ResourceForm({
  moduleId,
  resource: existingResource,
}: {
  moduleId: string;
  resource?: Resource;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(existingResource?.title ?? EMPTY.title);
  const [type, setType] = useState<ResourceType>(existingResource?.type ?? EMPTY.type);
  const [fileUrl, setFileUrl] = useState(existingResource?.file_url ?? EMPTY.fileUrl);
  const [displayOrder, setDisplayOrder] = useState(existingResource?.display_order ?? EMPTY.displayOrder);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await upsertResource({
        id: existingResource?.id,
        module_id: moduleId,
        title,
        type,
        file_url: fileUrl,
        display_order: displayOrder,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (!existingResource) {
        setTitle(EMPTY.title);
        setType(EMPTY.type);
        setFileUrl(EMPTY.fileUrl);
        setDisplayOrder(EMPTY.displayOrder);
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!existingResource) return;
    if (!confirm(`Delete "${existingResource.title}"?`)) return;

    startTransition(async () => {
      const result = await deleteResource(existingResource.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 border border-border bg-background px-3 py-2">
      <label className={LABEL}>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required className={`w-40 ${INPUT}`} />
      </label>
      <label className={LABEL}>
        Type
        <select value={type} onChange={(event) => setType(event.target.value as ResourceType)} className={INPUT}>
          {TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className={`flex-1 ${LABEL}`}>
        File URL
        <input
          value={fileUrl}
          onChange={(event) => setFileUrl(event.target.value)}
          required
          className={`w-full min-w-40 ${INPUT}`}
        />
      </label>
      <label className={LABEL}>
        Order
        <input
          type="number"
          value={displayOrder}
          onChange={(event) => setDisplayOrder(Number(event.target.value))}
          className={`w-16 ${INPUT}`}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="bg-accent px-3 py-1.5 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {existingResource ? "Save" : "Add"}
      </button>
      {existingResource && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="font-heading text-base font-bold uppercase tracking-wide text-red-700 hover:underline disabled:opacity-50"
        >
          Delete
        </button>
      )}
      {error && <p className="w-full font-body text-base text-red-700">{error}</p>}
    </form>
  );
}
