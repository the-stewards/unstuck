import "server-only";
import { getResend } from "@/lib/notify";

export type ReminderKind = "t24h" | "t1h" | "tnow" | "after";

export interface ReminderEmailInput {
  email: string;
  firstName: string;
  kind: ReminderKind;
  // "12:00 PM ET" - the weekly session time, used in subjects/body.
  timeLabel: string;
  joinUrl: string;
  joinLabel: string;
  // Where the post-session email sends people to grab the next cycle's seat.
  rsvpUrl: string;
  unsubscribeUrl: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Copy {
  subject: string;
  heading: string;
  body: string;
  cta: "join" | "rsvp";
}

export function reminderCopy(kind: ReminderKind, firstName: string, timeLabel: string): Copy {
  const name = esc(firstName);
  switch (kind) {
    case "t24h":
      return {
        subject: `Tomorrow at ${timeLabel}: your UNSTUCK session`,
        heading: `See you tomorrow, ${name}`,
        body: `Your free live session is tomorrow at <strong style="color:#fffae8;">${esc(timeLabel)}</strong>. It's the same link every Thursday, so save this email.`,
        cta: "join",
      };
    case "t1h":
      return {
        subject: "Starts in 1 hour: join UNSTUCK",
        heading: "One hour to go",
        body: `Your live session starts at <strong style="color:#fffae8;">${esc(timeLabel)}</strong>. Grab a notebook and join a few minutes early.`,
        cta: "join",
      };
    case "tnow":
      return {
        subject: "Starting now: join UNSTUCK",
        heading: "We're starting now",
        body: "Your live session is starting. Tap below to join.",
        cta: "join",
      };
    case "after":
      return {
        subject: "Thanks for registering for UNSTUCK",
        heading: `Thanks, ${name}`,
        body: `Whether you joined live or missed it, you're welcome at the next one. We run it every Thursday at <strong style="color:#fffae8;">${esc(timeLabel)}</strong>, free.`,
        cta: "rsvp",
      };
  }
}

export function reminderHtml(input: ReminderEmailInput): string {
  const copy = reminderCopy(input.kind, input.firstName, input.timeLabel);
  const button =
    copy.cta === "join"
      ? { url: input.joinUrl, label: input.joinLabel }
      : { url: input.rsvpUrl, label: "Reserve Your Seat For Next Thursday" };

  return `
<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#fffae8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffae8; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#403d3d; border-radius:0 3px 3px 0; border-left:4px solid #f76732;">
          <tr><td style="padding:40px;">
            <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:16px; letter-spacing:0.3em; text-transform:uppercase; color:#f76732;">Unstuck</p>
            <h1 style="margin:0 0 20px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:32px; line-height:1.05; text-transform:uppercase; color:#fffae8;">${copy.heading}</h1>
            <p style="margin:0 0 28px 0; font-family:'Frank Ruhl Libre', Georgia, serif; font-weight:300; font-size:18px; line-height:1.75; color:rgba(255,250,232,0.85);">${copy.body}</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="background:#f76732; border-radius:2px;"><a href="${esc(button.url)}" style="display:inline-block; padding:16px 32px; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:18px; letter-spacing:0.1em; text-transform:uppercase; color:#fffae8; text-decoration:none;">${esc(button.label)}</a></td>
            </tr></table>
          </td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr><td style="padding:20px 8px 0 8px; font-family:Arial, sans-serif; font-size:12px; line-height:1.6; color:#777;">
            You're getting this because you registered for UNSTUCK. Ruoff Mortgage, 8101 N High St Suite 300, Columbus OH 43235, NMLS #141868. Equal Housing Lender.
            <br><a href="${esc(input.unsubscribeUrl)}" style="color:#777;">Unsubscribe</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendSessionReminderEmail(input: ReminderEmailInput): Promise<void> {
  const copy = reminderCopy(input.kind, input.firstName, input.timeLabel);
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: input.email,
    subject: copy.subject,
    html: reminderHtml(input),
    // Lets mail apps show their own "Unsubscribe" button (one-click POST).
    headers: {
      "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) throw error;
}
