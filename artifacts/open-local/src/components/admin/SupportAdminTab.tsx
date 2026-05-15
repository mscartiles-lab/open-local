import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AdminSupportTicket {
  id: number;
  reference: string;
  userId: number;
  email: string | null;
  username: string | null;
  role: string | null;
  subject: string;
  body: string;
  status: "open" | "in_progress" | "resolved";
  flaggedStale: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

const STATUS_BADGES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-sky-100 text-sky-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

function hoursOpen(createdAt: string): number {
  return Math.round((Date.now() - new Date(createdAt).getTime()) / 3_600_000);
}

export default function SupportAdminTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminSupportTicket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [openBodyId, setOpenBodyId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/support/tickets", { headers: authHeaders() });
      if (r.status === 401 || r.status === 403) {
        setError("Admin access required. Make sure you're signed in with an admin account.");
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

  useEffect(() => {
    reload();
  }, []);

  const setStatus = async (id: number, status: AdminSupportTicket["status"]) => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/support/tickets/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { webhookFired?: boolean };
      toast({
        title: `Marked ${status.replace("_", " ")}`,
        description:
          status === "resolved" && data.webhookFired
            ? "Resolved check-in webhook fired to n8n."
            : undefined,
      });
      await reload();
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: (e as Error).message,
      });
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : rows && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const expanded = openBodyId === t.id;
                  const age = hoursOpen(t.createdAt);
                  return (
                    <>
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs">
                          {t.reference}
                          {t.flaggedStale && (
                            <span className="ml-1 inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-[10px] uppercase">stale</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{t.username ?? "—"}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {t.email ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[28ch]">
                          <button
                            type="button"
                            className="text-left text-sm hover:underline"
                            onClick={() => setOpenBodyId(expanded ? null : t.id)}
                          >
                            <span className="line-clamp-2">{t.subject}</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t.status === "resolved" && t.resolvedAt
                            ? `Resolved ${new Date(t.resolvedAt).toLocaleDateString()}`
                            : `${age}h`}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.status}
                            onValueChange={(v) =>
                              setStatus(t.id, v as AdminSupportTicket["status"])
                            }
                            disabled={busyId === t.id}
                          >
                            <SelectTrigger
                              className={`w-36 h-8 capitalize ${STATUS_BADGES[t.status] ?? ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status !== "resolved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatus(t.id, "resolved")}
                              disabled={busyId === t.id}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark resolved
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow key={`${t.id}-body`}>
                          <TableCell colSpan={6} className="bg-muted/40">
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground py-2">
                              {t.body}
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No support tickets yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
