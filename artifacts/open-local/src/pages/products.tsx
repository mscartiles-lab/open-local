import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Search, Tag, Filter } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListProducts, useListCategories } from "@workspace/api-client-react";

export default function Products() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading } = useListProducts({
    search: search || undefined,
    category: selectedCategory || undefined,
  });

  const { data: categories } = useListCategories();

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Goods</h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-sans">
            Browse small-batch products straight from the source. Hand-crafted, locally grown, and carefully made.
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
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-none flex flex-col">
                        <div className="aspect-square w-full relative overflow-hidden bg-muted">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Tag className="w-12 h-12 opacity-20" />
                            </div>
                          )}
                          {!product.inStock && (
                            <div className="absolute top-2 right-2 bg-background/90 text-foreground text-xs px-2 py-1 uppercase tracking-wider font-bold">
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
                            <span className="font-serif font-medium text-foreground">${(product.priceCents / 100).toFixed(2)}</span>
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
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">No goods found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                {(search || selectedCategory) && (
                  <button 
                    onClick={() => { setSearch(""); setSelectedCategory(null); }}
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
