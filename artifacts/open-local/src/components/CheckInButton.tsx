import { useState } from "react";
import { MapPin, Loader2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { getUnlock } from "@/lib/unlockCatalog";

interface Props {
  vendorId: number;
  vendorName: string;
  hasLocation: boolean;
}

const SESSION_KEY = "ol_session";

export default function CheckInButton({ vendorId, vendorName, hasLocation }: Props) {
  const { toast } = useToast();
  const { user, openOnboarding } = useUser();
  const [busy, setBusy] = useState(false);

  if (!hasLocation) return null;

  const handleCheckIn = async () => {
    if (!user) {
      openOnboarding();
      toast({ title: "Sign in to check in", description: "Create your free shopper account to start earning unlocks." });
      return;
    }
    if (!("geolocation" in navigator)) {
      toast({ variant: "destructive", title: "Location not supported", description: "Your browser can't share location." });
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const token = localStorage.getItem(SESSION_KEY);
        try {
          const r = await fetch("/api/rewards/check-in", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              vendorId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await r.json();
          if (!r.ok) {
            toast({ variant: "destructive", title: "Check-in failed", description: data.error ?? `HTTP ${r.status}` });
            return;
          }

          if (data.alreadyCheckedInToday) {
            toast({ title: "Already checked in today", description: `You've already visited ${vendorName} today.` });
          } else if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
            const items = (data.newlyUnlocked as string[])
              .map((k) => {
                const def = getUnlock(k);
                return def ? `${def.emoji} ${def.label}` : k;
              })
              .join(", ");
            toast({ title: "🎉 New unlock!", description: `Checked in at ${vendorName}. You earned: ${items}` });
          } else {
            toast({ title: "Checked in!", description: `Verified visit to ${vendorName} (${(data.distanceMiles as number).toFixed(2)} mi away).` });
          }
        } catch (e) {
          toast({ variant: "destructive", title: "Check-in failed", description: (e as Error).message });
        } finally {
          setBusy(false);
        }
      },
      (err) => {
        setBusy(false);
        toast({
          variant: "destructive",
          title: "Couldn't get your location",
          description: err.message || "Please allow location access and try again.",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <Button onClick={handleCheckIn} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
      Check in here
      <Award className="w-4 h-4 opacity-60" />
    </Button>
  );
}
