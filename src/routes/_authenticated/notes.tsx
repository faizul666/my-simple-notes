import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Trash2, StickyNote, LogOut } from "lucide-react";

type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Your notes — MyNotes" },
      { name: "description", content: "View and manage your personal notes." },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    // Stamp the note with the logged-in user's id explicitly. This satisfies
    // the RLS INSERT policy (with check auth.uid() = user_id) regardless of
    // whether the table has a DEFAULT auth.uid() on user_id.
    const payload = {
      title: title.trim(),
      content: content.trim() || null,
      user_id: user.id,
    };
    const { error } = await (supabase.from("notes") as any).insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setContent("");
    toast.success("Note added");
    load();
  };

  const deleteNote = async (id: string) => {
    const prev = notes;
    setNotes(notes.filter((n) => n.id !== id));
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setNotes(prev);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">MyNotes</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New note</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addNote} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="A quick thought…"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write something down"
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add note"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Your notes
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Add your first above.</p>
          ) : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id}>
                  <Card>
                    <CardContent className="pt-6 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium break-words">{n.title}</h3>
                        {n.content && (
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                            {n.content}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNote(n.id)}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
