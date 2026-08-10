import type { Bonus, BonusStatus } from "@/lib/types";

interface BonusLockProps {
  bonus: Bonus;
  status: BonusStatus;
}

// Locked bonuses stay visible (never hidden) — seeing what's missing is the
// FOMO mechanic. Locked gets the heavier anchor-card treatment (charcoal +
// orange top border) to make "still locked" read as the more serious state;
// unlocked gets the standard card (cream + charcoal top border).
export function BonusLock({ bonus, status }: BonusLockProps) {
  const isLocked = status === "locked_missed";

  return (
    <div
      className={
        isLocked
          ? "border-t-[3px] border-accent bg-band-bg px-5 py-4"
          : "border-t-[3px] border-foreground bg-card px-5 py-4"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4
            className={`font-heading text-lg font-bold uppercase ${
              isLocked ? "text-band-text" : "text-foreground"
            }`}
          >
            {bonus.title}
          </h4>
          {bonus.value_prop && (
            <p
              className={`mt-1 font-body text-base font-light ${
                isLocked ? "text-band-text/70" : "text-muted"
              }`}
            >
              {bonus.value_prop}
            </p>
          )}
        </div>
        <span className="shrink-0 text-lg" aria-hidden>
          {isLocked ? "🔒" : "✓"}
        </span>
      </div>
      {isLocked && (
        <p className="mt-3 font-heading text-base font-bold uppercase tracking-wide text-accent">
          Locked unless you book a call.
        </p>
      )}
    </div>
  );
}
