import { useEffect, useState } from "react";
import { Loader2, Trash2, ShieldCheck } from "lucide-react";
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

interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: string;
  state: string;
  zip: string | null;
  tier: string;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export default function UsersAdminTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/users", { headers: authHeaders() });
      if (r.status === 401 || r.status === 403) {
        setError(t("admin.adminAccessRequired"));
        setUsers(null);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setUsers(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const setRole = async (id: number, role: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: t("admin.userRoleUpdated") });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.userRoleUpdateFailed"), description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: t("admin.userDeleted") });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.userDeleteFailed"), description: (e as Error).message });
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
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.userColUser")}</TableHead>
                  <TableHead>{t("admin.userColEmail")}</TableHead>
                  <TableHead>{t("admin.colLocation")}</TableHead>
                  <TableHead>{t("admin.userColTier")}</TableHead>
                  <TableHead>{t("admin.userColRole")}</TableHead>
                  <TableHead>{t("admin.userColJoined")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {u.role === "admin" && <ShieldCheck className="w-4 h-4 text-amber-600" />}
                        @{u.username}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.zip ? `${u.zip}, ` : ""}{u.state}
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">
                        {u.tier}
                        {!u.stripeSubscriptionId && <span className="text-muted-foreground"> ({t("admin.userUnpaid")})</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        onValueChange={(v) => setRole(u.id, v)}
                        disabled={busyId === u.id}
                      >
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shopper">{t("admin.userRoleShopper")}</SelectItem>
                          <SelectItem value="vendor">{t("admin.userRoleVendor")}</SelectItem>
                          <SelectItem value="admin">{t("admin.userRoleAdmin")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" disabled={busyId === u.id}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("admin.deleteUserTitle", { username: u.username })}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("admin.deleteUserWarning")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("admin.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">{t("admin.noUsers")}</div>
        )}
      </CardContent>
    </Card>
  );
}
