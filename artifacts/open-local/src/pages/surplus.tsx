import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListProducts, useListVendors } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Tag, Percent, Clock, ShoppingBag, ArrowRight, LocateFixed, Loader2, X, MapPin } from "lucide-react";
import { useProximity, haversineMiles, PROXIMITY_PICKS, PROXIMITY_LABELS } from "@/hooks/use-proximity";

export default function Surplus() {
  const { t } = useTranslation();
  const { data: allProducts, isLoading } = useListProducts();
  const { data: vendors } = useListVendors();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const { userPos, radius, setRadius, locating, locationError, locate, clear } = useProximity();

  // vendorId → lat/lng map
  const vendorById = useMemo(() => {
    const m = new Map<number, { latitude?: number | null; longitude?: number | null }>();
    (vendors ?? []).forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const surplusProducts = useMemo(() => {
    let list = (allProducts ?? []).filter((p) => p.listingType === "surplus" && p.inStock);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }

    return [...list].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "price_asc") return a.priceCents - b.priceCents;
      if (sortBy === "price_desc") return b.priceCents - a.priceCents;
      if (sortBy === "discount") {
        const discountA = a.originalPriceCents ? a.originalPriceCents - a.priceCents : 0;
        const discountB = b.originalPriceCents ? b.originalPriceCents - b.priceCents : 0;
        return discountB - discountA;
      }
      return 0;
    });
  }, [allProducts, search, categoryFilter, sortBy]);

  // Proximity split
  const { surplusNear, surplusBeyond } = useMemo(() => {
    if (!userPos) return { surplusNear: surplusProducts, surplusBeyond: [] as typeof surplusProducts };
    const near: typeof surplusProducts = [];
    const far: typeof surplusProducts = [];
    for (const p of surplusProducts) {
      const v = vendorById.get(p.vendorId);
      if (!v?.latitude || !v?.longitude) { far.push(p); continue; }
      const dist = haversineMiles(userPos.latitude, userPos.longitude, v.latitude, v.longitude);
      (dist <= radius ? near : far).push(p);
    }
    return { surplusNear: near, surplusBeyond: far };
  }, [surplusProducts, userPos, radius, vendorById]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return (allProducts ?? [])
      .filter((p) => p.listingType === "surplus")
      .filter((p) => { if (seen.has(p.category)) return false; seen.add(p.category); return true; })
      .map((p) => p.category)
      .sort();
  }, [allProducts]);

  useSearchLogger(search, "surplus", surplusProducts.length);

  const totalSavings = useMemo(() => {
    return surplusProducts.reduce((acc, p) => {
      if (p.originalPriceCents) return acc + (p.originalPriceCents - p.priceCents);
      return acc;
    }, 0);
  }, [surplusProducts]);

  const n = surplusProducts.length;

  return (
    <Layout>
      {/* Hero */}
      <div className="relative bg-amber-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#fff,#fff_1px,transparent_1px,transparent_12px)]" />
        <div className="relative container max-w-6xl mx-auto px-4 py-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Percent className="w-3 h-3" />
              {t("surplus.finalSale")}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-600/40 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {t("surplus.whileSuppliesLast")}
            </span>
          </div>
          <h1 className="text-5xl font-serif font-bold text-white mb-3">
            {t("surplus.title")}
          </h1>
          <p className="text-amber-200 text-lg max-w-xl font-sans">
            {t("surplus.subtitle")}
          </p>
          {totalSavings > 0 && (
            <p className="mt-4 text-amber-300 font-medium text-sm">
              {t("surplus.savingsAvailable", { pct: (totalSavings / 100).toFixed(2) })}
            </p>
          )}
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t("surplus.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t("common.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allCategories")}</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("surplus.sortNewest")}</SelectItem>
              <SelectItem value="price_asc">{t("surplus.sortPriceLow")}</SelectItem>
              <SelectItem value="price_desc">{t("surplus.sortPriceHigh")}</SelectItem>
              <SelectItem value="discount">{t("surplus.sortBiggestDiscount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Near Me bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {!userPos ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={locate} disabled={locating}>
              {locating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("common.locating")}</>
                : <><LocateFixed className="w-4 h-4" /> {t("surplus.nearMe")}</>
              }
            </Button>
          ) : (
            <>
              <div className="flex gap-1.5">
                {PROXIMITY_PICKS.map((r) => (
                  <button key={r} onClick={() => setRadius(r)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${radius === r ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary"}`}>
                    {PROXIMITY_LABELS[r]}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{surplusNear.length} nearby</span>
              <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> {t("surplus.clearLocation")}</button>
            </>
          )}
          {locationError && <p className="text-xs text-amber-600">{locationError}</p>}
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {isLoading
            ? t("common.loading")
            : n === 1
            ? t("surplus.itemOnSale")
            : t("surplus.itemsOnSale", { n })
          }
        </p>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : surplusProducts.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-25" />
            <p className="text-lg font-medium">{t("surplus.noItems")}</p>
            <p className="text-sm mt-1">{t("surplus.noItemsDescription")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* In-radius grid */}
            {surplusNear.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {surplusNear.map((product, i) => <SurplusCard key={product.id} product={product} i={i} t={t} />)}
              </div>
            )}

            {/* Beyond divider */}
            {userPos && surplusBeyond.length > 0 && (
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  Beyond {PROXIMITY_LABELS[radius]} · {surplusBeyond.length} more
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Beyond grid */}
            {surplusBeyond.length > 0 && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${userPos ? "opacity-60" : ""}`}>
                {surplusBeyond.map((product, i) => <SurplusCard key={product.id} product={product} i={i} t={t} />)}
              </div>
            )}

            {/* No nearby */}
            {userPos && surplusNear.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No surplus items within {PROXIMITY_LABELS[radius]}.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

type SurplusProduct = {
  id: number; name: string; vendorName: string; vendorLocation: string; vendorSlug: string;
  priceCents: number; originalPriceCents?: number | null; unit: string; imageUrl: string;
};

function SurplusCard({ product, i, t }: {
  product: SurplusProduct;
  i: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const savingsPercent = product.originalPriceCents
    ? Math.round(((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100)
    : null;
  return (
    <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
      <Link href={`/vendors/${product.vendorSlug}`}>
        <div className="group cursor-pointer bg-background border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
          <div className="relative aspect-square overflow-hidden">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {savingsPercent && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{t("surplus.discount", { pct: savingsPercent })}</div>
            )}
            <div className="absolute top-2 right-2 bg-amber-950/80 text-amber-200 text-xs font-semibold px-2 py-1 rounded-full">{t("surplus.finalSale")}</div>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-1">{product.vendorName} · {product.vendorLocation}</p>
            <h3 className="font-serif font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-foreground">${(product.priceCents / 100).toFixed(2)}</span>
              {product.originalPriceCents && (
                <span className="text-sm text-muted-foreground line-through">${(product.originalPriceCents / 100).toFixed(2)}</span>
              )}
              <span className="text-xs text-muted-foreground">/ {product.unit}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
              {t("surplus.viewVendor")} <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
