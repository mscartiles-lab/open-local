import { useState } from "react";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Search, Store, Filter, Heart } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListVendors, useListCategories, useListLocations } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const { data: vendors, isLoading } = useListVendors({
    search: search || undefined,
    category: selectedCategory || undefined,
    location: selectedLocation || undefined,
  });

  const { data: categories } = useListCategories();
  const { data: locations } = useListLocations();
  const { isFavoriteVendor, toggleVendor } = useFavorites();

  useSearchLogger(search, "vendors", vendors?.length);

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">Florida Producers</h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-sans">
            Discover the independent makers, farmers, and artisans crafting small-batch goods in Florida.
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
                placeholder="Search by name or description..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background"
              />
            </div>

            {categories && categories.vendorCategories.length > 0 && (
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
                  {categories.vendorCategories.map((c) => (
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

            {locations && locations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedLocation === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedLocation(null)}
                  >
                    All
                  </Badge>
                  {locations.map((l) => (
                    <Badge 
                      key={l.location}
                      variant={selectedLocation === l.location ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedLocation(l.location)}
                    >
                      {l.location} ({l.vendorCount})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
              </div>
            ) : vendors && vendors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {vendors.map((vendor, i) => (
                  <motion.div 
                    key={vendor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={`/vendors/${vendor.id}`} className="group block h-full">
                      <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-none relative">
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
            ) : (
              <div className="text-center py-20 bg-muted/50 border border-border">
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-serif font-bold text-foreground mb-2">No producers found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                {(search || selectedCategory || selectedLocation) && (
                  <button 
                    onClick={() => { setSearch(""); setSelectedCategory(null); setSelectedLocation(null); }}
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
