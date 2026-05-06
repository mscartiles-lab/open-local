// Catalog of unlockable avatar pieces.
// `key` is what we persist in DB and apply to the DiceBear URL.
// `threshold` is the number of unique vendors a shopper must check in to before earning it.
// `category` groups items in the UI.

export type UnlockCategory = "accessories" | "hair" | "clothes" | "badge";

export interface UnlockDef {
  key: string;
  label: string;
  category: UnlockCategory;
  threshold: number;
  emoji: string;
  description: string;
  // DiceBear param applied to avatar URL when equipped.
  // For badges, we render an overlay icon instead — no diceBear param.
  diceBearParam?: { name: string; value: string };
}

export const UNLOCK_CATALOG: UnlockDef[] = [
  {
    key: "first-visit",
    label: "Welcome Sticker",
    category: "badge",
    threshold: 1,
    emoji: "🌱",
    description: "Earned on your very first verified local visit.",
  },
  {
    key: "sunglasses",
    label: "Sunshine Shades",
    category: "accessories",
    threshold: 2,
    emoji: "🕶️",
    description: "Visit 2 different local shops.",
    diceBearParam: { name: "accessories", value: "sunglasses" },
  },
  {
    key: "tote",
    label: "Market Tote",
    category: "accessories",
    threshold: 3,
    emoji: "👜",
    description: "Visit 3 different local shops.",
  },
  {
    key: "fresh-hair",
    label: "Fresh Cut",
    category: "hair",
    threshold: 5,
    emoji: "💇",
    description: "Visit 5 different local shops.",
  },
  {
    key: "apron",
    label: "Maker's Apron",
    category: "clothes",
    threshold: 8,
    emoji: "🧑‍🍳",
    description: "Visit 8 different local shops.",
  },
  {
    key: "floral-crown",
    label: "Floral Crown",
    category: "accessories",
    threshold: 12,
    emoji: "🌸",
    description: "Visit 12 different local shops.",
  },
  {
    key: "explorer",
    label: "Local Explorer Badge",
    category: "badge",
    threshold: 20,
    emoji: "🗺️",
    description: "Visit 20 different local shops — a true local.",
  },
  {
    key: "patron",
    label: "Patron of the Locals",
    category: "badge",
    threshold: 35,
    emoji: "🏆",
    description: "Visit 35 different local shops. You ARE the locals.",
  },
];

export function unlocksEarnedFor(uniqueVendorCount: number): string[] {
  return UNLOCK_CATALOG
    .filter((u) => uniqueVendorCount >= u.threshold)
    .map((u) => u.key);
}
