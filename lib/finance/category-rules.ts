export type CategoryRule = {
  id: string;
  match: string;
  category_id: string;
};

export const categoryRulesStorageKey = "finwise:category-rules";

export function normalizeCategoryRuleMatch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function findCategoryRule(description: string, rules: CategoryRule[]) {
  const normalizedDescription = normalizeCategoryRuleMatch(description);
  if (!normalizedDescription) return null;

  return rules
    .filter((rule) => rule.category_id && normalizeCategoryRuleMatch(rule.match))
    .sort((left, right) => normalizeCategoryRuleMatch(right.match).length - normalizeCategoryRuleMatch(left.match).length)
    .find((rule) => normalizedDescription.includes(normalizeCategoryRuleMatch(rule.match))) ?? null;
}
