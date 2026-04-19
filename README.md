# Vault

Inventory, sales, and treasury management for retail.

**Stack:** Next.js 15 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres + Auth) · Gemini.

## Run locally

**Prerequisites:** Node.js 20+, a Supabase project.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` → `.env.local` and fill in your Supabase URL/anon key and Gemini API key.
3. Run the schema in Supabase — see [`supabase/README.md`](supabase/README.md).
4. Enable Google OAuth in Supabase (Authentication → Providers → Google).
   Add redirect URL `http://localhost:3000/auth/callback`.
5. Start the dev server:
   ```bash
   npm run dev
   ```

## Project layout

```
app/                   Next.js App Router (layout, page, /auth/callback)
middleware.ts          Refreshes Supabase session cookie
src/
  App.tsx              Main UI (client component)
  components/          Pure UI components
  firebase.ts          Firestore→Supabase compatibility shim
  lib/supabase/        Supabase browser + server clients
  index.css            Tailwind v4 entry
  types.ts             Shared types
supabase/
  schema.sql           Tables, RLS policies, triggers
  README.md            Supabase setup walkthrough
```

## Notes on the migration

- The legacy `firebase/firestore` API surface is preserved by `src/firebase.ts`,
  which is now a Supabase-backed shim. `App.tsx` imports the same names but
  hits Postgres underneath.
- `onSnapshot` is one-shot (no realtime). Mutations should refetch.
- Field naming: client uses camelCase, DB columns are snake_case — translation
  is handled inside the shim.

