import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | undefined;

// Lazy singleton — instantiating Stripe at module scope crashes build-time
// route analysis (and any import chain) whenever STRIPE_SECRET_KEY isn't
// set, e.g. before real credentials exist.
export function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}
