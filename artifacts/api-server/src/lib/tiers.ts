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

// Tier entitlements
export function tierAllowsPreOrder(tier: TierId | null | undefined): boolean {
  return tier === "middle" || tier === "premium";
}

export function tierIncludedFeaturedCount(tier: TierId | null | undefined): number {
  return tier === "premium" ? 2 : 0;
}

// À-la-carte feature boost (any vendor, any tier — purchased one-off)
export const FEATURE_BOOST_PRICE_CENTS = 500;
export const FEATURE_BOOST_DURATION_DAYS = 14;
export const FEATURE_BOOST_PLAN_NAME = "Open Local Listing Boost (2 weeks)";
