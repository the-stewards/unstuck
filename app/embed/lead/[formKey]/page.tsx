import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { getLeadForm } from "@/lib/lead-forms";
import { IframeResizer } from "./IframeResizer";

export const metadata: Metadata = {
  title: "Reserve your seat",
  robots: { index: false, follow: false },
};

// Iframe fallback for hosts that can't run the script-tag embed. It reuses
// the exact same widget script (one UI implementation) and just reports its
// height to the parent page so the iframe never clips or scrolls.
export default async function LeadEmbedPage({ params }: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await params;
  const form = getLeadForm(formKey);
  if (!form) notFound();

  return (
    <>
      <style>{`html,body{margin:0!important;padding:0!important;background:transparent!important;min-height:0!important;}`}</style>
      <div id="lead-embed-root" style={{ padding: 4 }}>
        <div data-unstuck-lead={form.key} />
      </div>
      <Script src="/embed/lead-widget.js" strategy="afterInteractive" />
      <IframeResizer targetId="lead-embed-root" />
    </>
  );
}
