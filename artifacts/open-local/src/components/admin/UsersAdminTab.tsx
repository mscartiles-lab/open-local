import { useEffect, useState } from "react";
import { Loader2, Trash2, ShieldCheck } from "lucide-react";
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
        setError("Admin access required. Make sure you're signed in with an admin account.");
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
      toast({ title: "Role updated" });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to update role", description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: "User deleted" });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to delete user", description: (e as Error).message });
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
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {!u.stripeSubscriptionId && <span className="text-muted-foreground"> (unpaid)</span>}
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
                          <SelectItem value="shopper">Shopper</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
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
                            <AlertDialogTitle>Delete @{u.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the user account and their session. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
          <div className="text-center py-12 text-muted-foreground">No users yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
