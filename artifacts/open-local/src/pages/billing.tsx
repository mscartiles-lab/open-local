import { useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles, Clock, ExternalLink, Loader2, CheckCircle, Store } from "lucide-react";
import { Link } from "wouter";
import { TierPicker } from "@/components/billing/TierPicker";
import { TIERS, type TierId } from "@/lib/tiers";

interface PricingInfo {
  vendor: {
    trialDays: number;
    earlyBirdRemaining: number;
    earlyBirdTotal: number;
    earlyBirdTrialDays: number;
    standardTrialDays: number;
  };
  business: {
    trialDays: number;
    earlyBirdRemaining: number;
    earlyBirdTotal: number;
  };
}

interface VendorStatus {
  status: string;
  trialDays?: number;
  trialEnd?: number | null;
  tier?: TierId;
  priceMonthly?: number;
}

const SESSION_KEY = "ol_session";

function getToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export default function Billing() {
  const { user, isLoading } = useUser();
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [status, setStatus] = useState<VendorStatus | null>(null);
  const [tier, setTier] = useState<TierId>("middle");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState(false);

  useEffect(() => {
    fetch("/api/billing/pricing")
      .then((r) => {
        if (!r.ok) throw new Error("pricing fetch failed");
        return r.json();
      })
      .then(setPricing)
      .catch(() => setPricingError(true));
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;
    fetch("/api/billing/vendor/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("status fetch failed");
        return r.json();
      })
      .then((data: VendorStatus) => {
        setStatus(data);
        if (data.tier) setTier(data.tier);
      })
      .catch(() => {});
  }, [user]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const token = getToken();
      const r = await fetch("/api/billing/vendor/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier }),
      });
      const data = await r.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to start checkout.");
        setCheckoutLoading(false);
      }
    } catch {
      setError("Couldn't reach the billing service. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const token = getToken();
      const r = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await r.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Failed to open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setError("Couldn't reach the billing portal.");
      setPortalLoading(false);
    }
  };

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
          <h1 className="text-3xl font-serif font-bold mb-3">Sign in to manage billing</h1>
          <p className="text-muted-foreground mb-6">You need an Open Local account to subscribe.</p>
          <Link href="/" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
            Back home
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
          <h1 className="text-3xl font-serif font-bold mb-3">Vendor accounts only</h1>
          <p className="text-muted-foreground mb-6">
            Billing is for vendors selling on Open Local. To list your business on the map instead, head to <Link href="/pin-your-business" className="text-primary underline">Pin Your Business</Link>.
          </p>
        </div>
      </Layout>
    );
  }

  const isActive = status?.status === "active" || status?.status === "trialing";
  const trialDays = pricing?.vendor.trialDays ?? 30;
  const earlyBirdLeft = pricing?.vendor.earlyBirdRemaining ?? 0;
  const isEarlyBird = earlyBirdLeft > 0;
  const selectedTier = TIERS[tier];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Vendor billing</h1>
          <p className="text-muted-foreground">Sell your handmade & local goods on Open Local.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {pricingError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            We couldn't load the current trial offer. Plan prices below are still accurate.
          </div>
        )}

        {isActive ? (
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-2xl font-bold text-foreground mb-1">
                  {status?.status === "trialing" ? "Free trial active" : "Subscription active"}
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Current plan: <strong className="text-foreground">{selectedTier.name}</strong> · ${selectedTier.priceMonthly.toFixed(2)}/mo
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {status?.status === "trialing" && status?.trialEnd
                    ? `Your trial ends on ${new Date(status.trialEnd * 1000).toLocaleDateString()}.`
                    : `Next charge: $${selectedTier.priceMonthly.toFixed(2)}.`}
                </p>
                <Button
                  onClick={openPortal}
                  disabled={portalLoading}
                  variant="outline"
                  className="gap-2"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Manage subscription
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border-2 border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Choose your plan</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                {isEarlyBird
                  ? `Early-bird offer: ${trialDays}-day free trial — ${earlyBirdLeft} of ${pricing?.vendor.earlyBirdTotal} spots left.`
                  : `Standard ${trialDays}-day free trial.`}
              </p>
              <TierPicker
                selected={tier}
                onSelect={setTier}
                trialDays={trialDays}
                isEarlyBird={isEarlyBird}
              />
            </div>

            <div className="rounded-2xl border-2 border-border bg-card overflow-hidden mb-6">
              <div className="bg-amber-50 border-b border-border px-6 py-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                    Open Local Vendor Plan — {selectedTier.name}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-serif font-bold text-foreground">${selectedTier.priceMonthly.toFixed(2)}</span>
                    <span className="text-muted-foreground">/ month</span>
                  </div>
                </div>
                {isEarlyBird && trialDays > 0 && (
                  <div className="flex items-center gap-2 text-amber-800 bg-amber-100 px-3 py-1.5 rounded-full text-sm font-semibold">
                    <Clock className="w-4 h-4" /> {trialDays}-day free trial
                  </div>
                )}
              </div>

              <div className="p-6">
                <ul className="space-y-2.5 mb-6">
                  {selectedTier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={startCheckout}
                  disabled={checkoutLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base gap-2"
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Starting checkout…</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> {isEarlyBird ? `Start ${trialDays}-day free trial` : `Subscribe — $${selectedTier.priceMonthly.toFixed(2)}/mo`}</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  {isEarlyBird ? "You won't be charged until your trial ends. " : ""}Cancel anytime from the billing portal.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
