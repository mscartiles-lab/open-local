import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle2, Clock, AlertTriangle, ExternalLink, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SESSION_KEY = "ol_session";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ConnectStatus = "none" | "pending" | "active" | "restricted";

interface StatusData {
  status: ConnectStatus;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  disabledReason?: string | null;
}

export default function PayoutsPanel({ vendorSlug }: { vendorSlug: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const STATUS_INFO: Record<ConnectStatus, { labelKey: string; descriptionKey: string; icon: typeof Clock; className: string }> = {
    none: {
      labelKey: "payouts.statusNone",
      descriptionKey: "payouts.statusNoneDesc",
      icon: Banknote,
      className: "text-muted-foreground",
    },
    pending: {
      labelKey: "payouts.statusPending",
      descriptionKey: "payouts.statusPendingDesc",
      icon: Clock,
      className: "text-amber-600",
    },
    restricted: {
      labelKey: "payouts.statusRestricted",
      descriptionKey: "payouts.statusRestrictedDesc",
      icon: AlertTriangle,
      className: "text-destructive",
    },
    active: {
      labelKey: "payouts.statusActive",
      descriptionKey: "payouts.statusActiveDesc",
      icon: CheckCircle2,
      className: "text-emerald-600",
    },
  };

  useEffect(() => {
    // Check for connect=success/refresh in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "success" || params.get("connect") === "refresh") {
      // Remove param from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("connect");
      window.history.replaceState({}, "", url.toString());
    }

    fetch("/api/billing/connect/status", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d: StatusData) => setData(d))
      .catch(() => setData({ status: "none" }))
      .finally(() => setLoading(false));
  }, [vendorSlug]);

  const handleSetup = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/billing/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`);
      window.location.href = d.url;
    } catch (e) {
      toast({ variant: "destructive", title: t("payouts.setupError"), description: (e as Error).message });
      setBusy(false);
    }
  };

  const status = data?.status ?? "none";
  const meta = STATUS_INFO[status];
  const StatusIcon = meta.icon;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Banknote className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl font-bold">{t("payouts.title")}</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-4">
              <StatusIcon className={cn("w-5 h-5 mt-0.5 shrink-0", meta.className)} />
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", meta.className)}>{t(meta.labelKey)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t(meta.descriptionKey)}</p>
                {data?.disabledReason && (
                  <p className="text-xs text-destructive mt-1">{t("payouts.reason")}: {data.disabledReason}</p>
                )}
              </div>
            </div>

            {status !== "active" && (
              <Button onClick={handleSetup} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {status === "none" ? t("payouts.setupWithStripe") : t("payouts.continueOnboarding")}
              </Button>
            )}

            {status === "active" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 space-y-1">
                <p className="font-semibold">{t("payouts.howItWorks")}</p>
                <p>{t("payouts.bullet1")}</p>
                <p>{t("payouts.bullet2")}</p>
                <p>{t("payouts.bullet3")} <strong>{t("payouts.bullet3Days")}</strong>{t("payouts.bullet3Suffix")}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
