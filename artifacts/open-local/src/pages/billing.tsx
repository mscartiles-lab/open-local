import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { Loader2, CheckCircle, Store, Gift, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { TIERS, TIER_ORDER, type TierId } from "@/lib/tiers";
import { useTranslation } from "react-i18next";

export default function Billing() {
  const { user, isLoading } = useUser();
  const [selected, setSelected] = useState<TierId>("middle");
  const { t } = useTranslation();
  const [billingResult, setBillingResult] = useState<"success" | "cancel" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("billing");
    if (result === "success" || result === "cancel") {
      setBillingResult(result);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("billing");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <h1 className="text-3xl font-serif font-bold mb-3">{t("billing.signInTitle")}</h1>
          <p className="text-muted-foreground mb-6">{t("billing.signInDescription")}</p>
          <Link href="/" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            {t("billing.backHome")}
          </Link>
        </div>
      </Layout>
    );
  }

  if (user.role !== "vendor") {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold mb-3">{t("billing.vendorOnlyTitle")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("billing.vendorOnlyDescription")}{" "}
            <Link href="/pin-your-business" className="text-primary underline">{t("billing.pinYourBusiness")}</Link>.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {billingResult === "success" && (
          <div className="mb-8 rounded-2xl border-2 border-green-300 bg-green-50 px-6 py-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-green-900 mb-1">Subscription activated!</p>
              <p className="text-sm text-green-800">Your plan is now active. Welcome to Open Local!</p>
            </div>
          </div>
        )}

        {billingResult === "cancel" && (
          <div className="mb-8 rounded-2xl border-2 border-amber-200 bg-amber-50 px-6 py-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
              <Store className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 mb-1">Checkout cancelled</p>
              <p className="text-sm text-amber-800">No worries — your plan hasn't changed. You can try again anytime.</p>
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{t("billing.title")}</h1>
          <p className="text-muted-foreground">{t("billing.subtitle")}</p>
        </div>

        {/* Waived notice banner */}
        <div className="mb-8 rounded-2xl border-2 border-green-300 bg-green-50 px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
            <Gift className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-green-900 mb-1">{t("billing.waivedTitle")}</p>
            <p className="text-sm text-green-800 leading-relaxed">{t("billing.waivedNotice")}</p>
          </div>
        </div>

        {/* Tier comparison — informational only */}
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">{t("billing.plansOverview")}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{t("billing.plansPreviewBefore")}<strong>Standard</strong>{t("billing.plansPreviewAfter")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {TIER_ORDER.map((id) => {
            const tier = TIERS[id];
            const featured = id === "middle";
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                className={`text-left rounded-2xl border-2 p-5 transition-all ${
                  selected === id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {featured && (
                  <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                    {t("billing.mostPopular")}
                  </span>
                )}
                <div className="font-serif text-xl font-bold text-foreground mb-0.5">{tier.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{tier.tagline}</div>
                <div className="text-2xl font-bold text-foreground mb-4">
                  ${tier.priceMonthly.toFixed(2)}<span className="text-sm font-normal text-muted-foreground"> {t("billing.month")}</span>
                </div>
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t("billing.freeAccessNotice")}
        </p>
      </div>
    </Layout>
  );
}
