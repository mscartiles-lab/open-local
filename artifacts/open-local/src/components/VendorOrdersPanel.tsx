import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, CheckCircle2, Clock, XCircle, RefreshCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SESSION_KEY = "ol_session";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface VendorOrder {
  id: number;
  status: "pending" | "paid" | "refunded" | "cancelled";
  amountCents: number;
  platformFeeCents: number;
  quantity: number;
  pickupNote: string | null;
  createdAt: string;
  productId: number;
  productName: string;
  listingType: string;
  availableUntil: string | null;
  buyerUsername: string;
  buyerEmail: string;
}

const STATUS_META = {
  paid: { label: "Paid", icon: CheckCircle2, className: "text-emerald-600" },
  pending: { label: "Pending", icon: Clock, className: "text-amber-500" },
  refunded: { label: "Refunded", icon: RefreshCcw, className: "text-muted-foreground" },
  cancelled: { label: "Cancelled", icon: XCircle, className: "text-muted-foreground" },
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function VendorOrdersPanel({ vendorId }: { vendorId: number }) {
  const [orders, setOrders] = useState<VendorOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/orders`, { headers: authHeaders() })
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => d && setOrders(d.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (forbidden) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-xl font-bold">Orders received</h2>
          {orders && orders.length > 0 && (
            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
              {orders.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <ShoppingBag className="w-8 h-8 opacity-30" />
            <p className="text-sm">No orders yet. Set up payouts above to start accepting card payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Order</th>
                  <th className="pb-2 pr-4 font-medium">Customer</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Your payout</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => {
                  const meta = STATUS_META[o.status] ?? STATUS_META.pending;
                  const StatusIcon = meta.icon;
                  const payoutCents = o.amountCents - o.platformFeeCents;
                  return (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium truncate max-w-[140px]">{o.productName}</p>
                        {o.quantity > 1 && <p className="text-xs text-muted-foreground">×{o.quantity}</p>}
                        {o.pickupNote && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate">
                            {o.pickupNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">@{o.buyerUsername}</p>
                        <p className="text-xs text-muted-foreground">{o.buyerEmail}</p>
                      </td>
                      <td className="py-3 pr-4 font-medium">{formatCents(o.amountCents)}</td>
                      <td className="py-3 pr-4 text-emerald-700 font-medium">{formatCents(payoutCents)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("flex items-center gap-1 text-xs font-medium", meta.className)}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
