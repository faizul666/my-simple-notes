import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Trash2, StickyNote, LogOut, Crown, Plus, Sparkles } from "lucide-react";

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

// Pastel palettes for the sticky-note cards, chosen deterministically per note.
const NOTE_COLORS = [
  "bg-amber-50 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50",
  "bg-rose-50 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50",
  "bg-sky-50 border-sky-200/80 dark:bg-sky-950/30 dark:border-sky-900/50",
  "bg-violet-50 border-violet-200/80 dark:bg-violet-950/30 dark:border-violet-900/50",
  "bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50",
  "bg-orange-50 border-orange-200/80 dark:bg-orange-950/30 dark:border-orange-900/50",
];
const colorFor = (id: string) =>
  NOTE_COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % NOTE_COLORS.length];

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotesPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  // Read this user's paid status from the subscribers table. RLS lets them
  // read only their own row; the row only exists once the webhook created it.
  const loadPaidStatus = async () => {
    const { data } = await (supabase.from("subscribers") as any)
      .select("is_paid")
      .eq("user_id", user.id)
      .maybeSingle();
    setIsPaid(!!data?.is_paid);
  };

  useEffect(() => {
    load();
    loadPaidStatus();
  }, []);

  // Start checkout: ask the edge function for a Stripe Checkout URL, then send
  // the browser there. The user's session is attached automatically by
  // functions.invoke, which is how create-checkout knows who is paying.
  const upgrade = async () => {
    setUpgrading(true);
    const { data, error } = await supabase.functions.invoke("create-checkout");
    if (error) {
      toast.error(error.message);
      setUpgrading(false);
      return;
    }
    if (data?.url) {
      window.location.href = data.url as string;
    } else {
      toast.error("Could not start checkout");
      setUpgrading(false);
    }
  };

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

  const initial = (user.email ?? "?")[0]?.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-background to-background dark:from-violet-950/20">
      <Toaster />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/25">
              <StickyNote className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <h1 className="text-lg font-bold tracking-tight">MyNotes</h1>
              <p className="text-[11px] text-muted-foreground">Your private space</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                <Crown className="h-3.5 w-3.5" /> Premium
              </span>
            ) : (
              <Button
                size="sm"
                onClick={upgrade}
                disabled={upgrading}
                className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold shadow-sm hover:opacity-90"
              >
                <Crown className="mr-1.5 h-4 w-4" />
                {upgrading ? "Redirecting…" : "Upgrade — $9"}
              </Button>
            )}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold text-foreground">
                {initial}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out" className="rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Composer */}
        <div className="mx-auto mb-10 max-w-2xl">
          <form
            onSubmit={addNote}
            className="group relative rounded-3xl border border-border/70 bg-card p-2 shadow-xl shadow-violet-900/5 transition-shadow focus-within:shadow-2xl focus-within:shadow-violet-900/10"
          >
            <div className="rounded-[1.25rem] p-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Take a note…"
                required
                className="w-full bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add more detail (optional)"
                rows={content ? 3 : 1}
                className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Only you can see your notes.</span>
                <Button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold shadow-lg shadow-violet-600/25 hover:opacity-90"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {saving ? "Adding…" : "Add note"}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Stats row */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4 text-violet-500" /> Your notes
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {notes.length} {notes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {/* Notes */}
        {loading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-border/60 bg-muted/60" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 dark:from-violet-950/40 dark:to-indigo-950/40">
              <StickyNote className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">No notes yet</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Jot down your first thought using the box above — it's saved instantly and only visible to you.
            </p>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
            {notes.map((n) => (
              <article
                key={n.id}
                className={`group relative rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${colorFor(n.id)}`}
              >
                <h3 className="pr-6 font-semibold leading-snug text-foreground break-words">{n.title}</h3>
                {n.content && (
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/80">
                    {n.content}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                  {timeAgo(n.created_at)}
                </div>
                <button
                  type="button"
                  onClick={() => deleteNote(n.id)}
                  aria-label="Delete note"
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-background/60 hover:text-rose-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
