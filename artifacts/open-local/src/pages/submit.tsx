import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wheat,
  Carrot,
  HandHeart,
  Beer,
  Hammer,
  Soup,
  Beef,
  Flower2,
  Coffee,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  AtSign,
  Phone,
  Globe,
  Instagram,
  Facebook,
  Plus,
  Minus,
  Mail,
  ShieldCheck,
  Clock,
  CalendarDays,
  Home,
  ImagePlus,
  X,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { LocationPicker } from "@/components/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useStartEmailVerification,
  useResendEmailVerification,
  useVerifyEmailCode,
  getListVendorsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const categories = [
  { name: "Bakery", icon: Wheat, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80" },
  { name: "Farm", icon: Carrot, image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1200&q=80" },
  { name: "Apiary", icon: HandHeart, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80" },
  { name: "Brewery", icon: Beer, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80" },
  { name: "Crafts", icon: Hammer, image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80" },
  { name: "Pantry", icon: Soup, image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80" },
  { name: "Butcher", icon: Beef, image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&q=80" },
  { name: "Florist", icon: Flower2, image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80" },
  { name: "Coffee", icon: Coffee, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80" },
  { name: "Other", icon: Sparkles, image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80" },
] as const;

const popularCities = [
  "Miami",
  "Tampa",
  "Orlando",
  "Jacksonville",
  "St. Petersburg",
  "Fort Lauderdale",
  "Gainesville",
  "Tallahassee",
  "Sarasota",
  "Key West",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const HOW_TO_ORDER_OPTIONS = [
  { value: "open_local_storefront" },
  { value: "website" },
  { value: "preorder_required" },
  { value: "farmers_market" },
] as const;

const createFormSchema = (t: TFunction) => z.object({
  category: z.string().min(2, t("submit.errorCategory")),
  name: z.string().min(2, t("submit.errorName")),
  tagline: z.string().min(10, t("submit.errorTagline")),
  description: z.string().min(20, t("submit.errorDescription")),
  location: z.string().min(2, t("submit.errorCity")),
  region: z.string().min(2),
  zipCode: z.string().optional().or(z.literal("")),
  established: z.coerce.number().int().min(1800).max(new Date().getFullYear()),
  // Step 3 — availability
  pickupAddress: z.string().optional().or(z.literal("")),
  openDays: z.array(z.string()).optional(),
  openHours: z.string().optional().or(z.literal("")),
  howToOrder: z.array(z.string()).optional(),
  marketsText: z.string().optional().or(z.literal("")),
  // Step 4 — contact
  contactEmail: z.string().email(t("submit.errorEmail")),
  imageUrl: z.string().optional().or(z.literal("")),
  websiteUrl: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const stepFields: Record<number, (keyof FormValues)[]> = {
  1: ["category"],
  2: ["name", "tagline", "description", "location", "region", "zipCode"],
  3: ["pickupAddress", "openDays", "openHours", "howToOrder", "marketsText"],
  4: ["contactEmail", "imageUrl", "websiteUrl", "phone", "instagramHandle", "facebookUrl"],
};

type VerificationState = {
  verificationId: number;
  email: string;
  devCode: string | null;
};

export default function Submit() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const startVerification = useStartEmailVerification();
  const resendVerification = useResendEmailVerification();
  const verifyCode = useVerifyEmailCode();

  const [step, setStep] = useState(1);
  const [showOptionalContact, setShowOptionalContact] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationState | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(t)),
    mode: "onChange",
    defaultValues: {
      category: "",
      name: "",
      tagline: "",
      description: "",
      location: "",
      region: "Florida",
      zipCode: "",
      established: new Date().getFullYear(),
      pickupAddress: "",
      openDays: [],
      openHours: "",
      howToOrder: [],
      marketsText: "",
      contactEmail: "",
      imageUrl: "",
      websiteUrl: "",
      phone: "",
      instagramHandle: "",
      facebookUrl: "",
    },
  });

  const watchedCategory = form.watch("category");
  const watchedName = form.watch("name");
  const watchedLocation = form.watch("location");

  const defaultImage = useMemo(() => {
    const match = categories.find((c) => c.name === watchedCategory);
    return match?.image ?? "";
  }, [watchedCategory]);

  function pickCategory(name: string) {
    console.log("[OL-submit] pickCategory fired:", name, "step before:", step);
    form.setValue("category", name, { shouldDirty: true, shouldTouch: true });
    setStep(2);
    console.log("[OL-submit] setStep(2) called");
  }

  async function nextStep() {
    const fields = stepFields[step];
    const valid = await form.trigger(fields);
    if (!valid) return;
    setStep(step + 1);
  }

  function prevStep() {
    setStep(Math.max(1, step - 1));
  }

  function normalizeUrl(val: string | undefined): string | null {
    if (!val || !val.trim()) return null;
    const trimmed = val.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  async function publish() {
    const fields = stepFields[4];
    const valid = await form.trigger(fields);
    if (!valid) {
      // Scroll to the first visible error so the user knows what's wrong
      const firstError = document.querySelector("[data-error]");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const values = form.getValues();
    const slug = values.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const instagramHandleClean = values.instagramHandle?.replace(/^@/, "");

    const vendorPayload = {
      ...values,
      slug,
      imageUrl: values.imageUrl || defaultImage,
      websiteUrl: normalizeUrl(values.websiteUrl),
      phone: values.phone || null,
      instagramHandle: instagramHandleClean || null,
      facebookUrl: normalizeUrl(values.facebookUrl),
      marketsText: values.marketsText || null,
      pickupAddress: values.pickupAddress || null,
      openDays: values.openDays?.length ? values.openDays : null,
      openHours: values.openHours || null,
      howToOrder: values.howToOrder?.length ? values.howToOrder.join(", ") : null,
      latitude: pickupLat ?? null,
      longitude: pickupLng ?? null,
    };

    startVerification.mutate(
      {
        data: {
          email: values.contactEmail,
          vendorPayload,
        },
      },
      {
        onSuccess: (data) => {
          setVerification({
            verificationId: data.verificationId,
            email: data.email,
            devCode: data.devCode,
          });
          setCode("");
          setVerifyError(null);
          setStep(5);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: t("submit.couldntSendCode"),
            description: t("submit.checkEmailRetry"),
          });
        },
      },
    );
  }

  function submitCode() {
    if (!verification || code.length !== 6) return;
    setVerifyError(null);
    verifyCode.mutate(
      {
        data: { verificationId: verification.verificationId, code },
      },
      {
        onSuccess: (vendor) => {
          queryClient.invalidateQueries({
            queryKey: getListVendorsQueryKey(),
          });
          toast({
            title: t("submit.successToast"),
            description: t("submit.successDescription"),
          });
          setLocation(`/dashboard/${vendor.slug}`);
        },
        onError: (err: unknown) => {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: unknown }).message)
              : "That code didn't match. Try again.";
          setVerifyError(msg);
        },
      },
    );
  }

  function resendCode() {
    if (!verification) return;
    setVerifyError(null);
    setCode("");
    resendVerification.mutate(
      { data: { verificationId: verification.verificationId } },
      {
        onSuccess: (data) => {
          setVerification({
            verificationId: data.verificationId,
            email: data.email,
            devCode: data.devCode,
          });
          toast({
            title: t("submit.newCodeSent"),
            description: t("submit.checkEmail", { email: data.email }),
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: t("submit.couldntResend"),
            description: t("submit.tryAgainMoment"),
          });
        },
      },
    );
  }

  return (
    <Layout>
      <div className="bg-muted border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
          <div className="text-center">
            <p className="text-sm tracking-[0.2em] uppercase text-primary font-semibold mb-3">
              {t("submit.stepsTitle")}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-3">
              {t("submit.heroTitle")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              {t("submit.heroDescription")}
            </p>
          </div>

          <Stepper step={step} />
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {step === 1 && (<>
              <StepHeader
                eyebrow={t("submit.stepOf", { step: 1, total: 4 })}
                title={t("submit.step1Title")}
                subtitle={t("submit.step1Description")}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mt-8">
                {categories.map(({ name, icon: Icon }) => {
                  const selected = watchedCategory === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pickCategory(name)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selected
                          ? "border-primary ring-2 ring-primary"
                          : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-primary group-hover:bg-primary/10",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="font-serif font-semibold text-foreground">
                        {t(`wholesale.cat${name}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6">
                {t("submit.step1Hint")}
              </p>
            </>)}
            {step === 2 && (<>
              <StepHeader
                eyebrow={t("submit.stepOf", { step: 2, total: 4 })}
                title={t("submit.step2Title")}
                subtitle={t("submit.step2Description")}
              />

              <div className="mt-8 space-y-6">
                <Field
                  label={t("submit.fieldName")}
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    placeholder={t("submit.namePlaceholder")}
                    autoFocus
                    {...form.register("name")}
                  />
                </Field>

                <Field
                  label={t("submit.fieldTagline")}
                  required
                    hint={t("submit.fieldTaglinePlaceholder")}
                  error={form.formState.errors.tagline?.message}
                >
                  <Input
                    placeholder={t("submit.fieldTaglinePlaceholder")}
                    {...form.register("tagline")}
                  />
                </Field>

                <Field
                  label={t("submit.fieldStory")}
                  required
                    hint={t("submit.fieldStoryPlaceholder")}
                  error={form.formState.errors.description?.message}
                >
                  <Textarea
                    placeholder={t("submit.fieldStoryPlaceholder")}
                    className="min-h-[140px]"
                    {...form.register("description")}
                  />
                </Field>

                <Field
                  label={t("submit.fieldCity")}
                  required
                  error={form.formState.errors.location?.message}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {popularCities.map((city) => {
                        const selected = watchedLocation === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() =>
                              form.setValue("location", city, {
                                shouldValidate: true,
                              })
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/50",
                            )}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t("submit.cityPlaceholder")}
                        className="pl-9"
                        value={form.watch("location")}
                        onChange={(e) =>
                          form.setValue("location", e.target.value, {
                            shouldValidate: true,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder={t("submit.fieldZip")}
                          {...form.register("zipCode")}
                          className="font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          if (!navigator.geolocation) return;
                          setGeolocating(true);
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              try {
                                const r = await fetch(
                                  `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`,
                                );
                                const data = await r.json();
                                const city =
                                  data.address?.city ||
                                  data.address?.town ||
                                  data.address?.village ||
                                  "";
                                const zip = data.address?.postcode || "";
                                if (city) form.setValue("location", city, { shouldValidate: true });
                                if (zip) form.setValue("zipCode", zip, { shouldValidate: true });
                              } catch {
                                // silently ignore
                              } finally {
                                setGeolocating(false);
                              }
                            },
                            () => setGeolocating(false),
                          );
                        }}
                      >
                        {geolocating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        <span className="ml-1.5">{t("submit.useMyLocation")}</span>
                      </Button>
                    </div>
                  </div>
                </Field>

                <input type="hidden" {...form.register("region")} />
              </div>

              <NavRow
                onBack={prevStep}
                onNext={nextStep}
                nextLabel={t("common.continue")}
                disabled={false}
              />
            </>)}
            {step === 3 && (<>
              <StepHeader
                eyebrow={t("submit.stepOf", { step: 3, total: 4 })}
                title={t("submit.step3Title")}
                subtitle={t("submit.step3Description")}
              />

              <div className="mt-8 space-y-8">
                {/* Pickup location */}
                <Field
                  label={t("submit.fieldPickupAddress")}
                  hint={t("submit.pickupAddressHint")}
                >
                  <div className="relative">
                    <Home className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("submit.pickupAddressPlaceholder")}
                      className="pl-9"
                      {...form.register("pickupAddress")}
                    />
                  </div>
                </Field>

                {/* Pin exact location */}
                <Field
                  label={t("submit.pinExactSpot")}
                  hint={t("submit.pinExactSpotHint")}
                >
                  <LocationPicker
                    hint={form.watch("pickupAddress") || form.watch("location")}
                    onChange={(lat, lng) => {
                      setPickupLat(lat);
                      setPickupLng(lng);
                    }}
                  />
                </Field>

                {/* Days open */}
                <Field
                  label={t("submit.fieldDays")}
                  hint={t("submit.fieldDaysHint")}
                >
                  <div className="flex flex-wrap gap-2 mt-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const selected = (form.watch("openDays") ?? []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const current = form.getValues("openDays") ?? [];
                            form.setValue(
                              "openDays",
                              selected ? current.filter((d) => d !== day) : [...current, day],
                              { shouldValidate: true },
                            );
                          }}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/50",
                          )}
                        >
                           {t(`submit.dayShort${day}`)}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Hours */}
                <Field
                  label={t("submit.fieldHours")}
                  hint={t("submit.fieldHoursHint")}
                >
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("submit.fieldHoursPlaceholder")}
                      className="pl-9"
                      {...form.register("openHours")}
                    />
                  </div>
                </Field>

                {/* How to order */}
                <Field
                  label={t("submit.fieldHowToOrder")}
                  hint={t("submit.fieldHowToOrderHint")}
                >
                  <div className="flex flex-col gap-2 mt-1">
                    {HOW_TO_ORDER_OPTIONS.map(({ value }) => {
                      const selected = (form.watch("howToOrder") ?? []).includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            const current = form.getValues("howToOrder") ?? [];
                            form.setValue(
                              "howToOrder",
                              selected ? current.filter((v) => v !== value) : [...current, value],
                              { shouldValidate: true },
                            );
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium text-left transition-colors",
                            selected
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/50",
                          )}
                        >
                          <span className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 transition-colors",
                            selected ? "border-primary bg-primary" : "border-border"
                          )}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </span>
                           {t(`submit.order${value}`)}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Markets */}
                <Field
                  label={t("submit.fieldMarkets")}
                  hint={t("submit.fieldMarketsHint")}
                >
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder={t("submit.fieldMarketsPlaceholder")}
                      className="min-h-[80px] pl-9"
                      {...form.register("marketsText")}
                    />
                  </div>
                </Field>
              </div>

              <div className="mt-10 border-t border-border pt-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="ghost" onClick={prevStep}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t("submit.back")}
                  </Button>
                  <Button type="button" onClick={nextStep} className="px-6">
                    {t("common.continue")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {t("submit.skipIntro")}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue("pickupAddress", "");
                      form.setValue("openDays", []);
                      form.setValue("openHours", "");
                      form.setValue("howToOrder", []);
                      form.setValue("marketsText", "");
                      setStep(4);
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("submit.skipAction")}
                  </button>
                  {" "}— {t("submit.skipOutro")}
                </p>
              </div>
            </>)}
            {step === 4 && (<>
              <StepHeader
                eyebrow={t("submit.stepOf", { step: 4, total: 4 })}
                title={t("submit.step4Title")}
                subtitle={t("submit.step4Description")}
              />

              <div className="mt-8 space-y-6">
                <Field
                  label={t("submit.fieldEmail")}
                  required
                  hint={t("submit.fieldEmailHint")}
                  error={form.formState.errors.contactEmail?.message}
                >
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder={t("submit.emailPlaceholder")}
                      className="pl-9"
                      autoFocus
                      {...form.register("contactEmail")}
                    />
                  </div>
                </Field>

                <Field
                  label={t("submit.coverPhoto")}
                  hint={
                    form.watch("imageUrl")
                      ? undefined
                      : defaultImage
                        ? t("submit.coverPhotoDefaultHint", { category: t(`wholesale.cat${watchedCategory}`).toLowerCase() })
                        : t("submit.coverPhotoUploadHint")
                  }
                >
                  <div className="space-y-3">
                    {form.watch("imageUrl") ? (
                      <div className="relative overflow-hidden rounded-md border border-border">
                        <img
                          src={form.watch("imageUrl")}
                          alt={t("submit.coverPreviewAlt")}
                          className="h-36 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue("imageUrl", "");
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <p className="bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                          {t("submit.uploadedRemove")}
                        </p>
                      </div>
                    ) : defaultImage ? (
                      <div className="overflow-hidden rounded-md border border-dashed border-border">
                        <img
                          src={defaultImage}
                          alt={t("submit.defaultCoverAlt")}
                          className="h-36 w-full object-cover opacity-60"
                        />
                        <p className="bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                          {t("submit.usingDefaultCover")}
                        </p>
                      </div>
                    ) : null}

                    <label
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-sm font-medium transition-colors",
                        isUploading
                          ? "cursor-not-allowed opacity-60 border-border text-muted-foreground"
                          : "border-primary/30 text-primary hover:border-primary hover:bg-primary/5",
                      )}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                           {t("submit.uploading")}
                        </>
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" />
                           {form.watch("imageUrl") ? t("submit.replacePhoto") : t("submit.uploadPhoto")}
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsUploading(true);
                          setUploadError(null);
                          try {
                            const metaRes = await fetch("/api/storage/uploads/request-url", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                            });
                            if (!metaRes.ok) throw new Error(t("submit.uploadStartFailed"));
                            const { uploadURL, objectPath } = await metaRes.json();
                            const putRes = await fetch(uploadURL, {
                              method: "PUT",
                              body: file,
                              headers: { "Content-Type": file.type },
                            });
                            if (!putRes.ok) throw new Error(t("submit.uploadFailed"));
                            const servingUrl = `/api/storage${objectPath}`;
                            form.setValue("imageUrl", servingUrl, { shouldValidate: true });
                          } catch (err) {
                            setUploadError(err instanceof Error ? err.message : t("submit.uploadFailed"));
                          } finally {
                            setIsUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>
                    {uploadError && (
                      <p className="text-xs text-destructive">{uploadError}</p>
                    )}
                  </div>
                </Field>

                <button
                  type="button"
                  onClick={() => setShowOptionalContact((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  {showOptionalContact ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                   {showOptionalContact ? t("submit.hideDetails") : t("submit.addDetails")}
                </button>

                <AnimatePresence>
                  {showOptionalContact && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-6 pt-2">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <Field
                             label={t("submit.fieldPhone")}
                            error={form.formState.errors.phone?.message}
                          >
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="(555) 123-4567"
                                className="pl-9"
                                {...form.register("phone")}
                              />
                            </div>
                          </Field>
                          <Field
                             label={t("submit.fieldWebsite")}
                            error={form.formState.errors.websiteUrl?.message}
                          >
                            <div className="relative">
                              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="https://..."
                                className="pl-9"
                                {...form.register("websiteUrl")}
                              />
                            </div>
                          </Field>
                          <Field
                             label={t("submit.fieldInstagram")}
                            error={form.formState.errors.instagramHandle?.message}
                          >
                            <div className="relative">
                              <Instagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="@yourhandle"
                                className="pl-9"
                                {...form.register("instagramHandle")}
                              />
                            </div>
                          </Field>
                          <Field
                             label={t("submit.fieldFacebook")}
                            error={form.formState.errors.facebookUrl?.message}
                          >
                            <div className="relative">
                              <Facebook className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="https://facebook.com/..."
                                className="pl-9"
                                {...form.register("facebookUrl")}
                              />
                            </div>
                          </Field>
                        </div>
                        <Field
                          label={t("submit.fieldEstablished")}
                          error={form.formState.errors.established?.message}
                        >
                          <Input
                            type="number"
                            placeholder={String(new Date().getFullYear())}
                            {...form.register("established")}
                          />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {watchedName && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      {t("submit.preview")}
                    </p>
                    <p className="font-serif text-xl font-bold text-foreground">
                      {watchedName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(`wholesale.cat${watchedCategory}`)} · {watchedLocation || t("submit.defaultLocation")}
                    </p>
                  </div>
                )}
              </div>

              <NavRow
                onBack={prevStep}
                onNext={publish}
                nextLabel={
                  startVerification.isPending
                    ? t("dashboard.sendingCode")
                    : t("submit.publish")
                }
                nextIcon={
                  startVerification.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="ml-2 h-4 w-4" />
                  )
                }
                disabled={startVerification.isPending}
              />
            </>)}
            {step === 5 && verification && (<>
              <VerifyStep
                email={verification.email}
                devCode={verification.devCode}
                code={code}
                setCode={setCode}
                onSubmit={submitCode}
                onResend={resendCode}
                onBack={() => {
                  setStep(4);
                  setVerification(null);
                  setCode("");
                  setVerifyError(null);
                }}
                error={verifyError}
                isVerifying={verifyCode.isPending}
                isResending={resendVerification.isPending}
              />
            </>)}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function Stepper({ step }: { step: number }) {
  const { t } = useTranslation();
  const labels = [
    t("submit.stepCategory"),
    t("submit.stepStory"),
    t("submit.stepAvailability"),
    t("submit.stepContact"),
    t("submit.stepVerify"),
  ];
  return (
    <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground border border-border",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  active || done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {n < labels.length && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-16 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
        {title}
      </h2>
      <p className="text-muted-foreground max-w-lg mx-auto">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function VerifyStep({
  email,
  devCode,
  code,
  setCode,
  onSubmit,
  onResend,
  onBack,
  error,
  isVerifying,
  isResending,
}: {
  email: string;
  devCode: string | null;
  code: string;
  setCode: (v: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
  error: string | null;
  isVerifying: boolean;
  isResending: boolean;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (code.length === 6 && !isVerifying) {
      onSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
          {t("submit.stepFinalCheck")}
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
          {t("submit.verifyEmail")}
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {t("submit.verifyEmailDescription", { email })}
        </p>
      </div>

      <div className="mt-10 mx-auto max-w-md">
        <input
          ref={inputRef}
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
          }}
          className={cn(
            "w-full rounded-lg border bg-card px-6 py-5 text-center font-mono text-3xl tracking-[0.6em] text-foreground shadow-sm focus:outline-none focus:ring-2",
            error
              ? "border-destructive focus:ring-destructive/30"
              : "border-border focus:border-primary focus:ring-primary/30",
          )}
          placeholder="······"
          aria-label={t("dashboard.enterCode")}
        />
        {error && (
          <p className="mt-2 text-center text-sm text-destructive">{error}</p>
        )}

        {devCode && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="mb-1 flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              {t("submit.demoModeTitle")}
            </p>
            <p>
              {t("submit.demoModeDescription")}{" "}
              <span className="font-mono text-base font-bold tracking-widest">
                {devCode}
              </span>
            </p>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {t("submit.resendPrompt")}{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={isResending}
            className="font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {isResending ? t("dashboard.sendingCode") : t("submit.resendCode")}
          </button>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("submit.useDifferentEmail")}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={code.length !== 6 || isVerifying}
          className="px-6"
        >
          {isVerifying ? t("dashboard.verifying") : t("submit.publish")}
          {isVerifying ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  nextIcon,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextIcon?: React.ReactNode;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("submit.back")}
      </Button>
      <Button type="button" onClick={onNext} disabled={disabled} className="px-6">
        {nextLabel}
        {nextIcon ?? <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
