import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

let resendClient: Resend | undefined;

// Lazy singleton — same reason as lib/stripe.ts: instantiating eagerly at
// module scope crashes build-time route analysis when RESEND_API_KEY isn't
// set yet.
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Generates a Supabase magic link without sending Supabase's own email —
// used only for the post-access-grant email, which has to double as a
// receipt/welcome message (custom copy), not the plain login-screen resend.
async function generateMagicLink(email: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` },
  });

  if (error) throw error;
  return data.properties.action_link;
}

// Steward Design Schema banner block, adapted for email: table layout and
// inline styles only (no flexbox/grid — most clients, Outlook especially,
// don't support them), font stacks with Barlow Condensed/Frank Ruhl Libre
// first and system fallbacks second since custom @font-face support is
// inconsistent across mail clients.
function accessEmailHtml(magicLink: string): string {
  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>You're in</title>
  </head>
  <body style="margin:0; padding:0; background:#fffae8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffae8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#403d3d; border-radius:0 3px 3px 0; border-left:4px solid #f76732;">
            <tr>
              <td style="padding:40px;">
                <p style="margin:0 0 12px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:16px; letter-spacing:0.3em; text-transform:uppercase; color:#f76732;">
                  Unstuck
                </p>
                <h1 style="margin:0 0 20px 0; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:32px; line-height:1.05; letter-spacing:-0.01em; text-transform:uppercase; color:#fffae8;">
                  You&rsquo;re <span style="color:#f76732;">In</span>
                </h1>
                <p style="margin:0 0 28px 0; font-family:'Frank Ruhl Libre', Georgia, serif; font-weight:300; font-size:18px; line-height:1.75; color:rgba(255,250,232,0.85);">
                  Your private UNSTUCK Starter Kit is ready. Click below to jump straight in &mdash; no password needed.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#f76732; border-radius:2px;">
                      <a href="${magicLink}" style="display:inline-block; padding:16px 40px; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:18px; letter-spacing:0.1em; text-transform:uppercase; color:#fffae8; text-decoration:none;">
                        Enter Unstuck
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0; font-family:'Barlow Condensed', Arial, sans-serif; font-weight:700; font-size:16px; letter-spacing:0.05em; text-transform:uppercase; color:rgba(255,250,232,0.4);">
                  Keep this email &mdash; it&rsquo;s your login link any time you come back.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}

// Fires once, right after grantAccess() succeeds — regardless of whether the
// grant came from a Stripe purchase or a manual comp. This is the "post-access
// delivery" email from the spec: receipt/welcome + login, via Resend rather
// than Supabase's default auth mailer.
export async function sendAccessGrantedEmail(email: string): Promise<void> {
  const magicLink = await generateMagicLink(email);

  // Resend reports API-level rejections (bad sender, rejected recipient
  // domain, etc.) through this response's `error` field, not by rejecting
  // the promise — checking it is what makes a failed send actually visible
  // as a failure to the caller, instead of silently reporting success.
  const { error } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "You're in — UNSTUCK access + login link",
    html: accessEmailHtml(magicLink),
  });

  if (error) throw error;
}

// Fires when webhook processing fails after signature verification — the
// one place a failure would otherwise be silent (a paying customer gets no
// access and nobody finds out until they email in). Deliberately best-effort:
// if the alert itself fails, there's nothing further to do but log it, and
// that must never mask or replace the original error being reported.
export async function sendAdminAlert(subject: string, message: string): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (adminEmails.length === 0) return;

  try {
    const { error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: adminEmails,
      subject: `[UNSTUCK Alert] ${subject}`,
      html: `<p style="font-family:sans-serif;">${message}</p>`,
    });

    if (error) throw error;
  } catch (err) {
    console.error("Failed to send admin alert:", subject, err);
  }
}
