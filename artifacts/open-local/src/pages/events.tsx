import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useListEvents, useCreateEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useSearchLogger } from "@/hooks/use-search-logger";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  MapPin,
  Clock,
  Ticket,
  Plus,
  Search,
  Tag,
  Star,
  Users,
  ExternalLink,
  PartyPopper,
} from "lucide-react";

const CATEGORIES = [
  "Farmers Market",
  "Festival",
  "Live Music",
  "Food & Drink",
  "Art & Culture",
  "Outdoor & Nature",
  "Workshop & Class",
  "Pop-Up Shop",
  "Community Meetup",
  "Sports & Fitness",
  "Family & Kids",
  "Fundraiser",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Farmers Market":    "bg-green-100 text-green-800",
  "Festival":          "bg-yellow-100 text-yellow-800",
  "Live Music":        "bg-purple-100 text-purple-800",
  "Food & Drink":      "bg-orange-100 text-orange-800",
  "Art & Culture":     "bg-pink-100 text-pink-800",
  "Outdoor & Nature":  "bg-teal-100 text-teal-800",
  "Workshop & Class":  "bg-blue-100 text-blue-800",
  "Pop-Up Shop":       "bg-rose-100 text-rose-800",
  "Community Meetup":  "bg-indigo-100 text-indigo-800",
  "Sports & Fitness":  "bg-cyan-100 text-cyan-800",
  "Family & Kids":     "bg-lime-100 text-lime-800",
  "Fundraiser":        "bg-amber-100 text-amber-800",
};

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please describe your event (min 20 chars)"),
  category: z.string().min(1, "Please select a category"),
  venueName: z.string().min(2, "Venue name is required"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().length(2, "Please select a state"),
  startsAt: z.string().min(1, "Start date & time is required"),
  endsAt: z.string().optional(),
  isFree: z.boolean().default(true),
  priceDollars: z.coerce.number().min(0).optional(),
  ticketUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  organizerName: z.string().min(2, "Organizer name is required"),
  organizerEmail: z.string().email("Valid email required"),
});

type FormValues = z.infer<typeof formSchema>;

function formatEventDate(startsAt: string, endsAt?: string | null) {
  const start = new Date(startsAt);
  const dateStr = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (endsAt) {
    const end = new Date(endsAt);
    const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return { date: dateStr, time: `${startTime} – ${endTime}` };
  }
  return { date: dateStr, time: startTime };
}

function getDayLabel(startsAt: string) {
  const start = new Date(startsAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const eventDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  if (eventDay.getTime() === today.getTime()) return "Today";
  if (eventDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  const diffDays = Math.ceil((eventDay.getTime() - today.getTime()) / 86400000);
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  return null;
}

function EventCard({ event, index }: {
  event: {
    id: number; title: string; description: string; category: string;
    venueName: string; city: string; state: string; startsAt: string;
    endsAt?: string | null; isFree: boolean; priceCents?: number | null;
    ticketUrl?: string | null; imageUrl?: string | null; organizerName: string;
    featured: boolean;
  };
  index: number;
}) {
  const { date, time } = formatEventDate(event.startsAt, event.endsAt);
  const dayLabel = getDayLabel(event.startsAt);
  const catColor = CATEGORY_COLORS[event.category] ?? "bg-gray-100 text-gray-700";
  const isPast = new Date(event.startsAt) < new Date();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04 }}
      className={`group bg-background border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${isPast ? "opacity-60" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/7] overflow-hidden bg-muted">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <PartyPopper className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        {/* Overlays */}
        <div className="absolute top-3 left-3 flex gap-2">
          {event.featured && (
            <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 text-xs font-bold px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3" /> Featured
            </span>
          )}
          {dayLabel && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              {dayLabel}
            </span>
          )}
          {isPast && (
            <span className="bg-muted/80 text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
              Past event
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${event.isFree ? "bg-emerald-100 text-emerald-800" : "bg-background/90 text-foreground"}`}>
            {event.isFree ? "Free" : event.priceCents ? `$${(event.priceCents / 100).toFixed(0)}` : "Paid"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${catColor}`}>
            {event.category}
          </span>
        </div>

        <h3 className="font-serif font-bold text-lg text-foreground leading-snug mb-1 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{event.description}</p>

        <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{event.venueName} · {event.city}, {event.state}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span>by {event.organizerName}</span>
          </div>
        </div>

        {event.ticketUrl && (
          <a
            href={event.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Ticket className="w-3.5 h-3.5" />
            Get tickets
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function Events() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "all">("upcoming");
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: events, isLoading } = useListEvents({
    upcoming: timeFilter === "upcoming" ? true : undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    search: search || undefined,
  });

  useSearchLogger(search, "events", events?.length);

  const createEvent = useCreateEvent();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", description: "", category: "", venueName: "",
      address: "", city: "", state: "FL", startsAt: "", endsAt: "",
      isFree: true, ticketUrl: "", imageUrl: "",
      organizerName: "", organizerEmail: "",
    },
  });

  const watchIsFree = form.watch("isFree");

  const onSubmit = (values: FormValues) => {
    const priceCents = !values.isFree && values.priceDollars ? Math.round(values.priceDollars * 100) : null;
    createEvent.mutate(
      {
        data: {
          title: values.title,
          description: values.description,
          category: values.category,
          venueName: values.venueName,
          address: values.address,
          city: values.city,
          state: values.state,
          startsAt: values.startsAt,
          endsAt: values.endsAt || undefined,
          isFree: values.isFree,
          priceCents,
          ticketUrl: values.ticketUrl || null,
          imageUrl: values.imageUrl || null,
          organizerName: values.organizerName,
          organizerEmail: values.organizerEmail,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast({ title: "Event submitted!", description: "Your event is now live on the board." });
          setSubmitOpen(false);
          form.reset();
        },
        onError: () => toast({ variant: "destructive", title: "Failed to submit event" }),
      },
    );
  };

  const featured = useMemo(() => (events ?? []).filter((e) => e.featured), [events]);
  const rest = useMemo(() => (events ?? []).filter((e) => !e.featured), [events]);

  return (
    <Layout>
      {/* Hero */}
      <div className="relative bg-primary overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_20%_50%,white,transparent_60%),radial-gradient(circle_at_80%_20%,white,transparent_50%)]" />
        <div className="relative container max-w-6xl mx-auto px-4 py-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/60 mb-3">Community Events</p>
              <h1 className="text-5xl font-serif font-bold text-primary-foreground leading-tight">
                What's happening<br />near you
              </h1>
              <p className="text-primary-foreground/75 mt-3 max-w-lg font-sans text-lg">
                Local markets, live music, pop-up shops, festivals, workshops — all in one place.
              </p>
            </div>
            <Button
              onClick={() => setSubmitOpen(true)}
              variant="secondary"
              className="flex-shrink-0 self-start sm:self-auto font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit an event
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search events, venues, organizers…"
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
          <div className="flex gap-1 bg-muted border border-border rounded-lg p-1 flex-shrink-0">
            {(["upcoming", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  timeFilter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "upcoming" ? "Upcoming" : "All events"}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          {isLoading ? "Loading…" : `${(events ?? []).length} event${(events ?? []).length !== 1 ? "s" : ""}`}
        </p>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/7] w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (events ?? []).length === 0 && (
          <div className="text-center py-24 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-25" />
            <p className="text-lg font-medium">No events found.</p>
            <p className="text-sm mt-1">Be the first to add one to the board.</p>
            <Button className="mt-6" onClick={() => setSubmitOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Submit an event
            </Button>
          </div>
        )}

        {/* Featured strip */}
        {!isLoading && featured.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Featured Events</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {featured.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* All events */}
        {!isLoading && rest.length > 0 && (
          <div>
            {featured.length > 0 && (
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">All Events</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {rest.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Submit a Community Event</DialogTitle>
            <DialogDescription>
              Share a local gathering, market, show, or workshop with the community.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
              {/* Title */}
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event title</FormLabel>
                  <FormControl><Input placeholder="Sunday Farmers Market at Riverside Park" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Description */}
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="Tell people what to expect…" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Category */}
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Date & time */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startsAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date & time</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endsAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End time (optional)</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Venue */}
              <FormField control={form.control} name="venueName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Venue name</FormLabel>
                  <FormControl><Input placeholder="Riverside Park Pavilion" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="Tampa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="FL" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Admission */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <FormField control={form.control} name="isFree" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="text-base">Free admission</FormLabel>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

                {!watchIsFree && (
                  <FormField control={form.control} name="priceDollars" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket price ($)</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="15.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="ticketUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket / RSVP link (optional)</FormLabel>
                    <FormControl><Input placeholder="https://eventbrite.com/..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Image */}
              <FormField control={form.control} name="imageUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel>Event image URL (optional)</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Organizer */}
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="organizerName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organizer name</FormLabel>
                    <FormControl><Input placeholder="Open Local Community" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="organizerEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl><Input type="email" placeholder="hello@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" className="w-full" disabled={createEvent.isPending}>
                {createEvent.isPending ? "Submitting…" : "Submit Event"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
