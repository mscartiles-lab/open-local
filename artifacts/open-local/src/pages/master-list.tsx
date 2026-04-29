import { useState, useMemo } from "react";
import {
  useListProducts,
  useListVendors,
  useGetMarketplaceStats,
} from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import {
  Search,
  Download,
  Package,
  Store,
  Tag,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CircleCheck,
  CircleX,
  Flame,
  Percent,
  BookmarkPlus,
  ListFilter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type SortField = "name" | "vendorName" | "category" | "priceCents" | "createdAt";
type SortDir = "asc" | "desc";

const LISTING_TYPE_META: Record<string, { label: string; color: string; icon: typeof Flame }> = {
  regular: { label: "Regular", color: "bg-gray-100 text-gray-700", icon: Package },
  batch_drop: { label: "Batch Drop", color: "bg-orange-100 text-orange-700", icon: Flame },
  surplus: { label: "Surplus", color: "bg-amber-100 text-amber-700", icon: Percent },
  pre_order: { label: "Pre-Order", color: "bg-blue-100 text-blue-700", icon: BookmarkPlus },
};

function SortButton({
  field,
  active,
  dir,
  onClick,
  children,
}: {
  field: SortField;
  active: SortField;
  dir: SortDir;
  onClick: (f: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === active;
  return (
    <button
      onClick={() => onClick(field)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
    >
      {children}
      {isActive ? (
        dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

export default function MasterList() {
  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: vendors } = useListVendors();
  const { data: stats } = useGetMarketplaceStats();

  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const allVendors = useMemo(() => {
    const seen = new Set<string>();
    return (products ?? [])
      .filter((p) => { if (seen.has(p.vendorName)) return false; seen.add(p.vendorName); return true; })
      .map((p) => p.vendorName)
      .sort();
  }, [products]);

  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    return (products ?? [])
      .filter((p) => { if (seen.has(p.category)) return false; seen.add(p.category); return true; })
      .map((p) => p.category)
      .sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products ?? [];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    if (vendorFilter !== "all") list = list.filter((p) => p.vendorName === vendorFilter);
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (typeFilter !== "all") list = list.filter((p) => p.listingType === typeFilter);
    if (stockFilter === "in") list = list.filter((p) => p.inStock);
    if (stockFilter === "out") list = list.filter((p) => !p.inStock);

    return [...list].sort((a, b) => {
      let av: string | number = a[sortField] ?? "";
      let bv: string | number = b[sortField] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [products, search, vendorFilter, categoryFilter, typeFilter, stockFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Vendor", "Category", "Price", "Unit", "Type", "In Stock", "Featured", "Added"],
      ...filtered.map((p) => [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.vendorName.replace(/"/g, '""')}"`,
        p.category,
        (p.priceCents / 100).toFixed(2),
        p.unit,
        p.listingType ?? "regular",
        p.inStock ? "Yes" : "No",
        p.featured ? "Yes" : "No",
        new Date(p.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `open-local-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inStockCount = (products ?? []).filter((p) => p.inStock).length;
  const vendorCount = vendors?.length ?? stats?.vendorCount ?? 0;

  return (
    <Layout>
      {/* Header */}
      <div className="bg-muted border-b border-border">
        <div className="container max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Admin · Catalog</p>
              <h1 className="text-4xl font-serif font-bold text-foreground">Master Product List</h1>
              <p className="text-muted-foreground mt-1.5 font-sans">
                Every product uploaded across all vendors — live, searchable, and exportable.
              </p>
            </div>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { icon: Package, label: "Total Products", value: productsLoading ? "—" : (products?.length ?? 0) },
              { icon: Store, label: "Vendors", value: vendorCount },
              { icon: CircleCheck, label: "In Stock", value: productsLoading ? "—" : inStockCount },
              { icon: Tag, label: "Categories", value: allCategories.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-background rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-serif font-bold text-foreground leading-none">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, vendor, category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Store className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All vendors</SelectItem>
              {allVendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <ListFilter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="batch_drop">Batch Drop</SelectItem>
              <SelectItem value="surplus">Surplus</SelectItem>
              <SelectItem value="pre_order">Pre-Order</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="in">In stock</SelectItem>
              <SelectItem value="out">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Result count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {productsLoading ? "Loading…" : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
            {(search || vendorFilter !== "all" || categoryFilter !== "all" || typeFilter !== "all" || stockFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setVendorFilter("all"); setCategoryFilter("all"); setTypeFilter("all"); setStockFilter("all"); }}
                className="ml-2 text-primary underline text-xs"
              >
                Clear filters
              </button>
            )}
          </p>
          <p className="text-xs text-muted-foreground hidden sm:block">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Sorted by {sortField === "createdAt" ? "newest" : sortField} · {sortDir}
          </p>
        </div>

        {/* Table */}
        {productsLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products match your filters.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-4 py-3 text-left">
                      <SortButton field="name" active={sortField} dir={sortDir} onClick={handleSort}>
                        Product
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortButton field="vendorName" active={sortField} dir={sortDir} onClick={handleSort}>
                        Vendor
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortButton field="category" active={sortField} dir={sortDir} onClick={handleSort}>
                        Category
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortButton field="priceCents" active={sortField} dir={sortDir} onClick={handleSort}>
                        Price
                      </SortButton>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left">
                      <SortButton field="createdAt" active={sortField} dir={sortDir} onClick={handleSort}>
                        Added
                      </SortButton>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filtered.map((product) => {
                    const typeMeta = LISTING_TYPE_META[product.listingType ?? "regular"] ?? LISTING_TYPE_META.regular;
                    const TypeIcon = typeMeta.icon;
                    return (
                      <tr key={product.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-9 h-9 rounded-md object-cover flex-shrink-0 border border-border"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-foreground leading-tight">{product.name}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/vendors/${product.vendorSlug}`}
                            className="text-primary font-medium hover:underline"
                          >
                            {product.vendorName}
                          </a>
                          <div className="text-xs text-muted-foreground">{product.vendorLocation}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          ${(product.priceCents / 100).toFixed(2)}
                          <span className="text-xs text-muted-foreground font-normal"> / {product.unit}</span>
                          {product.originalPriceCents && (
                            <div className="text-xs text-muted-foreground line-through">
                              ${(product.originalPriceCents / 100).toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeMeta.color}`}>
                            <TypeIcon className="w-3 h-3" />
                            {typeMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {product.inStock ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CircleCheck className="w-3.5 h-3.5" /> In stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <CircleX className="w-3.5 h-3.5" /> Out of stock
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(product.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
