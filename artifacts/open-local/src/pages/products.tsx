import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearch, useLocation } from "wouter";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { motion } from "framer-motion";
import { Search, Tag, Filter, Heart, LocateFixed, Loader2, X, MapPin } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListProducts, useListCategories, useListVendors } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useProximity, haversineMiles, PROXIMITY_PICKS, PROXIMITY_LABELS } from "@/hooks/use-proximity";

export default function Products() {
  const { t } = useTranslation();
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);
  const initialListingType = searchParams.get("listingType") || "all";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [listingType, setListingType] = useState<string>(initialListingType);
  const { userPos, radius, setRadius, locating, locationError, locate, clear } = useProximity();

  const { isFavoriteProduct, toggleProduct } = useFavorites();
  const { data: vendors } = useListVendors();

  useEffect(() => {
    const newParams = new URLSearchParams(searchString);
    if (listingType === "all") {
      newParams.delete("listingType");
    } else {
      newParams.set("listingType", listingType);
    }
    const newSearchString = newParams.toString();
    const currentPath = window.location.pathname;
    setLocation(`${currentPath}${newSearchString ? `?${newSearchString}` : ""}`);
  }, [listingType, setLocation]);

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: selectedCategory || undefined,
    ...(listingType !== "all" ? { listingType } : {})
  } as any); // using any here because the generated type might not have listingType if it wasn't fully synced, but orval fetch passes generic keys

  const { data: categories } = useListCategories();

  useSearchLogger(search, "products", products?.length);

  // Build vendorId → lat/lng lookup
  const vendorById = useMemo(() => {
    const m = new Map<number, { latitude?: number | null; longitude?: number | null }>();
    (vendors ?? []).forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  // Split products into in-radius and beyond when location is known
  type PList = NonNullable<typeof products>;
  const { inRadius: productsInRadius, beyond: productsBeyond } = useMemo<{ inRadius: PList; beyond: PList }>(() => {
    if (!userPos || !products) return { inRadius: products ?? [], beyond: [] };
    const inR: PList = [];
    const out: PList = [];
    for (const p of products) {
      const v = vendorById.get(p.vendorId);
      if (!v?.latitude || !v?.longitude) { out.push(p); continue; }
      const dist = haversineMiles(userPos.latitude, userPos.longitude, v.latitude, v.longitude);
      (dist <= radius ? inR : out).push(p);
    }
    return { inRadius: inR, beyond: out };
  }, [products, userPos, radius, vendorById]);

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-5xl font-serif font-bold text-foreground mb-4">{t("products.title")}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl font-sans">
            {t("products.subtitle")}
          </p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            {/* Near Me */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <LocateFixed className="w-4 h-4" /> {t("common.nearMe")}
              </h3>
              {!userPos ? (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={locate} disabled={locating}>
                  {locating ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("common.locating")}</> : <><LocateFixed className="w-4 h-4" /> {t("common.useMyLocation")}</>}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide">{t("common.radius")}</span>
                    <button onClick={clear} className="hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> {t("common.clear")}</button>
                  </div>
                  <div className="flex gap-1.5">
                    {PROXIMITY_PICKS.map((r) => (
                      <button key={r} onClick={() => setRadius(r)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${radius === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                        {PROXIMITY_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("products.withinMi", { n: productsInRadius.length })}</p>
                </div>
              )}
              {locationError && <p className="text-xs text-amber-600">{locationError}</p>}
            </div>

            <div className="space-y-4">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <Search className="w-4 h-4" /> Search
              </h3>
              <Input 
                placeholder={t("products.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <Tag className="w-4 h-4" /> {t("products.listingType")}
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={listingType === "all" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
                  onClick={() => setListingType("all")}
                >
                  {t("common.all")}
                </Badge>
                <Badge 
                  variant={listingType === "batch_drop" ? "default" : "outline"}
                  className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200 data-[state=on]:bg-amber-500"
                  style={listingType === "batch_drop" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("batch_drop")}
                >
                  {t("products.freshBatches")}
                </Badge>
                <Badge 
                  variant={listingType === "surplus" ? "default" : "outline"}
                  className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200"
                  style={listingType === "surplus" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("surplus")}
                >
                  {t("products.marketSurplus")}
                </Badge>
                <Badge 
                  variant={listingType === "pre_order" ? "default" : "outline"}
                  className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200"
                  style={listingType === "pre_order" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("pre_order")}
                >
                  {t("products.preOrders")}
                </Badge>
              </div>
            </div>

            {categories && categories.productCategories.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" /> {t("common.category")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
                    onClick={() => setSelectedCategory(null)}
                  >
                    {t("common.all")}
                  </Badge>
                  {categories.productCategories.map((c) => (
                    <Badge 
                      key={c.name}
                      variant={selectedCategory === c.name ? "default" : "outline"}
                      className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
                      onClick={() => setSelectedCategory(c.name)}
                    >
                      {c.name} ({c.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full" />)}
              </div>
            ) : products && products.length > 0 ? (
              <div className="space-y-8">
                {/* In-radius grid */}
                {productsInRadius.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {productsInRadius.map((product, i) => (
                      <ProductCard key={product.id} product={product} i={i} isFav={isFavoriteProduct(product.id)} toggle={() => toggleProduct(product.id)} />
                    ))}
                  </div>
                )}

                {/* "Beyond X mi" divider */}
                {userPos && productsBeyond.length > 0 && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      {t("products.beyondMi", { n: PROXIMITY_LABELS[radius], count: productsBeyond.length })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Beyond grid */}
                {productsBeyond.length > 0 && (
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${userPos ? "opacity-60" : ""}`}>
                    {productsBeyond.map((product, i) => (
                      <ProductCard key={product.id} product={product} i={i} isFav={isFavoriteProduct(product.id)} toggle={() => toggleProduct(product.id)} />
                    ))}
                  </div>
                )}

                {/* No nearby results */}
                {userPos && productsInRadius.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t("products.noWithinMi", { n: PROXIMITY_LABELS[radius] })}</p>
                    <p className="text-xs mt-1">{t("products.showingAll", { n: productsBeyond.length })}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/50 border border-border">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">{t("products.noGoods")}</h3>
                <p className="text-muted-foreground">{t("common.noResultsTryAdjusting")}</p>
                {(search || selectedCategory || listingType !== "all") && (
                  <button 
                    onClick={() => { setSearch(""); setSelectedCategory(null); setListingType("all"); }}
                    className="mt-4 text-primary hover:underline font-medium"
                  >
                    {t("common.clearAllFilters")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

type ProductItem = {
  id: number; name: string; vendorName: string; priceCents: number; unit: string;
  imageUrl: string; listingType: string; inStock: boolean;
  originalPriceCents?: number | null; availableUntil?: string | null;
};

function ProductCard({ product, i, isFav, toggle }: { product: ProductItem; i: number; isFav: boolean; toggle: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Link href={`/products/${product.id}`} className="group block h-full">
        <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
          <button onClick={(e) => { e.preventDefault(); toggle(); }} className="absolute top-3 right-3 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform">
            <Heart className="w-5 h-5" fill={isFav ? "currentColor" : "none"} />
          </button>
          <div className="aspect-square w-full relative overflow-hidden bg-muted">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Tag className="w-12 h-12 opacity-20" /></div>
            )}
            {product.listingType === "batch_drop" && <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">{t("common.freshBatch")}</div>}
            {product.listingType === "surplus" && <div className="absolute top-2 left-2 bg-green-100 text-green-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-green-200">{t("common.marketSurplus")}</div>}
            {product.listingType === "pre_order" && <div className="absolute top-2 left-2 bg-blue-50 text-blue-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-blue-200">{t("common.preOrder")}</div>}
            {!product.inStock && <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2 py-1 uppercase tracking-wider font-bold">{t("common.soldOut")}</div>}
          </div>
          <CardContent className="p-4 flex-1 flex flex-col">
            <div className="text-xs text-muted-foreground mb-1">{product.vendorName}</div>
            <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
            <div className="mt-auto flex justify-between items-center pt-4">
              <span className="font-serif font-medium text-foreground">
                ${(product.priceCents / 100).toFixed(2)}
                {product.listingType === "surplus" && product.originalPriceCents && (
                  <span className="text-muted-foreground line-through ml-2 text-sm">${(product.originalPriceCents / 100).toFixed(2)}</span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">{t("common.perUnit", { unit: product.unit })}</span>
            </div>
            {product.availableUntil && <div className="text-xs text-muted-foreground mt-2">{t("common.availableUntil", { date: new Date(product.availableUntil).toLocaleDateString() })}</div>}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
