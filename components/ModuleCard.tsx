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
export function ModuleCard({ id, title, description, status }: ModuleCardProps) {
  return (
    <Link
      href={`/module/${id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-accent"
    >
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-sm">
        {status === "complete" ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs text-background" aria-label="Complete">
            ✓
          </span>
        ) : (
          <span className="text-muted">{STATUS_LABEL[status]}</span>
        )}
      </div>
    </Link>
  );
}
