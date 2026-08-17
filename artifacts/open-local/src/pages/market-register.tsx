import { useState, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
const LocationPicker = lazy(() =>
  import("@/components/LocationPicker").then((m) => ({ default: m.LocationPicker })),
);
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Store,
  Mail,
  Globe,
  Instagram,
  ArrowLeft,
  ArrowRight,
  Tag,
} from "lucide-react";
import { useRegisterMarket } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const STATES = ["FL", "GA", "AL", "SC", "NC", "TN"];
const TAG_OPTIONS = [
  "organic", "year-round", "seasonal", "pet-friendly", "rain-or-shine",
  "music", "kids-activities", "food-trucks", "artisans", "plants",
  "seafood", "eggs", "honey", "baked-goods",
];

interface FormState {
  // Step 1 — Basics
  name: string;
  city: string;
  region: string;
  address: string;
  day: string;
  time: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  // Step 2 — Contact & presence
  contactEmail: string;
  phone: string;
  websiteUrl: string;
  instagramHandle: string;
  facebookUrl: string;
  twitterHandle: string;
  logoUrl: string;
  featuredImageUrl: string;
  tags: string[];
}

const INITIAL: FormState = {
  name: "", city: "", region: "FL", address: "", day: "", time: "", description: "",
  latitude: null, longitude: null,
  contactEmail: "", phone: "", websiteUrl: "", instagramHandle: "",
  facebookUrl: "", twitterHandle: "", logoUrl: "", featuredImageUrl: "", tags: [],
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {[...Array(total)].map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
              i < current
                ? "bg-primary border-primary text-primary-foreground"
                : i === current
                ? "border-primary text-primary bg-background"
                : "border-muted-foreground/30 text-muted-foreground/50 bg-muted",
            )}
          >
            {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn("h-0.5 w-8", i < current ? "bg-primary" : "bg-muted")} />
          )}
        </div>
      ))}
    </div>
  );
}

function Step1({
  form,
  set,
  setLatLng,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  setLatLng: (lat: number, lng: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldMarketName")} *</label>
        <Input
          placeholder="e.g. Sarasota Farmers Market"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldCity")} *</label>
          <Input placeholder="Sarasota" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldState")}</label>
          <Select value={form.region} onValueChange={(v) => set("region", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldAddress")}</label>
        <Input placeholder="5360 Gulf of Mexico Dr, Longboat Key, FL 34228" value={form.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldDay")}</label>
          <Select value={form.day} onValueChange={(v) => set("day", v)}>
            <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldHours")}</label>
          <Input placeholder="8am – 1pm" value={form.time} onChange={(e) => set("time", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldDescription")}</label>
        <textarea
          placeholder="Tell shoppers what makes your market special — the vibe, what vendors you have, any regular events…"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px]"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">
          Pin your exact location
        </label>
        <Suspense fallback={<div className="h-[280px] rounded-xl border border-border bg-muted animate-pulse" />}>
          <LocationPicker
            onChange={setLatLng}
            hint={[form.address, form.city, form.region].filter(Boolean).join(" ")}
            initialLat={form.latitude}
            initialLng={form.longitude}
          />
        </Suspense>
      </div>
    </div>
  );
}

function Step2({
  form,
  set,
  toggleTag,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string) => void;
  toggleTag: (tag: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldEmail")} *</label>
          <Input type="email" placeholder="manager@yourmarket.com" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldPhone")}</label>
          <Input type="tel" placeholder="(941) 555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldWebsite")}</label>
        <Input type="url" placeholder="https://yourmarket.com" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldInstagram")}</label>
          <Input placeholder="sarasotafarmersmarket" value={form.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldFacebook")}</label>
          <Input type="url" placeholder="https://facebook.com/…" value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldLogo")}</label>
          <Input type="url" placeholder="https://…/logo.png" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">{t("marketRegister.fieldBanner")}</label>
          <Input type="url" placeholder="https://…/banner.jpg" value={form.featuredImageUrl} onChange={(e) => set("featuredImageUrl", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          {t("marketRegister.fieldTags")}
        </label>
        <div className="flex flex-wrap gap-2">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                form.tags.includes(tag)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ form }: { form: FormState }) {
  const { t } = useTranslation();
  const rows: [string, string][] = [
    [t("marketRegister.fieldMarketName"), form.name],
    ["Location", [form.city, form.region].filter(Boolean).join(", ")],
    ...(form.address ? [[t("marketRegister.fieldAddress"), form.address] as [string, string]] : []),
    ...(form.day ? [["Day", [form.day, form.time].filter(Boolean).join(" · ")] as [string, string]] : []),
    [t("marketRegister.fieldEmail"), form.contactEmail],
    ...(form.websiteUrl ? [[t("marketRegister.fieldWebsite"), form.websiteUrl] as [string, string]] : []),
    ...(form.instagramHandle ? [["Instagram", `@${form.instagramHandle}`] as [string, string]] : []),
    ...(form.tags.length ? [["Tags", form.tags.join(", ")] as [string, string]] : []),
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("marketRegister.reviewNotice")}
      </p>

      <div className="rounded-xl border border-border overflow-hidden">
        {rows.map(([label, value], i) => (
          <div key={label} className={cn("flex gap-4 px-4 py-3", i % 2 === 0 ? "bg-muted/40" : "bg-background")}>
            <span className="text-xs font-semibold text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
            <span className="text-sm text-foreground break-all">{value || "—"}</span>
          </div>
        ))}
      </div>

      {form.description && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t("marketRegister.fieldDescription")}</p>
          <p className="text-sm text-foreground leading-relaxed">{form.description}</p>
        </div>
      )}
    </div>
  );
}

export default function MarketRegisterPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [done, setDone] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setLatLng = (lat: number, lng: number) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  const toggleTag = (tag: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const register = useRegisterMarket();
  const submitting = register.isPending;

  const canProceed = step === 0
    ? form.name.trim().length >= 2 && form.city.trim().length >= 1
    : step === 1
    ? form.contactEmail.includes("@")
    : true;

  const handleSubmit = async () => {
    try {
      await register.mutateAsync({
        data: {
          name: form.name.trim(),
          city: form.city.trim(),
          region: form.region,
          address: form.address.trim() || undefined,
          day: form.day || undefined,
          time: form.time.trim() || undefined,
          description: form.description.trim() || undefined,
          contactEmail: form.contactEmail.trim(),
          websiteUrl: form.websiteUrl.trim() || undefined,
          instagramHandle: form.instagramHandle.trim() || undefined,
          facebookUrl: form.facebookUrl.trim() || undefined,
          twitterHandle: form.twitterHandle.trim() || undefined,
          logoUrl: form.logoUrl.trim() || undefined,
          featuredImageUrl: form.featuredImageUrl.trim() || undefined,
          tags: form.tags.length ? form.tags : undefined,
          latitude: form.latitude ?? undefined,
          longitude: form.longitude ?? undefined,
        },
      });
      setDone(true);
    } catch {
      toast({ title: t("marketRegister.error"), variant: "destructive" });
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">{t("marketRegister.success")}</h1>
              <p className="text-muted-foreground leading-relaxed">
                {t("marketRegister.successDescription", { name: form.name, email: form.contactEmail })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/markets">
                <Button variant="outline" className="gap-2">
                  <MapPin className="w-4 h-4" /> {t("marketRegister.browseMarkets")}
                </Button>
              </Link>
              <Link href="/">
                <Button className="gap-2">
                  <Store className="w-4 h-4" /> {t("marketRegister.backToHome")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const STEP_LABELS = [
    t("marketRegister.stepBasics"),
    t("marketRegister.stepContact"),
    t("marketRegister.stepConfirm"),
  ];

  return (
    <Layout>
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Back to directory */}
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t("marketRegister.backToDirectory")}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-1.5">{t("marketRegister.title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("marketRegister.description")}
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator current={step} total={3} />
          <p className="text-xs text-muted-foreground mt-2 font-semibold">
            Step {step + 1} of 3 — {STEP_LABELS[step]}
          </p>
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border bg-card p-6 mb-6">
          {step === 0 && <Step1 form={form} set={set} setLatLng={setLatLng} />}
          {step === 1 && <Step2 form={form} set={set} toggleTag={toggleTag} />}
          {step === 2 && <Step3 form={form} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(step - 1) : navigate("/markets")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? t("common.cancel") : t("common.back")}
          </Button>

          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="gap-2"
            >
              {t("common.continue")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? t("marketRegister.submitting") : t("marketRegister.submitBtn")}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}
