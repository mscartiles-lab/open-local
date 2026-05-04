export type TierId = "basic" | "middle" | "premium";

export const TIER_IDS: TierId[] = ["basic", "middle", "premium"];

export const TIERS: Record<TierId, { id: TierId; name: string; priceCents: number }> = {
  basic: { id: "basic", name: "Basic", priceCents: 458 },
  middle: { id: "middle", name: "Standard", priceCents: 1098 },
  premium: { id: "premium", name: "Premium", priceCents: 2456 },
};

export function isValidTier(value: unknown): value is TierId {
  return typeof value === "string" && (TIER_IDS as string[]).includes(value);
}

export function vendorPlanName(tier: TierId): string {
  return `Open Local Vendor Plan — ${TIERS[tier].name}`;
}

export function businessPlanName(tier: TierId): string {
  return `Open Local Business Listing — ${TIERS[tier].name}`;
}
