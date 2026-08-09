import type { Bonus, BonusStatus } from "@/lib/types";

interface BonusLockProps {
  bonus: Bonus;
  status: BonusStatus;
}

// Locked bonuses stay visible (never hidden) — seeing what's missing is the
// FOMO mechanic. Only locked_missed renders the lock; the other two states
// read as already-included.
export function BonusLock({ bonus, status }: BonusLockProps) {
  const isLocked = status === "locked_missed";

  return (
    <div
      className={`rounded-lg border px-5 py-4 ${
        isLocked ? "border-border bg-card opacity-60" : "border-accent bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-medium text-foreground">{bonus.title}</h4>
          {bonus.value_prop && <p className="mt-1 text-sm text-muted">{bonus.value_prop}</p>}
        </div>
        <span className="shrink-0 text-lg" aria-hidden>
          {isLocked ? "🔒" : "✓"}
        </span>
      </div>
      {isLocked && (
        <p className="mt-3 text-xs text-accent">Gone unless you book a call.</p>
      )}
    </div>
  );
}
