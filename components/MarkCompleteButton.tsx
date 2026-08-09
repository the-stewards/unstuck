"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markModuleComplete } from "@/app/actions/progress";

interface MarkCompleteButtonProps {
  moduleId: string;
  nextHref: string;
  label: string;
}

export function MarkCompleteButton({ moduleId, nextHref, label }: MarkCompleteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await markModuleComplete(moduleId);
      } catch {
        // Best-effort — a save hiccup shouldn't trap the student on this page.
      }
      router.push(nextHref);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="bg-accent px-6 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isPending ? "Saving…" : label}
    </button>
  );
}
