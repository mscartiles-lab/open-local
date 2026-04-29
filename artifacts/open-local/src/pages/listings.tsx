import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListListings, useCreateListing } from "@workspace/api-client-react";
import { useSearchLogger } from "@/hooks/use-search-logger";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListListingsQueryKey } from "@workspace/api-client-react";
import {
  Search,
  Plus,
  HandHelping,
  Wrench,
  MapPin,
  Calendar,
  Tag,
  MessageSquare,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const CATEGORIES = [
  "Home & Garden",
  "Childcare & Education",
  "Cleaning & Maintenance",
  "Pet Care",
  "Health & Wellness",
  "Food & Catering",
  "Arts & Creative",
  "Tech & Repairs",
  "Events & Entertainment",
  "Transportation",
  "Agricultural & Farm",
  "Legal & Professional",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please describe what you need or offer (min 20 chars)"),
  type: z.enum(["wanted", "offering"]),
  category: z.string().min(1, "Please select a category"),
  city: z.string().min(2, "Please enter your city"),
  state: z.string().length(2, "Please select a state"),
  contactName: z.string().min(2, "Please enter your name"),
  contactEmail: z.string().email("Please enter a valid email"),
});

type FormValues = z.infer<typeof formSchema>;

function ListingCard({ listing }: { listing: {
  id: number; title: string; description: string; type: string;
  category: string; city: string; state: string; contactName: string; createdAt: string;
}}) {
  const isWanted = listing.type === "wanted";
  const daysAgo = Math.max(0, Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-background border border-border rounded-xl p-5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
              isWanted
                ? "bg-violet-100 text-violet-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {isWanted ? <HandHelping className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
            {isWanted ? "Wanted" : "Offering"}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Tag className="w-3 h-3" />
            {listing.category}
          </span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
        </span>
      </div>

      <h3 className="font-serif font-bold text-foreground text-lg leading-snug mb-2">{listing.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4">{listing.description}</p>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {listing.city}, {listing.state}
        </span>
        <span className="flex items-center gap-1 font-medium text-foreground">
          <MessageSquare className="w-3 h-3 text-primary" />
          {listing.contactName}
        </span>
      </div>
    </motion.div>
  );
}

export default function Listings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"all" | "wanted" | "offering">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [postOpen, setPostOpen] = useState(false);

  const { data: listings, isLoading } = useListListings({
    type: tab === "all" ? undefined : tab,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  });

  useSearchLogger(search, "listings", listings?.length);

  const createListing = useCreateListing();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "wanted",
      category: "",
      city: "",
      state: "FL",
      contactName: "",
      contactEmail: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createListing.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListListingsQueryKey() });
          toast({ title: "Listing posted!", description: "Your listing is now live." });
          setPostOpen(false);
          form.reset();
        },
        onError: () => toast({ variant: "destructive", title: "Failed to post listing" }),
      },
    );
  };

  const displayedListings = listings ?? [];

  return (
    <Layout>
      {/* Header */}
      <div className="bg-muted border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-foreground">Local Listings</h1>
              <p className="text-muted-foreground mt-2 font-sans max-w-xl">
                Community classifieds for local services — post what you need or what you offer, and connect with your neighbors.
              </p>
            </div>
            <Button onClick={() => setPostOpen(true)} className="flex-shrink-0 self-start sm:self-auto">
              <Plus className="w-4 h-4 mr-2" />
              Post a listing
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-8 bg-background border border-border rounded-lg p-1 w-fit">
            {(["all", "wanted", "offering"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : t === "wanted" ? "🙋 Wanted" : "🔧 Offering"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Search + category filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Tag className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          {isLoading ? "Loading…" : `${displayedListings.length} listing${displayedListings.length !== 1 ? "s" : ""}`}
        </p>

        {/* Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : displayedListings.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <HandHelping className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No listings yet.</p>
            <p className="text-sm mt-1">Be the first to post a local listing.</p>
            <Button className="mt-6" onClick={() => setPostOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Post a listing
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {displayedListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Post dialog */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Post a Local Listing</DialogTitle>
            <DialogDescription>
              Connect with your community — share what you need or what you can offer.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              {/* Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am…</FormLabel>
                    <div className="flex gap-3">
                      {[
                        { value: "wanted", label: "🙋 Looking for help", color: "border-violet-400 bg-violet-50 text-violet-800" },
                        { value: "offering", label: "🔧 Offering a service", color: "border-emerald-400 bg-emerald-50 text-emerald-800" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            field.value === opt.value ? opt.color + " border-2" : "border-border bg-background text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Looking for a reliable dog walker in Tampa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what you need or what you offer — schedule, frequency, budget, experience, etc."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Tampa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="FL" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={createListing.isPending}>
                {createListing.isPending ? "Posting…" : "Post Listing"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
