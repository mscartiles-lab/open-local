import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface AdminCertification {
  id: number;
  vendorId: number;
  name: string;
  documentUrl: string | null;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  decidedAt: string | null;
  rejectionReason: string | null;
}

const SESSION_KEY = "ol_session";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(SESSION_KEY);
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export default function CertificationsAdminTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminCertification[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/certifications", { headers: authHeaders() });
      if (r.status === 401 || r.status === 403) {
        setError(t("admin.adminAccessRequired"));
        setRows(null);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRows(data.certifications);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const decide = async (id: number, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const r = await fetch(`/api/admin/certifications/${id}/decide`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast({ title: action === "approve" ? t("admin.certApproved") : t("admin.certRejected") });
      await reload();
    } catch (e) {
      toast({ variant: "destructive", title: t("admin.certUpdateFailed"), description: (e as Error).message });
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
                  <TableHead>{t("admin.certColVendorId")}</TableHead>
                  <TableHead>{t("admin.certColCertification")}</TableHead>
                  <TableHead>{t("admin.certColDocument")}</TableHead>
                  <TableHead>{t("admin.certColStatus")}</TableHead>
                  <TableHead>{t("admin.certColRequested")}</TableHead>
                  <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.vendorId}</TableCell>
                    <TableCell className="font-medium text-sm">{c.name}</TableCell>
                    <TableCell>
                      {c.documentUrl ? (
                        <a
                          href={c.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {t("admin.certView")} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("admin.certNone")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_BADGES[c.status]}`}>
                        {c.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => decide(c.id, "approve")}
                            disabled={busyId === c.id}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                            {t("admin.certApprove")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => decide(c.id, "reject")}
                            disabled={busyId === c.id}
                          >
                            <XCircle className="w-4 h-4 mr-1 text-red-600" />
                            {t("admin.certReject")}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.decidedAt ? new Date(c.decidedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {t("admin.noCertifications")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
