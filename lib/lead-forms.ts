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
      "I agree to receive text and email reminders for Unstuck. Message and data rates may apply. Reply STOP to opt out.",
    eventName: "Unstuck Live Training",
    // Recurring weekly session; Eastern time assumed (Ohio).
    eventDate: "Every Thursday at 12:00 PM ET",
  },
};

export function getLeadForm(key: unknown): LeadFormConfig | undefined {
  if (typeof key !== "string") return undefined;
  return Object.prototype.hasOwnProperty.call(LEAD_FORMS, key) ? LEAD_FORMS[key] : undefined;
}
