import { useState, useMemo } from "react";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListProducts } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Tag, Percent, Clock, ShoppingBag, ArrowRight } from "lucide-react";

export default function Surplus() {
  const { data: allProducts, isLoading } = useListProducts();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

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

  return (
    <Layout>
      {/* Hero */}
      <div className="relative bg-amber-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#fff,#fff_1px,transparent_1px,transparent_12px)]" />
        <div className="relative container max-w-6xl mx-auto px-4 py-14">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Percent className="w-3 h-3" />
              Final Sale
            </span>
            <span className="inline-flex items-center gap-1.5 bg-amber-600/40 text-amber-200 text-xs font-semibold px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              While supplies last
            </span>
          </div>
          <h1 className="text-5xl font-serif font-bold text-white mb-3">
            Surplus & Final Sale
          </h1>
          <p className="text-amber-200 text-lg max-w-xl font-sans">
            Excess inventory, end-of-season goods, and clearance items from independent local producers — deeply discounted, while they last.
          </p>
          {totalSavings > 0 && (
            <p className="mt-4 text-amber-300 font-medium text-sm">
              Up to ${(totalSavings / 100).toFixed(2)} in savings available right now.
            </p>
          )}
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search surplus items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
              <SelectItem value="discount">Biggest discount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Count */}
        <p className="text-sm text-muted-foreground mb-6">
          {isLoading ? "Loading…" : `${surplusProducts.length} item${surplusProducts.length !== 1 ? "s" : ""} on sale`}
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
            <p className="text-lg font-medium">No surplus items right now.</p>
            <p className="text-sm mt-1">Check back soon — vendors add clearance items regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {surplusProducts.map((product, i) => {
              const savingsPercent = product.originalPriceCents
                ? Math.round(((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100)
                : null;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/vendors/${product.vendorSlug}`}>
                    <div className="group cursor-pointer bg-background border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="relative aspect-square overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {savingsPercent && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            -{savingsPercent}%
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-amber-950/80 text-amber-200 text-xs font-semibold px-2 py-1 rounded-full">
                          Final sale
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">{product.vendorName} · {product.vendorLocation}</p>
                        <h3 className="font-serif font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-foreground">
                            ${(product.priceCents / 100).toFixed(2)}
                          </span>
                          {product.originalPriceCents && (
                            <span className="text-sm text-muted-foreground line-through">
                              ${(product.originalPriceCents / 100).toFixed(2)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">/ {product.unit}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                          View vendor <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
