import { describe, expect, it } from "vitest";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const canValidatePublicClient = Boolean(supabaseUrl && anonKey);

describe("NEXT_PUBLIC_SUPABASE_ANON_KEY", () => {
  it.skipIf(!canValidatePublicClient)("can access Supabase Auth public settings", async () => {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: anonKey! },
    });

    expect(response.ok).toBe(true);
  });
});
