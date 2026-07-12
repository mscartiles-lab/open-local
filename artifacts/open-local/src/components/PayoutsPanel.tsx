import { useEffect, useState } from "react";
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

const STATUS_INFO: Record<ConnectStatus, { label: string; description: string; icon: typeof Clock; className: string }> = {
  none: {
    label: "Not set up",
    description: "Set up payouts to accept card payments for your listings. Stripe handles the secure bank onboarding.",
    icon: Banknote,
    className: "text-muted-foreground",
  },
  pending: {
    label: "Onboarding in progress",
    description: "You started the setup but haven't finished. Complete the Stripe onboarding to start accepting payments.",
    icon: Clock,
    className: "text-amber-600",
  },
  restricted: {
    label: "Action needed",
    description: "Stripe needs more information before payments can be enabled. Click below to continue.",
    icon: AlertTriangle,
    className: "text-destructive",
  },
  active: {
    label: "Payouts active",
    description: "You can accept card payments. Funds are transferred to your bank within 2 business days of each sale.",
    icon: CheckCircle2,
    className: "text-emerald-600",
  },
};

export default function PayoutsPanel({ vendorSlug }: { vendorSlug: string }) {
  const { toast } = useToast();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      toast({ variant: "destructive", title: "Couldn't start setup", description: (e as Error).message });
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
          <h2 className="font-serif text-xl font-bold">Online payments & payouts</h2>
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
                <p className={cn("font-semibold text-sm", meta.className)}>{meta.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
                {data?.disabledReason && (
                  <p className="text-xs text-destructive mt-1">Reason: {data.disabledReason}</p>
                )}
              </div>
            </div>

            {status !== "active" && (
              <Button onClick={handleSetup} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {status === "none" ? "Set up payouts with Stripe" : "Continue Stripe onboarding"}
              </Button>
            )}

            {status === "active" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 space-y-1">
                <p className="font-semibold">How payouts work</p>
                <p>• Shoppers pay at checkout — Open Local takes an 8% platform fee.</p>
                <p>• The remaining amount is transferred to your connected bank account.</p>
                <p>• Stripe's standard payout schedule: <strong>2 business days</strong> after each charge settles.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
