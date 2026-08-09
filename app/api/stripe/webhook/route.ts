import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantAccess } from "@/lib/access";
import { sendAccessGrantedEmail } from "@/lib/notify";

const UNIQUE_VIOLATION = "23505";

// This is what actually grants access — not the /purchase/success redirect,
// which can fail to load or have its tab closed before landing. Must read
// the raw body (not JSON-parsed) for Stripe's signature check, and must be
// idempotent: Stripe retries delivery, so a duplicate event must not grant
// access twice or send a second email.
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_details?.email ?? session.customer_email;

  if (!email) {
    return NextResponse.json({ error: "Checkout session has no email." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { error: orderError } = await supabase.from("orders").insert({
    stripe_session_id: session.id,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
    email: normalizedEmail,
    amount_cents: session.amount_total ?? 0,
  });

  const isDuplicateDelivery = orderError?.code === UNIQUE_VIOLATION;
  if (orderError && !isDuplicateDelivery) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  if (!isDuplicateDelivery) {
    const result = await grantAccess({
      email: normalizedEmail,
      source: "stripe_purchase",
      stripeSessionId: session.id,
    });

    if (result.granted) {
      await sendAccessGrantedEmail(normalizedEmail);
    }
  }

  return NextResponse.json({ received: true });
}
