import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const logo = readFileSync(resolve(root, "components/branding/finwise-logo.tsx"), "utf8");
const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
const styles = readFileSync(resolve(root, "app/globals.css"), "utf8");
const goalDialog = readFileSync(resolve(root, "components/finance/budget-goal-dialogs.tsx"), "utf8");
const button = readFileSync(resolve(root, "components/ui/button.tsx"), "utf8");
const themeAudit = readFileSync(resolve(root, "THEME_TOKENS.md"), "utf8");
const primitives = readFileSync(resolve(root, "components/ui/primitives.tsx"), "utf8");
const appShell = readFileSync(resolve(root, "components/layout/app-shell.tsx"), "utf8");
const transactionList = readFileSync(resolve(root, "components/finance/transaction-list.tsx"), "utf8");
const calendarScreen = readFileSync(resolve(root, "components/finance/calendar-screen.tsx"), "utf8");
const accountsScreen = readFileSync(resolve(root, "components/finance/accounts-screen.tsx"), "utf8");
const analysisScreens = readFileSync(resolve(root, "components/finance/analysis-screens.tsx"), "utf8");
const onboarding = readFileSync(resolve(root, "components/finance/onboarding-flow.tsx"), "utf8");
const budgetWatch = readFileSync(resolve(root, "components/finance/budget-watch-banner.tsx"), "utf8");
const workspacePreferences = readFileSync(resolve(root, "components/finance/workspace-preferences-cards.tsx"), "utf8");

describe("Finwise owner-supplied branding assets", () => {
  it("uses only the supplied dark, light, and standalone-mark PNG URLs in the reusable logo renderer", () => {
    expect(logo).toContain("mwmlZfWFtEHSUSTN.png");
    expect(logo).toContain("xRNqxYzLTGWnNnFq.png");
    expect(logo).toContain("yyOodUOnTdJgYWBI.png");
    expect(logo).not.toContain(".svg");
    expect(logo).not.toContain("font-serif");
    expect(logo).not.toContain("PLAN · TRACK · GROW");
  });

  it("selects the supplied light lockup in light mode and the supplied dark lockup in dark mode", () => {
    expect(logo).toContain('resolvedTheme === "light" ? asset.light : asset.dark');
  });

  it("uses supplied favicon and app-icon PNGs and removes the recreated dynamic icon route", () => {
    expect(layout).toContain("REVWfUHGrNpbNMvi.png");
    expect(layout).toContain("wpDVRhsALSOOSMXW.png");
    expect(layout).toContain("SuuwLgnYgazvsrkK.png");
    expect(existsSync(resolve(root, "app/icon.tsx"))).toBe(false);
  });

  it("uses midnight-navy, ivory, muted-champagne gold, green success, and red danger tokens", () => {
    expect(styles).toContain("--canvas: #010817");
    expect(styles).toContain("--ink: #f5efe4");
    expect(styles).toContain("--accent: #d0aa61");
    expect(styles).toContain("--positive: #7cc49a");
    expect(styles).toContain("--danger: #eea08e");
    expect(styles).not.toContain("#a7b5ff");
    expect(button).toContain('"bg-[var(--accent)] text-[#151108] hover:brightness-110');
    expect(button).toContain('"bg-[var(--danger)]/15 text-[var(--danger)]');
    expect(themeAudit).toContain("#010817");
    expect(themeAudit).toContain("No periwinkle source values or recreated logo URLs remain in runtime code.");
  });

  it("keeps the GoalDialog target-date field mapped to target_date", () => {
    expect(goalDialog).toContain('value={form.target_date} onChange={(event) => setForm((current) => ({ ...current, target_date: event.target.value }))}');
  });

  it("uses restrained shared motion and disables nonessential animation for reduced-motion users", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("@keyframes finwise-reveal");
    expect(logo).toContain("finwise-logo");
    expect(primitives).toContain('data-finwise-motion="card"');
    expect(primitives).toContain('data-finwise-motion="dialog"');
    expect(primitives).toContain("finwise-lift finwise-reveal");
    expect(primitives).toContain("finwise-reveal max-h");
    expect(appShell).toContain("finwise-reveal mx-auto");
    expect(transactionList).toContain("finwise-stagger divide-y");
    expect(transactionList).toContain("finwise-list-row group");
    expect(calendarScreen).toContain("finwise-stagger grid grid-cols-7");
    expect(accountsScreen).toContain('data-finwise-motion="account-collection" className="finwise-stagger');
    expect(analysisScreens).toContain('data-finwise-motion="analysis-stat-collection" className="finwise-stagger');
    expect(analysisScreens).toContain('data-finwise-motion="analysis-chart-collection" className="finwise-stagger');
    expect(styles).toContain("aside nav a:hover, nav.fixed a:hover");
  });

  it("suppresses shared motion effects when the user requests reduced motion", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation-duration: .01ms !important");
    expect(styles).toContain("animation-iteration-count: 1 !important");
    expect(styles).toContain("transition-duration: .01ms !important");
    expect(styles).toContain("scroll-behavior: auto !important");
  });

  it("keeps onboarding and budget-watch alerts inside the authenticated workspace without scheduled delivery", () => {
    expect(onboarding).toContain("onboarding_status: status");
    expect(onboarding).toContain('settings?.onboarding_status === "active"');
    expect(budgetWatch).toContain("activeBudgetWatchAlerts");
    expect(workspacePreferences).toContain("budget_watch_warning_percent");
    expect(workspacePreferences).toContain("budget_watch_critical_percent");
    expect(workspacePreferences).not.toContain("setInterval");
    expect(workspacePreferences).not.toContain("setTimeout");
    expect(workspacePreferences).toContain("does not send emails, create scheduled jobs");
  });
});
