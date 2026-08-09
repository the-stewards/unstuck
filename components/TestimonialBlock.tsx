import type { Testimonial } from "@/lib/types";

export function TestimonialBlock({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {testimonials.map((t) => (
        <blockquote key={t.id} className="rounded-lg border border-border bg-card px-5 py-4">
          <p className="text-sm text-foreground">&ldquo;{t.quote}&rdquo;</p>
          <footer className="mt-3 text-xs text-muted">
            {t.client_name}
            {t.result_stat && <span className="text-accent"> — {t.result_stat}</span>}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}
