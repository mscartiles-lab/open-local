import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, ShoppingBag, CheckCircle2, Clock, XCircle, RefreshCcw, Package } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SESSION_KEY = "ol_session";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MyOrder {
  id: number;
  status: "pending" | "paid" | "refunded" | "cancelled";
  amountCents: number;
  platformFeeCents: number;
  quantity: number;
  pickupNote: string | null;
  createdAt: string;
  productId: number;
  productName: string;
  productImageUrl: string;
  listingType: string;
  availableUntil: string | null;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { user, openOnboarding } = useUser();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [loading, setLoading] = useState(true);

  const STATUS_META = {
    paid: { label: t("orders.paid"), icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    pending: { label: t("orders.pending"), icon: Clock, className: "text-amber-600 bg-amber-50 border-amber-200" },
    refunded: { label: t("orders.refunded"), icon: RefreshCcw, className: "text-muted-foreground bg-muted border-border" },
    cancelled: { label: t("orders.cancelled"), icon: XCircle, className: "text-muted-foreground bg-muted border-border" },
  };

  // Show success toast if redirected back from Stripe
  const [successShown, setSuccessShown] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("order") === "success" && !successShown) {
      setSuccessShown(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("order");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch("/api/orders/me", { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => setOrders(d.orders))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <Layout>
        <div className="container max-w-2xl mx-auto px-4 py-24 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground opacity-30 mb-6" />
          <h1 className="text-3xl font-serif font-bold mb-3">{t("orders.title")}</h1>
          <p className="text-muted-foreground mb-6">{t("orders.signInDescription")}</p>
          <Button onClick={openOnboarding}>{t("common.signIn")}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-serif font-bold">{t("orders.title")}</h1>
        </div>

        {/* Success banner */}
        {successShown && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t("orders.paymentConfirmed")}</p>
              <p className="text-sm">{t("orders.paymentConfirmedDetail")}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-muted-foreground">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-lg">{t("orders.noOrders")}</p>
            <Button variant="outline" onClick={() => setLocation("/products")}>{t("orders.browseListings")}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const meta = STATUS_META[o.status] ?? STATUS_META.pending;
              const StatusIcon = meta.icon;
              return (
                <Card key={o.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex gap-0">
                      {/* Product image */}
                      <div className="w-28 shrink-0 bg-muted">
                        {o.productImageUrl ? (
                          <img src={o.productImageUrl} alt={o.productName} className="w-full h-full object-cover aspect-square" />
                        ) : (
                          <div className="w-full aspect-square flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground opacity-30" />
                          </div>
                        )}
                      </div>

                      {/* Order details */}
                      <div className="flex-1 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${o.productId}`} className="font-serif font-bold text-lg hover:text-primary transition-colors">
                            {o.productName}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {t("orders.from")}{" "}
                            <Link href={`/vendors/${o.vendorId}`} className="hover:text-primary transition-colors">
                              {o.vendorName}
                            </Link>
                          </p>
                          {o.quantity > 1 && (
                            <p className="text-xs text-muted-foreground mt-1">{t("orders.quantity")} {o.quantity}</p>
                          )}
                          {o.pickupNote && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{o.pickupNote}</p>
                          )}
                          {o.availableUntil && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("orders.pickupBy")} {new Date(o.availableUntil).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 shrink-0">
                          <p className="text-xl font-bold font-serif">{formatCents(o.amountCents)}</p>
                          <span className={cn("flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5", meta.className)}>
                            <StatusIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
