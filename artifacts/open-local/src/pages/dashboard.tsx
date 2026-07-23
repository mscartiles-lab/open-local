import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  Loader2,
  Package,
  ExternalLink,
  Trash2,
  Flame,
  TrendingDown,
  Plus,
  Zap,
  Star,
  Copy,
  Check,
  BarChart3,
  Store,
  Layers,
  Settings,
  ShieldCheck,
  Lock,
  RefreshCw,
  Tag,
  Clock,
  Sparkles,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { FEATURE_BOOST_PRICE, FEATURE_BOOST_DURATION_DAYS, TIER_PHOTO_LIMIT, TIER_VIDEO_LIMIT, type TierId } from "@/lib/tiers";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorBySlug,
  useListVendorProducts,
  useUpdateProduct,
  useDeleteProduct,
  getListVendorProductsQueryKey,
  getListProductsQueryKey,
  getGetLocalNowFeedQueryKey,
  getGetMarketplaceStatsQueryKey,
  type Vendor,
  type Product,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import CustomerVerificationPanel from "@/components/CustomerVerificationPanel";
import PayoutsPanel from "@/components/PayoutsPanel";
import VendorOrdersPanel from "@/components/VendorOrdersPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import SupportRequestForm from "@/components/SupportRequestForm";
import AdditionalLocationsPanel from "@/components/AdditionalLocationsPanel";
import InventoryCsvTools from "@/components/InventoryCsvTools";
import ProductVariationsManager from "@/components/ProductVariationsManager";
import VisitRequestsPanel from "@/components/VisitRequestsPanel";
import ProductUploadDialog, { type ListingType } from "@/components/ProductUploadDialog";

type Tab = "analytics" | "inventory" | "store" | "settings";

const SESSION_OTP_KEY = "ol_dashboard_verified";

// ─── Dashboard OTP gate ──────────────────────────────────────────────────────

function DashboardOtpGate({ onVerified }: { onVerified: () => void }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState("");

  const sessionToken =
    typeof window !== "undefined" ? window.localStorage.getItem("ol_session") : null;

  const sendCode = useCallback(async () => {
    if (!sessionToken) return;
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/dashboard/otp/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json() as { sent?: boolean; devFallback?: boolean; devCode?: string; email?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
        setPhase("idle");
        return;
      }
      setEmail(data.email ?? "");
      setDevCode(data.devCode ?? null);
      setPhase("sent");
    } catch {
      setError("Network error. Please try again.");
      setPhase("idle");
    }
  }, [sessionToken]);

  useEffect(() => { sendCode(); }, []);

  const verify = useCallback(async () => {
    if (!sessionToken || code.trim().length !== 6) return;
    setPhase("verifying");
    setError("");
    try {
      const res = await fetch("/api/dashboard/otp/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json() as { valid?: boolean; error?: string };
      if (!res.ok || !data.valid) {
        setError(data.error ?? "Incorrect code");
        setPhase("sent");
        return;
      }
      sessionStorage.setItem(SESSION_OTP_KEY, "1");
      onVerified();
    } catch {
      setError("Network error. Please try again.");
      setPhase("sent");
    }
  }, [sessionToken, code, onVerified]);

  return (
    <Layout>
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">Dashboard access</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {phase === "idle" || phase === "sending"
                ? "Sending a verification code to your email…"
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {(phase === "sending" || phase === "idle") && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {(phase === "sent" || phase === "verifying") && (
            <div className="space-y-3">
              {devCode && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                  <strong>Dev mode</strong> — code is{" "}
                  <span className="font-mono font-bold text-lg tracking-widest">{devCode}</span>
                </div>
              )}
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                className="text-center text-xl tracking-[0.3em] font-mono"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={verify} className="w-full" disabled={code.length < 6 || phase === "verifying"}>
                {phase === "verifying" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : <><Lock className="mr-2 h-4 w-4" />Enter dashboard</>}
              </Button>
              <button
                type="button"
                onClick={() => { setCode(""); setError(""); sendCode(); }}
                className="flex items-center justify-center gap-1.5 w-full text-sm text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Resend code
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── Shareable link bar ──────────────────────────────────────────────────────

function StorefrontLinkBar({ vendorSlug }: { vendorSlug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined"
    ? `${window.location.origin}/vendors/${vendorSlug}`
    : `/vendors/${vendorSlug}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
      <p className="flex-1 truncate text-sm text-muted-foreground font-mono">{url}</p>
      <button
        onClick={copy}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition",
          copied ? "bg-primary text-white" : "bg-card border border-border text-foreground hover:bg-muted",
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy link"}
      </button>
      <Link href={`/vendors/${vendorSlug}`} target="_blank">
        <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition">
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </button>
      </Link>
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Package; label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Icon className={cn("h-5 w-5", accent ?? "text-muted-foreground")} />
      <p className="mt-2 font-serif text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Listing badge ───────────────────────────────────────────────────────────

function ListingBadge({ type }: { type: string }) {
  const styles: Record<string, { label: string; cls: string }> = {
    batch_drop: { label: "Batch drop", cls: "bg-amber-100 text-amber-800" },
    surplus: { label: "Surplus", cls: "bg-emerald-100 text-emerald-800" },
    pre_order: { label: "Pre-order", cls: "bg-sky-100 text-sky-800" },
    regular: { label: "Regular", cls: "bg-stone-100 text-stone-700" },
  };
  const s = styles[type] ?? styles.regular!;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider", s.cls)}>
      {s.label}
    </span>
  );
}

// ─── Listing promo actions ───────────────────────────────────────────────────

function ListingPromoActions({ productId, featured }: { productId: number; featured: boolean }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"boost" | "feature" | null>(null);

  const sessionToken =
    typeof window !== "undefined" ? window.localStorage.getItem("ol_session") : null;

  const handleBoost = async () => {
    if (!sessionToken) { toast({ title: "Sign in to boost listings" }); return; }
    setBusy("boost");
    try {
      const r = await fetch("/api/billing/feature-boost/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ productId }),
      });
      const data = await r.json() as { url?: string; error?: string };
      if (!r.ok || !data.url) {
        toast({ title: "Couldn't start checkout", description: data.error ?? "Try again in a moment.", variant: "destructive" });
        return;
      }
      window.location.href = data.url;
    } finally { setBusy(null); }
  };

  const handleFeature = async () => {
    if (!sessionToken) return;
    setBusy("feature");
    try {
      const r = await fetch(`/api/products/${productId}/feature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await r.json().catch(() => ({})) as { error?: string; currentlyActive?: number; allowance?: number };
      if (!r.ok) {
        toast({ title: "Couldn't feature listing", description: data.error ?? "Try again.", variant: "destructive" });
        return;
      }
      toast({ title: "Listing featured", description: `Using ${data.currentlyActive}/${data.allowance} included slots.` });
    } finally { setBusy(null); }
  };

  if (featured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
        <Star className="h-3 w-3" /> Featured
      </span>
    );
  }

  const isPremium = user?.role === "vendor" && user?.tier === "premium";

  return (
    <div className="flex items-center gap-1">
      {isPremium && (
        <Button variant="ghost" size="sm" disabled={busy !== null} onClick={handleFeature} title="Use one of your Premium featured slots">
          <Star className="mr-1 h-3.5 w-3.5" /> Feature
        </Button>
      )}
      <Button variant="outline" size="sm" disabled={busy !== null} onClick={handleBoost}
        title={`$${FEATURE_BOOST_PRICE} · features this listing for ${FEATURE_BOOST_DURATION_DAYS} days`}>
        <Zap className="mr-1 h-3.5 w-3.5" />
        {busy === "boost" ? "Opening…" : `Boost $${FEATURE_BOOST_PRICE}`}
      </Button>
    </div>
  );
}

// ─── Analytics tab ───────────────────────────────────────────────────────────

function AnalyticsTab({ vendorId, products }: { vendorId: number; products: Product[] }) {
  const inStockCount = products.filter((p) => p.inStock).length;
  const liveBatchDrops = products.filter((p) => p.listingType === "batch_drop" && p.inStock).length;
  const liveSurplus = products.filter((p) => p.listingType === "surplus" && p.inStock).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard icon={Package} label="Total products" value={(products ?? []).length} />
        <StatCard icon={Tag} label="In stock" value={inStockCount} />
        <StatCard icon={Flame} label="Live batch drops" value={liveBatchDrops} accent="text-amber-700" />
        <StatCard icon={TrendingDown} label="Live surplus" value={liveSurplus} accent="text-emerald-700" />
      </div>
      <AnalyticsPanel kind="vendor" id={vendorId} />
      <PayoutsPanel vendorSlug={""} />
      <VendorOrdersPanel vendorId={vendorId} />
      <VisitRequestsPanel vendorId={vendorId} />
      <CustomerVerificationPanel vendorId={vendorId} />
    </div>
  );
}

// ─── Inventory tab ───────────────────────────────────────────────────────────

function InventoryTab({
  vendor,
  products,
  onAddProduct,
  onRefresh,
}: {
  vendor: Vendor;
  products: Product[];
  onAddProduct: (type?: ListingType) => void;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [filterType, setFilterType] = useState<string>("all");

  const sessionToken =
    typeof window !== "undefined" ? window.localStorage.getItem("ol_session") : null;

  const filtered = filterType === "all" ? products : products.filter((p) => p.listingType === filterType);

  const FILTER_TYPES = [
    { value: "all", label: "All" },
    { value: "regular", label: "Regular" },
    { value: "batch_drop", label: "Batch drops" },
    { value: "surplus", label: "Surplus" },
    { value: "pre_order", label: "Pre-orders" },
  ];

  return (
    <div className="space-y-6">
      {/* Quick add row */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => onAddProduct("regular")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
          <Button variant="outline" onClick={() => onAddProduct("batch_drop")} className="gap-2">
            <Flame className="h-4 w-4 text-amber-600" />
            Drop a batch
          </Button>
          <Button variant="outline" onClick={() => onAddProduct("surplus")} className="gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-600" />
            Mark surplus
          </Button>
        </div>
        <InventoryCsvTools vendorId={vendor.id} onImported={onRefresh} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_TYPES.map((ft) => (
          <button
            key={ft.value}
            onClick={() => setFilterType(ft.value)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold transition",
              filterType === ft.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {ft.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground self-center">
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted px-6 py-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 font-serif text-xl font-bold text-foreground">
            {filterType === "all" ? "Nothing listed yet" : `No ${filterType.replace("_", " ")} listings`}
          </p>
          <p className="mt-1 text-muted-foreground">
            {filterType === "all"
              ? "Use the buttons above to add your first listing."
              : "Switch to a different filter or add one above."}
          </p>
          {filterType === "all" && (
            <Button className="mt-5" onClick={() => onAddProduct("regular")}>
              <Plus className="mr-2 h-4 w-4" />
              Add first product
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {filtered.map((p, i) => (
            <div key={p.id} className={cn("flex flex-col gap-4 p-4", i > 0 && "border-t border-border")}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg font-bold text-foreground">{p.name}</p>
                    <ListingBadge type={p.listingType} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-foreground">${(p.priceCents / 100).toFixed(2)}</span>
                    <span className="text-muted-foreground"> / {p.unit}</span>
                    {p.listingType === "surplus" && p.originalPriceCents && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        ${(p.originalPriceCents / 100).toFixed(2)}
                      </span>
                    )}
                    {p.availableUntil && (
                      <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Until {new Date(p.availableUntil).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Switch
                      checked={p.inStock}
                      onCheckedChange={(checked) => {
                        updateProduct.mutate(
                          { id: p.id, data: { inStock: checked } },
                          { onSuccess: onRefresh },
                        );
                      }}
                    />
                    <span className="hidden md:inline">In stock</span>
                  </label>
                  <ListingPromoActions productId={p.id} featured={p.featured} />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
                      deleteProduct.mutate(
                        { id: p.id },
                        {
                          onSuccess: () => {
                            onRefresh();
                            toast({ title: "Deleted", description: `${p.name} was removed.` });
                          },
                        },
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <ProductVariationsManager productId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Store editor tab ────────────────────────────────────────────────────────

function StoreEditorTab({ vendor }: { vendor: Vendor }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionToken =
    typeof window !== "undefined" ? window.localStorage.getItem("ol_session") : null;

  const [name, setName] = useState(vendor.name);
  const [tagline, setTagline] = useState(vendor.tagline ?? "");
  const [description, setDescription] = useState(vendor.description ?? "");
  const [location, setLocation] = useState(vendor.location ?? "");
  const [phone, setPhone] = useState(vendor.phone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(vendor.websiteUrl ?? "");
  const [instagramHandle, setInstagramHandle] = useState(vendor.instagramHandle ?? "");
  const [facebookUrl, setFacebookUrl] = useState(vendor.facebookUrl ?? "");
  const [marketsText, setMarketsText] = useState(vendor.marketsText ?? "");
  const [pickupAddress, setPickupAddress] = useState(vendor.pickupAddress ?? "");
  const [openHours, setOpenHours] = useState(vendor.openHours ?? "");
  const [howToOrder, setHowToOrder] = useState(vendor.howToOrder ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!sessionToken) { toast({ title: "Not signed in", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          name: name.trim() || undefined,
          tagline: tagline.trim() || undefined,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          phone: phone.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          instagramHandle: instagramHandle.trim() || undefined,
          facebookUrl: facebookUrl.trim() || undefined,
          marketsText: marketsText.trim() || undefined,
          pickupAddress: pickupAddress.trim() || undefined,
          openHours: openHours.trim() || undefined,
          howToOrder: howToOrder.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast({ title: "Save failed", description: d.error ?? "Please try again.", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["vendor", vendor.slug] });
      toast({ title: "Saved!", description: "Your storefront has been updated." });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <Field label="Business name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Tagline">
        <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="One-line description for the directory listing" />
      </Field>
      <Field label="About / Story">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell people about your business, your craft, your values…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[120px]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City / Area">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Tampa, FL" />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </Field>
      </div>
      <Field label="Website URL">
        <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourbusiness.com" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Instagram handle">
          <Input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} placeholder="@handle" />
        </Field>
        <Field label="Facebook URL">
          <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/…" />
        </Field>
      </div>
      <Field label="Markets / Where to find you">
        <textarea
          value={marketsText}
          onChange={(e) => setMarketsText(e.target.value)}
          placeholder="Saturday Farmers Market (9am–1pm), downtown …"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px]"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Pickup address">
          <Input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="123 Main St, Tampa" />
        </Field>
        <Field label="Open hours">
          <Input value={openHours} onChange={(e) => setOpenHours(e.target.value)} placeholder="Sat 9am–1pm, by appt" />
        </Field>
      </div>
      <Field label="How to order">
        <Input value={howToOrder} onChange={(e) => setHowToOrder(e.target.value)} placeholder="DM on Instagram, order online, walk-in…" />
      </Field>

      <div className="pt-2">
        <Button onClick={save} disabled={saving} className="min-w-[120px]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Settings tab ────────────────────────────────────────────────────────────

function SettingsTab({ vendor }: { vendor: Vendor }) {
  return (
    <div className="max-w-xl space-y-8">
      <AdditionalLocationsPanel
        vendor={vendor}
        onUpdated={() => {}}
      />
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-serif text-lg font-bold mb-4">Support</h3>
        <SupportRequestForm />
      </section>
    </div>
  );
}

// ─── Main dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("analytics");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState<ListingType>("regular");

  // Session-level 2FA: check once per browser session
  const [otpVerified, setOtpVerified] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_OTP_KEY) === "1";
  });

  const {
    data: vendor,
    isLoading,
    error,
  } = useGetVendorBySlug(slug ?? "", {
    query: { enabled: !!slug, queryKey: ["vendor", slug] },
  });

  const { data: products = [] } = useListVendorProducts(vendor?.id ?? 0, {
    query: { enabled: !!vendor, queryKey: ["vendor-products", vendor?.id] },
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListVendorProductsQueryKey(vendor?.id ?? 0) });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLocalNowFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMarketplaceStatsQueryKey() });
  }

  const openAddProduct = (type: ListingType = "regular") => {
    setUploadType(type);
    setUploadOpen(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !vendor) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold">Dashboard not found</h1>
          <p className="mt-2 text-muted-foreground">We couldn't find a business at this URL.</p>
          <Link href="/submit">
            <Button className="mt-6">List your business</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  // Show 2FA gate for vendor accounts (or when not logged in via session)
  const needsOtp = user?.role === "vendor" && !otpVerified;
  if (needsOtp) {
    return <DashboardOtpGate onVerified={() => setOtpVerified(true)} />;
  }

  const tier = (user?.tier ?? "basic") as TierId;

  const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "inventory", label: "Inventory", icon: Layers },
    { id: "store", label: "Store Editor", icon: Store },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <Layout>
      {/* Header */}
      <div className="border-b border-border bg-muted">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col gap-5">
            {/* Top row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={vendor.imageUrl}
                  alt={vendor.name}
                  className="h-16 w-16 rounded-lg border border-border object-cover md:h-20 md:w-20"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Your dashboard</p>
                  <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{vendor.name}</h1>
                  <p className="text-sm text-muted-foreground">{vendor.category} · {vendor.location}, {vendor.region}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => openAddProduct("regular")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add product
                </Button>
              </div>
            </div>

            {/* Storefront link — prominent */}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                Your public storefront — share with customers
              </p>
              <StorefrontLinkBar vendorSlug={vendor.slug} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container mx-auto max-w-6xl px-4">
          <nav className="flex gap-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition",
                  activeTab === id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {activeTab === "analytics" && (
          <AnalyticsTab vendorId={vendor.id} products={products} />
        )}
        {activeTab === "inventory" && (
          <InventoryTab
            vendor={vendor}
            products={products}
            onAddProduct={openAddProduct}
            onRefresh={invalidateAll}
          />
        )}
        {activeTab === "store" && <StoreEditorTab vendor={vendor} />}
        {activeTab === "settings" && <SettingsTab vendor={vendor} />}
      </div>

      {/* Product upload dialog */}
      {uploadOpen && (
        <ProductUploadDialog
          open={uploadOpen}
          vendorId={vendor.id}
          vendorCategory={vendor.category}
          tier={tier}
          defaultType={uploadType}
          onClose={() => setUploadOpen(false)}
          onCreated={() => {
            setUploadOpen(false);
            invalidateAll();
          }}
        />
      )}
    </Layout>
  );
}
