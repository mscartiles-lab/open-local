import { useEffect } from "react";
import { useListFeaturedVendors, useListFeaturedProducts, useGetMarketplaceStats, useListCategories, useListLocations, useGetLocalNowFeed } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Store, Tag, Heart, Flame, Percent, CalendarClock } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useFavorites } from "@/hooks/use-favorites";
import HeroMap from "@/components/HeroMap";
import { useUser } from "@/context/UserContext";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetMarketplaceStats();
  const { data: featuredVendors, isLoading: vendorsLoading } = useListFeaturedVendors();
  const { data: featuredProducts, isLoading: productsLoading } = useListFeaturedProducts();
  const { data: localNowFeed, isLoading: localNowFeedLoading } = useGetLocalNowFeed();
  const { isFavoriteVendor, isFavoriteProduct, toggleVendor, toggleProduct } = useFavorites();
  const { user, isLoading: userLoading, openOnboarding } = useUser();

  useEffect(() => {
    if (userLoading || user) return;
    if (sessionStorage.getItem("ol:onboardingShown") === "1") return;
    const t = setTimeout(() => {
      sessionStorage.setItem("ol:onboardingShown", "1");
      openOnboarding();
    }, 600);
    return () => clearTimeout(t);
  }, [user, userLoading, openOnboarding]);

  return (
    <Layout>
      <div className="w-full">
        {/* Hero Map */}
        <HeroMap />

        {/* Stats */}
        <section className="py-10 bg-background border-b border-border">
          <div className="container max-w-6xl mx-auto px-4">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center text-center bg-card border border-border rounded-2xl py-6 px-4 shadow-sm">
                  <span className="text-5xl font-serif font-bold text-primary">{stats.vendorCount}</span>
                  <span className="text-sm text-muted-foreground font-semibold mt-2">Florida Vendors</span>
                </div>
                <div className="flex flex-col items-center text-center bg-card border border-border rounded-2xl py-6 px-4 shadow-sm">
                  <span className="text-5xl font-serif font-bold text-primary">{stats.productCount}</span>
                  <span className="text-sm text-muted-foreground font-semibold mt-2">Unique Products</span>
                </div>
                <div className="flex flex-col items-center text-center bg-card border border-border rounded-2xl py-6 px-4 shadow-sm">
                  <span className="text-5xl font-serif font-bold text-primary">{stats.locationCount}</span>
                  <span className="text-sm text-muted-foreground font-semibold mt-2">Local Regions</span>
                </div>
                <div className="flex flex-col items-center text-center bg-card border border-border rounded-2xl py-6 px-4 shadow-sm">
                  <span className="text-5xl font-serif font-bold text-primary">{stats.categoryCount}</span>
                  <span className="text-sm text-muted-foreground font-semibold mt-2">Craft Categories</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Local Near Me Now */}
        <section className="py-16 bg-card border-b border-border">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="mb-10">
              <h2 className="text-4xl font-serif font-bold text-foreground">Local Near Me Now</h2>
              <p className="text-lg text-muted-foreground mt-2">Fresh drops, market surplus, and pre-orders.</p>
            </div>

            {localNowFeedLoading ? (
              <div className="space-y-12">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-8 w-48 mb-6" />
                    <div className="flex gap-6 overflow-hidden">
                      {[...Array(4)].map((_, j) => <Skeleton key={j} className="h-[300px] w-[280px] shrink-0" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : localNowFeed ? (
              <div className="space-y-16">
                {/* Fresh Batches */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                      <Flame className="w-6 h-6 text-amber-500" /> Fresh Batches Today
                    </h3>
                    <Link href="/products?listingType=batch_drop" className="flex items-center gap-1.5 text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl transition-all">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </div>
                  {localNowFeed.batchDrops.length > 0 ? (
                    <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
                      {localNowFeed.batchDrops.map(product => (
                        <div key={product.id} className="w-[280px] shrink-0 snap-start">
                          <Link href={`/products/${product.id}`} className="group block h-full">
                            <Card className="h-full overflow-hidden border-border bg-background hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
                              <button 
                                onClick={(e) => { e.preventDefault(); toggleProduct(product.id); }}
                                className="absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                              >
                                <Heart className="w-4 h-4" fill={isFavoriteProduct(product.id) ? "currentColor" : "none"} />
                              </button>
                              <div className="aspect-square w-full relative overflow-hidden bg-muted">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Tag className="w-12 h-12 opacity-20" />
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">
                                  Fresh Batch
                                </div>
                              </div>
                              <CardContent className="p-4 flex-1 flex flex-col">
                                <div className="text-xs text-muted-foreground mb-1">{product.vendorName}</div>
                                <h4 className="text-base font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h4>
                                <div className="mt-auto flex justify-between items-center pt-2">
                                  <span className="font-serif font-medium">${(product.priceCents / 100).toFixed(2)}</span>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-background border border-border text-muted-foreground text-sm flex items-center gap-2">
                      <Flame className="w-4 h-4 opacity-50" /> No fresh batches reported right now. Check back later!
                    </div>
                  )}
                </div>

                {/* Market Surplus */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                      <Percent className="w-6 h-6 text-amber-600" /> Market Surplus
                    </h3>
                    <Link href="/products?listingType=surplus" className="flex items-center gap-1.5 text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl transition-all">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </div>
                  {localNowFeed.surplus.length > 0 ? (
                    <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
                      {localNowFeed.surplus.map(product => (
                        <div key={product.id} className="w-[280px] shrink-0 snap-start">
                          <Link href={`/products/${product.id}`} className="group block h-full">
                            <Card className="h-full overflow-hidden border-border bg-background hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
                              <button 
                                onClick={(e) => { e.preventDefault(); toggleProduct(product.id); }}
                                className="absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                              >
                                <Heart className="w-4 h-4" fill={isFavoriteProduct(product.id) ? "currentColor" : "none"} />
                              </button>
                              <div className="aspect-square w-full relative overflow-hidden bg-muted">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Tag className="w-12 h-12 opacity-20" />
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">
                                  Market Surplus
                                </div>
                              </div>
                              <CardContent className="p-4 flex-1 flex flex-col">
                                <div className="text-xs text-muted-foreground mb-1">{product.vendorName}</div>
                                <h4 className="text-base font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h4>
                                <div className="mt-auto flex flex-col pt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-serif font-medium text-foreground">${(product.priceCents / 100).toFixed(2)}</span>
                                    {product.originalPriceCents && (
                                      <span className="text-sm text-muted-foreground line-through">${(product.originalPriceCents / 100).toFixed(2)}</span>
                                    )}
                                  </div>
                                  {product.originalPriceCents && (
                                    <div className="text-[10px] text-amber-700 font-bold mt-1">
                                      {Math.round(((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100)}% OFF
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-background border border-border text-muted-foreground text-sm flex items-center gap-2">
                      <Percent className="w-4 h-4 opacity-50" /> Markets are cleared out for now!
                    </div>
                  )}
                </div>

                {/* Pre Orders */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                      <CalendarClock className="w-6 h-6 text-blue-600" /> Reserve for Pickup
                    </h3>
                    <Link href="/products?listingType=pre_order" className="flex items-center gap-1.5 text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl transition-all">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
                  </div>
                  {localNowFeed.preOrders.length > 0 ? (
                    <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory hide-scrollbar">
                      {localNowFeed.preOrders.map(product => (
                        <div key={product.id} className="w-[280px] shrink-0 snap-start">
                          <Link href={`/products/${product.id}`} className="group block h-full">
                            <Card className="h-full overflow-hidden border-border bg-background hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
                              <button 
                                onClick={(e) => { e.preventDefault(); toggleProduct(product.id); }}
                                className="absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                              >
                                <Heart className="w-4 h-4" fill={isFavoriteProduct(product.id) ? "currentColor" : "none"} />
                              </button>
                              <div className="aspect-square w-full relative overflow-hidden bg-muted">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Tag className="w-12 h-12 opacity-20" />
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 bg-blue-50 text-blue-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-blue-200">
                                  Pre-Order
                                </div>
                              </div>
                              <CardContent className="p-4 flex-1 flex flex-col">
                                <div className="text-xs text-muted-foreground mb-1">{product.vendorName}</div>
                                <h4 className="text-base font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h4>
                                <div className="mt-auto flex flex-col pt-2">
                                  <span className="font-serif font-medium">${(product.priceCents / 100).toFixed(2)}</span>
                                  {product.availableUntil && (
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                      Until {new Date(product.availableUntil).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-background border border-border text-muted-foreground text-sm flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 opacity-50" /> No pre-orders available currently.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Featured Vendors */}
        <section className="py-16 bg-background">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-serif font-bold text-foreground">Featured Producers</h2>
                <p className="text-lg text-muted-foreground mt-2">The hands behind the goods.</p>
              </div>
              <Link href="/vendors" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-5 py-2.5 rounded-xl transition-all">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {vendorsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredVendors?.slice(0, 3).map((vendor, i) => (
                  <motion.div 
                    key={vendor.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link href={`/vendors/${vendor.id}`} className="group block h-full">
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-2xl relative">
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleVendor(vendor.id); }}
                          className="absolute top-3 right-3 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                        >
                          <Heart className="w-5 h-5" fill={isFavoriteVendor(vendor.id) ? "currentColor" : "none"} />
                        </button>
                        <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted">
                          {vendor.imageUrl ? (
                            <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Store className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">{vendor.name}</h3>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{vendor.category}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{vendor.tagline || vendor.description}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" /> {vendor.location}, {vendor.region}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Featured Products */}
        <section className="py-16 bg-card border-t border-border">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-serif font-bold text-foreground">Market Highlights</h2>
                <p className="text-lg text-muted-foreground mt-2">Small-batch goods fresh from the source.</p>
              </div>
              <Link href="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-5 py-2.5 rounded-xl transition-all">
                Browse all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts?.slice(0, 4).map((product, i) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link href={`/products/${product.id}`} className="group block h-full">
                      <Card className="h-full overflow-hidden border-border bg-background hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
                        <button 
                          onClick={(e) => { e.preventDefault(); toggleProduct(product.id); }}
                          className="absolute top-2 right-2 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
                        >
                          <Heart className="w-4 h-4" fill={isFavoriteProduct(product.id) ? "currentColor" : "none"} />
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
                            <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">
                              Fresh Batch
                            </div>
                          )}
                          {product.listingType === "surplus" && (
                            <div className="absolute top-2 left-2 bg-amber-100 text-amber-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-amber-200">
                              Market Surplus
                            </div>
                          )}
                          {product.listingType === "pre_order" && (
                            <div className="absolute top-2 left-2 bg-blue-50 text-blue-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-blue-200">
                              Pre-Order
                            </div>
                          )}
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
            )}
          </div>
        </section>

      </div>
    </Layout>
  );
}
