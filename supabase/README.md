# Supabase setup

## 1. Create the project
- Go to https://supabase.com/dashboard → **New Project**.
- Note the **Project URL** and **anon public** key (Project Settings → API).

## 2. Configure environment
Copy `.env.example` → `.env.local` and fill:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 3. Run the schema
In **SQL Editor**, paste and run the contents of [`schema.sql`](./schema.sql).
This creates all tables, the `handle_new_user` trigger, RLS policies, and helper functions.

## 4. Enable Google OAuth
- Authentication → Providers → **Google**: enable, paste your Google OAuth client ID + secret.
- Authentication → URL Configuration → **Site URL**: `http://localhost:3000` (and your prod URL).
- Add redirect URL: `http://localhost:3000/auth/callback`.

## 5. Bootstrap admin
After your first Google sign-in, the trigger inserts a `public.users` row.
If your email is **not** `aman.teferi.80@gmail.com`, promote yourself manually:
```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

## Notes on the schema
- IDs are `text` (matches the old Firestore-style ID generator).
- `users.id` is `uuid` and FKs to `auth.users(id)`.
- `users.uid` is a generated text alias so old client code reading `user.uid` keeps working.
- All money is `numeric` (consider migrating to integer minor units later).
