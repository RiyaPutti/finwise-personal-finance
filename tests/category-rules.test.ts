import { describe, expect, it } from "vitest";
import { findCategoryRule, normalizeCategoryRuleMatch } from "@/lib/finance/category-rules";

describe("device-private category rules", () => {
  it("normalizes user-entered matching text without changing the stored category", () => {
    expect(normalizeCategoryRuleMatch("  Metro MART ")).toBe("metro mart");
  });

  it("returns the most specific reviewable match and ignores empty rules", () => {
    const rules = [
      { id: "general", match: "metro", category_id: "transport" },
      { id: "specific", match: "metro mart", category_id: "groceries" },
      { id: "empty", match: "", category_id: "other" },
    ];

    expect(findCategoryRule("Metro Mart weekly shop", rules)).toMatchObject({ id: "specific", category_id: "groceries" });
    expect(findCategoryRule("", rules)).toBeNull();
    expect(findCategoryRule("Other merchant", rules)).toBeNull();
  });
});
