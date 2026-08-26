import { useEffect, useState } from "react";
import { Loader2, Trash2, Plus, Eye, Copy, Check, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "ol_session";

interface Subscription {
  id: number;
  label: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

interface Delivery {
  id: number;
  event: string;
  statusCode: number | null;
  ok: boolean;
  attempt: number;
  error: string | null;
  payload: unknown;
  createdAt: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(SESSION_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function WebhooksAdminTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sweeping, setSweeping] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDeliveries, setOpenDeliveries] = useState<Subscription | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[] | null>(null);
  const [freshSecret, setFreshSecret] = useState<{ id: number; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // create-form state
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const reload = async () => {
    setLoading(true);
    try {
      const [sr, er] = await Promise.all([
        fetch("/api/admin/webhooks", { headers: authHeaders() }),
        fetch("/api/admin/webhooks/events", { headers: authHeaders() }),
      ]);
      if (!sr.ok || !er.ok) throw new Error("Couldn't load webhooks");
      const sData = await sr.json();
      const eData = await er.json();
      setSubs(sData.subscriptions);
      setEvents(eData.events);
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.error"), description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const togglePick = (ev: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) next.delete(ev); else next.add(ev);
      return next;
    });
  };

  const create = async () => {
    if (!label.trim() || !url.trim() || picked.size === 0) {
      toast({ variant: "destructive", title: t("admin.webhookFillRequired") });
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ label, url, events: Array.from(picked), active: true }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const created = await r.json();
      setFreshSecret({ id: created.id, secret: created.secret });
      setLabel(""); setUrl(""); setPicked(new Set());
      setOpenCreate(false);
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.error"), description: (e as Error).message });
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (s: Subscription) => {
    const r = await fetch(`/api/admin/webhooks/${s.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ active: !s.active }),
    });
    if (r.ok) reload();
  };

  const remove = async (id: number) => {
    const r = await fetch(`/api/admin/webhooks/${id}`, { method: "DELETE", headers: authHeaders() });
    if (r.ok) { toast({ title: t("admin.webhookDeleted") }); reload(); }
  };

  const rotateSecret = async (id: number) => {
    const r = await fetch(`/api/admin/webhooks/${id}/rotate-secret`, { method: "POST", headers: authHeaders() });
    if (!r.ok) { toast({ variant: "destructive", title: `HTTP ${r.status}` }); return; }
    const updated = await r.json();
    setFreshSecret({ id: updated.id, secret: updated.secret });
  };

  const showDeliveries = async (s: Subscription) => {
    setOpenDeliveries(s);
    setDeliveries(null);
    const r = await fetch(`/api/admin/webhooks/${s.id}/deliveries`, { headers: authHeaders() });
    if (r.ok) { const d = await r.json(); setDeliveries(d.deliveries); }
  };

  const runSweep = async () => {
    setSweeping(true);
    try {
      const r = await fetch("/api/admin/onboarding/run-daily", {
        method: "POST",
        headers: authHeaders(),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const sent = data.sent as Record<string, number>;
      const totals = Object.values(sent).reduce((a, b) => a + b, 0);
      const breakdown = Object.entries(sent)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(", ");
      const pausedBit = typeof data.paused === "number" && data.paused > 0
        ? ` Paused ${data.paused} expired-trial vendor${data.paused === 1 ? "" : "s"}.`
        : "";
      toast({
        title: t("admin.webhookSweepComplete"),
        description: `Scanned ${data.scanned} vendors. Sent ${totals} email${totals === 1 ? "" : "s"}${breakdown ? ` (${breakdown})` : ""}. Flagged ${data.flagged} for follow-up.${pausedBit}`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.webhookSweepFailed"), description: (e as Error).message });
    } finally {
      setSweeping(false);
    }
  };

  const copyFreshSecret = () => {
    if (!freshSecret) return;
    navigator.clipboard.writeText(freshSecret.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-serif font-bold">{t("admin.webhooks")}</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {t("admin.webhookDescription")}{" "}
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">X-OpenLocal-Signature</code>
              {" "}{t("admin.webhookSignatureNote")}{" "}
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">{`{timestamp}.{rawBody}`}</code>{" "}
              {t("admin.webhookUsingSecret")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={runSweep} disabled={sweeping} className="gap-2">
              {sweeping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t("admin.webhookRunSweep")}
            </Button>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />{t("admin.webhookAdd")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{t("admin.webhookNew")}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{t("admin.webhookLabel")}</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Zapier — vendor signups" />
                </div>
                <div>
                  <Label>{t("admin.webhookPostUrl")}</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.zapier.com/..." />
                </div>
                <div>
                  <Label>{t("admin.webhookEvents")}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-64 overflow-y-auto">
                    {events.map((ev) => (
                      <label key={ev} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted">
                        <input type="checkbox" checked={picked.has(ev)} onChange={() => togglePick(ev)} />
                        <span className="font-mono text-xs">{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenCreate(false)}>{t("admin.cancel")}</Button>
                <Button onClick={create} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{t("admin.webhookCreate")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : !subs || subs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t("admin.noWebhooks")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.webhookColLabel")}</TableHead>
                  <TableHead>{t("admin.webhookColUrl")}</TableHead>
                  <TableHead>{t("admin.webhookColEvents")}</TableHead>
                  <TableHead>{t("admin.webhookColActive")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.label}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[220px] truncate">{s.url}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {s.events.map((ev) => (
                          <Badge key={ev} variant="secondary" className="font-mono text-[10px]">{ev}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => showDeliveries(s)} title={t("admin.webhookRecentDeliveries")}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => rotateSecret(s.id)} title={t("admin.webhookRotateSecret")}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.deleteWebhookTitle", { label: s.label })}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin.deleteWebhookWarning")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(s.id)} className="bg-destructive text-destructive-foreground">{t("admin.delete")}</AlertDialogAction>
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
        )}

        <Dialog open={!!freshSecret} onOpenChange={(o) => !o && setFreshSecret(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("admin.webhookSaveSecret")}</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("admin.webhookSecretWarning")}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{freshSecret?.secret}</code>
              <Button variant="outline" size="icon" onClick={copyFreshSecret}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <DialogFooter><Button onClick={() => setFreshSecret(null)}>{t("admin.webhookSavedIt")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!openDeliveries} onOpenChange={(o) => !o && setOpenDeliveries(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>{t("admin.webhookRecentDeliveries")}{openDeliveries ? ` — ${openDeliveries.label}` : ""}</DialogTitle></DialogHeader>
            {!deliveries ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("admin.webhookNoDeliveries")}</p>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {deliveries.map((d) => (
                  <div key={d.id} className="border rounded-lg p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-semibold">{d.event}</span>
                      <span className={`px-2 py-0.5 rounded font-mono ${d.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {d.statusCode ?? "ERR"} {d.ok ? "OK" : "FAIL"} · attempt {d.attempt}
                      </span>
                    </div>
                    <div className="text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</div>
                    {d.error && <div className="text-rose-700">{d.error}</div>}
                    <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-[10px]">{JSON.stringify(d.payload, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
