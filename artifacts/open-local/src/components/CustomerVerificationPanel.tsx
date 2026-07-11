import { useEffect, useState, useRef } from "react";
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
      toast({ variant: "destructive", title: "Couldn't load requests", description: (e as Error).message });
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
        title: action === "approve" ? "Visit approved" : "Request rejected",
        description:
          action === "approve"
            ? data.newlyUnlockedForShopper?.length
              ? `Visit credited — they unlocked ${data.newlyUnlockedForShopper.length} new reward${data.newlyUnlockedForShopper.length === 1 ? "" : "s"}!`
              : "Visit credited."
            : "Request dismissed.",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't update", description: (e as Error).message });
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
        <p className="text-sm">No pending visit requests right now.</p>
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
                requested {new Date(p.requestedAt).toLocaleString()}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(p.id, "reject")} className="gap-1">
              <X className="w-4 h-4" /> Reject
            </Button>
            <Button size="sm" disabled={busy} onClick={() => decide(p.id, "approve")} className="gap-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Approve
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Verify tab ────────────────────────────────────────────────────────────────
function VerifyTab({ vendorId, onUpdate }: { vendorId: number; onUpdate: () => void }) {
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
        title: `@${data.username} verified`,
        description: data.newlyUnlocked?.length
          ? `Visit credited — they unlocked ${data.newlyUnlocked.length} new reward${data.newlyUnlocked.length === 1 ? "" : "s"}!`
          : "Visit credited. They've been verified as a customer.",
      });
      inputRef.current?.focus();
    } catch (e) {
      toast({ variant: "destructive", title: "Verification failed", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="py-4 space-y-5">
      <p className="text-sm text-muted-foreground">
        Enter a shopper's username to directly grant them a verified visit credit — no request needed on their end.
      </p>

      <form onSubmit={handleVerify} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
          <Input
            ref={inputRef}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="shopperusername"
            className="pl-7"
            disabled={busy}
            autoComplete="off"
            autoCapitalize="none"
          />
        </div>
        <Button type="submit" disabled={busy || !username.trim()} className="gap-2 shrink-0">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
          Verify
        </Button>
      </form>

      <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm">How this works</p>
        <p>• The shopper shows you their Open Local username at your stall or market table.</p>
        <p>• You enter it here and hit Verify — they instantly get visit credit.</p>
        <p>• Each unique shop visit counts once toward their rewards unlocks.</p>
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────
const STATUS_META = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-emerald-600" },
  pending: { label: "Pending", icon: Clock, className: "text-amber-500" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-muted-foreground" },
};

function HistoryTab({ vendorId }: { vendorId: number }) {
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
      toast({ variant: "destructive", title: "Couldn't load history", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [vendorId, filter]);

  const visible = (visits ?? []).filter((v) =>
    !search.trim() || v.username.toLowerCase().includes(search.trim().toLowerCase().replace(/^@/, "")),
  );

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "approved", label: "Approved" },
    { key: "pending", label: "Pending" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="py-2 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username…"
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
              {f.label}
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
          <p className="text-sm">{search ? "No matches for that username." : "No visit records yet."}</p>
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
                    {v.decidedAt ? ` · decided ${new Date(v.decidedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span className={cn("flex items-center gap-1 text-xs font-medium", meta.className)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {meta.label}
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

  const tabs: { key: Tab; label: string; icon: typeof Inbox }[] = [
    { key: "pending", label: "Pending", icon: Inbox },
    { key: "verify", label: "Verify customer", icon: UserCheck },
    { key: "history", label: "History", icon: History },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-xl font-bold">Customer verification</h2>
          <p className="text-xs text-muted-foreground hidden sm:block">
            Shoppers earn rewards when you verify their visit.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-4">
          {tabs.map(({ key, label, icon: Icon }) => (
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
              {label}
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
