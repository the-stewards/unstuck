import { SUPPORT_EMAIL } from "@/lib/support";

// Fires once at 100% course progress — the single highest-satisfaction
// moment in the product, and previously wasted (dashboard just showed
// checkmarks with no acknowledgment). Distinct from CtaBanner: this is
// about finishing the content, not the call-booking funnel, so it sits
// above that banner rather than duplicating its CTA.
export function CourseCompleteBanner() {
  return (
    <div className="border-l-4 border-accent bg-card px-6 py-6 sm:px-8 sm:py-8">
      <p className="font-heading text-base font-bold uppercase tracking-[0.4em] text-accent">
        You Did It
      </p>
      <h2 className="mt-2 font-heading text-2xl font-bold uppercase leading-tight text-foreground sm:text-3xl">
        You&rsquo;re <span className="text-accent">Unstuck</span>
      </h2>
      <p className="mt-3 max-w-md font-body text-lg font-light text-muted">
        Every module, done. If this actually helped, we&rsquo;d love to hear about it —{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=My%20UNSTUCK%20story`}
          className="text-accent underline"
        >
          send us your story
        </a>
        .
      </p>
    </div>
  );
}
