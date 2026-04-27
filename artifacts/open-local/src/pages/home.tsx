import { useListFeaturedVendors, useListFeaturedProducts, useGetMarketplaceStats, useListCategories, useListLocations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Store, Tag } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetMarketplaceStats();
  const { data: featuredVendors, isLoading: vendorsLoading } = useListFeaturedVendors();
  const { data: featuredProducts, isLoading: productsLoading } = useListFeaturedProducts();
  const { data: categories } = useListCategories();
  const { data: locations } = useListLocations();

  return (
    <Layout>
      <div className="w-full">
        {/* Hero Section */}
        <section className="relative w-full min-h-[70vh] flex items-center justify-center bg-primary/5 border-b border-border overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("/noise.png")' }}></div>
          <div className="container max-w-6xl mx-auto px-4 py-20 relative z-10 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground mb-6 leading-tight max-w-4xl">
                The public square for the <span className="italic text-primary">small-batch economy.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto font-sans">
                A place where a third-generation orchard, a one-woman ceramics studio, and a microbrewery share the same shelf. Real people, real places, real goods.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="/products" className="bg-primary text-primary-foreground px-8 py-4 rounded-md font-medium text-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                  Browse Goods <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/vendors" className="bg-transparent border border-primary text-primary px-8 py-4 rounded-md font-medium text-lg hover:bg-primary/5 transition-colors">
                  Meet the Producers
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-background border-b border-border">
          <div className="container max-w-6xl mx-auto px-4">
            {statsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border">
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-serif font-bold text-foreground">{stats.vendorCount}</span>
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-2">Independent Vendors</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-serif font-bold text-foreground">{stats.productCount}</span>
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-2">Unique Products</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-serif font-bold text-foreground">{stats.locationCount}</span>
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-2">Local Regions</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className="text-4xl font-serif font-bold text-foreground">{stats.categoryCount}</span>
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-medium mt-2">Craft Categories</span>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Featured Vendors */}
        <section className="py-24 bg-card">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-foreground">Featured Producers</h2>
                <p className="text-muted-foreground mt-2">The hands behind the goods.</p>
              </div>
              <Link href="/vendors" className="hidden sm:inline-flex items-center gap-1 text-primary font-medium hover:underline">
                View all vendors <ArrowRight className="w-4 h-4" />
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
                      <Card className="h-full overflow-hidden border-border bg-background hover-elevate transition-all duration-300 rounded-none">
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
        <section className="py-24 bg-background border-t border-border">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-serif font-bold text-foreground">Market Highlights</h2>
                <p className="text-muted-foreground mt-2">Small-batch goods fresh from the source.</p>
              </div>
              <Link href="/products" className="hidden sm:inline-flex items-center gap-1 text-primary font-medium hover:underline">
                Browse all goods <ArrowRight className="w-4 h-4" />
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
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-none flex flex-col">
                        <div className="aspect-square w-full relative overflow-hidden bg-muted">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Tag className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col">
                          <div className="text-xs text-muted-foreground mb-1">{product.vendorName}</div>
                          <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                          <div className="mt-auto flex justify-between items-center pt-4">
                            <span className="font-serif font-medium text-foreground">${(product.priceCents / 100).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">per {product.unit}</span>
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

      </div>
    </Layout>
  );
}
