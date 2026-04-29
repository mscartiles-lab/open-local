import { useState } from "react";
import { useGetSearchInsights } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Clock,
  Lightbulb,
  Target,
  ShoppingBag,
  Store,
  HandHelping,
  CalendarDays,
  Percent,
  RefreshCw,
} from "lucide-react";

const CONTEXT_META: Record<string, { label: string; icon: typeof Search; color: string }> = {
  products: { label: "Products / Goods", icon: ShoppingBag, color: "bg-green-100 text-green-700" },
  vendors:  { label: "Vendors",          icon: Store,       color: "bg-blue-100 text-blue-700" },
  listings: { label: "Local Listings",   icon: HandHelping, color: "bg-violet-100 text-violet-700" },
  events:   { label: "Events",           icon: CalendarDays,color: "bg-amber-100 text-amber-700" },
  surplus:  { label: "Surplus / Sale",   icon: Percent,     color: "bg-orange-100 text-orange-700" },
};

function Stat({ icon: Icon, label, value, sub, accent = false }: {
  icon: typeof Search; label: string; value: number | string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 flex items-center gap-4 ${accent ? "border-red-200 bg-red-50" : "border-border bg-background"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${accent ? "bg-red-100" : "bg-primary/10"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-red-600" : "text-primary"}`} />
      </div>
      <div>
        <div className={`text-3xl font-serif font-bold leading-none ${accent ? "text-red-700" : "text-foreground"}`}>{value}</div>
        <div className="text-sm font-medium text-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function QueryBar({ query, count, max, zeroResultCount, contexts, rank }: {
  query: string; count: number; max: number; zeroResultCount: number; contexts: string[]; rank: number;
}) {
  const pct = Math.max(4, (count / max) * 100);
  const isGap = zeroResultCount > 0;
  return (
    <div className="flex items-center gap-3 group">
      <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className="font-medium text-sm text-foreground truncate">{query}</span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isGap && (
              <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-2.5 h-2.5" /> {zeroResultCount} no results
              </span>
            )}
            <span className="text-xs text-muted-foreground">{count}×</span>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isGap ? "bg-red-400" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-1 mt-1.5">
          {contexts.map((c) => {
            const meta = CONTEXT_META[c];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <span key={c} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${meta.color}`}>
                <Icon className="w-2.5 h-2.5" />
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SearchInsights() {
  const { data, isLoading, refetch } = useGetSearchInsights();
  const [view, setView] = useState<"opportunities" | "all">("opportunities");

  const displayQueries = view === "opportunities" ? (data?.topOpportunities ?? []) : (data?.topQueries ?? []);
  const maxCount = displayQueries.reduce((m, q) => Math.max(m, q.count), 1);

  return (
    <Layout>
      {/* Header */}
      <div className="bg-muted border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Admin · Analytics</p>
              <h1 className="text-4xl font-serif font-bold text-foreground">Demand Signals</h1>
              <p className="text-muted-foreground mt-1.5 font-sans max-w-xl">
                What buyers are searching for — including searches with zero results, showing you exactly what vendors to recruit.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 border border-border bg-background px-4 py-2.5 rounded-md text-sm font-medium hover:bg-muted transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {isLoading ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <Stat icon={Search} label="Total searches" value={data?.totalSearches ?? 0} />
                <Stat icon={BarChart3} label="Unique terms" value={data?.uniqueTerms ?? 0} sub="distinct search phrases" />
                <Stat
                  icon={AlertCircle}
                  label="Zero-result searches"
                  value={data?.zeroResultCount ?? 0}
                  sub="unmet demand — recruit here"
                  accent
                />
                <Stat icon={TrendingUp} label="Searched contexts" value={data?.byContext?.length ?? 0} sub="pages with active searches" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main: query bars */}
          <div className="lg:col-span-2 space-y-6">

            {/* View toggle + headline */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-1">
                <div className="flex items-center gap-2">
                  {view === "opportunities"
                    ? <><Target className="w-5 h-5 text-red-500" /><h2 className="text-xl font-serif font-bold">Vendor Opportunities</h2></>
                    : <><TrendingUp className="w-5 h-5 text-primary" /><h2 className="text-xl font-serif font-bold">All Top Searches</h2></>
                  }
                </div>
                <div className="flex gap-1 bg-muted border border-border rounded-lg p-1">
                  {(["opportunities", "all"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {v === "opportunities" ? "🎯 Opportunities" : "📊 All searches"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {view === "opportunities"
                  ? "Terms searched by buyers that returned zero results — prime targets for vendor recruitment."
                  : "Most frequently searched terms across all marketplace pages, red bars = unmet demand."
                }
              </p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
              </div>
            ) : displayQueries.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-25" />
                <p className="font-medium">No search data yet.</p>
                <p className="text-sm mt-1">Data will appear here as visitors use the search fields.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {displayQueries.map((q, i) => (
                  <QueryBar
                    key={q.query}
                    query={q.query}
                    count={q.count}
                    max={maxCount}
                    zeroResultCount={q.zeroResultCount}
                    contexts={q.contexts}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* By context */}
            <div className="border border-border rounded-xl p-5">
              <h3 className="font-serif font-bold text-base mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Searches by page
              </h3>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
              ) : (data?.byContext ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {(data?.byContext ?? []).map((c) => {
                    const meta = CONTEXT_META[c.context];
                    const Icon = meta?.icon ?? Search;
                    return (
                      <div key={c.context} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm">{meta?.label ?? c.context}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tip box */}
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-5">
              <div className="flex items-start gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <h3 className="font-bold text-sm text-amber-900">How to use this</h3>
              </div>
              <ul className="text-xs text-amber-800 space-y-1.5 leading-relaxed">
                <li>• <strong>Zero-result searches</strong> = the market has demand but no supply. These are your top vendor leads.</li>
                <li>• <strong>High-count searches</strong> in Products suggest what categories to prioritize when recruiting makers.</li>
                <li>• <strong>Vendor searches</strong> that fail signal a city or niche not yet covered on the platform.</li>
                <li>• Share the top opportunities list with your outreach team as a data-backed pitch to new vendors.</li>
              </ul>
            </div>

            {/* Recent searches */}
            <div className="border border-border rounded-xl p-5">
              <h3 className="font-serif font-bold text-base mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent searches
              </h3>
              {isLoading ? (
                <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
              ) : (data?.recentQueries ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {(data?.recentQueries ?? []).slice(0, 15).map((r, i) => {
                    const meta = CONTEXT_META[r.context];
                    const isZero = r.resultsCount === 0;
                    return (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isZero && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                          <span className={`text-sm truncate ${isZero ? "text-red-700 font-medium" : "text-foreground"}`}>
                            {r.query}
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${meta?.color ?? "bg-muted text-muted-foreground"}`}>
                          {meta?.label ?? r.context}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
