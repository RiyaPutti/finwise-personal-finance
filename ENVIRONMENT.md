# Environment Variables

Finwise V1 requires **only two public Supabase configuration values**. Create a local environment file from this list and set the same variables in Vercel for Preview and Production deployments.

| Variable | Required | Runtime exposure | Purpose |
|---|---:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser and server | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser and server | Supabase publishable/anon key used with Row Level Security. |

> `NEXT_PUBLIC_*` values are embedded in browser code. Use only your intended Supabase project URL and publishable/anon key with this prefix.

## Local development

Create `.env.local` from the following shape, substituting your own values locally. Do not commit this file.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Vercel deployment

In **Project Settings → Environment Variables**, add the same two variables for Preview and Production. Add each deployed domain’s `/auth/callback` URL to Supabase Authentication URL Configuration.

## Explicitly excluded secrets

Finwise V1 does **not** use `SUPABASE_SERVICE_ROLE_KEY`, database passwords, JWT secrets, Manus tokens, or OAuth client secrets in application source. Do not define `SUPABASE_SERVICE_ROLE_KEY` with a `NEXT_PUBLIC_` prefix or import it in browser code. If a future server-only maintenance task genuinely needs a service role key, keep it server-only, add it only in the hosting provider’s encrypted environment settings, and review that change separately.
