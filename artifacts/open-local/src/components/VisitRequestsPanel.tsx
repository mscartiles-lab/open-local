import { useEffect, useState } from "react";
import { Loader2, Check, X, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type AvatarStyle } from "@/context/UserContext";
import Avatar from "@/components/Avatar";

const SESSION_KEY = "ol_session";

interface PendingRequest {
  id: number;
  requestedAt: string;
  shopperUserId: number;
  username: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
}

export default function VisitRequestsPanel({ vendorId }: { vendorId: number }) {
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingRequest[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [forbidden, setForbidden] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      const r = await fetch(`/api/rewards/vendor/${vendorId}/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.status === 403) { setForbidden(true); setPending([]); return; }
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
      const token = localStorage.getItem(SESSION_KEY);
      const r = await fetch(`/api/rewards/visits/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setPending((p) => p?.filter((req) => req.id !== id) ?? null);
      toast({
        title: action === "approve" ? "Approved" : "Rejected",
        description: action === "approve"
          ? (data.newlyUnlockedForShopper?.length ? `Visit credited. They unlocked ${data.newlyUnlockedForShopper.length} new reward${data.newlyUnlockedForShopper.length === 1 ? "" : "s"}!` : "Visit credited.")
          : "Request dismissed.",
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't update", description: (e as Error).message });
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  if (forbidden) return null;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            <h2 className="font-serif text-xl font-bold">Visit requests</h2>
            {pending && pending.length > 0 && (
              <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">{pending.length}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Shoppers earn rewards when you approve a visit.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : pending && pending.length > 0 ? (
          <ul className="divide-y divide-border">
            {pending.map((p) => {
              const busy = busyIds.has(p.id);
              return (
                <li key={p.id} className="py-3 flex items-center gap-3">
                  <Avatar seed={p.avatarSeed} style={p.avatarStyle} size={40} ringClassName="border border-primary/20" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">@{p.username}</p>
                    <p className="text-xs text-muted-foreground">requested {new Date(p.requestedAt).toLocaleString()}</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(p.id, "reject")} className="gap-1">
                    <X className="w-4 h-4" /> Reject
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => decide(p.id, "approve")} className="gap-1">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No pending visit requests right now.</p>
        )}
      </CardContent>
    </Card>
  );
}
