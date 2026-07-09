import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/success")({
  head: () => ({
    meta: [{ title: "Payment successful — MyNotes" }],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  // The webhook flips is_paid a moment after Stripe redirects here, so we poll
  // the subscribers table a few times until it shows up.
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let tries = 0;
    let active = true;

    const poll = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setChecking(false);
        return;
      }
      const { data } = await (supabase.from("subscribers") as any)
        .select("is_paid")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (data?.is_paid) {
        setConfirmed(true);
        setChecking(false);
      } else if (tries < 8) {
        tries += 1;
        setTimeout(poll, 1500); // retry — the webhook may still be processing
      } else {
        setChecking(false); // give up gracefully; payment may still confirm
      }
    };

    poll();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center py-12">
          {checking ? (
            <>
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <h1 className="mt-4 text-xl font-semibold">Confirming your payment…</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Hang tight — we're activating your Premium access.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h1 className="mt-4 text-2xl font-semibold">
                {confirmed ? "You're Premium! 🎉" : "Thanks for your payment!"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {confirmed
                  ? "Your account has been upgraded."
                  : "Your upgrade will activate shortly."}
              </p>
              <Button asChild className="mt-6">
                <Link to="/notes">Back to my notes</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
