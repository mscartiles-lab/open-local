import { useParams } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Globe, Mail, Clock, Store, Tag, Heart, Phone, Instagram, Facebook } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useGetVendor, useListVendorProducts, getGetVendorQueryKey, getListVendorProductsQueryKey } from "@workspace/api-client-react";
import NotFound from "./not-found";
import { useFavorites } from "@/hooks/use-favorites";

export default function VendorDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { isFavoriteVendor, toggleVendor, isFavoriteProduct, toggleProduct } = useFavorites();

  const { data: vendor, isLoading: vendorLoading, error: vendorError } = useGetVendor(id, {
    query: {
      enabled: !isNaN(id),
      queryKey: getGetVendorQueryKey(id)
    }
  });

  const { data: products, isLoading: productsLoading } = useListVendorProducts(id, {
    query: {
      enabled: !isNaN(id),
      queryKey: getListVendorProductsQueryKey(id)
    }
  });

  if (isNaN(id) || (vendorError && (vendorError as any).status === 404)) {
    return <NotFound />;
  }

  return (
    <Layout>
      {vendorLoading ? (
        <div>
          <Skeleton className="w-full h-[40vh]" />
          <div className="container max-w-4xl mx-auto px-4 -mt-16 relative z-10">
            <Skeleton className="w-full h-64" />
          </div>
        </div>
      ) : vendor ? (
        <div className="w-full">
          {/* Cover / Hero */}
          <div className="w-full h-[40vh] relative bg-muted border-b border-border">
            <button 
              onClick={() => toggleVendor(vendor.id)}
              className="absolute top-8 right-8 z-20 p-4 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform"
            >
              <Heart className="w-8 h-8" fill={isFavoriteVendor(vendor.id) ? "currentColor" : "none"} />
            </button>
            {vendor.imageUrl ? (
              <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="w-24 h-24 text-muted-foreground opacity-20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>

          <div className="container max-w-4xl mx-auto px-4 -mt-16 relative z-10 mb-16">
            <Card className="bg-background border-border shadow-xl rounded-2xl">
              <CardContent className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
                  <div>
                    <div className="text-xs font-medium text-primary uppercase tracking-wider mb-2">{vendor.category}</div>
                    <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{vendor.name}</h1>
                    <p className="text-xl text-muted-foreground font-serif italic mb-6">{vendor.tagline}</p>
                    
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {vendor.location}, {vendor.region}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Est. {vendor.established}
                      </div>
                      {vendor.websiteUrl && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <a href={vendor.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                            Website
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <a href={`mailto:${vendor.contactEmail}`} className="hover:text-primary hover:underline">
                          Contact
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-border prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/80 font-sans leading-relaxed">
                  <p>{vendor.description}</p>
                </div>

                {/* Where to find us */}
                {(vendor.marketsText || vendor.phone || vendor.instagramHandle || vendor.facebookUrl) && (
                  <div className="mt-12 p-6 bg-muted border border-border">
                    <h3 className="font-serif font-bold text-xl mb-4">Where to find us</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {vendor.marketsText && (
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Markets</h4>
                          <ul className="space-y-2 text-sm">
                            {vendor.marketsText.split(',').map((market, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span>{market.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Connect</h4>
                        {vendor.phone && (
                          <a href={`tel:${vendor.phone}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                            <Phone className="w-4 h-4" /> {vendor.phone}
                          </a>
                        )}
                        {vendor.instagramHandle && (
                          <a href={`https://instagram.com/${vendor.instagramHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                            <Instagram className="w-4 h-4" /> @{vendor.instagramHandle}
                          </a>
                        )}
                        {vendor.facebookUrl && (
                          <a href={vendor.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                            <Facebook className="w-4 h-4" /> Facebook
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Products */}
          <div className="container max-w-6xl mx-auto px-4 pb-24">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-8 border-b border-border pb-4">
              Goods by {vendor.name}
            </h2>

            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full" />)}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((product, i) => (
                  <motion.div 
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Link href={`/products/${product.id}`} className="group block h-full">
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-2xl flex flex-col relative">
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
                            <div className="absolute top-2 left-2 bg-green-100 text-green-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-green-200">
                              Market Surplus
                            </div>
                          )}
                          {product.listingType === "pre_order" && (
                            <div className="absolute top-2 left-2 bg-blue-50 text-blue-900 text-[10px] px-2 py-1 uppercase tracking-wider font-bold border border-blue-200">
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
                          <div className="text-xs text-muted-foreground mb-1">{product.category}</div>
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
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-muted/50 border border-border">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-serif font-bold text-foreground mb-2">No goods listed</h3>
                <p className="text-muted-foreground">This producer hasn't added any products yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
