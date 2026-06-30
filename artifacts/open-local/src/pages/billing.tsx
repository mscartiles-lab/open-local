import { useState } from "react";
import Layout from "@/components/layout/Layout";
import { useUser } from "@/context/UserContext";
import { Loader2, CheckCircle, Store, Gift, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { TIERS, TIER_ORDER, type TierId } from "@/lib/tiers";

const WAIVED_NOTICE = "Subscription fees are currently being waived while we grow our community. Enjoy full access to Open Local completely free until further notice — we'll give you plenty of heads-up before anything changes.";

export default function Billing() {
  const { user, isLoading } = useUser();
  const [selected, setSelected] = useState<TierId>("middle");

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
          <h1 className="text-3xl font-serif font-bold mb-3">Sign in to view plans</h1>
          <p className="text-muted-foreground mb-6">You need an Open Local account to view vendor plans.</p>
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
            Billing is for vendors selling on Open Local. To list your business on the map instead, head to{" "}
            <Link href="/pin-your-business" className="text-primary underline">Pin Your Business</Link>.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Vendor plans</h1>
          <p className="text-muted-foreground">Everything included while we build our community together.</p>
        </div>

        {/* Waived notice banner */}
        <div className="mb-8 rounded-2xl border-2 border-green-300 bg-green-50 px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
            <Gift className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-green-900 mb-1">Subscription fees are currently waived 🎉</p>
            <p className="text-sm text-green-800 leading-relaxed">{WAIVED_NOTICE}</p>
          </div>
        </div>

        {/* Tier comparison — informational only */}
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Plans overview</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Here's a preview of the plans we'll offer once subscriptions open. Your tier will be set to <strong>Standard</strong> in the meantime so you get pre-orders and everything you need to sell.</p>

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
                    Most popular
                  </span>
                )}
                <div className="font-serif text-xl font-bold text-foreground mb-0.5">{tier.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{tier.tagline}</div>
                <div className="text-2xl font-bold text-foreground mb-4">
                  ${tier.priceMonthly.toFixed(2)}<span className="text-sm font-normal text-muted-foreground"> / mo</span>
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
          No action needed — you have free access right now. We'll notify you by email before subscriptions go live.
        </p>
      </div>
    </Layout>
  );
}
