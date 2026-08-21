import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitEstablishment } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import Layout from "@/components/layout/Layout";
import { TierPicker } from "@/components/billing/TierPicker";
import { TIERS, type TierId } from "@/lib/tiers";
import { LocationPicker } from "@/components/LocationPicker";
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
const ESTABLISHMENT_TYPE_KEYS: Record<(typeof ESTABLISHMENT_TYPES)[number], string> = {
  "Café": "pinBusiness.typeCafe",
  Restaurant: "pinBusiness.typeRestaurant",
  "Bar / Brewery": "pinBusiness.typeBarBrewery",
  Boutique: "pinBusiness.typeBoutique",
  Gallery: "pinBusiness.typeGallery",
  Bookshop: "pinBusiness.typeBookshop",
  Bakery: "pinBusiness.typeBakery",
  "Farm Stand": "pinBusiness.typeFarmStand",
  "Spa / Wellness": "pinBusiness.typeSpaWellness",
  Fitness: "pinBusiness.typeFitness",
  Market: "pinBusiness.typeMarket",
  Other: "pinBusiness.typeOther",
};

const createSchema = (t: TFunction) => z.object({
  name: z.string().min(2, t("pinBusiness.errorName")),
  type: z.string().min(1, t("pinBusiness.errorType")),
  description: z.string().min(20, t("pinBusiness.errorDescription")),
  address: z.string().min(5, t("pinBusiness.errorAddress")),
  city: z.string().min(2, t("pinBusiness.errorCity")),
  state: z.string().min(2, t("pinBusiness.errorState")),
  contactEmail: z.string().email(t("pinBusiness.errorEmail")),
  phone: z.string().optional(),
  website: z.string().url(t("pinBusiness.errorWebsite")).optional().or(z.literal("")),
  instagramHandle: z.string().optional(),
  facebookUrl: z.string().url(t("pinBusiness.errorUrl")).optional().or(z.literal("")),
  tiktokUrl: z.string().url(t("pinBusiness.errorUrl")).optional().or(z.literal("")),
  imageUrl: z.string().url(t("pinBusiness.errorImageUrl")).optional().or(z.literal("")),
  photoUrlsRaw: z.string().optional(),
  videoUrl: z.string().url(t("pinBusiness.errorVideoUrl")).optional().or(z.literal("")),
});

type FormData = z.infer<ReturnType<typeof createSchema>>;

interface BusinessPricing {
  business: {
    trialDays: number;
    earlyBirdRemaining: number;
    earlyBirdTotal: number;
  };
}

export default function PinYourBusiness() {
  const { t } = useTranslation();
  const [tier, setTier] = useState<TierId>("middle");
  const [submitted, setSubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState<{ token: string; name: string } | null>(null);
  const [pinLatLng, setPinLatLng] = useState<{ lat: number; lng: number } | null>(null);
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
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: { state: "FL" },
  });

  const watchedAddress = watch("address");
  const watchedCity = watch("city");
  const watchedState = watch("state");
  const locationHint = [watchedAddress, watchedCity, watchedState].filter(Boolean).join(" ");

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
      latitude: pinLatLng?.lat ?? null,
      longitude: pinLatLng?.lng ?? null,
      tier,
    };

    const result = await mutateAsync({ data: payload });
    const token = (result as { billingToken?: string })?.billingToken;
    if (!token) {
      setCheckoutError(t("pinBusiness.errorNoBillingLink"));
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
        setCheckoutError(result.error ?? t("pinBusiness.errorCheckoutFailed"));
        setCheckoutLoading(false);
      }
    } catch {
      setCheckoutError(t("pinBusiness.errorBillingService"));
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
                {t("pinBusiness.submissionReceived")}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                {t("pinBusiness.submissionReceivedDesc")}
              </p>
            </div>

            <div className="rounded-2xl border-2 border-primary/30 bg-amber-50/50 overflow-hidden">
              <div className="bg-amber-100/60 border-b border-amber-200 px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Open Local {t("pinBusiness.businessListing")} — {selectedTier.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-serif font-bold text-foreground">
                    ${selectedTier.priceMonthly.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">{t("pinBusiness.perMonth")}</span>
                </div>
              </div>

              <div className="p-6">
                {isEarlyBird ? (
                  <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 mb-5">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 mt-0.5 text-amber-700" />
                      <div>
                        <p className="font-semibold text-amber-900 mb-0.5">
                          {t("pinBusiness.earlyBirdOffer", { count: trialMonths })}
                        </p>
                        <p className="text-sm text-amber-800">
                          {t("pinBusiness.earlyBirdSpotsLeft", { left: earlyBirdLeft, total: pricing?.business.earlyBirdTotal })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-5">
                    {t("pinBusiness.standardBillingStarts")}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t("pinBusiness.startingCheckout")}</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> {isEarlyBird ? t("pinBusiness.startFreeTrial", { count: trialMonths }) : t("pinBusiness.subscribe", { price: selectedTier.priceMonthly.toFixed(2) })}</>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  {isEarlyBird ? t("pinBusiness.noChargeUntilEnd") + " " : ""}{t("pinBusiness.manageStripePortal")}
                </p>
              </div>
            </div>

            <div className="text-center mt-6">
              <a href="/" className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
                {t("pinBusiness.skipForNow")}
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
            {isEarlyBird ? t("pinBusiness.earlyBirdBadge", { left: earlyBirdLeft, months: trialMonths }) : t("pinBusiness.plansFrom")}
          </div>
          <h1 className="text-5xl font-serif font-bold text-foreground mb-4 leading-tight">
            {t("pinBusiness.heroHeading")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t("pinBusiness.heroSubheading")}
          </p>
        </div>

        {/* Tier Picker */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-foreground mb-1">{t("pinBusiness.choosePlan")}</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {t("pinBusiness.allPlansIncludePin")}{" "}
            {pricingError
              ? t("pinBusiness.pricingUnavailable")
              : isEarlyBird
              ? t("pinBusiness.earlyBirdApplies")
              : t("pinBusiness.noActiveTrial")}
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
              <Store className="w-5 h-5 text-primary" /> {t("pinBusiness.businessInfo")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelBusinessName")} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder={t("pinBusiness.placeholderBusinessName")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelType")} <span className="text-destructive">*</span>
                </label>
                <select
                  {...register("type")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">{t("pinBusiness.selectType")}</option>
                  {ESTABLISHMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{t(ESTABLISHMENT_TYPE_KEYS[type])}</option>
                  ))}
                </select>
                {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("pinBusiness.labelPhone")}</label>
                <input
                  {...register("phone")}
                  placeholder={t("pinBusiness.placeholderPhone")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelDescription")} <span className="text-destructive">*</span>
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder={t("pinBusiness.placeholderDescription")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" /> {t("pinBusiness.sectionLocation")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelStreetAddress")} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("address")}
                  placeholder={t("pinBusiness.placeholderAddress")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelState")} <span className="text-destructive">*</span>
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
                  {t("pinBusiness.labelCity")} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("city")}
                  placeholder={t("pinBusiness.placeholderCity")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
              </div>
            </div>

            {/* Draggable map pin */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("pinBusiness.labelPinLocation")}
              </label>
              <LocationPicker
                onChange={(lat, lng) => setPinLatLng({ lat, lng })}
                hint={locationHint}
                initialLat={pinLatLng?.lat}
                initialLng={pinLatLng?.lng}
              />
            </div>
          </div>

          {/* Photos */}
          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> {t("pinBusiness.sectionPhotos")}
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("pinBusiness.labelPrimaryPhoto")}
              </label>
              <input
                {...register("imageUrl")}
                placeholder={t("pinBusiness.placeholderPrimaryPhoto")}
                className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("pinBusiness.primaryPhotoHint")}
              </p>
              {errors.imageUrl && <p className="text-xs text-destructive mt-1">{errors.imageUrl.message}</p>}
            </div>

            {tier !== "basic" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelAdditionalPhotos")} <span className="text-xs text-muted-foreground font-normal">({t("pinBusiness.additionalPhotosHint")})</span>
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
                {t("pinBusiness.multiplePhotosStandard")}
              </p>
            )}
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">{t("pinBusiness.sectionContactLinks")}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelContactEmail")} <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("contactEmail")}
                  type="email"
                  placeholder={t("pinBusiness.placeholderEmail")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("pinBusiness.labelWebsite")}</label>
                <input
                  {...register("website")}
                  placeholder={t("pinBusiness.placeholderWebsite")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.website && <p className="text-xs text-destructive mt-1">{errors.website.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">{t("pinBusiness.labelInstagram")}</label>
                <div className="flex items-center border border-input rounded-md overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                  <span className="px-3 text-sm text-muted-foreground border-r border-input py-2.5 bg-muted">@</span>
                  <input
                    {...register("instagramHandle")}
                    placeholder={t("pinBusiness.placeholderInstagram")}
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {tier !== "basic" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t("pinBusiness.labelFacebook")}</label>
                    <input
                      {...register("facebookUrl")}
                      placeholder={t("pinBusiness.placeholderFacebook")}
                      className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {errors.facebookUrl && <p className="text-xs text-destructive mt-1">{errors.facebookUrl.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{t("pinBusiness.labelTikTok")}</label>
                    <input
                      {...register("tiktokUrl")}
                      placeholder={t("pinBusiness.placeholderTikTok")}
                      className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    {errors.tiktokUrl && <p className="text-xs text-destructive mt-1">{errors.tiktokUrl.message}</p>}
                  </div>
                </>
              )}
            </div>

            {tier === "basic" && (
              <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
                {t("pinBusiness.facebookTikTokStandard")}
              </p>
            )}
          </div>

          {/* Premium-only video */}
          {tier === "premium" && (
            <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> {t("pinBusiness.sectionVideo")}
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">{t("pinBusiness.premiumBadge")}</span>
              </h2>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t("pinBusiness.labelVideoUrl")} <span className="text-xs text-muted-foreground font-normal">({t("pinBusiness.videoUrlHint")})</span>
                </label>
                <input
                  {...register("videoUrl")}
                  placeholder={t("pinBusiness.placeholderVideoUrl")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.videoUrl && <p className="text-xs text-destructive mt-1">{errors.videoUrl.message}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {selectedTier.name} {t("pinBusiness.planDot")} ${selectedTier.priceMonthly.toFixed(2)}/mo
              {isEarlyBird ? ` · ${trialMonths} ${t("pinBusiness.monthsFree")}` : ""}
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isPending ? t("pinBusiness.submitting") : t("pinBusiness.submitContinue")}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
