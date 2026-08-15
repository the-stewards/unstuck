import type { Bonus } from "@/lib/types";

interface BonusLockProps {
  bonus: Bonus;
}

// Every published bonus renders as available, full stop — the $47 purchase
// page promises "everything, right now," so gating bonuses behind a call
// made paying customers feel like something they already bought was being
// withheld. Admin's call-status tracking and reactivateBonuses() are
// untouched (see app/actions/admin.ts) — this is purely a display change.
// coming_soon bonuses render alongside published ones (not hidden) so
// students see what's on the way, but with no checkmark or content link.
export function BonusLock({ bonus }: BonusLockProps) {
  const isComingSoon = bonus.status === "coming_soon";

  return (
    <div className={`border-t-[3px] border-foreground bg-card px-5 py-4 ${isComingSoon ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-heading text-lg font-bold uppercase text-foreground">
            {bonus.title}
          </h4>
          {bonus.value_prop && (
            <p className="mt-1 font-body text-base font-light text-muted">{bonus.value_prop}</p>
          )}
        </div>
        {isComingSoon ? (
          <span className="shrink-0 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
            Coming soon
          </span>
        ) : (
          <span className="shrink-0 text-lg" aria-hidden>
            ✓
          </span>
        )}
      </div>
      {!isComingSoon && bonus.content_url && (
        <a
          href={bonus.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block font-heading text-base font-bold uppercase tracking-wide text-accent hover:underline"
        >
          Access this bonus →
        </a>
      )}
    </div>
  );
}
