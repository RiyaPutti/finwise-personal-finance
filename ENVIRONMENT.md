# Environment Variables

Finwise requires **two public Supabase configuration values** for its browser client and **one server-only Supabase Admin value** for the authenticated Delete Account operation. Create a local environment file from this list and set the same variables in Vercel for Preview and Production deployments.

| Variable | Required | Runtime exposure | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server | Supabase publishable/anon key used with Row Level Security. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase Admin key used only by `DELETE /api/account` after the current user’s cookie-backed session has been verified. |

> `NEXT_PUBLIC_*` values are embedded in browser code. Use only your intended Supabase project URL and publishable/anon key with this prefix.

## Local development

Create `.env.local` from the following shape, substituting your own values locally. Do not commit this file.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Vercel deployment

In **Project Settings → Environment Variables**, add all three variables for Preview and Production. Add each deployed domain’s `/auth/callback` URL to Supabase Authentication URL Configuration.

## Explicitly excluded secrets

Finwise does **not** include any `SUPABASE_SERVICE_ROLE_KEY`, database password, JWT secret, Manus token, or OAuth client secret in application source. `SUPABASE_SERVICE_ROLE_KEY` is read only inside the server-side `DELETE /api/account` route, after the route verifies the current user’s session. Never define it with a `NEXT_PUBLIC_` prefix, import it into browser code, commit it to `.env*`, or display it in logs.
