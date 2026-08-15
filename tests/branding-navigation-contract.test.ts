import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const authScreen = readFileSync(resolve(root, "components/finance/auth-screen.tsx"), "utf8");
const appShell = readFileSync(resolve(root, "components/layout/app-shell.tsx"), "utf8");

describe("Finwise logo navigation", () => {
  it("makes authentication-logo placements accessible links to the application entry route", () => {
    expect(authScreen).toContain('import Link from "next/link"');
    expect(authScreen.match(/<Link href="\/" aria-label="Finwise home"/g)).toHaveLength(2);
  });

  it("keeps the workspace logo linked to the overview route", () => {
    expect(appShell).toContain('<Link href="/app/overview"');
  });

  it("keeps every section reachable from the mobile More menu", () => {
    expect(appShell).toContain('aria-label="Open all sections"');
    expect(appShell).toContain('title="All sections"');
    expect(appShell).toContain('aria-label="All Finwise sections"');
    expect(appShell).toContain('navigation.slice(0, 4)');
    expect(appShell).toContain('navigation.map(([slug, label, Icon])');
  });
});
