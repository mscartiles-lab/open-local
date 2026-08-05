import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Package,
  ArrowRight,
  Loader2,
  Tag,
  Box,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  useListWholesaleListings,
  useCreateWholesaleListing,
  useUpdateWholesaleListing,
  useDeleteWholesaleListing,
  getListWholesaleQueryKey,
  type WholesaleListing,
} from "@workspace/api-client-react";
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Categories ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Bakery", "Farm", "Apiary", "Brewery", "Crafts",
  "Pantry", "Butcher", "Florist", "Coffee", "Other",
];

const UNITS = ["lb", "oz", "kg", "case", "flat", "dozen", "bundle", "bag", "each", "gallon", "pint", "quart"];

// ─── Listing form state ───────────────────────────────────────────────────────

interface ListingForm {
  title: string;
  description: string;
  category: string;
  pricePerUnit: string;
  unit: string;
  minOrderQty: string;
  availableQty: string;
  imageUrl: string;
  expiresAt: string;
}

const EMPTY_FORM: ListingForm = {
  title: "",
  description: "",
  category: "",
  pricePerUnit: "",
  unit: "",
  minOrderQty: "1",
  availableQty: "",
  imageUrl: "",
  expiresAt: "",
};

// ─── WholesaleCard ────────────────────────────────────────────────────────────

function WholesaleCard({
  listing,
  isOwner,
  onEdit,
  onDelete,
}: {
  listing: WholesaleListing;
  isOwner?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isExpired = listing.expiresAt ? new Date(listing.expiresAt) < new Date() : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
    >
      {listing.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="w-full h-44 object-cover"
        />
      ) : (
        <div className="w-full h-44 bg-gradient-to-br from-green-900/20 to-amber-900/10 flex items-center justify-center">
          <Package className="w-12 h-12 text-green-800/30" />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {listing.category && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
              <Tag className="w-3 h-3" />
              {listing.category}
            </span>
          )}
          {isExpired && (
            <span className="text-[11px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Expired
            </span>
          )}
          {listing.expiresAt && !isExpired && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              Until {new Date(listing.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-foreground text-base leading-snug">{listing.title}</h3>
          {listing.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {listing.description}
            </p>
          )}
        </div>

        {/* Price + qty */}
        <div className="flex items-end gap-3 flex-wrap">
          {listing.pricePerUnit != null && (
            <div>
              <span className="text-xl font-bold text-green-800">
                ${Number(listing.pricePerUnit).toFixed(2)}
              </span>
              {listing.unit && (
                <span className="text-sm text-muted-foreground ml-1">/{listing.unit}</span>
              )}
            </div>
          )}
          {listing.minOrderQty > 1 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Min {listing.minOrderQty} {listing.unit || "units"}
            </span>
          )}
          {listing.availableQty != null && (
            <span className="text-xs text-muted-foreground">
              {listing.availableQty} available
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
          <Link
            href={`/vendors/${listing.vendorId}`}
            className="flex items-center gap-2 min-w-0"
          >
            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-green-800">
                {listing.vendorName?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <span className="text-xs text-muted-foreground hover:text-primary transition-colors truncate">
              {listing.vendorName}
            </span>
          </Link>

          {isOwner ? (
            <div className="flex gap-1.5">
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Edit listing"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                title="Delete listing"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link href={`/vendors/${listing.vendorId}`}>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                Contact <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

function ListingModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: WholesaleListing | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<ListingForm>(() =>
    editing
      ? {
          title: editing.title,
          description: editing.description ?? "",
          category: editing.category ?? "",
          pricePerUnit: editing.pricePerUnit != null ? String(editing.pricePerUnit) : "",
          unit: editing.unit ?? "",
          minOrderQty: String(editing.minOrderQty),
          availableQty: editing.availableQty != null ? String(editing.availableQty) : "",
          imageUrl: editing.imageUrl ?? "",
          expiresAt: editing.expiresAt ? editing.expiresAt.slice(0, 10) : "",
        }
      : EMPTY_FORM,
  );

  // Reset form whenever the modal opens or switches between create/edit targets
  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              title: editing.title,
              description: editing.description ?? "",
              category: editing.category ?? "",
              pricePerUnit: editing.pricePerUnit != null ? String(editing.pricePerUnit) : "",
              unit: editing.unit ?? "",
              minOrderQty: String(editing.minOrderQty),
              availableQty: editing.availableQty != null ? String(editing.availableQty) : "",
              imageUrl: editing.imageUrl ?? "",
              expiresAt: editing.expiresAt ? editing.expiresAt.slice(0, 10) : "",
            }
          : EMPTY_FORM,
      );
    }
  }, [open, editing?.id]);

  const set = (key: keyof ListingForm) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const create = useCreateWholesaleListing();
  const update = useUpdateWholesaleListing();

  const saving = create.isPending || update.isPending;

  const handleSubmit = async () => {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      pricePerUnit: form.pricePerUnit ? parseFloat(form.pricePerUnit) : undefined,
      unit: form.unit.trim() || undefined,
      minOrderQty: parseInt(form.minOrderQty) || 1,
      availableQty: form.availableQty ? parseInt(form.availableQty) : undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, data: payload });
        toast({ title: "Listing updated" });
      } else {
        await create.mutateAsync({ data: payload });
        toast({ title: "Listing posted!" });
      }
      queryClient.invalidateQueries({ queryKey: getListWholesaleQueryKey() });
      onClose();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit listing" : "Post a wholesale listing"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Title *</label>
            <Input
              placeholder="e.g. Bulk wildflower honey — 5-gallon buckets"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">Description</label>
            <textarea
              placeholder="Describe the product, harvest details, minimum order requirements…"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Category</label>
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Unit</label>
              <Select value={form.unit} onValueChange={set("unit")}>
                <SelectTrigger><SelectValue placeholder="lb, case…" /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Price / unit</label>
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={form.pricePerUnit}
                onChange={(e) => set("pricePerUnit")(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Min order</label>
              <Input
                type="number"
                placeholder="1"
                min="1"
                value={form.minOrderQty}
                onChange={(e) => set("minOrderQty")(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Available qty</label>
              <Input
                type="number"
                placeholder="—"
                min="1"
                value={form.availableQty}
                onChange={(e) => set("availableQty")(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Image URL</label>
              <Input
                placeholder="https://…"
                value={form.imageUrl}
                onChange={(e) => set("imageUrl")(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Expires on</label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt")(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Post listing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WholesalePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WholesaleListing | null>(null);

  const { data: listings = [], isLoading } = useListWholesaleListings(
    {
      search: search.trim() || undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    },
    { query: { queryKey: getListWholesaleQueryKey({ search: search.trim() || undefined, category: categoryFilter !== "all" ? categoryFilter : undefined }) } },
  );

  const deleteM = useDeleteWholesaleListing();

  const sorted = useMemo(() => {
    const list = [...listings];
    if (sortBy === "price_asc") list.sort((a, b) => (Number(a.pricePerUnit) || 0) - (Number(b.pricePerUnit) || 0));
    if (sortBy === "price_desc") list.sort((a, b) => (Number(b.pricePerUnit) || 0) - (Number(a.pricePerUnit) || 0));
    // "newest" is default order from API
    return list;
  }, [listings, sortBy]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    return listings.filter((l) => l.category && !seen.has(l.category) && seen.add(l.category)).map((l) => l.category!);
  }, [listings]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this listing?")) return;
    try {
      await deleteM.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListWholesaleQueryKey() });
      toast({ title: "Listing removed" });
    } catch {
      toast({ title: "Could not remove listing", variant: "destructive" });
    }
  };

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (l: WholesaleListing) => { setEditing(l); setModalOpen(true); };

  return (
    <Layout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1c2a10] via-[#243316] to-[#2d3a1d] overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#fff,#fff_1px,transparent_1px,transparent_14px)]" />
        <div className="relative container max-w-6xl mx-auto px-4 py-14">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              <Box className="w-3 h-3" />
              B2B Exchange
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-semibold px-3 py-1 rounded-full">
              Vendors only
            </span>
          </div>

          <h1 className="text-5xl font-serif font-bold text-white mb-3">
            Wholesale Exchange
          </h1>
          <p className="text-green-200 text-lg max-w-xl font-sans mb-8">
            Buy and sell in bulk with fellow Florida producers. Source ingredients, trade surplus, and build supplier relationships — vendor to vendor.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {user ? (
              <Button
                onClick={openCreate}
                className="gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-6"
              >
                <Plus className="w-4 h-4" />
                Post a Listing
              </Button>
            ) : (
              <Link href="/submit">
                <Button className="gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-6">
                  <Plus className="w-4 h-4" />
                  List your business to post
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-10">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search wholesale listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="price_asc">Price: low → high</SelectItem>
              <SelectItem value="price_desc">Price: high → low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-24 text-center">
            <Package className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold text-foreground text-lg mb-2">No wholesale listings yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
              {search || categoryFilter !== "all"
                ? "No listings match your filters. Try adjusting your search."
                : "Be the first to post a wholesale listing and connect with other Florida producers."}
            </p>
            {user && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="w-4 h-4" /> Post the first listing
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {sorted.length} listing{sorted.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sorted.map((l) => (
                <WholesaleCard
                  key={l.id}
                  listing={l}
                  onEdit={() => openEdit(l)}
                  onDelete={() => handleDelete(l.id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Info banner */}
        <div className={cn(
          "mt-12 rounded-2xl border border-dashed border-[#3c4a26]/30 bg-[#f9f6f0] p-6",
          "flex flex-col sm:flex-row items-start sm:items-center gap-4",
        )}>
          <div className="flex-1">
            <p className="font-semibold text-[#1a1a1a] text-sm">How does it work?</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Wholesale listings connect vendors directly. When you see something you need, click "Contact" to visit the vendor's profile and reach out via their listed contact info or through Open Local messages.
            </p>
          </div>
          <Link href="/vendors">
            <Button variant="outline" size="sm" className="whitespace-nowrap gap-1.5">
              Browse all vendors <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Modal */}
      <ListingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />
    </Layout>
  );
}
