export type TierId = "basic" | "middle" | "premium";

export interface TierDef {
  id: TierId;
  name: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
}

export const TIERS: Record<TierId, TierDef> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceMonthly: 4.58,
    tagline: "A simple presence on the map.",
    features: [
      "Map pin with name & address",
      "1 photo",
      "Public listing page",
      "Cancel anytime",
    ],
  },
  middle: {
    id: "middle",
    name: "Standard",
    priceMonthly: 10.98,
    tagline: "Everything most local businesses need.",
    features: [
      "Everything in Basic",
      "Multiple photos (up to 6)",
      "Phone, hours & full contact info",
      "Social links (Instagram, Facebook, TikTok)",
      "Customer reviews on your page",
      "Featured in your area's discovery feed",
      "Pre-order listings (reserve for market pickup)",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthly: 24.56,
    tagline: "Maximum visibility and promotional power.",
    features: [
      "Everything in Standard",
      "2 featured posts — feature any of your listings, anywhere",
      "Featured on the homepage",
      "Featured in your category",
      "Promotional offers & discounts",
      "Video clip on your listing",
      "Priority placement in search results",
    ],
  },
};

export const TIER_ORDER: TierId[] = ["basic", "middle", "premium"];

export const FEATURE_BOOST_PRICE = 5;
export const FEATURE_BOOST_DURATION_DAYS = 14;
