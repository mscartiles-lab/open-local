export type UnlockCategory = "accessories" | "hair" | "clothes" | "badge";

// Where on the avatar an overlay sits.
export type OverlayZone =
  | "head-top"   // hats, crowns, bandana on top of head
  | "hair"       // hair pieces wrapping the head
  | "eyes"       // glasses
  | "neck"       // shirts, aprons, scarves
  | "corner-bl"  // held in lower-left corner (tote)
  | "corner-br"; // held in lower-right corner (coffee)

export interface UnlockDef {
  key: string;
  label: string;
  category: UnlockCategory;
  threshold: number;
  emoji: string;
  description: string;
  // If present, the unlock is equippable as a visual overlay.
  asset?: string;
  zone?: OverlayZone;
}

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "") + "/wardrobe";

export const UNLOCK_CATALOG: UnlockDef[] = [
  { key: "first-visit",    label: "Welcome Sticker",      category: "badge",       threshold: 1,  emoji: "🌱", description: "Earned on your very first approved local visit." },
  { key: "sunglasses",     label: "Sunshine Shades",      category: "accessories", threshold: 2,  emoji: "🕶️", description: "Visit 2 different local shops.",  asset: `${BASE}/sunglasses.png`,     zone: "eyes" },
  { key: "tote",           label: "Market Tote",          category: "accessories", threshold: 3,  emoji: "👜", description: "Visit 3 different local shops.",  asset: `${BASE}/tote.png`,           zone: "corner-bl" },
  { key: "cool-cap",       label: "Open Local Cap",       category: "accessories", threshold: 4,  emoji: "🧢", description: "Visit 4 different local shops.",  asset: `${BASE}/cool-cap.png`,       zone: "head-top" },
  { key: "fresh-hair",     label: "Fresh Cut",            category: "hair",        threshold: 5,  emoji: "💇", description: "Visit 5 different local shops.",  asset: `${BASE}/fresh-hair.png`,     zone: "hair" },
  { key: "coffee-cup",     label: "Local Roast",          category: "accessories", threshold: 6,  emoji: "☕", description: "Visit 6 different local shops.",  asset: `${BASE}/coffee-cup.png`,     zone: "corner-br" },
  { key: "apron",          label: "Maker's Apron",        category: "clothes",     threshold: 8,  emoji: "🧑‍🍳", description: "Visit 8 different local shops.",  asset: `${BASE}/apron.png`,          zone: "neck" },
  { key: "bandana",        label: "Paisley Bandana",      category: "accessories", threshold: 10, emoji: "🪢", description: "Visit 10 different local shops.", asset: `${BASE}/bandana.png`,        zone: "head-top" },
  { key: "floral-crown",   label: "Floral Crown",         category: "accessories", threshold: 12, emoji: "🌸", description: "Visit 12 different local shops.", asset: `${BASE}/floral-crown.png`,   zone: "head-top" },
  { key: "tropical-shirt", label: "Tropical Shirt",       category: "clothes",     threshold: 15, emoji: "🌺", description: "Visit 15 different local shops.", asset: `${BASE}/tropical-shirt.png`, zone: "neck" },
  { key: "cozy-scarf",     label: "Cozy Scarf",           category: "clothes",     threshold: 18, emoji: "🧣", description: "Visit 18 different local shops.", asset: `${BASE}/cozy-scarf.png`,     zone: "neck" },
  { key: "explorer",       label: "Local Explorer Badge", category: "badge",       threshold: 20, emoji: "🗺️", description: "Visit 20 different local shops — a true local." },
  { key: "galaxy-hair",    label: "Galaxy Hair",          category: "hair",        threshold: 25, emoji: "🌌", description: "Visit 25 different local shops.", asset: `${BASE}/galaxy-hair.png`,    zone: "hair" },
  { key: "patron",         label: "Patron of the Locals", category: "badge",       threshold: 35, emoji: "🏆", description: "Visit 35 different local shops. You ARE the locals." },
];

export function getUnlock(key: string): UnlockDef | undefined {
  return UNLOCK_CATALOG.find((u) => u.key === key);
}

// CSS positioning for each overlay zone, expressed as inline styles
// relative to a square avatar container (percent-based so it scales).
export function zoneStyle(zone: OverlayZone): React.CSSProperties {
  switch (zone) {
    case "head-top":  return { top: "-14%", left: "8%",   width: "84%" };
    case "hair":      return { top: "-10%", left: "4%",   width: "92%" };
    case "eyes":      return { top: "30%",  left: "18%",  width: "64%" };
    case "neck":      return { top: "68%",  left: "12%",  width: "76%" };
    case "corner-bl": return { bottom: "-4%", left: "-8%", width: "36%" };
    case "corner-br": return { bottom: "-2%", right: "-6%", width: "30%" };
  }
}
