import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MyNotes — a calm place for your thoughts" },
      { name: "description", content: "A simple, private notes app. Sign in and start writing." },
      { property: "og:title", content: "MyNotes" },
      { property: "og:description", content: "A simple, private notes app." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
            <StickyNote className="h-7 w-7 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">MyNotes</h1>
          <p className="text-muted-foreground">
            A calm, private space for your thoughts. Sign in to view and add notes.
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/notes">Open notes</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
