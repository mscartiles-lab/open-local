import { useState, useEffect } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Search as SearchIcon, MapPin, Store, ShoppingBag, ArrowRight } from "lucide-react";
import { useListVendors, useListProducts } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchLogger } from "@/hooks/use-search-logger";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SearchPage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchString);
  const q = params.get("q")?.trim() ?? "";

  const [draft, setDraft] = useState(q);
  useEffect(() => { setDraft(q); }, [q]);

  const enabled = q.length > 0;
  const { data: vendors, isFetching: vendorsLoading } = useListVendors(
    enabled ? { search: q } : undefined,
  );
  const { data: products, isFetching: productsLoading } = useListProducts(
    enabled ? { search: q } : undefined,
  );

  const totalResults = (vendors?.length ?? 0) + (products?.length ?? 0);
  useSearchLogger(q, "search", enabled ? totalResults : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-10">
        <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-2">Search</h1>
        <p className="text-muted-foreground mb-6">Find local vendors and goods by keyword.</p>

        <form onSubmit={submit} className="flex gap-2 max-w-2xl mb-10">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Try ‘sourdough’, ‘honey’, ‘ceramic’, ‘Tampa’…"
              className="pl-9 h-12 text-base"
            />
          </div>
          <Button type="submit" className="h-12 px-6 bg-primary text-primary-foreground hover:bg-primary/90">
            Search
          </Button>
        </form>

        {!enabled && (
          <div className="text-center py-16 text-muted-foreground">
            <SearchIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Type something above to search across vendors and goods.</p>
          </div>
        )}

        {enabled && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {(vendorsLoading || productsLoading)
                ? "Searching…"
                : `${totalResults} result${totalResults === 1 ? "" : "s"} for `}
              {!(vendorsLoading || productsLoading) && <span className="font-semibold text-foreground">"{q}"</span>}
            </p>

            <section className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="font-serif text-2xl text-foreground">Vendors</h2>
                {!vendorsLoading && vendors && (
                  <span className="text-sm text-muted-foreground">({vendors.length})</span>
                )}
              </div>
              {vendorsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
                </div>
              ) : vendors && vendors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vendors.map((v) => (
                    <Link
                      key={v.id}
                      href={`/vendors/${v.slug}`}
                      className="flex items-start gap-4 p-4 bg-card border border-border rounded-2xl hover-elevate transition-all"
                    >
                      {v.imageUrl && (
                        <img src={v.imageUrl} alt={v.name} className="w-16 h-16 rounded-xl object-cover bg-muted shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold uppercase tracking-wide text-secondary">{v.category}</span>
                        </div>
                        <h3 className="font-serif text-lg text-foreground truncate">{v.name}</h3>
                        {v.tagline && <p className="text-sm text-muted-foreground line-clamp-2">{v.tagline}</p>}
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {v.location}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No vendors match "{q}".</p>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="font-serif text-2xl text-foreground">Goods</h2>
                {!productsLoading && products && (
                  <span className="text-sm text-muted-foreground">({products.length})</span>
                )}
              </div>
              {productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
                </div>
              ) : products && products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover-elevate transition-all"
                    >
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.name} className="w-full aspect-square object-cover bg-muted" />
                      )}
                      <div className="p-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">{p.category}</span>
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2 mt-0.5">{p.name}</h3>
                        <p className="text-sm font-bold text-primary mt-1">
                          {formatPrice(p.priceCents)}
                          {p.unit && <span className="text-xs font-normal text-muted-foreground"> / {p.unit}</span>}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No goods match "{q}".</p>
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
