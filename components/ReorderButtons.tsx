"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveModule, moveResource, moveBonus, moveTestimonial } from "@/app/actions/content";

type ReorderKind = "module" | "resource" | "bonus" | "testimonial";

interface ReorderButtonsProps {
  kind: ReorderKind;
  id: string;
  moduleId?: string;
  disableUp: boolean;
  disableDown: boolean;
}

const BUTTON_CLASS =
  "border border-border bg-card px-2 py-1 font-heading text-base font-bold leading-none text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-30";

export function ReorderButtons({ kind, id, moduleId, disableUp, disableDown }: ReorderButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(direction: "up" | "down") {
    startTransition(async () => {
      if (kind === "module") {
        await moveModule(id, direction);
      } else if (kind === "resource") {
        await moveResource(id, moduleId!, direction);
      } else if (kind === "bonus") {
        await moveBonus(id, direction);
      } else {
        await moveTestimonial(id, direction);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button
        type="button"
        onClick={() => handle("up")}
        disabled={isPending || disableUp}
        aria-label="Move up"
        className={BUTTON_CLASS}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => handle("down")}
        disabled={isPending || disableDown}
        aria-label="Move down"
        className={BUTTON_CLASS}
      >
        ↓
      </button>
    </div>
  );
}
