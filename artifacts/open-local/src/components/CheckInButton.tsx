import { useState } from "react";
import { Award, Loader2, HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";

interface Props {
  vendorId: number;
  vendorName: string;
  hasLocation?: boolean; // unused; kept for backward compatibility
}

const SESSION_KEY = "ol_session";

// "Request visit credit" — sends a pending request to the vendor for them
// to approve from their dashboard. No GPS required.
export default function CheckInButton({ vendorId, vendorName }: Props) {
  const { toast } = useToast();
  const { user, openOnboarding } = useUser();
  const [busy, setBusy] = useState(false);

  const handleRequest = async () => {
    if (!user) {
      openOnboarding();
      toast({ title: "Sign in to request credit", description: "Create your free shopper account to start earning unlocks." });
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
        toast({ variant: "destructive", title: "Couldn't request credit", description: data.error ?? `HTTP ${r.status}` });
        return;
      }
      toast({
        title: "Request sent!",
        description: `${vendorName} will see your request in their dashboard. You'll earn credit once they approve.`,
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Request failed", description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={handleRequest} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <HandHelping className="w-4 h-4" />}
      Request visit credit
      <Award className="w-4 h-4 opacity-60" />
    </Button>
  );
}
