import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const route = readFileSync(resolve(root, "app/api/account/route.ts"), "utf8");
const dialog = readFileSync(resolve(root, "components/finance/account-deletion-card.tsx"), "utf8");

describe("account deletion safeguards", () => {
  it("derives the deletion target from the verified session and keeps the service key server-only", () => {
    expect(route).toContain("supabase.auth.getUser()");
    expect(route).toContain("admin.auth.admin.deleteUser(user.id)");
    expect(route).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(route).not.toContain("request.json()");
    expect(route).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  });

  it("requires typed confirmation and clears the local session before redirecting", () => {
    expect(dialog).toContain('const confirmationPhrase = "DELETE"');
    expect(dialog).toContain('method: "DELETE"');
    expect(dialog).toContain('auth.signOut({ scope: "local" })');
    expect(dialog).toContain('window.location.assign("/auth")');
  });
});
