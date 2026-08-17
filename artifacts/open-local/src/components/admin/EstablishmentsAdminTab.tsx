import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, Trash2, MapPin, ExternalLink, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AdminEstablishment {
  id: number;
  name: string;
  type: string;
  city: string;
  state: string;
  contactEmail: string;
  status: string;
  tier: string;
  isTrial: boolean;
  stripeSubscriptionId: string | null;
  website: string | null;
  createdAt: string;
}

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

export default function EstablishmentsAdminTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminEstablishment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/establishments", { headers: authHeaders() });
      if (r.status === 401 || r.status === 403) {
        setError(t("admin.adminAccessRequired"));
        setRows(null);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRows(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const setStatus = async (id: number, status: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/establishments/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: t("admin.estabMarked", { status }) });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.estabUpdateFailed"), description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/establishments/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: t("admin.estabDeleted") });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.estabDeleteFailed"), description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">{error}</CardContent></Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : rows && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.estabColBusiness")}</TableHead>
                  <TableHead>{t("admin.estabColType")}</TableHead>
                  <TableHead>{t("admin.colLocation")}</TableHead>
                  <TableHead>{t("admin.estabColTier")}</TableHead>
                  <TableHead>{t("admin.estabColStatus")}</TableHead>
                  <TableHead>{t("admin.estabColSubmitted")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{e.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{e.contactEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize text-sm">{e.type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {e.city}, {e.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">
                        {e.tier}
                        {!e.stripeSubscriptionId && <span className="text-muted-foreground"> ({t("admin.userUnpaid")})</span>}
                        {e.isTrial && <span className="ml-1 text-xs text-emerald-700">{t("admin.estabTrial")}</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={e.status}
                        onValueChange={(v) => setStatus(e.id, v)}
                        disabled={busyId === e.id}
                      >
                        <SelectTrigger className={`w-32 h-8 capitalize ${STATUS_BADGES[e.status] ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t("admin.estabStatusPending")}</SelectItem>
                          <SelectItem value="active">{t("admin.estabStatusActive")}</SelectItem>
                          <SelectItem value="rejected">{t("admin.estabStatusRejected")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/business-dashboard/${e.id}`}>
                          <Button variant="ghost" size="icon" title={t("admin.estabAnalyticsDashboard")}>
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </Link>
                        {e.website && (
                          <a href={e.website} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                          </a>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={busyId === e.id}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.deleteEstabTitle", { name: e.name })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("admin.deleteEstabWarning")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.delete")}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">{t("admin.noEstablishments")}</div>
        )}
      </CardContent>
    </Card>
  );
}
