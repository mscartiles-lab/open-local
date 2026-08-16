import { useState, useMemo } from "react";
import { useSearchLogger } from "@/hooks/use-search-logger";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Search, Store, Filter, Heart, LocateFixed, Loader2, X, Map, List } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useListVendors, useListCategories, useListLocations } from "@workspace/api-client-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useProximity, haversineMiles, PROXIMITY_PICKS, PROXIMITY_LABELS } from "@/hooks/use-proximity";
import VendorsMapView from "@/components/VendorsMapView";

export default function Vendors() {
  const [view, setView] = useState<"list" | "map">("list");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const { userPos, radius, setRadius, locating, locationError, locate, clear } = useProximity();

  const { data: vendors, isLoading } = useListVendors({
    search: search || undefined,
    category: selectedCategory || undefined,
    location: selectedLocation || undefined,
  });

  const { data: categories } = useListCategories();
  const { data: locations } = useListLocations();
  const { isFavoriteVendor, toggleVendor } = useFavorites();

  useSearchLogger(search, "vendors", vendors?.length);

  // Split vendors into in-radius and beyond when location is known
  const { inRadius, beyond } = useMemo(() => {
    if (!userPos || !vendors) return { inRadius: vendors ?? [], beyond: [] };
    const inR: typeof vendors = [];
    const out: typeof vendors = [];
    for (const v of vendors) {
      if (!v.latitude || !v.longitude) { out.push(v); continue; }
      const dist = haversineMiles(userPos.latitude, userPos.longitude, v.latitude, v.longitude);
      (dist <= radius ? inR : out).push(v);
    }
    return { inRadius: inR, beyond: out };
  }, [vendors, userPos, radius]);

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-5xl font-serif font-bold text-foreground">Florida Producers</h1>
            {/* Map / List toggle */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1 shrink-0 mt-1">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setView("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Map className="w-4 h-4" /> Map
              </button>
            </div>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl font-sans mb-8">
            Discover the independent makers, farmers, and artisans crafting small-batch goods in Florida.
          </p>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search by vendor name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-background text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            {/* Near Me */}
            <div className="space-y-3">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <LocateFixed className="w-4 h-4" /> Near Me
              </h3>
              {!userPos ? (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={locate} disabled={locating}>
                  {locating ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating…</> : <><LocateFixed className="w-4 h-4" /> Use my location</>}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wide">Radius</span>
                    <button onClick={clear} className="hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
                  </div>
                  <div className="flex gap-1.5">
                    {PROXIMITY_PICKS.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRadius(r)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${radius === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                      >
                        {PROXIMITY_LABELS[r]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{inRadius.length} within {PROXIMITY_LABELS[radius]}</p>
                </div>
              )}
              {locationError && <p className="text-xs text-amber-600">{locationError}</p>}
            </div>

            {categories && categories.vendorCategories.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <Filter className="w-4 h-4" /> Category
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Badge>
                  {categories.vendorCategories.map((c) => (
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

            {locations && locations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Location
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={selectedLocation === null ? "default" : "outline"}
                    className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
                    onClick={() => setSelectedLocation(null)}
                  >
                    All
                  </Badge>
                  {locations.map((l) => (
                    <Badge 
                      key={l.location}
                      variant={selectedLocation === l.location ? "default" : "outline"}
                      className="cursor-pointer px-4 py-1.5 text-sm rounded-xl"
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
            {/* Map view */}
            {view === "map" && (
              isLoading ? (
                <Skeleton className="h-[520px] w-full rounded-2xl" />
              ) : (
                <VendorsMapView vendors={vendors ?? []} />
              )
            )}

            {/* List view */}
            {view === "list" && (isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[400px] w-full" />)}
              </div>
            ) : vendors && vendors.length > 0 ? (
              <div className="space-y-8">
                {/* In-radius grid */}
                {inRadius.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {inRadius.map((vendor, i) => <VendorCard key={vendor.id} vendor={vendor} i={i} isFav={isFavoriteVendor(vendor.id)} toggle={() => toggleVendor(vendor.id)} userPos={userPos} />)}
                  </div>
                )}

                {/* "Beyond X mi" divider */}
                {userPos && beyond.length > 0 && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                      Beyond {PROXIMITY_LABELS[radius]} · {beyond.length} more
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Beyond grid */}
                {beyond.length > 0 && (
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-6 ${userPos ? "opacity-60" : ""}`}>
                    {beyond.map((vendor, i) => <VendorCard key={vendor.id} vendor={vendor} i={i} isFav={isFavoriteVendor(vendor.id)} toggle={() => toggleVendor(vendor.id)} userPos={userPos} />)}
                  </div>
                )}

                {/* No nearby results message */}
                {userPos && inRadius.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No producers within {PROXIMITY_LABELS[radius]}.</p>
                    <p className="text-xs mt-1">Showing all {beyond.length} results below.</p>
                  </div>
                )}
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
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function VendorCard({
  vendor, i, isFav, toggle, userPos,
}: {
  vendor: { id: number; name: string; slug: string; category: string; tagline: string | null; description: string; location: string; region: string; imageUrl: string; latitude?: number | null; longitude?: number | null };
  i: number; isFav: boolean; toggle: () => void; userPos: { latitude: number; longitude: number } | null;
}) {
  const dist = userPos && vendor.latitude && vendor.longitude
    ? haversineMiles(userPos.latitude, userPos.longitude, vendor.latitude, vendor.longitude)
    : null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Link href={`/vendors/${vendor.id}`} className="group block h-full">
        <Card className="h-full overflow-hidden border-border bg-card hover-elevate transition-all duration-300 rounded-2xl relative">
          <button onClick={(e) => { e.preventDefault(); toggle(); }} className="absolute top-3 right-3 z-10 p-2 bg-background/80 backdrop-blur-sm rounded-full text-primary hover:scale-110 transition-transform">
            <Heart className="w-5 h-5" fill={isFav ? "currentColor" : "none"} />
          </button>
          <div className="aspect-[4/3] w-full relative overflow-hidden bg-muted">
            {vendor.imageUrl ? (
              <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Store className="w-12 h-12 opacity-20" /></div>
            )}
            {dist !== null && (
              <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> {dist.toFixed(1)} mi
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
  );
}
