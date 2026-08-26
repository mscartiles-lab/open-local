import { useEffect, useState } from "react";
import { Loader2, Shield, Search, X, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface IpLog {
  id: number;
  ip: string;
  method: string;
  path: string;
  eventType: string;
  userId: number | null;
  userAgent: string | null;
  statusCode: number | null;
  createdAt: string;
}

interface IpSummaryRow {
  ip: string;
  count: number;
  lastSeen: string;
  authEvents: number;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("ol_session");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const EVENT_COLORS: Record<string, string> = {
  visit: "bg-stone-100 text-stone-700",
  login_attempt: "bg-amber-100 text-amber-800",
  login_success: "bg-emerald-100 text-emerald-800",
  login_failure: "bg-red-100 text-red-700",
  signup_attempt: "bg-sky-100 text-sky-800",
  signup_success: "bg-emerald-100 text-emerald-800",
  signup_failure: "bg-red-100 text-red-700",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function IpLogsAdminTab() {
  const { t } = useTranslation();
  const [view, setView] = useState<"log" | "summary">("summary");
  const [rows, setRows] = useState<IpLog[] | null>(null);
  const [summary, setSummary] = useState<IpSummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterIp, setFilterIp] = useState("");
  const [filterEvent, setFilterEvent] = useState("all");
  const [draftIp, setDraftIp] = useState("");
  const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

  const fetchLog = async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (filterIp) params.set("ip", filterIp);
    if (filterEvent !== "all") params.set("eventType", filterEvent);
    const r = await fetch(`${base}/api/admin/ip-logs?${params}`, { headers: authHeaders() });
    if (r.ok) setRows(await r.json());
    setLoading(false);
  };

  const fetchSummary = async () => {
    setLoading(true);
    const r = await fetch(`${base}/api/admin/ip-logs/summary`, { headers: authHeaders() });
    if (r.ok) setSummary(await r.json());
    setLoading(false);
  };

  useEffect(() => {
    if (view === "summary") fetchSummary();
    else fetchLog();
  }, [view, filterIp, filterEvent]);

  const applyIpFilter = () => {
    setFilterIp(draftIp.trim());
    if (view === "summary") setView("log");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-bold text-foreground">{t("admin.ipAccessLogs")}</h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "summary" ? "default" : "outline"}
            onClick={() => setView("summary")}
          >
            {t("admin.ip24hSummary")}
          </Button>
          <Button
            size="sm"
            variant={view === "log" ? "default" : "outline"}
            onClick={() => setView("log")}
          >
            {t("admin.ipEventLog")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => view === "summary" ? fetchSummary() : fetchLog()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Filters (log view only) */}
      {view === "log" && (
        <div className="flex gap-2 flex-wrap">
          <form
            onSubmit={(e) => { e.preventDefault(); applyIpFilter(); }}
            className="flex gap-2"
          >
            <Input
              placeholder={t("admin.ipFilterByIp")}
              value={draftIp}
              onChange={(e) => setDraftIp(e.target.value)}
              className="w-44 h-8 text-sm"
            />
            <Button size="sm" type="submit" variant="outline">
              <Search className="h-3.5 w-3.5" />
            </Button>
            {filterIp && (
              <Button size="sm" variant="ghost" onClick={() => { setFilterIp(""); setDraftIp(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </form>
          <Select value={filterEvent} onValueChange={setFilterEvent}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder={t("admin.ipEventType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.ipAllEvents")}</SelectItem>
              <SelectItem value="visit">{t("admin.ipVisits")}</SelectItem>
              <SelectItem value="login_attempt">{t("admin.ipLoginAttempt")}</SelectItem>
              <SelectItem value="login_success">{t("admin.ipLoginSuccess")}</SelectItem>
              <SelectItem value="login_failure">{t("admin.ipLoginFailure")}</SelectItem>
              <SelectItem value="signup_attempt">{t("admin.ipSignupAttempt")}</SelectItem>
              <SelectItem value="signup_success">{t("admin.ipSignupSuccess")}</SelectItem>
              <SelectItem value="signup_failure">{t("admin.ipSignupFailure")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t("admin.loading")}</span>
        </div>
      ) : view === "summary" ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.ipColIpAddress")}</TableHead>
                <TableHead className="text-right">{t("admin.ipColRequests24h")}</TableHead>
                <TableHead className="text-right">{t("admin.ipColAuthEvents")}</TableHead>
                <TableHead>{t("admin.ipColLastSeen")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summary ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                    {t("admin.ipNoRequests24h")}
                  </TableCell>
                </TableRow>
              ) : (
                (summary ?? []).map((row) => (
                  <TableRow key={row.ip}>
                    <TableCell className="font-mono text-sm">{row.ip}</TableCell>
                    <TableCell className="text-right font-semibold">{row.count}</TableCell>
                    <TableCell className="text-right">
                      {row.authEvents > 0 ? (
                        <Badge className="bg-amber-100 text-amber-800 border-0">{row.authEvents}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{timeAgo(row.lastSeen)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setDraftIp(row.ip); setFilterIp(row.ip); setView("log"); }}
                      >
                        {t("admin.ipViewLog")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.ipColTime")}</TableHead>
                <TableHead>{t("admin.ipColIpAddress")}</TableHead>
                <TableHead>{t("admin.ipColEvent")}</TableHead>
                <TableHead>{t("admin.ipColPath")}</TableHead>
                <TableHead>{t("admin.ipColStatus")}</TableHead>
                <TableHead>{t("admin.ipColUserId")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                    {t("admin.ipNoRecords")}
                  </TableCell>
                </TableRow>
              ) : (
                (rows ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {timeAgo(row.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <button
                        className="hover:underline text-left"
                        onClick={() => { setDraftIp(row.ip); setFilterIp(row.ip); }}
                      >
                        {row.ip}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${EVENT_COLORS[row.eventType] ?? "bg-stone-100 text-stone-700"}`}>
                        {row.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                      {row.method} {row.path}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.statusCode ? (
                        <span className={row.statusCode >= 400 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          {row.statusCode}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.userId ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
