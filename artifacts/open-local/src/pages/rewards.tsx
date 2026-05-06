import { useEffect, useState } from "react";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import Avatar from "@/components/Avatar";
import { UNLOCK_CATALOG, type UnlockDef } from "@/lib/unlockCatalog";

const SESSION_KEY = "ol_session";

interface MeData {
  uniqueVendorCount: number;
  unlocks: string[];
  equipped: string[];
}

export default function Rewards() {
  const { user, openOnboarding } = useUser();
  const { toast } = useToast();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      const r = await fetch("/api/rewards/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMe(await r.json());
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't load rewards", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [user?.id]);

  const toggleEquip = async (key: string) => {
    if (!me) return;
    const isEquipped = me.equipped.includes(key);
    const next = isEquipped ? me.equipped.filter((k) => k !== key) : [...me.equipped, key];
    setMe({ ...me, equipped: next });
    setSaving(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      const r = await fetch("/api/rewards/equipped", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ equipped: next }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMe((prev) => prev ? { ...prev, equipped: data.equipped } : prev);
    } catch (e) {
      toast({ variant: "destructive", title: "Couldn't save", description: (e as Error).message });
      setMe((prev) => prev ? { ...prev, equipped: me.equipped } : prev);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="container max-w-3xl mx-auto px-4 py-20 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-3xl font-serif font-bold mb-2">Earn rewards for shopping local</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to start earning avatar unlocks every time you visit a verified local shop.
          </p>
          <Button onClick={openOnboarding}>Join Open Local</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12">
        <div className="container max-w-5xl mx-auto px-4 flex items-center gap-6">
          <Avatar
            seed={user.avatarSeed}
            style={user.avatarStyle}
            equipped={me?.equipped}
            size={96}
            ringClassName="border-4 border-primary/30 shadow-lg"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold">@{user.username}'s Rewards</h1>
            <p className="text-muted-foreground">
              Verified visits to <span className="font-semibold text-foreground">{me?.uniqueVendorCount ?? 0}</span> local shops · {me?.unlocks.length ?? 0} of {UNLOCK_CATALOG.length} unlocks earned
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: visit a shop's page on the map and tap "Check in here" while you're there to earn credit.
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {UNLOCK_CATALOG.map((u) => {
              const earned = me?.unlocks.includes(u.key) ?? false;
              const equipped = me?.equipped.includes(u.key) ?? false;
              const canEquip = earned && !!u.asset;
              return (
                <RewardCard
                  key={u.key}
                  unlock={u}
                  earned={earned}
                  equipped={equipped}
                  canEquip={canEquip}
                  onToggle={() => toggleEquip(u.key)}
                  disabled={saving}
                />
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function RewardCard({
  unlock,
  earned,
  equipped,
  canEquip,
  onToggle,
  disabled,
}: {
  unlock: UnlockDef;
  earned: boolean;
  equipped: boolean;
  canEquip: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <Card className={`transition-all ${earned ? "" : "opacity-60"} ${equipped ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4 text-center">
        <div className="h-20 mb-2 flex items-center justify-center select-none">
          {earned ? (
            unlock.asset ? (
              <img src={unlock.asset} alt={unlock.label} className="max-h-20 max-w-full object-contain" draggable={false} />
            ) : (
              <span className="text-5xl">{unlock.emoji}</span>
            )
          ) : (
            <Lock className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
        <div className="font-semibold text-sm mb-1">{unlock.label}</div>
        <div className="text-xs text-muted-foreground mb-3 min-h-[2.5em]">{unlock.description}</div>
        <div className="text-xs font-medium text-muted-foreground mb-3 capitalize">{unlock.category}</div>
        {earned ? (
          canEquip ? (
            <Button
              size="sm"
              variant={equipped ? "default" : "outline"}
              className="w-full"
              onClick={onToggle}
              disabled={disabled}
            >
              {equipped ? "Equipped" : "Equip"}
            </Button>
          ) : (
            <div className="text-xs text-emerald-700 font-medium">Earned</div>
          )
        ) : (
          <div className="text-xs text-muted-foreground">{unlock.threshold} visit{unlock.threshold === 1 ? "" : "s"}</div>
        )}
      </CardContent>
    </Card>
  );
}
