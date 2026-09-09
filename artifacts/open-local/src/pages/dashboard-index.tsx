import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Loader2, Search } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";

function normalizeSlug(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/\/(?:vendors|dashboard)\/([^/?#]+)/i);
  let candidate = match?.[1] ?? trimmed;
  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return "";
  }
  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
}

export default function DashboardIndex() {
  const { user, isLoading, openLogin } = useUser();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState("");

  useEffect(() => {
    if (user?.role === "vendor" && user.vendorSlug) {
      navigate(`/dashboard/${user.vendorSlug}`, { replace: true });
    }
  }, [navigate, user]);

  if (isLoading || (user?.role === "vendor" && user.vendorSlug)) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto max-w-xl px-4 py-20 text-center">
          <LayoutDashboard className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-serif text-3xl font-bold">Vendor dashboard</h1>
          <p className="mt-2 text-muted-foreground">Log in with your vendor account to manage your store.</p>
          <Button className="mt-6" onClick={openLogin}>Log in</Button>
        </div>
      </Layout>
    );
  }

  if (user.role !== "vendor") {
    return (
      <Layout>
        <div className="container mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="font-serif text-3xl font-bold">Vendor account required</h1>
          <p className="mt-2 text-muted-foreground">This page is for vendor accounts that manage an Open Local store.</p>
          <Button asChild className="mt-6"><Link href="/for-vendors">Learn about joining as a vendor</Link></Button>
        </div>
      </Layout>
    );
  }

  const connect = () => {
    const slug = normalizeSlug(profile);
    if (slug) navigate(`/dashboard/${slug}`);
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-xl px-4 py-20">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <Search className="h-10 w-10 text-primary" />
          <h1 className="mt-4 font-serif text-3xl font-bold">Connect your vendor profile</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your public store URL or store slug. We’ll send a verification code to the contact email on that listing, then connect it to your account.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Input
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && connect()}
              placeholder="your-store or openlocalapp.com/vendors/your-store"
            />
            <Button onClick={connect} disabled={!normalizeSlug(profile)}>Continue</Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Not sure of your store URL? <Link href="/vendors" className="font-medium text-primary hover:underline">Find it in the vendor directory.</Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}