import { useState } from "react";
import { useParams, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Sparkles,
  Tag,
  Package,
  ArrowRight,
  ExternalLink,
  Trash2,
  Bookmark,
  Clock,
  Flame,
  TrendingDown,
  Plus,
  Zap,
  Star,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { FEATURE_BOOST_PRICE, FEATURE_BOOST_DURATION_DAYS } from "@/lib/tiers";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useGetVendorBySlug,
  useListVendorProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  getListVendorProductsQueryKey,
  getListProductsQueryKey,
  getGetLocalNowFeedQueryKey,
  getGetMarketplaceStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import VisitRequestsPanel from "@/components/VisitRequestsPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import SupportRequestForm from "@/components/SupportRequestForm";

type QuickType = "batch_drop" | "surplus" | "regular";

const quickActions: {
  type: QuickType;
  title: string;
  blurb: string;
  icon: typeof Flame;
  accent: string;
}[] = [
  {
    type: "batch_drop",
    title: "Drop a batch",
    blurb: "A fresh release just out of the oven, kiln, or kitchen.",
    icon: Flame,
    accent: "bg-amber-100 text-amber-800",
  },
  {
    type: "surplus",
    title: "Mark surplus",
    blurb: "End-of-market leftovers at a discount.",
    icon: TrendingDown,
    accent: "bg-emerald-100 text-emerald-800",
  },
  {
    type: "regular",
    title: "Add a product",
    blurb: "A regular item for your storefront.",
    icon: Plus,
    accent: "bg-stone-100 text-stone-800",
  },
];

const baseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(10, "A short description helps people decide."),
  priceDollars: z.coerce.number().positive("Price must be positive"),
  unit: z.string().min(1, "Unit is required (e.g., 'loaf', 'bag', 'lb')"),
  imageUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
});

const batchSchema = baseSchema;
const surplusSchema = baseSchema.extend({
  originalPriceDollars: z.coerce
    .number()
    .positive("Original price must be positive"),
});
const regularSchema = baseSchema;

type FormShape = z.infer<typeof surplusSchema>;

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<QuickType | null>(null);

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

  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  function invalidateAll() {
    queryClient.invalidateQueries({
      queryKey: getListVendorProductsQueryKey(vendor?.id ?? 0),
    });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLocalNowFeedQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getGetMarketplaceStatsQueryKey(),
    });
  }

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
          <p className="mt-2 text-muted-foreground">
            We couldn't find a business at this URL.
          </p>
          <Link href="/submit">
            <Button className="mt-6">List your business</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const inStockCount = products.filter((p) => p.inStock).length;
  const liveBatchDrops = products.filter(
    (p) => p.listingType === "batch_drop" && p.inStock,
  ).length;
  const liveSurplus = products.filter(
    (p) => p.listingType === "surplus" && p.inStock,
  ).length;

  return (
    <Layout>
      <div className="border-b border-border bg-muted">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={vendor.imageUrl}
                alt={vendor.name}
                className="h-16 w-16 rounded-lg border border-border object-cover md:h-20 md:w-20"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                  Your dashboard
                </p>
                <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
                  {vendor.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {vendor.category} · {vendor.location}, {vendor.region}
                </p>
              </div>
            </div>
            <Link href={`/vendors/${vendor.id}`}>
              <Button variant="outline" className="gap-2">
                View public profile
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Bookmark className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Bookmark this page</strong> — this URL is your private
              dashboard. Anyone with the link can manage your listings, so keep
              it to yourself.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10 space-y-8">
        <AnalyticsPanel kind="vendor" id={vendor.id} />
        <VisitRequestsPanel vendorId={vendor.id} />
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <SupportRequestForm />
        </section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          <StatCard
            icon={Package}
            label="Total products"
            value={products.length}
          />
          <StatCard icon={Tag} label="In stock" value={inStockCount} />
          <StatCard
            icon={Flame}
            label="Live batch drops"
            value={liveBatchDrops}
            accent="text-amber-700"
          />
          <StatCard
            icon={TrendingDown}
            label="Live surplus"
            value={liveSurplus}
            accent="text-emerald-700"
          />
        </div>

        <h2 className="mt-12 mb-4 font-serif text-2xl font-bold text-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map(({ type, title, blurb, icon: Icon, accent }) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveAction(type)}
              className="group flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground">{blurb}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>

        <h2 className="mt-12 mb-4 font-serif text-2xl font-bold text-foreground">
          Your listings
        </h2>
        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted px-6 py-16 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-serif text-xl font-bold text-foreground">
              Nothing listed yet
            </p>
            <p className="mt-1 text-muted-foreground">
              Use a quick action above to get your first listing live.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {products.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "flex flex-col gap-4 p-4 md:flex-row md:items-center",
                  i > 0 && "border-t border-border",
                )}
              >
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg font-bold text-foreground">
                      {p.name}
                    </p>
                    <ListingBadge type={p.listingType} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {p.description}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-foreground">
                      ${(p.priceCents / 100).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground"> / {p.unit}</span>
                    {p.listingType === "surplus" && p.originalPriceCents && (
                      <span className="ml-2 text-xs text-muted-foreground line-through">
                        ${(p.originalPriceCents / 100).toFixed(2)}
                      </span>
                    )}
                    {p.availableUntil && (
                      <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Until{" "}
                        {new Date(p.availableUntil).toLocaleDateString()}
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
                          {
                            id: p.id,
                            data: { inStock: checked },
                          },
                          {
                            onSuccess: () => {
                              invalidateAll();
                            },
                          },
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
                      if (
                        !confirm(`Delete "${p.name}"? This can't be undone.`)
                      )
                        return;
                      deleteProduct.mutate(
                        { id: p.id },
                        {
                          onSuccess: () => {
                            invalidateAll();
                            toast({
                              title: "Deleted",
                              description: `${p.name} was removed.`,
                            });
                          },
                        },
                      );
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeAction && (
        <QuickAddDialog
          open={!!activeAction}
          type={activeAction}
          vendorId={vendor.id}
          vendorCategory={vendor.category}
          onClose={() => setActiveAction(null)}
          onCreated={() => {
            invalidateAll();
            setActiveAction(null);
          }}
        />
      )}
    </Layout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Icon className={cn("h-5 w-5", accent ?? "text-muted-foreground")} />
      <p className="mt-2 font-serif text-2xl font-bold text-foreground">
        {value}
      </p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function ListingPromoActions({
  productId,
  featured,
}: {
  productId: number;
  featured: boolean;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"boost" | "feature" | null>(null);

  const sessionToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ol_session")
      : null;

  const handleBoost = async () => {
    if (!sessionToken) {
      toast({ title: "Sign in to boost listings" });
      return;
    }
    setBusy("boost");
    try {
      const r = await fetch("/api/billing/feature-boost/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ productId }),
      });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url) {
        toast({
          title: "Couldn't start checkout",
          description: data.error ?? "Try again in a moment.",
          variant: "destructive",
        });
        return;
      }
      window.location.href = data.url;
    } finally {
      setBusy(null);
    }
  };

  const handleFeature = async () => {
    if (!sessionToken) return;
    setBusy("feature");
    try {
      const r = await fetch(`/api/products/${productId}/feature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = (await r.json().catch(() => ({}))) as {
        error?: string;
        currentlyActive?: number;
        allowance?: number;
      };
      if (!r.ok) {
        toast({
          title: "Couldn't feature listing",
          description: data.error ?? "Try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Listing featured",
        description: `Using ${data.currentlyActive}/${data.allowance} included slots.`,
      });
    } finally {
      setBusy(null);
    }
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
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== null}
          onClick={handleFeature}
          title="Use one of your 2 Premium featured slots"
        >
          <Star className="mr-1 h-3.5 w-3.5" /> Feature
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={busy !== null}
        onClick={handleBoost}
        title={`$${FEATURE_BOOST_PRICE} · features this listing for ${FEATURE_BOOST_DURATION_DAYS} days`}
      >
        <Zap className="mr-1 h-3.5 w-3.5" />
        {busy === "boost" ? "Opening…" : `Boost $${FEATURE_BOOST_PRICE}`}
      </Button>
    </div>
  );
}

function ListingBadge({ type }: { type: string }) {
  const styles: Record<string, { label: string; cls: string }> = {
    batch_drop: {
      label: "Batch drop",
      cls: "bg-amber-100 text-amber-800",
    },
    surplus: {
      label: "Surplus",
      cls: "bg-emerald-100 text-emerald-800",
    },
    pre_order: {
      label: "Pre-order",
      cls: "bg-sky-100 text-sky-800",
    },
    regular: { label: "Regular", cls: "bg-stone-100 text-stone-700" },
  };
  const s = styles[type] ?? styles.regular!;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

function QuickAddDialog({
  open,
  type,
  vendorId,
  vendorCategory,
  onClose,
  onCreated,
}: {
  open: boolean;
  type: QuickType;
  vendorId: number;
  vendorCategory: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();

  const schema =
    type === "surplus"
      ? surplusSchema
      : type === "batch_drop"
        ? batchSchema
        : regularSchema;

  const form = useForm<FormShape>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      priceDollars: 0,
      unit: type === "batch_drop" ? "loaf" : "item",
      imageUrl: "",
      originalPriceDollars: 0,
    },
  });

  const titles: Record<QuickType, string> = {
    batch_drop: "Drop a batch",
    surplus: "Mark surplus",
    regular: "Add a product",
  };
  const subtitles: Record<QuickType, string> = {
    batch_drop:
      "Tell people what just came out. Shows up in Local Near Me Now until it sells out.",
    surplus:
      "Discount your end-of-market leftovers so they don't go to waste.",
    regular: "A regular item for your storefront.",
  };

  function onSubmit(values: FormShape) {
    const priceCents = Math.round(values.priceDollars * 100);
    const payload = {
      vendorId,
      name: values.name,
      description: values.description,
      priceCents,
      unit: values.unit,
      category: vendorCategory,
      imageUrl: values.imageUrl || "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80",
      inStock: true,
      featured: false,
      listingType: type,
      originalPriceCents:
        type === "surplus" && values.originalPriceDollars
          ? Math.round(values.originalPriceDollars * 100)
          : null,
      availableUntil: null,
      pickupNote: null,
    };

    createProduct.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({
            title:
              type === "batch_drop"
                ? "Batch is live"
                : type === "surplus"
                  ? "Surplus listed"
                  : "Product added",
            description: `${values.name} is now visible to neighbors.`,
          });
          form.reset();
          onCreated();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Couldn't save",
            description: "Please try again.",
          });
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {titles[type]}
          </DialogTitle>
          <DialogDescription>{subtitles[type]}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 pt-2"
        >
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Name</label>
            <Input
              placeholder={
                type === "batch_drop"
                  ? "Sourdough miche"
                  : type === "surplus"
                    ? "Sunday market leftovers — pastry box"
                    : "Whole-grain bread"
              }
              autoFocus
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Short description
            </label>
            <Textarea
              placeholder="A sentence or two — what is it, who is it for?"
              className="min-h-[80px]"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={type === "surplus" ? "" : "col-span-2"}>
              <label className="mb-1.5 block text-sm font-semibold">
                {type === "surplus" ? "Sale price" : "Price"} ($)
              </label>
              <Input
                type="number"
                step="0.01"
                {...form.register("priceDollars")}
              />
            </div>
            {type === "surplus" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Original ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("originalPriceDollars")}
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Unit</label>
              <Input
                placeholder="loaf, bag, lb"
                {...form.register("unit")}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">
              Image URL <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input placeholder="https://..." {...form.register("imageUrl")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {type === "batch_drop"
                ? "Drop batch"
                : type === "surplus"
                  ? "List surplus"
                  : "Add product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
