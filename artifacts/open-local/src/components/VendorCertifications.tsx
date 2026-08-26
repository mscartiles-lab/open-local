import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Certification {
  id: number;
  name: string;
  status: "pending" | "approved" | "rejected";
}

export default function VendorCertifications({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/vendors/${vendorId}/certifications`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (active) setCertifications(data.certifications);
      } catch (e) {
        if (active) toast({ variant: "destructive", title: t("certifications.loadError"), description: (e as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [vendorId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  if (certifications.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("certifications.noItems")}</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {certifications.map((c) => (
        <div
          key={c.id}
          className="inline-flex items-center gap-2 text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-full"
        >
          <BadgeCheck className="w-4 h-4" />
          {c.name}
        </div>
      ))}
    </div>
  );
}

export function VendorCertificationBadges({ vendorId }: { vendorId: number }) {
  const [certifications, setCertifications] = useState<Certification[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/vendors/${vendorId}/certifications`)
      .then((r) => (r.ok ? r.json() : { certifications: [] }))
      .then((data) => { if (active) setCertifications(data.certifications ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, [vendorId]);

  if (certifications.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {certifications.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full"
        >
          <BadgeCheck className="w-3 h-3" /> {c.name}
        </span>
      ))}
    </div>
  );
}
