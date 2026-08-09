import Link from "next/link";
import type { ProgressStatus } from "@/lib/types";

interface ModuleCardProps {
  id: string;
  title: string;
  description: string | null;
  status: ProgressStatus;
}

const STATUS_LABEL: Record<ProgressStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

// Soft lock: every module is a live link regardless of status — nothing is
// greyed out or blocked. The checkmark is the only signal of completion.
// Standard card treatment: cream fill, charcoal top border, orange accent
// reserved for the one thing that matters — the completion state.
export function ModuleCard({ id, title, description, status }: ModuleCardProps) {
  return (
    <Link
      href={`/module/${id}`}
      className="flex items-center justify-between gap-4 border-t-[3px] border-foreground bg-card px-5 py-4 transition-colors hover:border-accent"
    >
      <div>
        <h3 className="font-heading text-[22px] font-bold uppercase leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-1 font-body text-base font-light text-muted">{description}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status === "complete" ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm text-on-accent"
            aria-label="Complete"
          >
            ✓
          </span>
        ) : (
          <span className="font-heading text-base font-bold uppercase tracking-wide text-muted-light">
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>
    </Link>
  );
}
