import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { motion } from "framer-motion";
import { Search, Tag, Filter, Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";

export default function Products() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(searchString);
  const initialListingType = searchParams.get("listingType") || "all";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [listingType, setListingType] = useState<string>(initialListingType);

  const { isFavoriteProduct, toggleProduct } = useFavorites();

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

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Florida Goods</h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-sans">
            Browse small-batch products straight from the source. Hand-crafted, locally grown, and carefully made across Florida.
          </p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            <div className="space-y-4">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <Search className="w-4 h-4" /> Search
              </h3>
              <Input 
                placeholder="Search products..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <Tag className="w-4 h-4" /> Listing Type
              </h3>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={listingType === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setListingType("all")}
                >
                  All
                </Badge>
                <Badge 
                  variant={listingType === "batch_drop" ? "default" : "outline"}
                  className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-200 data-[state=on]:bg-amber-500"
                  style={listingType === "batch_drop" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("batch_drop")}
                >
                  Fresh Batches
                </Badge>
                <Badge 
                  variant={listingType === "surplus" ? "default" : "outline"}
                  className="cursor-pointer bg-green-100 hover:bg-green-200 text-green-900 border-green-200"
                  style={listingType === "surplus" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("surplus")}
                >
                  Market Surplus
                </Badge>
                <Badge 
                  variant={listingType === "pre_order" ? "default" : "outline"}
                  className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200"
                  style={listingType === "pre_order" ? { backgroundColor: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                  onClick={() => setListingType("pre_order")}
                >
                  Pre-Orders
                </Badge>
              </div>
            </div>

            {categories && categories.productCategories.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Badge>
                  {categories.productCategories.map((c) => (
                    <Badge 
                      key={c.name}
                      variant={selectedCategory === c.name ? "default" : "outline"}
                      className="cursor-pointer"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, i) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/products/${product.id}`} className="group block h-full">
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-none flex flex-col relative">
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleProduct(product.id); }}
                          className="absolute top-3 right-3 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                        >
                          <Heart className="w-5 h-5" fill={isFavoriteProduct(product.id) ? "currentColor" : "none"} />
                        </button>
                        <div className="aspect-square w-full relative overflow-hidden bg-muted">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Tag className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                          {product.listingType === "batch_drop" && (
                            <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">
                              Fresh Batch
                            </div>
                          )}
                          {product.listingType === "surplus" && (
                            <div className="absolute top-2 left-2 bg-green-100 text-green-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-green-200">
                              Market Surplus
                            </div>
                          )}
                          {product.listingType === "pre_order" && (
                            <div className="absolute top-2 left-2 bg-blue-50 text-blue-900 text-xs px-2 py-1 uppercase tracking-wider font-bold border border-blue-200">
                              Pre-Order
                            </div>
                          )}
                          {!product.inStock && (
                            <div className="absolute bottom-2 right-2 bg-background/90 text-foreground text-xs px-2 py-1 uppercase tracking-wider font-bold">
                              Sold Out
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className="text-xs text-muted-foreground mb-1 hover:text-primary transition-colors">
                            {product.vendorName}
                          </div>
                          <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                          <div className="mt-auto flex justify-between items-center pt-4">
                            <span className="font-serif font-medium text-foreground">
                              ${(product.priceCents / 100).toFixed(2)}
                              {product.listingType === "surplus" && product.originalPriceCents && (
                                <span className="text-muted-foreground line-through ml-2 text-sm">${(product.originalPriceCents / 100).toFixed(2)}</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">per {product.unit}</span>
                          </div>
                          {product.availableUntil && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Available until {new Date(product.availableUntil).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/50 border border-border">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">No goods found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                {(search || selectedCategory || listingType !== "all") && (
                  <button 
                    onClick={() => { setSearch(""); setSelectedCategory(null); setListingType("all"); }}
                    className="mt-4 text-primary hover:underline font-medium"
                  >
                    Clear all filters
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
