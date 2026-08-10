import {
  Home,
  ShieldCheck,
  Users,
  UtensilsCrossed,
  Soup,
  Car,
  Smartphone,
  ShoppingCart,
  RefreshCw,
  Clapperboard,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Circle,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical category order — the original CAT_META key order, preserved exactly.
 * Ramp colour is a fixed index into this list so a category keeps its colour
 * across analyses. Appending is safe; reordering is not.
 */
export const CATEGORY_ORDER = [
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
] as const;

export type CategoryName = (typeof CATEGORY_ORDER)[number];

const OTHER_INDEX = CATEGORY_ORDER.length - 1;

const INDEX_BY_NAME = new Map<string, number>(
  CATEGORY_ORDER.map((name, i) => [name, i]),
);

export const CATEGORY_ICONS: Record<CategoryName, LucideIcon> = {
  "Rent": Home,
  "Insurance": ShieldCheck,
  "Personal Transfer": Users,
  "Office Food": UtensilsCrossed,
  "Food & Dining": Soup,
  "Transport": Car,
  "Bills & Subscriptions": Smartphone,
  "Groceries": ShoppingCart,
  "Self Transfer": RefreshCw,
  "Entertainment": Clapperboard,
  "Shopping": ShoppingBag,
  "Healthcare": HeartPulse,
  "Education": GraduationCap,
  "Other": Circle,
};

/** Fixed position in the canonical order; unknown categories map to `Other`. */
export function categoryIndex(cat: string): number {
  return INDEX_BY_NAME.get(cat) ?? OTHER_INDEX;
}

/**
 * Ramp colour for a category. Data encoding only — never use this to tint an
 * interface control, and never use `--accent` for a chart series.
 */
export function categoryColor(cat: string): string {
  return `var(--ramp-${categoryIndex(cat)})`;
}

export function categoryIcon(cat: string): LucideIcon {
  return CATEGORY_ICONS[CATEGORY_ORDER[categoryIndex(cat)]];
}
