export type TierId = "basic" | "middle" | "premium";

export interface TierDef {
  id: TierId;
  name: string;
  priceMonthly: number;
  tagline: string;
  features: string[];
}

/** Number of selling location pins included in Premium at no extra charge. */
export const PREMIUM_INCLUDED_LOCATIONS = 3;

/** Monthly cost in dollars for each selling location beyond the included count. */
export const ADDITIONAL_LOCATION_PRICE_MONTHLY = 5;

export const TIERS: Record<TierId, TierDef> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceMonthly: 4.58,
    tagline: "Get discovered on the map.",
    features: [
      "Pin on the map",
      "Profile photo",
      "Business description",
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
      "Multiple photo uploads",
      "Video uploads",
      "Product listings",
      "Linked social media accounts (Instagram, Facebook, TikTok)",
      "Phone & full contact info",
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
      `${PREMIUM_INCLUDED_LOCATIONS} selling locations included (+$${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo each additional)`,
      "3 listings, products, batch drops, or pre-orders featured at the top of the feed",
      "Featured on the homepage",
      "Featured in your category",
      "Priority placement in search results",
      "Promotional offers & discounts",
    ],
  },
};

export const TIER_ORDER: TierId[] = ["basic", "middle", "premium"];

// À-la-carte boost: anyone can pay to feature a single listing for 2 weeks.
export const FEATURE_BOOST_PRICE = 5;
export const FEATURE_BOOST_DURATION_DAYS = 14;
