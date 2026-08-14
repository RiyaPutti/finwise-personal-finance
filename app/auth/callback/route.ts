import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: any };

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url); const code = requestUrl.searchParams.get("code"); const next = requestUrl.searchParams.get("next") ?? "/app/overview";
  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(new URL("/auth?error=config", requestUrl.origin));
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: CookieToSet[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } });
  if (code) { const { error } = await supabase.auth.exchangeCodeForSession(code); if (!error) return response; }
  return NextResponse.redirect(new URL("/auth?error=callback", requestUrl.origin));
}
