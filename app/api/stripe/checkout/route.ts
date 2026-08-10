import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Open to any origin: this route only ever creates a Stripe Checkout Session
// (no cookies, no session, no secret data in the response — just a redirect
// URL to Stripe's own hosted payment page) so it's safe to call from
// external marketing pages (thank-you pages, webinar funnels) that embed
// their own copy of this form outside the app's own origin.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Best-effort, isolated from the checkout flow entirely — powers the admin
// "abandoned checkout" list (see lib/admin-data.ts). Must never affect
// whether checkout succeeds: wrapped in its own try/catch (not just relying
// on supabase-js's {error} field) since admin client construction or the
// network call itself can throw, e.g. checkout_attempts not existing yet
// (migration 0003 unapplied) or during tests where Supabase isn't mocked.
async function logCheckoutAttempt(email: string, sessionId: string): Promise<void> {
  try {
    await createAdminClient().from("checkout_attempts").insert({ email, stripe_session_id: sessionId });
  } catch {
    // Intentionally ignored.
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // PurchaseButton (and any external embed of this same form) always does
  // response.json() on the result — this route must always return JSON,
  // never let an exception fall through to Next's default HTML error page
  // (which would break that .json() call).
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!, quantity: 1 }],
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Could not create checkout session." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    await logCheckoutAttempt(email, session.id);

    return NextResponse.json({ url: session.url }, { headers: CORS_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Could not start checkout. Try again in a moment." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
