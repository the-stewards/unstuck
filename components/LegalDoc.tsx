import Link from "next/link";
import type { ReactNode } from "react";

interface LegalDocProps {
  title: string;
  titleOrange: string;
  effectiveDate: string;
  children: ReactNode;
}

// Shared chrome for /terms and /privacy — semantic h2/p/ul/table inside
// children get their styling from the arbitrary child selectors below
// rather than repeated className props, since both pages are long,
// section-heavy legal text rather than component-driven UI.
export function LegalDoc({ title, titleOrange, effectiveDate, children }: LegalDocProps) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link
        href="/"
        className="font-heading text-base font-bold uppercase tracking-wide text-muted-light hover:text-accent"
      >
        ← UNSTUCK
      </Link>
      <h1 className="mt-6 font-heading text-3xl font-bold uppercase leading-none tracking-tight text-foreground">
        {title} <span className="text-accent">{titleOrange}</span>
      </h1>
      <p className="mt-2 font-body text-base text-muted">Effective {effectiveDate}</p>

      <div
        className="mt-8 flex flex-col gap-5 font-body text-base font-light leading-relaxed text-foreground
          [&_h2]:mt-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:leading-tight [&_h2]:text-foreground
          [&_strong]:font-medium [&_strong]:text-foreground
          [&_a]:text-accent [&_a]:underline
          [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:pl-5
          [&_table]:w-full [&_table]:border-collapse [&_table]:text-base
          [&_th]:border [&_th]:border-border [&_th]:bg-card [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-heading [&_th]:text-base [&_th]:uppercase [&_th]:tracking-wide
          [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2"
      >
        {children}
      </div>
    </main>
  );
}
