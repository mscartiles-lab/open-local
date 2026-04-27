import { useParams } from "wouter";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Store, Tag, MapPin } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useGetProduct, useGetVendor, useListVendorProducts, getGetProductQueryKey, getGetVendorQueryKey, getListVendorProductsQueryKey } from "@workspace/api-client-react";
import NotFound from "./not-found";

export default function ProductDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: product, isLoading: productLoading, error: productError } = useGetProduct(id, {
    query: {
      enabled: !isNaN(id),
      queryKey: getGetProductQueryKey(id)
    }
  });

  const vendorId = product?.vendorId;

  const { data: vendor, isLoading: vendorLoading } = useGetVendor(vendorId as number, {
    query: {
      enabled: !!vendorId,
      queryKey: getGetVendorQueryKey(vendorId as number)
    }
  });

  const { data: moreProducts, isLoading: moreProductsLoading } = useListVendorProducts(vendorId as number, {
    query: {
      enabled: !!vendorId,
      queryKey: getListVendorProductsQueryKey(vendorId as number)
    }
  });

  if (isNaN(id) || (productError && (productError as any).status === 404)) {
    return <NotFound />;
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {productLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <Skeleton className="w-full aspect-square" />
            <div className="space-y-6">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-3/4 h-12" />
              <Skeleton className="w-24 h-8" />
              <Skeleton className="w-full h-40" />
            </div>
          </div>
        ) : product ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
              {/* Product Image */}
              <div className="bg-muted border border-border aspect-square relative flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Tag className="w-24 h-24 text-muted-foreground opacity-20" />
                )}
                {!product.inStock && (
                  <div className="absolute top-4 right-4 bg-background/90 text-foreground px-4 py-2 uppercase tracking-widest font-bold text-sm">
                    Sold Out
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex flex-col justify-center">
                <Link href={`/vendors/${product.vendorId}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4">
                  <Store className="w-4 h-4" /> {product.vendorName}
                </Link>
                
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4 leading-tight">{product.name}</h1>
                
                <div className="flex items-end gap-3 mb-8 pb-8 border-b border-border">
                  <span className="text-3xl font-serif font-bold text-foreground">${(product.priceCents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground mb-1">per {product.unit}</span>
                </div>

                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/80 font-sans leading-relaxed mb-12">
                  <p>{product.description}</p>
                </div>

                <div className="bg-muted/30 border border-border p-6 mt-auto">
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-4">About the Producer</h3>
                  {vendorLoading ? (
                    <Skeleton className="w-full h-16" />
                  ) : vendor ? (
                    <div>
                      <Link href={`/vendors/${vendor.id}`} className="font-serif font-bold text-lg hover:text-primary transition-colors inline-block mb-2">
                        {vendor.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mb-3">{vendor.tagline}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {vendor.location}, {vendor.region}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* More from vendor */}
            {moreProducts && moreProducts.length > 1 && (
              <div className="pt-12 border-t border-border">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-8">
                  More from {product.vendorName}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {moreProducts.filter(p => p.id !== product.id).slice(0, 4).map((p, i) => (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Link href={`/products/${p.id}`} className="group block h-full">
                        <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-none flex flex-col">
                          <div className="aspect-square w-full relative overflow-hidden bg-muted">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <Tag className="w-12 h-12 opacity-20" />
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">{p.name}</h3>
                            <div className="mt-auto flex justify-between items-center pt-4">
                              <span className="font-serif font-medium text-foreground">${(p.priceCents / 100).toFixed(2)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
