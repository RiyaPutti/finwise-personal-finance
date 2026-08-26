import { describe, expect, it } from "vitest";
import { isEndOfMonthReviewWindow } from "@/lib/finance/calculations";

describe("isEndOfMonthReviewWindow", () => {
  it("only opens during the compact final-days review window", () => {
    expect(isEndOfMonthReviewWindow(new Date("2026-08-26T12:00:00"))).toBe(false);
    expect(isEndOfMonthReviewWindow(new Date("2026-08-27T12:00:00"))).toBe(true);
    expect(isEndOfMonthReviewWindow(new Date("2026-08-31T12:00:00"))).toBe(true);
  });

  it("keeps the window bounded when callers supply an invalidly large number of days", () => {
    expect(isEndOfMonthReviewWindow(new Date("2026-08-25T12:00:00"), 100)).toBe(true);
    expect(isEndOfMonthReviewWindow(new Date("2026-08-24T12:00:00"), 100)).toBe(false);
  });
});
