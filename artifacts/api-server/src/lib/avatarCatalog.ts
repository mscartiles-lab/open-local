// Catalog of unlockable avatar pieces.
// Server-side mirrors `artifacts/open-local/src/lib/unlockCatalog.ts`.
// `key` is what we persist in DB; `threshold` = unique APPROVED vendor visits required.

export type UnlockCategory = "accessories" | "hair" | "clothes" | "badge";

export interface UnlockDef {
  key: string;
  label: string;
  category: UnlockCategory;
  threshold: number;
  emoji: string;
  description: string;
}

export const UNLOCK_CATALOG: UnlockDef[] = [
  { key: "first-visit",     label: "Welcome Sticker",        category: "badge",       threshold: 1,  emoji: "🌱", description: "Earned on your very first approved local visit." },
  { key: "sunglasses",      label: "Sunshine Shades",        category: "accessories", threshold: 2,  emoji: "🕶️", description: "Visit 2 different local shops." },
  { key: "tote",            label: "Market Tote",            category: "accessories", threshold: 3,  emoji: "👜", description: "Visit 3 different local shops." },
  { key: "cool-cap",        label: "Open Local Cap",         category: "accessories", threshold: 4,  emoji: "🧢", description: "Visit 4 different local shops." },
  { key: "fresh-hair",      label: "Fresh Cut",              category: "hair",        threshold: 5,  emoji: "💇", description: "Visit 5 different local shops." },
  { key: "coffee-cup",      label: "Local Roast",            category: "accessories", threshold: 6,  emoji: "☕", description: "Visit 6 different local shops." },
  { key: "apron",           label: "Maker's Apron",          category: "clothes",     threshold: 8,  emoji: "🧑‍🍳", description: "Visit 8 different local shops." },
  { key: "bandana",         label: "Paisley Bandana",        category: "accessories", threshold: 10, emoji: "🪢", description: "Visit 10 different local shops." },
  { key: "floral-crown",    label: "Floral Crown",           category: "accessories", threshold: 12, emoji: "🌸", description: "Visit 12 different local shops." },
  { key: "tropical-shirt",  label: "Tropical Shirt",         category: "clothes",     threshold: 15, emoji: "🌺", description: "Visit 15 different local shops." },
  { key: "cozy-scarf",      label: "Cozy Scarf",             category: "clothes",     threshold: 18, emoji: "🧣", description: "Visit 18 different local shops." },
  { key: "explorer",        label: "Local Explorer Badge",   category: "badge",       threshold: 20, emoji: "🗺️", description: "Visit 20 different local shops — a true local." },
  { key: "galaxy-hair",     label: "Galaxy Hair",            category: "hair",        threshold: 25, emoji: "🌌", description: "Visit 25 different local shops." },
  { key: "patron",          label: "Patron of the Locals",   category: "badge",       threshold: 35, emoji: "🏆", description: "Visit 35 different local shops. You ARE the locals." },
];

export function unlocksEarnedFor(uniqueVendorCount: number): string[] {
  return UNLOCK_CATALOG
    .filter((u) => uniqueVendorCount >= u.threshold)
    .map((u) => u.key);
}
