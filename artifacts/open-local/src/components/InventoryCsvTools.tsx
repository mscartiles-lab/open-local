import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import { Download, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface CsvRow {
  name?: string;
  description?: string;
  priceCents?: string;
  unit?: string;
  category?: string;
  imageUrl?: string;
  inStock?: string;
  listingType?: string;
}

export default function InventoryCsvTools({
  vendorId,
  onImported,
}: {
  vendorId: number;
  onImported: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"import" | "export" | null>(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      const r = await fetch(`/api/vendors/${vendorId}/products/export`, {
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const csv = await r.text();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-vendor-${vendorId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        variant: "destructive",
        title: t("csv.exportFailed"),
        description: (e as Error).message,
      });
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("import");
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data
            .filter((r) => r.name && r.name.trim())
            .map((r) => ({
              name: (r.name ?? "").trim(),
              description: (r.description ?? "").trim(),
              priceCents: Number(r.priceCents ?? 0),
              unit: (r.unit ?? "").trim(),
              category: (r.category ?? "").trim(),
              imageUrl: r.imageUrl?.trim() || undefined,
              inStock:
                r.inStock === undefined || r.inStock === ""
                  ? undefined
                  : ["true", "1", "yes"].includes(r.inStock.trim().toLowerCase()),
              listingType: (r.listingType?.trim() || undefined) as
                | "regular"
                | "batch_drop"
                | "surplus"
                | "pre_order"
                | undefined,
            }));

          if (rows.length === 0) {
            toast({
              variant: "destructive",
              title: t("csv.noValidRows"),
              description: t("csv.noValidRowsHint"),
            });
            return;
          }

          const resp = await fetch(`/api/vendors/${vendorId}/products/bulk-import`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ rows }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            throw new Error(data.error ?? `HTTP ${resp.status}`);
          }
          toast({
            title: t("csv.importComplete"),
            description: t("csv.importedCount", { count: data.imported }),
          });
          onImported();
        } catch (err) {
          toast({
            variant: "destructive",
            title: t("csv.importFailed"),
            description: (err as Error).message,
          });
        } finally {
          setBusy(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (err) => {
        setBusy(null);
        toast({
          variant: "destructive",
          title: t("csv.couldntRead"),
          description: err.message,
        });
      },
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={busy !== null}
      >
        {busy === "export" ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" />
        )}
        {t("csv.exportCsv")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy !== null}
      >
        {busy === "import" ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        {t("csv.importCsv")}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
