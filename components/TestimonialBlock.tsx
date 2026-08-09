import type { Testimonial } from "@/lib/types";

// Light quote block per the schema: cream fill, orange left border, italic
// Frank Ruhl Libre for the quote, Barlow Condensed for attribution.
export function TestimonialBlock({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {testimonials.map((t) => (
        <blockquote key={t.id} className="border-l-4 border-accent bg-card px-5 py-4">
          <p className="font-body text-lg italic font-normal text-foreground">
            &ldquo;{t.quote}&rdquo;
          </p>
          <footer className="mt-3 font-heading text-base font-bold uppercase tracking-wide text-muted-light">
            {t.client_name}
            {t.result_stat && <span className="text-accent"> — {t.result_stat}</span>}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}
