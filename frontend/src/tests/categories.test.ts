import { describe, it, expect } from "vitest";
import {
  CATEGORY_ORDER,
  categoryIndex,
  categoryColor,
  categoryIcon,
} from "@/lib/categories";

describe("category system", () => {
  it("preserves the canonical CAT_META order exactly", () => {
    expect([...CATEGORY_ORDER]).toEqual([
      "Rent",
      "Insurance",
      "Personal Transfer",
      "Office Food",
      "Food & Dining",
      "Transport",
      "Bills & Subscriptions",
      "Groceries",
      "Self Transfer",
      "Entertainment",
      "Shopping",
      "Healthcare",
      "Education",
      "Other",
    ]);
  });

  it("assigns colour by fixed index, not by spend rank", () => {
    expect(categoryColor("Rent")).toBe("var(--ramp-0)");
    expect(categoryColor("Food & Dining")).toBe("var(--ramp-4)");
    expect(categoryColor("Other")).toBe("var(--ramp-13)");
  });

  it("is stable regardless of the order categories are queried in", () => {
    const first = CATEGORY_ORDER.map(categoryColor);
    const shuffled = [...CATEGORY_ORDER].reverse().map(categoryColor);
    expect(CATEGORY_ORDER.map(categoryColor)).toEqual(first);
    expect(shuffled).toEqual([...first].reverse());
  });

  it("falls back to the Other step for unknown categories", () => {
    expect(categoryIndex("Crypto Gambling")).toBe(13);
    expect(categoryColor("Crypto Gambling")).toBe("var(--ramp-13)");
  });

  it("returns a Lucide component for every canonical category", () => {
    for (const cat of CATEGORY_ORDER) {
      const Icon = categoryIcon(cat);
      expect(typeof Icon === "function" || typeof Icon === "object").toBe(true);
    }
  });

  it("returns a fallback icon for unknown categories", () => {
    expect(categoryIcon("Crypto Gambling")).toBe(categoryIcon("Other"));
  });
});
