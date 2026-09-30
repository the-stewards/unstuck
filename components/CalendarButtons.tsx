import { getLeadForm } from "@/lib/lead-forms";
import { googleCalendarUrl } from "@/lib/lead-calendar";

// Save-to-calendar block for the post-purchase page when the buyer came from
// a lead form's upsell (?from=<form key>). The widget renders its own copy of
// this step for people who decline the upsell.
export function CalendarButtons({ formKey }: { formKey: string }) {
  const form = getLeadForm(formKey);
  if (!form) return null;

  const linkClass =
    "inline-block rounded-sm border border-accent px-6 py-3 font-heading text-lg font-bold uppercase tracking-widest text-foreground hover:bg-accent";

  return (
    <div className="mt-10 border-t border-muted/30 pt-8">
      <h2 className="font-heading text-2xl font-bold uppercase leading-none tracking-tight text-foreground">
        {form.calendarStep.title}
      </h2>
      <p className="mt-3 font-body text-base font-light leading-relaxed text-muted">{form.calendarStep.message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <a href={googleCalendarUrl(form)} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {form.calendarStep.googleLabel}
        </a>
        <a href={`/api/leads/calendar?form=${form.key}`} className={linkClass}>
          {form.calendarStep.icsLabel}
        </a>
      </div>
    </div>
  );
}
