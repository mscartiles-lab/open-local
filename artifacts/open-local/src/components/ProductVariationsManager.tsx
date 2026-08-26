import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

interface Variation {
  id: number;
  productId: number;
  name: string;
  priceCents: number;
  sku: string | null;
  inStock: boolean;
  sortOrder: number;
}

export default function ProductVariationsManager({ productId }: { productId: number }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [variations, setVariations] = useState<Variation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newSku, setNewSku] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/products/${productId}/variations`);
      const data = await r.json();
      setVariations(data.variations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && variations === null) load();
  }, [open]);

  const addVariation = async () => {
    if (!newName.trim() || !newPrice) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/products/${productId}/variations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: newName.trim(),
          priceCents: Math.round(Number(newPrice) * 100),
          sku: newSku.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
      setNewName("");
      setNewPrice("");
      setNewSku("");
      await load();
    } catch (e) {
      toast({ variant: "destructive", title: t("variations.addError"), description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const toggleStock = async (v: Variation) => {
    setBusy(true);
    try {
      await fetch(`/api/products/variations/${v.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ inStock: !v.inStock }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeVariation = async (id: number) => {
    setBusy(true);
    try {
      await fetch(`/api/products/variations/${id}`, { method: "DELETE", headers: authHeaders() });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full border-t border-border/60 pt-2 mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <Layers className="h-3.5 w-3.5" />
        {t("variations.sectionTitle")} {variations && variations.length > 0 ? `(${variations.length})` : ""}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-3">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              {variations && variations.length > 0 && (
                <div className="space-y-1.5">
                  {variations.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate font-medium">{v.name}</span>
                      <span className="text-muted-foreground">${(v.priceCents / 100).toFixed(2)}</span>
                      {v.sku && <span className="text-xs text-muted-foreground font-mono">{v.sku}</span>}
                      <Switch checked={v.inStock} onCheckedChange={() => toggleStock(v)} disabled={busy} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeVariation(v.id)}
                        disabled={busy}
                        title={t("variations.remove")}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Input
                  placeholder={t("variations.namePlaceholder")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 w-32 text-sm"
                />
                <Input
                  placeholder={t("variations.pricePlaceholder")}
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="h-8 w-24 text-sm"
                />
                <Input
                  placeholder={t("variations.skuPlaceholder")}
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="h-8 w-28 text-sm"
                />
                <Button size="sm" variant="outline" onClick={addVariation} disabled={busy || !newName.trim() || !newPrice}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> {t("variations.add")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
