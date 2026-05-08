import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Users, Search, Package, MapPin, Sparkles } from "lucide-react";

const SESSION_KEY = "ol_session";

interface DailyPoint {
  day: string;
  count: number;
}

interface VendorAnalytics {
  vendor: { id: number; name: string; slug: string };
  visits: {
    pending: number;
    approved: number;
    rejected: number;
    last30: number;
    daily: DailyPoint[];
  };
  products: {
    total: number;
    inStock: number;
    featured: number;
    batchDrops: number;
    surplus: number;
    preOrders: number;
  };
  search: {
    appearancesLast30: number;
    topMarketplaceQueries: { query: string; count: number }[];
  };
}

interface EstablishmentAnalytics {
  establishment: {
    id: number;
    name: string;
    type: string;
    city: string;
    state: string;
    status: string;
    tier: string;
  };
  search: {
    appearancesLast30: number;
    daily: DailyPoint[];
    topMarketplaceQueries: { query: string; count: number }[];
  };
  neighborhood: {
    peersInCity: number;
    visitsToVendorsInCityLast30: number;
  };
}

type Props =
  | { kind: "vendor"; id: number }
  | { kind: "establishment"; id: number };

function Sparkline({ points, accent }: { points: DailyPoint[]; accent: string }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const w = 100;
  const h = 32;
  const step = w / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - (p.count / max) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-10">
      <path d={area} fill={accent} fillOpacity="0.15" />
      <path d={path} fill="none" stroke={accent} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-semibold uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-2xl font-serif font-bold text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default function AnalyticsPanel(props: Props) {
  const [data, setData] = useState<VendorAnalytics | EstablishmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = props.kind === "vendor"
      ? `/api/analytics/vendor/${props.id}`
      : `/api/analytics/establishment/${props.id}`;
    setLoading(true);
    setError(null);
    const token = localStorage.getItem(SESSION_KEY);
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (r) => {
        if (r.status === 401) throw new Error("Sign in to view analytics.");
        if (r.status === 403) throw new Error("You don't have access to these analytics.");
        if (!r.ok) throw new Error(`Couldn't load analytics (${r.status}).`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [props.kind, props.id]);

  if (loading) {
    return (
      <div className="bg-muted/40 rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        {error}
      </div>
    );
  }
  if (!data) return null;

  const accent = "#c07218";

  if (props.kind === "vendor") {
    const v = data as VendorAnalytics;
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-foreground">Analytics</h2>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Users} label="Approved visits" value={v.visits.approved} hint={`${v.visits.last30} in last 30d`} />
          <StatTile icon={Sparkles} label="Pending requests" value={v.visits.pending} />
          <StatTile icon={Search} label="Matching searches" value={v.search.appearancesLast30} hint="Queries containing your keywords" />
          <StatTile icon={Package} label="Live listings" value={v.products.inStock} hint={`of ${v.products.total} total`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Visits trend</h3>
              <span className="text-xs text-muted-foreground ml-auto">{v.visits.last30} approved</span>
            </div>
            <Sparkline points={v.visits.daily} accent={accent} />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>30d ago</span>
              <span>today</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">What shoppers are searching</h3>
            </div>
            {v.search.topMarketplaceQueries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No searches yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {v.search.topMarketplaceQueries.map((q) => (
                  <li key={q.query} className="flex justify-between text-sm">
                    <span className="text-foreground truncate">{q.query}</span>
                    <span className="text-muted-foreground tabular-nums">{q.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-foreground mb-3">Listing breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div><div className="text-xl font-serif font-bold">{v.products.total}</div><div className="text-xs text-muted-foreground">Total</div></div>
            <div><div className="text-xl font-serif font-bold text-emerald-700">{v.products.inStock}</div><div className="text-xs text-muted-foreground">In stock</div></div>
            <div><div className="text-xl font-serif font-bold text-amber-700">{v.products.batchDrops}</div><div className="text-xs text-muted-foreground">Batch drops</div></div>
            <div><div className="text-xl font-serif font-bold text-rose-700">{v.products.surplus}</div><div className="text-xs text-muted-foreground">Surplus</div></div>
            <div><div className="text-xl font-serif font-bold text-primary">{v.products.featured}</div><div className="text-xs text-muted-foreground">Featured</div></div>
          </div>
        </div>
      </section>
    );
  }

  const e = data as EstablishmentAnalytics;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-foreground">Analytics</h2>
        <span className="text-xs text-muted-foreground">Last 30 days</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={Search} label="Matching searches" value={e.search.appearancesLast30} hint="Queries containing your keywords" />
        <StatTile icon={MapPin} label="Peers in your city" value={e.neighborhood.peersInCity} hint={e.establishment.city} />
        <StatTile icon={Users} label="Local vendor visits" value={e.neighborhood.visitsToVendorsInCityLast30} hint="Activity nearby (30d)" />
        <StatTile icon={Sparkles} label="Status" value={e.establishment.status} hint={`Tier: ${e.establishment.tier}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Search appearances trend</h3>
          </div>
          <Sparkline points={e.search.daily} accent={accent} />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>30d ago</span><span>today</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Top searches in the marketplace</h3>
          </div>
          {e.search.topMarketplaceQueries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No searches yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {e.search.topMarketplaceQueries.map((q) => (
                <li key={q.query} className="flex justify-between text-sm">
                  <span className="text-foreground truncate">{q.query}</span>
                  <span className="text-muted-foreground tabular-nums">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
