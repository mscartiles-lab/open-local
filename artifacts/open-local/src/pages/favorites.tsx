import { Link } from "wouter";
import { motion } from "framer-motion";
import { Store, Tag, Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useListVendors, useListProducts } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";

export default function Favorites() {
  const { favoriteVendors, favoriteProducts, toggleVendor, toggleProduct, isFavoriteVendor, isFavoriteProduct } = useFavorites();

  const { data: vendors, isLoading: vendorsLoading } = useListVendors();
  const { data: products, isLoading: productsLoading } = useListProducts();

  const savedVendors = vendors?.filter(v => favoriteVendors.includes(v.id)) || [];
  const savedProducts = products?.filter(p => favoriteProducts.includes(p.id)) || [];

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4 flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" fill="currentColor" /> Favorites
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-sans">
            Your saved Florida producers and local goods.
          </p>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Saved Producers */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Saved Producers</h2>
          {vendorsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[300px] w-full" />)}
            </div>
          ) : savedVendors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {savedVendors.map((vendor, i) => (
                <motion.div 
                  key={vendor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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
                        <p className="text-sm text-muted-foreground line-clamp-2">{vendor.tagline || vendor.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/50 border border-border">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">No saved producers</h3>
              <p className="text-muted-foreground mb-6">You haven't saved any producers yet.</p>
              <Button asChild>
                <Link href="/vendors">Browse Producers</Link>
              </Button>
            </div>
          )}
        </section>

        {/* Saved Goods */}
        <section>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Saved Goods</h2>
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[300px] w-full" />)}
            </div>
          ) : savedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {savedProducts.map((product, i) => (
                <motion.div 
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/products/${product.id}`} className="group block h-full">
                    <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
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
          ) : (
            <div className="text-center py-16 bg-muted/50 border border-border">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-serif font-bold text-foreground mb-2">No saved goods</h3>
              <p className="text-muted-foreground mb-6">You haven't saved any goods yet.</p>
              <Button asChild>
                <Link href="/products">Browse Goods</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
