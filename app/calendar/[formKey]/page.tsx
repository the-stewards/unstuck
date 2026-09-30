import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { getLeadForm } from "@/lib/lead-forms";

export const metadata: Metadata = {
  title: "Save it to your calendar",
  robots: { index: false, follow: false },
};

// Default step 3 page: declining the upsell and returning from Stripe both
// land here unless the form config points calendarPageUrl at another page
// (e.g. a Brilliant Directories page embedding data-unstuck-calendar).
export default async function CalendarPage({ params }: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await params;
  const form = getLeadForm(formKey);
  if (!form) notFound();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div data-unstuck-calendar={form.key} />
      </div>
      <Script src="/embed/lead-widget.js" strategy="afterInteractive" />
    </main>
  );
}
