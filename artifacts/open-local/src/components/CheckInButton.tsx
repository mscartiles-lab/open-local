import { useState } from "react";
import { Award, Loader2, HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { useTranslation } from "react-i18next";

interface Props {
  vendorId: number;
  vendorName: string;
  hasLocation?: boolean; // unused; kept for backward compatibility
}

const SESSION_KEY = "ol_session";

// "Request visit credit" — sends a pending request to the vendor for them
// to approve from their dashboard. No GPS required.
export default function CheckInButton({ vendorId, vendorName }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, openOnboarding } = useUser();
  const [busy, setBusy] = useState(false);

  const handleRequest = async () => {
    if (!user) {
      openOnboarding();
      toast({ title: t("checkIn.signIn"), description: t("checkIn.signInDescription") });
      return;
    }

    setBusy(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      const r = await fetch("/api/rewards/request-visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ vendorId }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ variant: "destructive", title: t("checkIn.failed"), description: data.error ?? `HTTP ${r.status}` });
        return;
      }
      toast({
        title: t("checkIn.sent"),
        description: t("checkIn.sentDescription", { vendor: vendorName }),
      });
    } catch (e) {
      toast({ variant: "destructive", title: t("checkIn.error"), description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleRequest} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHelping className="w-4 h-4" />}
      {t("checkIn.request")}
      <Award className="w-4 h-4 opacity-60" />
    </Button>
  );
}
