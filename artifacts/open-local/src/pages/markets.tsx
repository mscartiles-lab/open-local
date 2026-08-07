import { useState, lazy, Suspense } from "react";
import { Link } from "wouter";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Clock,
  Mail,
  Globe,
  Instagram,
  Search,
  ShieldCheck,
  Users,
  CalendarDays,
  ArrowRight,
  Store,
  LayoutGrid,
  Map,
} from "lucide-react";
import {
  useListMarkets,
  getListMarketsQueryKey,
  type Market,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// Lazy-load the map so Leaflet CSS doesn't block the initial paint
const MarketsMapView = lazy(() => import("@/components/MarketsMapView"));

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const REGIONS = ["FL", "GA", "AL", "SC"];

function MarketCard({ market }: { market: Market }) {
  const detailHref = market.slug ? `/markets/${market.slug}` : null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Banner */}
      {(market.featuredImageUrl || market.imageUrl) ? (
        <img
          src={market.featuredImageUrl ?? market.imageUrl ?? ""}
          alt={market.name}
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-[#243316] to-[#3c4a26] flex items-center justify-center">
          <Store className="w-12 h-12 text-white/20" />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {market.logoUrl ? (
            <img
              src={market.logoUrl}
              alt={market.name}
              className="w-12 h-12 rounded-xl border border-border object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-green-800">
                {market.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-foreground text-base leading-tight">{market.name}</h3>
              {market.verified && (
                <span title="Verified market">
                  <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {market.city}, {market.region}
            </p>
          </div>
        </div>

        {/* Schedule */}
        {(market.day || market.time) && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span>
              {[market.day, market.time].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        {/* Address */}
        {market.address && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 leading-relaxed">
            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
            {market.address}
          </p>
        )}

        {/* Description */}
        {market.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {market.description}
          </p>
        )}

        {/* Tags */}
        {market.tags && market.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {market.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-semibold bg-green-50 text-green-800 border border-green-200 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/50 flex-wrap">
          <div className="flex items-center gap-2">
            {market.vendorCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" />
                {market.vendorCount} vendor{market.vendorCount !== 1 ? "s" : ""}
              </span>
            )}
            {market.contactEmail && (
              <a
                href={`mailto:${market.contactEmail}`}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                Apply
              </a>
            )}
          </div>

          {detailHref ? (
            <Link href={detailHref}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                View Market <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          ) : (
            <div className="flex gap-2">
              {market.websiteUrl && (
                <a
                  href={market.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Website"
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
              )}
              {market.instagramHandle && (
                <a
                  href={`https://instagram.com/${market.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Instagram"
                >
                  <Instagram className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewMode = "list" | "map";

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data: markets = [], isLoading } = useListMarkets(
    {
      search: search.trim() || undefined,
      day: dayFilter !== "all" ? dayFilter : undefined,
      region: regionFilter !== "all" ? regionFilter : undefined,
    },
    {
      query: {
        queryKey: getListMarketsQueryKey({
          search: search.trim() || undefined,
          day: dayFilter !== "all" ? dayFilter : undefined,
          region: regionFilter !== "all" ? regionFilter : undefined,
        }),
      },
    },
  );

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1c2a10] via-[#243316] to-[#2d3a1d] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#fff,#fff_1px,transparent_1px,transparent_14px)]" />
        <div className="relative container max-w-6xl mx-auto px-4 py-14">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3 h-3" />
            Florida Farmers Markets
          </div>
          <h1 className="text-5xl font-serif font-bold text-white mb-3">
            Farmers Market Directory
          </h1>
          <p className="text-green-200 text-lg max-w-xl mb-8 leading-relaxed">
            Find a farmers market near you — browse by day, city, or region and discover where local growers and makers gather every week.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/markets/register">
              <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-6">
                Register Your Market
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10">
        {/* Filters + view toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or city…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All days</SelectItem>
              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* List / Map toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border",
                viewMode === "map"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              <Map className="w-3.5 h-3.5" />
              Map
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          viewMode === "list" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
            </div>
          ) : (
            <Skeleton className="h-[520px] rounded-2xl" />
          )
        ) : markets.length === 0 ? (
          <div className="py-24 text-center">
            <Store className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground text-lg mb-2">No markets found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
              {search || dayFilter !== "all" || regionFilter !== "all"
                ? "No markets match your filters. Try adjusting your search."
                : "No markets are listed yet. Be the first to register yours."}
            </p>
            <Link href="/markets/register">
              <Button className="gap-2">Register Your Market <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        ) : viewMode === "map" ? (
          <Suspense fallback={<Skeleton className="h-[520px] rounded-2xl" />}>
            <MarketsMapView markets={markets} />
          </Suspense>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {markets.length} market{markets.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {markets.map((m: Market) => <MarketCard key={m.id} market={m} />)}
            </div>
          </>
        )}

        {/* CTA banner */}
        <div className={cn(
          "mt-12 rounded-2xl border border-dashed border-[#3c4a26]/30 bg-[#f9f6f0] p-6",
          "flex flex-col sm:flex-row items-start sm:items-center gap-4",
        )}>
          <div className="flex-1">
            <p className="font-semibold text-[#1a1a1a] text-sm">Is your market missing?</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Register your farmers market for free. We'll review your submission within 1–2 business days and add it to the directory.
            </p>
          </div>
          <Link href="/markets/register">
            <Button className="gap-1.5 whitespace-nowrap">
              Register for free <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
