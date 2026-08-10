import Link from "next/link";
import type { CallStatus } from "@/lib/types";

const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL || "#";

interface CopyEntry {
  label: string;
  headingPre: string;
  headingOrange: string;
  headingPost: string;
  body: string;
  cta: string | null;
}

const COPY: Record<CallStatus, CopyEntry> = {
  not_booked: {
    label: "Next Step",
    headingPre: "",
    headingOrange: "Activate",
    headingPost: " Your Bonuses",
    body: "The bonuses you missed are still locked — unless you get on a call.",
    cta: "Book a Call",
  },
  booked: {
    label: "You're In",
    headingPre: "You're ",
    headingOrange: "Booked",
    headingPost: "",
    body: "We've got you down. No need to do anything else here.",
    cta: null,
  },
  completed: {
    label: "All Set",
    headingPre: "Thanks For ",
    headingOrange: "Calling",
    headingPost: " In",
    body: "Reach out any time if something's still unclear.",
    cta: null,
  },
};

// Banner block per the schema: charcoal fill, orange left border, section
// label, H2 with one orange word, deck copy, CTA button.
export function CtaBanner({ callStatus }: { callStatus: CallStatus }) {
  const copy = COPY[callStatus];

  return (
    <div className="flex flex-col items-start gap-4 border-l-4 border-accent bg-band-bg px-6 py-6 sm:px-8 sm:py-8">
      <div>
        <p className="font-heading text-base font-bold uppercase tracking-[0.4em] text-accent">
          {copy.label}
        </p>
        <h2 className="mt-2 font-heading text-2xl font-bold uppercase leading-tight text-band-text sm:text-3xl">
          {copy.headingPre}
          <span className="text-accent">{copy.headingOrange}</span>
          {copy.headingPost}
        </h2>
        <p className="mt-3 max-w-md font-body text-lg font-light text-band-text/70">
          {copy.body}
        </p>
      </div>
      {copy.cta && (
        <Link
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 bg-accent px-8 py-3 font-heading text-base font-bold uppercase tracking-wide text-on-accent transition-opacity hover:opacity-90"
        >
          {copy.cta}
        </Link>
      )}
    </div>
  );
}
