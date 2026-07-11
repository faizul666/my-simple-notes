# MyNotes — Portfolio Case Study

_Copy-paste source for the Fiverr Portfolio section and Upwork. Second portfolio piece — proves the security + payments layer of an AI SaaS MVP._

---

## Project title (pick one)

- **MyNotes — Secure Multi-User SaaS with Stripe Payments (RLS + billing demo)**
- **Secure SaaS Building Blocks: Auth, Row-Level Security & Stripe, Done Right**
- **MyNotes — The Auth + RLS + Stripe Layer Every SaaS MVP Needs**

## One-line hook

A focused demo of the parts of a SaaS that have to be correct: real authentication, database-level data isolation (RLS), and Stripe Checkout with webhooks that actually unlock premium access.

## Short description (portfolio card, ~2–3 sentences)

MyNotes is a compact SaaS I built to demonstrate the security and payments layer that every real product needs. Each user signs up and sees only their own data — enforced by PostgreSQL Row-Level Security, not just the UI — and can upgrade to premium via Stripe Checkout, where a signed webhook (not the browser) is what actually grants access. It's the "boring but critical" foundation that separates a real app from a demo.

## Full case study (long description)

**Why this exists.** Most quick-built apps quietly get two things wrong: data isolation and payment verification. MyNotes exists to show both done correctly.

**What I built:**
- **Authentication** — email/password sign-up and login (Supabase Auth), protected routes
- **Row-Level Security** — every note is owned by a user, and the database itself refuses to return another user's rows. Verified with two accounts: User A can never see User B's data, even if the frontend is tampered with
- **Stripe payments** — a premium upgrade via Stripe Checkout; a **signed Stripe webhook** verifies the payment server-to-server and flips the user's status. The success page is treated as UX only — the webhook is the source of truth, so no one can fake premium access
- Clean, responsive UI

**The point.** The success page can be faked; a signed webhook can't. Data hidden in the UI can leak; RLS enforced in the database can't. These are the details that decide whether a SaaS is safe to launch — and they're exactly what I get right.

## Links

- **Source:** https://github.com/faizul666/my-simple-notes

## Skills / tags to attach

`Supabase` · `PostgreSQL` · `Row-Level Security` · `Stripe` · `Stripe Webhooks` · `Authentication` · `React` · `TypeScript` · `SaaS` · `Full-Stack Development`

## Images to upload

From `day-04-notes-frontend/docs/`:
1. `notes.png` — the logged-in app (a real multi-user product)
2. `login.png` — clean auth screen

> Pairs perfectly with the PostAgent entry: PostAgent shows the AI agent backend; MyNotes shows the security + payments backbone. Together they cover the full "what I build" list from the gig.
