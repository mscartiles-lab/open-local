import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t("admin.supportMarked", { status: status.replace("_", " ") }),
        description:
          status === "resolved" && data.webhookFired
            ? t("admin.supportWebhookFired")
            : undefined,
      });
      await reload();
    } catch (e) {
      toast({
        variant: "destructive",
        title: t("admin.supportUpdateFailed"),
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
                  <TableHead>{t("admin.supportColReference")}</TableHead>
                  <TableHead>{t("admin.supportColFrom")}</TableHead>
                  <TableHead>{t("admin.supportColSubject")}</TableHead>
                  <TableHead>{t("admin.supportColAge")}</TableHead>
                  <TableHead>{t("admin.supportColStatus")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((ticket) => {
                  const expanded = openBodyId === ticket.id;
                  const age = hoursOpen(ticket.createdAt);
                  return (
                    <>
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">
                          {ticket.reference}
                          {ticket.flaggedStale && (
                            <span className="ml-1 inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-[10px] uppercase">{t("admin.supportStale")}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium">{ticket.username ?? "—"}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {ticket.email ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[28ch]">
                          <button
                            type="button"
                            className="text-left text-sm hover:underline"
                            onClick={() => setOpenBodyId(expanded ? null : ticket.id)}
                          >
                            <span className="line-clamp-2">{ticket.subject}</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.status === "resolved" && ticket.resolvedAt
                            ? t("admin.supportResolved", { date: new Date(ticket.resolvedAt).toLocaleDateString() })
                            : `${age}h`}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={ticket.status}
                            onValueChange={(v) =>
                              setStatus(ticket.id, v as AdminSupportTicket["status"])
                            }
                            disabled={busyId === ticket.id}
                          >
                            <SelectTrigger
                              className={`w-36 h-8 capitalize ${STATUS_BADGES[ticket.status] ?? ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">{t("admin.supportStatusOpen")}</SelectItem>
                              <SelectItem value="in_progress">{t("admin.supportStatusInProgress")}</SelectItem>
                              <SelectItem value="resolved">{t("admin.supportStatusResolved")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {ticket.status !== "resolved" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatus(ticket.id, "resolved")}
                              disabled={busyId === ticket.id}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {t("admin.supportMarkResolved")}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow key={`${ticket.id}-body`}>
                          <TableCell colSpan={6} className="bg-muted/40">
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground py-2">
                              {ticket.body}
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
            {t("admin.noSupportTickets")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
