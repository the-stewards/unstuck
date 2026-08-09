import Link from "next/link";
import type { CallStatus } from "@/lib/types";

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL || "#";

const COPY: Record<CallStatus, { heading: string; body: string; cta: string | null }> = {
  not_booked: {
    heading: "Book a call to reactivate your bonuses",
    body: "The bonuses you missed are still gone — unless you get on a call.",
    cta: "Book a call",
  },
  booked: {
    heading: "You're booked — see you on the call.",
    body: "We've got you down. No need to do anything else here.",
    cta: null,
  },
  completed: {
    heading: "Great catching up on the call.",
    body: "Reach out any time if something's still unclear.",
    cta: null,
  },
};

export function CtaBanner({ callStatus }: { callStatus: CallStatus }) {
  const copy = COPY[callStatus];

  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-accent bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-foreground">{copy.heading}</p>
        <p className="mt-1 text-sm text-muted">{copy.body}</p>
      </div>
      {copy.cta && (
        <Link
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {copy.cta}
        </Link>
      )}
    </div>
  );
}
