import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

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

function accessEmailHtml(magicLink: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
      <h1 style="font-size: 22px;">You're in.</h1>
      <p>Your private UNSTUCK library is ready. Click below to jump straight in — no password needed.</p>
      <p style="margin: 24px 0;">
        <a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#111;color:#fff;text-decoration:none;border-radius:6px;">Enter UNSTUCK</a>
      </p>
      <p style="color:#666;font-size:13px;">Keep this email — it's your login link any time you come back.</p>
    </div>
  `;
}

// Fires once, right after grantAccess() succeeds — regardless of whether the
// grant came from a Stripe purchase or a manual comp. This is the "post-access
// delivery" email from the spec: receipt/welcome + login, via Resend rather
// than Supabase's default auth mailer.
export async function sendAccessGrantedEmail(email: string): Promise<void> {
  const magicLink = await generateMagicLink(email);

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: "You're in — UNSTUCK access + login link",
    html: accessEmailHtml(magicLink),
  });
}
