// Edge Function: stripe-webhook
// Stripe's servers call THIS endpoint after a payment. It is the source of
// truth for "did they pay". We verify Stripe's signature, then mark the user
// as paid using the SERVICE ROLE key (which bypasses RLS).
//
// Deploy with JWT verification OFF (--no-verify-jwt): Stripe does not send a
// Supabase JWT. We authenticate the request via the Stripe signature instead.

import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
  });

  // 1. Verify the request really came from Stripe (not a forger).
  const signature = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body is required for signature check
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    console.error("Signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. React to the "payment completed" event.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;

    if (userId) {
      // Service-role client: allowed to write to subscribers despite RLS.
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { error } = await admin.from("subscribers").upsert(
        {
          user_id: userId,
          email: session.customer_email,
          is_paid: true,
          stripe_customer_id: session.customer as string | null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        console.error("Failed to mark user paid:", error.message);
        return new Response("DB error", { status: 500 });
      }
      console.log(`Marked user ${userId} as paid.`);
    }
  }

  // 3. Always 200 quickly so Stripe knows we received it.
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
