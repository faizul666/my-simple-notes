// Edge Function: create-checkout
// Creates a Stripe Checkout Session for the logged-in user and returns its URL.
// The frontend redirects the user to that URL. Uses the SECRET key, which is
// why this runs on the server and never in the browser.
//
// Deploy with JWT verification ON (default): the frontend calls this with the
// user's Supabase session, so we can identify who is paying.

import Stripe from "https://esm.sh/stripe@16.12.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Browsers send a preflight OPTIONS request before the real POST.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Identify the caller from their Supabase JWT (sent by the frontend).
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (userErr || !user?.email) {
      return json({ error: "Not authenticated" }, 401);
    }

    // 2. Create the Stripe Checkout Session.
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const origin = req.headers.get("origin") ?? "http://localhost:8080";

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-time payment that unlocks Premium
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "MyNotes Premium" },
            unit_amount: 900, // $9.00, in cents
          },
          quantity: 1,
        },
      ],
      // Stripe echoes this back on the webhook so we know which user paid.
      metadata: { user_id: user.id },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/notes`,
    });

    return json({ url: session.url }, 200);
  } catch (err) {
    console.error("create-checkout error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
