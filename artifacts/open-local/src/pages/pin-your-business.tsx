import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitEstablishment } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { TierPicker } from "@/components/billing/TierPicker";
import { TIERS, type TierId } from "@/lib/tiers";
import { MapPin, Store, CheckCircle, Clock, Sparkles, CreditCard, Loader2, Image as ImageIcon, Video } from "lucide-react";

const ESTABLISHMENT_TYPES = [
  "Café",
  "Restaurant",
  "Bar / Brewery",
  "Boutique",
  "Gallery",
  "Bookshop",
  "Bakery",
  "Farm Stand",
  "Spa / Wellness",
  "Fitness",
  "Market",
  "Other",
];

const schema = z.object({
  name: z.string().min(2, "Business name is required"),
  type: z.string().min(1, "Please select a type"),
  description: z.string().min(20, "Please write at least 20 characters"),
  address: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  contactEmail: z.string().email("Valid email required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL (include https://)").optional().or(z.literal("")),
  instagramHandle: z.string().optional(),
  facebookUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  tiktokUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Enter a valid image URL").optional().or(z.literal("")),
  photoUrlsRaw: z.string().optional(),
  videoUrl: z.string().url("Enter a valid video URL").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface BusinessPricing {
  business: {
    trialDays: number;
    earlyBirdRemaining: number;
    earlyBirdTotal: number;
  };
}

export default function PinYourBusiness() {
  const [tier, setTier] = useState<TierId>("middle");
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ token: string; name: string } | null>(null);
  const [pricing, setPricing] = useState<BusinessPricing | null>(null);
  const [pricingError, setPricingError] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { mutateAsync, isPending } = useSubmitEstablishment();

  useEffect(() => {
    fetch("/api/billing/pricing")
      .then((r) => {
        if (!r.ok) throw new Error("pricing fetch failed");
        return r.json();
      })
      .then(setPricing)
      .catch(() => setPricingError(true));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: "FL" },
  });

  const onSubmit = async (data: FormData) => {
    const photoUrls = data.photoUrlsRaw
      ? data.photoUrlsRaw.split(/\s*[\n,]\s*/).filter((u) => u.trim().length > 0).slice(0, 6)
      : null;

    // Tier-aware payload — strip fields the chosen tier doesn't include
    const payload = {
      name: data.name,
      type: data.type,
      description: data.description,
      address: data.address,
      city: data.city,
      state: data.state,
      contactEmail: data.contactEmail,
      phone: data.phone || null,
      website: data.website || null,
      instagramHandle: data.instagramHandle || null,
      facebookUrl: tier !== "basic" ? (data.facebookUrl || null) : null,
      tiktokUrl: tier !== "basic" ? (data.tiktokUrl || null) : null,
      imageUrl: data.imageUrl || null,
      photoUrls: tier !== "basic" ? photoUrls : null,
      videoUrl: tier === "premium" ? (data.videoUrl || null) : null,
      latitude: null,
      longitude: null,
      tier,
    };

    const result = await mutateAsync({ data: payload });
    const token = (result as { billingToken?: string })?.billingToken;
    if (!token) {
      setCheckoutError("Submission saved, but we couldn't generate a billing link. Please contact support.");
      setSubmitted(true);
      return;
    }
    setSubmittedData({ token, name: data.name });
    setSubmitted(true);
  };

  const startCheckout = async () => {
    if (!submittedData) return;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const r = await fetch("/api/billing/business/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingToken: submittedData.token, tier }),
      });
      const result = await r.json();
      if (r.ok && result.url) {
        window.location.href = result.url;
      } else {
        setCheckoutError(result.error ?? "Couldn't start checkout.");
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutError("Couldn't reach the billing service. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const trialDays = pricing?.business.trialDays ?? 0;
  const earlyBirdLeft = pricing?.business.earlyBirdRemaining ?? 0;
  const isEarlyBird = earlyBirdLeft > 0;
  const trialMonths = Math.round(trialDays / 30);
  const selectedTier = TIERS[tier];

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <div className="max-w-xl w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
                Submission received!
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Our team reviews submissions within 24 hours. To go live the moment we approve you, set up your listing subscription now.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-primary/30 bg-amber-50/50 overflow-hidden">
              <div className="bg-amber-100/60 border-b border-amber-200 px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Open Local Business Listing — {selectedTier.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-serif font-bold text-foreground">
                    ${selectedTier.priceMonthly.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/ month</span>
                </div>
              </div>

              <div className="p-6">
                {isEarlyBird ? (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 mb-5">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 mt-0.5 text-amber-700" />
                      <div>
                        <p className="font-semibold text-amber-900 mb-0.5">
                          {trialMonths} months free — early-bird offer
                        </p>
                        <p className="text-sm text-amber-800">
                          Only {earlyBirdLeft} of {pricing?.business.earlyBirdTotal} free spots remaining.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-5">
                    Standard billing starts immediately.
                  </p>
                )}

                <ul className="space-y-2.5 mb-6">
                  {selectedTier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {checkoutError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-3">
                    {checkoutError}
                  </div>
                )}

                <button
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors h-12 rounded-xl font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> {isEarlyBird ? `Start ${trialMonths}-month free trial` : `Subscribe — $${selectedTier.priceMonthly.toFixed(2)}/mo`}</>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  {isEarlyBird ? "You won't be charged until your free period ends. " : ""}Manage anything later from the Stripe portal.
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
                Skip for now — I'll set up billing later
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold mb-5">
            <Sparkles className="w-4 h-4" />
            {isEarlyBird ? `${earlyBirdLeft} free spots left — ${trialMonths} months on us` : "Plans from $4.58/month"}
          </div>
          <h1 className="text-5xl font-serif font-bold text-foreground mb-4 leading-tight">
            Pin your business<br />on the map
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Get your independently-owned establishment discovered by locals and visitors exploring the area. Visible on both our web map and mobile app.
          </p>
        </div>

        {/* Tier Picker */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-1">Choose your plan</h2>
          <p className="text-sm text-muted-foreground mb-5">
            All plans include a map pin. {pricingError ? "Live trial pricing unavailable — see Stripe for details." : isEarlyBird ? `Early-bird trial applies to all plans.` : "No active trial promotion."}
          </p>
          <TierPicker
            selected={tier}
            onSelect={setTier}
            trialDays={trialDays}
            isEarlyBird={isEarlyBird}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Business info
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Business name <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="e.g. The Garden Café"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type <span className="text-destructive">*</span>
                </label>
                <select
                  {...register("type")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Select type…</option>
                  {ESTABLISHMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input
                  {...register("phone")}
                  placeholder="(555) 000-0000"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Tell locals what makes your place special…"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Street address <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("address")}
                  placeholder="123 Main St"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  State <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("state")}
                  placeholder="FL"
                  maxLength={2}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase"
                />
                {errors.state && <p className="text-xs text-destructive mt-1">{errors.state.message}</p>}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  City <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("city")}
                  placeholder="Tampa"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> Photos
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Primary photo URL
              </label>
              <input
                {...register("imageUrl")}
                placeholder="https://example.com/your-photo.jpg"
                className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a hosted image URL. Direct uploads coming soon.
              </p>
              {errors.imageUrl && <p className="text-xs text-destructive mt-1">{errors.imageUrl.message}</p>}
            </div>

            {tier !== "basic" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Additional photo URLs <span className="text-xs text-muted-foreground font-normal">(up to 6, one per line)</span>
                </label>
                <textarea
                  {...register("photoUrlsRaw")}
                  rows={3}
                  placeholder={"https://example.com/photo-2.jpg\nhttps://example.com/photo-3.jpg"}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none font-mono"
                />
              </div>
            )}

            {tier === "basic" && (
              <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
                Multiple photos are included in the Standard plan.
              </p>
            )}
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Contact & links</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Contact email <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("contactEmail")}
                  type="email"
                  placeholder="you@yourbusiness.com"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
                <input
                  {...register("website")}
                  placeholder="https://yourbusiness.com"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.website && <p className="text-xs text-destructive mt-1">{errors.website.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Instagram handle</label>
                <div className="flex items-center border border-input rounded-md overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                  <span className="px-3 text-sm text-muted-foreground border-r border-input py-2.5 bg-muted">@</span>
                  <input
                    {...register("instagramHandle")}
                    placeholder="yourbusiness"
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {tier !== "basic" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Facebook URL</label>
                    <input
                      {...register("facebookUrl")}
                      placeholder="https://facebook.com/yourbusiness"
                      className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {errors.facebookUrl && <p className="text-xs text-destructive mt-1">{errors.facebookUrl.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">TikTok URL</label>
                    <input
                      {...register("tiktokUrl")}
                      placeholder="https://tiktok.com/@yourbusiness"
                      className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {errors.tiktokUrl && <p className="text-xs text-destructive mt-1">{errors.tiktokUrl.message}</p>}
                  </div>
                </>
              )}
            </div>

            {tier === "basic" && (
              <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
                Facebook & TikTok links are included starting at the Standard plan.
              </p>
            )}
          </div>

          {/* Premium-only video */}
          {tier === "premium" && (
            <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> Video clip
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">Premium</span>
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Video URL <span className="text-xs text-muted-foreground font-normal">(YouTube, Vimeo, or direct .mp4)</span>
                </label>
                <input
                  {...register("videoUrl")}
                  placeholder="https://youtube.com/watch?v=…"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.videoUrl && <p className="text-xs text-destructive mt-1">{errors.videoUrl.message}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {selectedTier.name} plan · ${selectedTier.priceMonthly.toFixed(2)}/mo
              {isEarlyBird ? ` · ${trialMonths} months free` : ""}
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isPending ? "Submitting…" : "Submit & continue"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
