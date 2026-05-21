export type UnlockCategory = "accessories" | "hair" | "clothes" | "badge";
export type OverlayZone =
  | "head-top"
  | "hair"
  | "eyes"
  | "neck"
  | "corner-bl"
  | "corner-br";

export interface UnlockDef {
  key: string;
  label: string;
  category: UnlockCategory;
  threshold: number;
  emoji: string;
  description: string;
  asset?: string;
  zone?: OverlayZone;
}

const WEB_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/wardrobe`;

export const UNLOCK_CATALOG: UnlockDef[] = [
  { key: "first-visit",    label: "Welcome Sticker",      category: "badge",       threshold: 1,  emoji: "🌱", description: "Earned on your very first approved local visit." },
  { key: "sunglasses",     label: "Sunshine Shades",      category: "accessories", threshold: 2,  emoji: "🕶️", description: "Visit 2 different local shops.",  asset: `${WEB_BASE}/sunglasses.png`,     zone: "eyes" },
  { key: "tote",           label: "Market Tote",          category: "accessories", threshold: 3,  emoji: "👜", description: "Visit 3 different local shops.",  asset: `${WEB_BASE}/tote.png`,           zone: "corner-bl" },
  { key: "cool-cap",       label: "Open Local Cap",       category: "accessories", threshold: 4,  emoji: "🧢", description: "Visit 4 different local shops.",  asset: `${WEB_BASE}/cool-cap.png`,       zone: "head-top" },
  { key: "fresh-hair",     label: "Fresh Cut",            category: "hair",        threshold: 5,  emoji: "💇", description: "Visit 5 different local shops.",  asset: `${WEB_BASE}/fresh-hair.png`,     zone: "hair" },
  { key: "coffee-cup",     label: "Local Roast",          category: "accessories", threshold: 6,  emoji: "☕", description: "Visit 6 different local shops.",  asset: `${WEB_BASE}/coffee-cup.png`,     zone: "corner-br" },
  { key: "apron",          label: "Maker's Apron",        category: "clothes",     threshold: 8,  emoji: "🧑‍🍳", description: "Visit 8 different local shops.",  asset: `${WEB_BASE}/apron.png`,          zone: "neck" },
  { key: "bandana",        label: "Paisley Bandana",      category: "accessories", threshold: 10, emoji: "🪢", description: "Visit 10 different local shops.", asset: `${WEB_BASE}/bandana.png`,        zone: "head-top" },
  { key: "floral-crown",   label: "Floral Crown",         category: "accessories", threshold: 12, emoji: "🌸", description: "Visit 12 different local shops.", asset: `${WEB_BASE}/floral-crown.png`,   zone: "head-top" },
  { key: "tropical-shirt", label: "Tropical Shirt",       category: "clothes",     threshold: 15, emoji: "🌺", description: "Visit 15 different local shops.", asset: `${WEB_BASE}/tropical-shirt.png`, zone: "neck" },
  { key: "cozy-scarf",     label: "Cozy Scarf",           category: "clothes",     threshold: 18, emoji: "🧣", description: "Visit 18 different local shops.", asset: `${WEB_BASE}/cozy-scarf.png`,     zone: "neck" },
  { key: "explorer",       label: "Local Explorer Badge", category: "badge",       threshold: 20, emoji: "🗺️", description: "Visit 20 different local shops — a true local." },
  { key: "galaxy-hair",    label: "Galaxy Hair",          category: "hair",        threshold: 25, emoji: "🌌", description: "Visit 25 different local shops.", asset: `${WEB_BASE}/galaxy-hair.png`,    zone: "hair" },
  { key: "patron",         label: "Patron of the Locals", category: "badge",       threshold: 35, emoji: "🏆", description: "Visit 35 different local shops. You ARE the locals." },
];

export function getUnlock(key: string): UnlockDef | undefined {
  return UNLOCK_CATALOG.find((u) => u.key === key);
}

export type ZoneStyle = {
  position: "absolute";
  top?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  bottom?: `${number}%`;
  width: `${number}%`;
  aspectRatio: number;
};

export function zoneStyle(zone: OverlayZone): ZoneStyle {
  switch (zone) {
    case "head-top":  return { position: "absolute", top: "-14%", left: "8%",   width: "84%", aspectRatio: 1 };
    case "hair":      return { position: "absolute", top: "-10%", left: "4%",   width: "92%", aspectRatio: 1 };
    case "eyes":      return { position: "absolute", top: "30%",  left: "18%",  width: "64%", aspectRatio: 2 };
    case "neck":      return { position: "absolute", top: "68%",  left: "12%",  width: "76%", aspectRatio: 1.4 };
    case "corner-bl": return { position: "absolute", bottom: "-4%", left: "-8%", width: "36%", aspectRatio: 1 };
    case "corner-br": return { position: "absolute", bottom: "-2%", right: "-6%", width: "30%", aspectRatio: 1 };
  }
}

export const AVATAR_STYLES = [
  "thumbs",
  "adventurer",
  "fun-emoji",
  "pixel-art",
  "avataaars",
  "big-smile",
  "bottts",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "croodles",
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number];
