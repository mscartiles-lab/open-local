import { useState } from "react";
import { useParams, Link } from "wouter";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Clock,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  CalendarDays,
  ShieldCheck,
  Users,
  ArrowLeft,
  Loader2,
  Tag,
  Phone,
  Store,
} from "lucide-react";
import {
  useGetMarket,
  useClaimMarket,
  useListMarkets,
  useListVendors,
  getGetMarketQueryKey,
  getListMarketsQueryKey,
} from "@workspace/api-client-react";
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function MarketDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const { data: market, isLoading, error } = useGetMarket(slug ?? "", {
    query: { enabled: !!slug, queryKey: getGetMarketQueryKey(slug ?? "") },
  });

  const { data: marketVendors, isLoading: vendorsLoading } = useListVendors(
    market ? { marketName: market.name } : undefined,
    { query: { enabled: !!market } },
  );

  const claimM = useClaimMarket();

  const handleClaim = async () => {
    if (!market?.slug) return;
    setClaiming(true);
    try {
      await claimM.mutateAsync({ slug: market.slug });
      queryClient.invalidateQueries({ queryKey: getGetMarketQueryKey(slug ?? "") });
      queryClient.invalidateQueries({ queryKey: getListMarketsQueryKey() });
      toast({ title: "Market claimed! You are now the manager." });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Could not claim the market.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (error || !market) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
          <MapPin className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-bold mb-2">Market not found</h1>
          <p className="text-muted-foreground mb-6">This market listing doesn't exist or may have been removed.</p>
          <Link href="/markets">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to directory
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isClaimed = market.managerId != null;
  const isManager = user && market.managerId === user.id;

  const gmapsUrl = market.address
    ? `https://maps.google.com/?q=${encodeURIComponent(market.address)}`
    : market.latitude && market.longitude
    ? `https://maps.google.com/?q=${market.latitude},${market.longitude}`
    : null;

  return (
    <Layout>
      {/* Banner */}
      {(market.featuredImageUrl || market.imageUrl) ? (
        <div className="w-full h-64 md:h-80 overflow-hidden">
          <img
            src={market.featuredImageUrl ?? market.imageUrl ?? ""}
            alt={market.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-[#1c2a10] via-[#243316] to-[#2d3a1d]" />
      )}

      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link href="/markets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to directory
        </Link>

        {/* Identity row */}
        <div className="flex items-start gap-5 mb-8">
          {market.logoUrl ? (
            <img
              src={market.logoUrl}
              alt={market.name}
              className="w-20 h-20 rounded-2xl border-4 border-background shadow-md object-cover -mt-10 relative shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl border-4 border-background shadow-md bg-green-100 flex items-center justify-center -mt-10 relative shrink-0">
              <span className="text-2xl font-bold text-green-800">{market.name[0]?.toUpperCase()}</span>
            </div>
          )}

          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-3xl font-bold text-foreground">{market.name}</h1>
              {market.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {market.city}, {market.region}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Vendors at this market */}
            <div>
              <h2 className="font-bold text-foreground text-lg mb-3 flex items-center gap-1.5">
                <Store className="w-5 h-5" />
                Vendors at this market
              </h2>
              {vendorsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full rounded-xl" />)}
                </div>
              ) : marketVendors && marketVendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {marketVendors.map((vendor) => (
                    <Link key={vendor.id} href={`/vendors/${vendor.id}`}>
                      <Card className="hover:border-primary/40 transition-colors rounded-xl cursor-pointer">
                        <CardContent className="p-4 flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                            {vendor.imageUrl ? (
                              <img src={vendor.imageUrl} alt={vendor.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-5 h-5 text-muted-foreground opacity-40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{vendor.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{vendor.category}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{vendor.tagline || vendor.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                  <Store className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No vendors linked to this market yet.</p>
                </div>
              )}
            </div>
            {/* Schedule */}
            {(market.day || market.time) && (
              <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
                <CalendarDays className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{market.day ?? "Market day"}</p>
                  {market.time && <p className="text-sm text-muted-foreground mt-0.5">{market.time}</p>}
                </div>
              </div>
            )}

            {/* Address */}
            {market.address && (
              <div className="rounded-xl border border-border bg-card p-4 flex gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">{market.address}</p>
                  {gmapsUrl && (
                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Open in Google Maps →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {market.description && (
              <div>
                <h2 className="font-bold text-foreground text-lg mb-2">About the market</h2>
                <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-wrap">
                  {market.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {market.tags && market.tags.length > 0 && (
              <div>
                <h2 className="font-bold text-foreground text-base mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  About this market
                </h2>
                <div className="flex flex-wrap gap-2">
                  {market.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold bg-green-50 text-green-800 border border-green-200 px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Claim listing */}
            {!isClaimed && user && !isManager && (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
                <p className="font-semibold text-foreground text-sm mb-1">Is this your market?</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Claim this listing to manage your market's details on Open Local.
                </p>
                <Button
                  onClick={handleClaim}
                  disabled={claiming}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {claiming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Claim this listing
                </Button>
              </div>
            )}

            {!isClaimed && !user && (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5">
                <p className="font-semibold text-foreground text-sm mb-1">Is this your market?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Sign in to claim this listing and manage your market profile.
                </p>
                <Link href="/submit">
                  <Button variant="outline" size="sm">Sign in to claim</Button>
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Vendor count */}
            {market.vendorCount > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xl font-bold text-foreground">{market.vendorCount}</p>
                  <p className="text-xs text-muted-foreground">Vendors</p>
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Contact & links</h3>

              {market.contactEmail && (
                <a
                  href={`mailto:${market.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  {market.contactEmail}
                </a>
              )}

              {market.websiteUrl && (
                <a
                  href={market.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  Website
                </a>
              )}

              {market.instagramHandle && (
                <a
                  href={`https://instagram.com/${market.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
                  @{market.instagramHandle}
                </a>
              )}

              {market.facebookUrl && (
                <a
                  href={market.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Facebook className="w-4 h-4 text-muted-foreground shrink-0" />
                  Facebook
                </a>
              )}

              {market.twitterHandle && (
                <a
                  href={`https://twitter.com/${market.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Twitter className="w-4 h-4 text-muted-foreground shrink-0" />
                  @{market.twitterHandle}
                </a>
              )}
            </div>

            {/* Apply CTA */}
            {market.contactEmail && (
              <a href={`mailto:${market.contactEmail}?subject=Vendor application — ${market.name}`}>
                <Button className="w-full gap-2">
                  <Mail className="w-4 h-4" />
                  Apply as a vendor
                </Button>
              </a>
            )}

            {market.websiteUrl && (
              <a href={market.websiteUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full gap-2">
                  <Globe className="w-4 h-4" />
                  Visit website
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
