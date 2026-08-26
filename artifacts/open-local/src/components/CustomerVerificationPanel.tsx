import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Check, X, Inbox, UserCheck, History, Search, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { type AvatarStyle } from "@/context/UserContext";
import Avatar from "@/components/Avatar";
import { cn } from "@/lib/utils";

const SESSION_KEY = "ol_session";

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface VisitRow {
  id: number;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt?: string | null;
  shopperUserId: number;
  username: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
}

type Tab = "pending" | "verify" | "history";

// ── Pending tab ───────────────────────────────────────────────────────────────
function PendingTab({
  vendorId,
  onUpdate,
}: {
  vendorId: number;
  onUpdate: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [pending, setPending] = useState<VisitRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/rewards/vendor/${vendorId}/pending`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPending(data.pending);
    } catch (e) {
      toast({ variant: "destructive", title: t("verification.errorLoadRequests"), description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [vendorId]);

  const decide = async (id: number, action: "approve" | "reject") => {
    setBusyIds((s) => new Set(s).add(id));
    try {
      const r = await fetch(`/api/rewards/visits/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setPending((p) => p?.filter((req) => req.id !== id) ?? null);
      onUpdate();
      toast({
        title: action === "approve" ? t("verification.visitApproved") : t("verification.requestRejected"),
        description:
          action === "approve"
            ? data.newlyUnlockedForShopper?.length
              ? t("verification.visitCreditedUnlocked", { count: data.newlyUnlockedForShopper.length })
              : t("verification.visitCredited")
            : t("verification.requestDismissed"),
      });
    } catch (e) {
      toast({ variant: "destructive", title: t("verification.errorUpdate"), description: (e as Error).message });
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pending || pending.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <Inbox className="w-8 h-8 opacity-40" />
        <p className="text-sm">{t("verification.noPending")}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {pending.map((p) => {
        const busy = busyIds.has(p.id);
        return (
          <li key={p.id} className="py-3 flex items-center gap-3">
            <Avatar seed={p.avatarSeed} style={p.avatarStyle as AvatarStyle} size={40} ringClassName="border border-primary/20" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">@{p.username}</p>
              <p className="text-xs text-muted-foreground">
                {t("verification.requested")} {new Date(p.requestedAt).toLocaleString()}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(p.id, "reject")} className="gap-1">
              <X className="w-4 h-4" /> {t("verification.reject")}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => decide(p.id, "approve")} className="gap-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {t("verification.approve")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Verify tab ────────────────────────────────────────────────────────────────
function VerifyTab({ vendorId, onUpdate }: { vendorId: number; onUpdate: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim().replace(/^@/, "");
    if (!name) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/rewards/vendor/${vendorId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ username: name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setUsername("");
      onUpdate();
      toast({
        title: t("verification.userVerified", { username: data.username }),
        description: data.newlyUnlocked?.length
          ? t("verification.visitCreditedUnlocked", { count: data.newlyUnlocked.length })
          : t("verification.visitCreditedCustomer"),
      });
      inputRef.current?.focus();
    } catch (e) {
      toast({ variant: "destructive", title: t("verification.errorVerification"), description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-4 space-y-5">
      <p className="text-sm text-muted-foreground">
        {t("verification.verifyDescription")}
      </p>

      <form onSubmit={handleVerify} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
          <Input
            ref={inputRef}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("verification.usernamePlaceholder")}
            className="pl-7"
            disabled={busy}
            autoComplete="off"
            autoCapitalize="none"
          />
        </div>
        <Button type="submit" disabled={busy || !username.trim()} className="gap-2 shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          {t("verification.verify")}
        </Button>
      </form>

      <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">{t("verification.howItWorks")}</p>
        <p>{t("verification.step1")}</p>
        <p>{t("verification.step2")}</p>
        <p>{t("verification.step3")}</p>
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────
const STATUS_META = {
  approved: { labelKey: "verification.statusApproved", icon: CheckCircle2, className: "text-emerald-600" },
  pending: { labelKey: "verification.statusPending", icon: Clock, className: "text-amber-500" },
  rejected: { labelKey: "verification.statusRejected", icon: XCircle, className: "text-muted-foreground" },
};

function HistoryTab({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [visits, setVisits] = useState<VisitRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [search, setSearch] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const r = await fetch(`/api/rewards/vendor/${vendorId}/history${qs}`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setVisits(data.visits);
    } catch (e) {
      toast({ variant: "destructive", title: t("verification.errorLoadHistory"), description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [vendorId, filter]);

  const visible = (visits ?? []).filter((v) =>
    !search.trim() || v.username.toLowerCase().includes(search.trim().toLowerCase().replace(/^@/, "")),
  );

  const filters: { key: typeof filter; labelKey: string }[] = [
    { key: "all", labelKey: "verification.filterAll" },
    { key: "approved", labelKey: "verification.filterApproved" },
    { key: "pending", labelKey: "verification.filterPending" },
    { key: "rejected", labelKey: "verification.filterRejected" },
  ];

  return (
    <div className="py-2 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("verification.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              className="text-xs"
            >
              {t(f.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
          <History className="w-8 h-8 opacity-40" />
          <p className="text-sm">{search ? t("verification.noMatches") : t("verification.noRecords")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((v) => {
            const meta = STATUS_META[v.status];
            const StatusIcon = meta.icon;
            return (
              <li key={v.id} className="py-3 flex items-center gap-3">
                <Avatar seed={v.avatarSeed} style={v.avatarStyle as AvatarStyle} size={36} ringClassName="border border-primary/20" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">@{v.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.requestedAt).toLocaleDateString()}
                    {v.decidedAt ? ` · ${t("verification.decided")} ${new Date(v.decidedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span className={cn("flex items-center gap-1 text-xs font-medium", meta.className)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {t(meta.labelKey)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function CustomerVerificationPanel({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    fetch(`/api/rewards/vendor/${vendorId}/pending`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setPendingCount(d.pending?.length ?? 0))
      .catch(() => {});
  }, [vendorId, historyKey]);

  const handleUpdate = () => setHistoryKey((k) => k + 1);

  const tabs: { key: Tab; labelKey: string; icon: typeof Inbox }[] = [
    { key: "pending", labelKey: "verification.tabPending", icon: Inbox },
    { key: "verify", labelKey: "verification.tabVerify", icon: UserCheck },
    { key: "history", labelKey: "verification.tabHistory", icon: History },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-bold">{t("verification.title")}</h2>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {t("verification.subtitle")}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-4">
          {tabs.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t transition-colors border-b-2 -mb-px",
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-4 h-4" />
              {t(labelKey)}
              {key === "pending" && pendingCount != null && pendingCount > 0 && (
                <span className="ml-0.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-px font-semibold leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "pending" && (
          <PendingTab key={historyKey} vendorId={vendorId} onUpdate={handleUpdate} />
        )}
        {tab === "verify" && (
          <VerifyTab vendorId={vendorId} onUpdate={handleUpdate} />
        )}
        {tab === "history" && (
          <HistoryTab key={historyKey} vendorId={vendorId} />
        )}
      </CardContent>
    </Card>
  );
}
