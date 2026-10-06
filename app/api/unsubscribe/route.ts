import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

// Unsubscribe from session emails.
//  - GET  = the footer link. It only shows a confirm button: mail scanners that
//           pre-fetch links must not be able to unsubscribe people by accident.
//  - POST = does it (the confirm button, and mail apps' one-click
//           List-Unsubscribe-Post). Records the address in email_suppressions.

const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function page(title: string, message: string, status = 200, extra = "") {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#fffae8;font-family:Georgia,serif;color:#403d3d"><div style="max-width:520px;margin:12vh auto;padding:0 24px"><h1 style="font-family:Arial,sans-serif;text-transform:uppercase;font-size:28px;margin:0 0 12px">${title}</h1><p style="font-size:18px;line-height:1.6;margin:0 0 20px">${message}</p>${extra}</div></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function parse(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";
  const valid = !!email && !!token && verifyUnsubscribeToken(email, token);
  return { email, valid };
}

const INVALID = () =>
  page("Link not valid", "This unsubscribe link is invalid or incomplete. Reply to any of our emails and we will take care of it.", 400);

export async function GET(request: Request) {
  const { email, valid } = parse(request);
  if (!valid) return INVALID();
  const form = `<form method="POST" action="${escAttr(new URL(request.url).pathname + new URL(request.url).search)}"><button type="submit" style="background:#f76732;color:#fffae8;font-family:Arial,sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:0;border-radius:2px;padding:14px 26px;font-size:16px;cursor:pointer">Unsubscribe</button></form>`;
  return page("Unsubscribe", `Stop UNSTUCK session reminder emails to <strong>${escAttr(email)}</strong>?`, 200, form);
}

export async function POST(request: Request) {
  const { email, valid } = parse(request);
  if (!valid) return INVALID();

  try {
    const { error } = await createAdminClient()
      .from("email_suppressions")
      .upsert({ email, reason: "unsubscribe" }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return page("Something went wrong", "We could not save that just now. Please try the link again in a minute.", 500);
  }

  return page("You're unsubscribed", "You will no longer get UNSTUCK session reminder emails at this address.");
}
