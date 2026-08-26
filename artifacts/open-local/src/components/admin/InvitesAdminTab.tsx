import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Download,
  RefreshCw,
  Mail,
  Trash2,
  CheckCircle2,
  Clock,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface WaitlistEntry {
  id: number;
  email: string;
  name: string | null;
  status: string;
  invitedAt: string | null;
  createdAt: string;
  source: string | null;
  unsubscribed: boolean;
}

function getInviteUrl(): string {
  const origin = window.location.origin;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${origin}${base}/invite`;
}

export default function InvitesAdminTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const inviteUrl = getInviteUrl();

  async function fetchEntries() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("ol_session");
      const res = await fetch(`${BASE}/api/admin/invite/entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load entries");
      setEntries(await res.json());
    } catch {
      setError(t("admin.inviteLoadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchEntries(); }, []);

  async function resend(id: number) {
    setResending(id);
    try {
      const token = localStorage.getItem("ol_session");
      const res = await fetch(`${BASE}/api/admin/invite/${id}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { sent?: boolean };
      toast({
        title: data.sent ? t("admin.inviteSent") : t("admin.inviteQueued"),
        description: data.sent
          ? t("admin.inviteResentDescription")
          : t("admin.inviteNoEmailDescription"),
      });
      void fetchEntries();
    } catch {
      toast({ title: t("admin.error"), description: t("admin.inviteResendFailed"), variant: "destructive" });
    } finally {
      setResending(null);
    }
  }

  async function deleteEntry(id: number) {
    if (!confirm(t("admin.inviteConfirmRemove"))) return;
    setDeleting(id);
    try {
      const token = localStorage.getItem("ol_session");
      await fetch(`${BASE}/api/admin/invite/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null);
      toast({ title: t("admin.inviteRemoved"), description: t("admin.inviteEntryDeleted") });
    } catch {
      toast({ title: t("admin.error"), description: t("admin.inviteDeleteFailed"), variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  function copyLink() {
    void navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const img = new Image();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = "open-local-invite-qr.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  }

  const pending = entries?.filter((e) => e.status === "pending").length ?? 0;
  const invited = entries?.filter((e) => e.status === "invited").length ?? 0;

  return (
    <div className="space-y-6">
      {/* QR Code card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#3c4a26]" />
              {t("admin.inviteQrCode")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div
              ref={qrRef}
              className="p-4 bg-white border-2 border-[#3c4a26]/20 rounded-xl"
            >
              <QRCodeSVG
                value={inviteUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#3c4a26"
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground max-w-[200px]">
              {t("admin.inviteQrScanHint")}
            </p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={downloadQr}
              >
                <Download className="w-4 h-4 mr-1.5" />
                {t("admin.inviteDownloadPng")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={copyLink}
              >
                {copied ? (
                  <><Check className="w-4 h-4 mr-1.5 text-green-600" /> {t("admin.inviteCopied")}</>
                ) : (
                  <><Copy className="w-4 h-4 mr-1.5" /> {t("admin.inviteCopyLink")}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.inviteWaitlistStats")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#3c4a26]/5 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#3c4a26]" />
                <span className="font-medium">{t("admin.inviteStatusInvited")}</span>
              </div>
              <span className="text-2xl font-bold text-[#3c4a26]">{invited}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="font-medium">{t("admin.inviteStatusPending")}</span>
              </div>
              <span className="text-2xl font-bold text-amber-600">{pending}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="font-medium text-muted-foreground">{t("admin.inviteTotal")}</span>
              <span className="text-2xl font-bold">{(entries?.length ?? 0)}</span>
            </div>

            <div className="pt-2">
              <p className="text-sm text-muted-foreground font-medium mb-1">{t("admin.inviteLink")}</p>
              <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-2 text-xs font-mono break-all">
                {inviteUrl}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Entries table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("admin.inviteWaitlistEntries")}</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            {t("admin.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("admin.loading")}
            </div>
          )}
          {error && (
            <p className="text-red-600 text-sm py-4">{error}</p>
          )}
          {!loading && !error && entries && entries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{t("admin.inviteNoEntries")}</p>
              <p className="text-sm mt-1">{t("admin.inviteNoEntriesHint")}</p>
            </div>
          )}
          {!loading && entries && entries.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.inviteColEmail")}</TableHead>
                  <TableHead>{t("admin.inviteColName")}</TableHead>
                  <TableHead>{t("admin.inviteColStatus")}</TableHead>
                  <TableHead>{t("admin.inviteColSubmitted")}</TableHead>
                  <TableHead>{t("admin.inviteColInvited")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium text-sm">{entry.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.name ?? <span className="italic opacity-40">—</span>}
                    </TableCell>
                    <TableCell>
                      {entry.status === "invited" ? (
                        <Badge className="bg-[#3c4a26]/10 text-[#3c4a26] border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {t("admin.inviteStatusInvited")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          <Clock className="w-3 h-3 mr-1" />
                          {t("admin.inviteStatusPending")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.invitedAt
                        ? new Date(entry.invitedAt).toLocaleDateString()
                        : <span className="italic opacity-40">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resend(entry.id)}
                          disabled={resending === entry.id || entry.unsubscribed}
                          title={t("admin.inviteResendTitle")}
                        >
                          {resending === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteEntry(entry.id)}
                          disabled={deleting === entry.id}
                          title={t("admin.inviteDeleteTitle")}
                        >
                          {deleting === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
