// Config for every lead form the widget/iframe can render. The server looks
// up copy and consent wording HERE by form key - it never trusts consent text
// sent from the browser, so what gets stored is exactly what we displayed.
// Add a form by adding a key; unknown keys are rejected by the API.

export interface LeadFormConfig {
  key: string;
  title: string;
  subtitle: string;
  cta: string;
  successTitle: string;
  successMessage: string;
  // Counter is hidden until the count reaches this (a small number hurts
  // social proof). Embeds can raise/lower it with data-min-count.
  minCount: number;
  countLabel: string;
  consentText: string;
  // Sent in the confirmation email and shown on the success state.
  eventName: string;
  eventDate: string;
  // Recurring session, used to build the calendar links. Wall-clock time in tz.
  schedule: { weekday: number; hour: number; minute: number; tz: string; durationMinutes: number };
  calendar: { title: string; description: string; joinUrl: string };
  // Step 2 of the flow (after the RSVP): the $47 offer. Omit to skip straight
  // to the calendar step.
  upsell?: {
    eyebrow: string;
    headline: string;
    body: string;
    bullets: string[];
    price: string;
    cta: string;
    decline: string;
    terms: string;
    // Stripe Payment Link for the $47 offer. When set, "Yes" goes straight to
    // it (with client_reference_id = the lead id, no personal data in the URL)
    // instead of creating a Checkout Session through /api/stripe/checkout.
    // The link's post-payment redirect is configured in the Stripe dashboard.
    checkoutUrl?: string;
  };
  calendarStep: {
    title: string;
    message: string;
    googleLabel: string;
    appleLabel: string;
    outlookLabel: string;
    icsLabel: string;
    purchasedMessage: string;
  };
  // Where the save-to-calendar widget lives. Declining the upsell and returning
  // from Stripe checkout both land here. Absolute URL (e.g. a Brilliant
  // Directories page that embeds data-unstuck-calendar). Omit to use the
  // hosted page at /calendar/<key> on this app.
  calendarPageUrl?: string;
}

// Server-owned on purpose: the checkout route builds Stripe's success_url from
// this, so a browser can never point the post-payment redirect elsewhere.
export function getCalendarPageUrl(form: LeadFormConfig, origin: string): string {
  return form.calendarPageUrl || `${origin.replace(/\/+$/, "")}/calendar/${form.key}`;
}

export const LEAD_FORMS: Record<string, LeadFormConfig> = {
  webinar: {
    key: "webinar",
    title: "Save Your Seat",
    subtitle: "Free live training from The Stewards. Enter your details to reserve your spot.",
    cta: "Reserve My Spot",
    successTitle: "You're in.",
    successMessage: "Check your email for the details. We'll text you a reminder before we go live.",
    minCount: 25,
    countLabel: "people have reserved a seat",
    consentText:
      "I agree to receive text and email reminders for Unstuck.",
    eventName: "Unstuck Live Training",
    // Recurring weekly session; Eastern time assumed (Ohio).
    eventDate: "Every Thursday at 12:00 PM ET",
    schedule: { weekday: 4, hour: 12, minute: 0, tz: "America/New_York", durationMinutes: 60 },
    calendar: {
      title: "Unstuck Live Training",
      description: "Free live training from The Stewards.",
      // TODO(Ryan): paste the live join link (Zoom etc.) here. Empty = "link is in your confirmation email".
      joinUrl: "",
    },
    upsell: {
      // Short on purpose: the upsell page above the widget does the selling
      // (VSL + the toolkit), so this card only closes the sale. No price
      // anchor ("normally $X") unless it has genuinely been sold at that price.
      eyebrow: "Optional upgrade for UNSTUCK attendees",
      headline: "Add the Move-Up Starter Kit",
      body: "Short videos, checklists, and scripts to help you evaluate your next move.",
      bullets: [
        "Tools you can use one question at a time",
        "Instant access after checkout",
        "No purchase required to attend UNSTUCK",
      ],
      price: "$47 one-time",
      cta: "Get Instant Access For $47",
      decline: "No thanks, continue to my calendar link",
      terms: "By purchasing you agree to the Terms of Service and Privacy Policy.",
      checkoutUrl: "https://buy.stripe.com/fZu28qb7kgDO7arec60Fi01",
    },
    calendarStep: {
      title: "Add the session to your calendar now so it doesn't get buried.",
      message: "You'll receive a confirmation email with your access link and calendar details.",
      googleLabel: "Add to Google Calendar",
      appleLabel: "Add to Apple Calendar",
      outlookLabel: "Add to Outlook",
      icsLabel: "Download .ICS File",
      purchasedMessage: "Payment received. Check your email for your UNSTUCK access link.",
    },
    calendarPageUrl: "https://www.stewards.loan/unstuck.save",
  },
};

export function getLeadForm(key: unknown): LeadFormConfig | undefined {
  if (typeof key !== "string") return undefined;
  return Object.prototype.hasOwnProperty.call(LEAD_FORMS, key) ? LEAD_FORMS[key] : undefined;
}
