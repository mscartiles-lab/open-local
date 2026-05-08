import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Loader2, Bookmark } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import AnalyticsPanel from "@/components/AnalyticsPanel";

interface Establishment {
  id: number;
  name: string;
  type: string;
  city: string;
  state: string;
  imageUrl?: string | null;
  status: string;
}

export default function BusinessDashboard() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const [biz, setBiz] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(numId)) {
      setError("Invalid business id");
      setLoading(false);
      return;
    }
    fetch(`/api/establishments/${numId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Business not found");
        return r.json();
      })
      .then((b) => setBiz(b))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [numId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !biz) {
    return (
      <Layout>
        <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold">Business not found</h1>
          <p className="mt-2 text-muted-foreground">{error ?? "We couldn't find this business."}</p>
          <Link href="/submit">
            <Button className="mt-6">List your business</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="border-b border-border bg-muted">
        <div className="container mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              {biz.imageUrl && (
                <img
                  src={biz.imageUrl}
                  alt={biz.name}
                  className="h-16 w-16 rounded-lg border border-border object-cover md:h-20 md:w-20"
                />
              )}
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Business dashboard</p>
                <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{biz.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {biz.type} · {biz.city}, {biz.state}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Bookmark className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>Bookmark this page</strong> — only the contact email on file (or an admin) can view these analytics.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-10">
        <AnalyticsPanel kind="establishment" id={biz.id} />
      </div>
    </Layout>
  );
}
