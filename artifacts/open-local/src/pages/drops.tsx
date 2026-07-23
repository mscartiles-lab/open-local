import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Zap, Clock, TrendingDown, ArrowRight, Tag } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ListingKey = "batch_drop" | "pre_order" | "surplus";

const TYPES = [
  {
    key: "batch_drop" as ListingKey,
    label: "Batch Drops",
    blurb: "Fresh releases just out of the oven, kiln, or kitchen — grab them before they're gone.",
    icon: Zap,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    activeBg: "bg-amber-600",
    badge: "bg-amber-100 text-amber-800",
    dotColor: "#d97706",
  },
  {
    key: "pre_order" as ListingKey,
    label: "Pre-Orders",
    blurb: "Reserve your spot for upcoming market pickups before the vendor is sold out.",
    icon: Clock,
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    activeBg: "bg-sky-600",
    badge: "bg-sky-100 text-sky-800",
    dotColor: "#0284c7",
  },
  {
    key: "surplus" as ListingKey,
    label: "Surplus",
    blurb: "End-of-market leftovers at a discount. Help vendors reduce waste while saving money.",
    icon: TrendingDown,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    activeBg: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
    dotColor: "#059669",
  },
] as const;

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DropsPage() {
  const [active, setActive] = useState<ListingKey>("batch_drop");
  const { data: allProducts, isLoading } = useListProducts();

  const typeConfig = TYPES.find((t) => t.key === active)!;
  const Icon = typeConfig.icon;

  const products = useMemo(
    () => (allProducts ?? []).filter((p) => p.listingType === active && p.inStock),
    [allProducts, active],
  );

  return (
    <Layout>
      {/* Header */}
      <div className="border-b border-border bg-muted py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
            Open Local
          </p>
          <h1 className="font-serif text-5xl font-bold text-foreground mb-3">
            Exclusive Drops &amp; Pre-Orders
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Special listings from local producers — fresh batch drops, upcoming market pre-orders, and end-of-day surplus.
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        {/* Type filter cards */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {TYPES.map((t) => {
            const TIcon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={cn(
                  "rounded-xl border p-5 text-left transition-all",
                  isActive
                    ? `${t.bg} ring-2 ring-offset-2`
                    : "border-border bg-card hover:bg-muted",
                )}

              >
                <div className={cn("flex items-center gap-2 mb-2")}>
                  <div
                    className={cn("flex h-8 w-8 items-center justify-center rounded-full", isActive ? t.activeBg : "bg-muted")}
                  >
                    <TIcon className={cn("h-4 w-4", isActive ? "text-white" : "text-muted-foreground")} />
                  </div>
                  <p className={cn("font-serif text-lg font-bold", isActive ? t.color : "text-foreground")}>
                    {t.label}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.blurb}</p>
              </button>
            );
          })}
        </div>

        {/* Results header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", typeConfig.activeBg)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-foreground">{typeConfig.label}</h2>
            <p className="text-sm text-muted-foreground">{typeConfig.blurb}</p>
          </div>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted px-8 py-20 text-center">
            <Icon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-serif text-2xl font-bold text-foreground">
              No {typeConfig.label.toLowerCase()} right now
            </p>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
              {active === "batch_drop" && "Vendors post fresh batches throughout the day and on market mornings. Check back soon."}
              {active === "pre_order" && "Vendors open pre-orders ahead of upcoming markets. Check back as market day approaches."}
              {active === "surplus" && "Vendors post leftover items after markets. Check back on market evenings."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <Link key={p.id} href={`/vendors/${p.vendorId}`}>
                <div className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-20 w-20 shrink-0 rounded-lg object-cover border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1.5", typeConfig.badge)}>
                      <Icon className="h-2.5 w-2.5" />
                      {typeConfig.label.replace(/s$/, "")}
                    </span>
                    <p className="font-serif text-base font-bold text-foreground leading-tight mb-1 line-clamp-2">
                      {p.name}
                    </p>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("font-bold text-base", typeConfig.color)}>{formatPrice(p.priceCents)}</span>
                      <span className="text-xs text-muted-foreground">/{p.unit}</span>
                      {p.originalPriceCents && p.originalPriceCents > p.priceCents && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(p.originalPriceCents)}</span>
                      )}
                    </div>
                    {p.availableUntil && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Until {new Date(p.availableUntil).toLocaleDateString()}
                      </p>
                    )}
                    {p.vendorName && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        {p.vendorName}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 self-center shrink-0 text-muted-foreground group-hover:text-primary transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
