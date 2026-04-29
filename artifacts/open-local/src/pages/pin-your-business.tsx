import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSubmitEstablishment } from "@workspace/api-client-react";
import Layout from "@/components/layout/Layout";
import { MapPin, Store, CheckCircle, Clock, Star } from "lucide-react";

const ESTABLISHMENT_TYPES = [
  "Café",
  "Restaurant",
  "Bar / Brewery",
  "Boutique",
  "Gallery",
  "Bookshop",
  "Bakery",
  "Farm Stand",
  "Spa / Wellness",
  "Fitness",
  "Market",
  "Other",
];

const schema = z.object({
  name: z.string().min(2, "Business name is required"),
  type: z.string().min(1, "Please select a type"),
  description: z.string().min(20, "Please write at least 20 characters"),
  address: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  contactEmail: z.string().email("Valid email required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL (include https://)").optional().or(z.literal("")),
  instagramHandle: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function PinYourBusiness() {
  const [submitted, setSubmitted] = useState(false);
  const { mutateAsync, isPending } = useSubmitEstablishment();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: "FL" },
  });

  const onSubmit = async (data: FormData) => {
    await mutateAsync({
      data: {
        ...data,
        website: data.website || null,
        phone: data.phone || null,
        instagramHandle: data.instagramHandle || null,
        latitude: null,
        longitude: null,
      },
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-4">
              You're on the map — almost!
            </h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              We received your submission and will review it shortly. Once approved, your business will appear as a pin on the map for local explorers to discover.
            </p>
            <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground text-left mb-8">
              <p className="font-medium text-foreground mb-1">What happens next?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Our team reviews your submission (usually within 24 hrs)</li>
                <li>We'll email you when you go live</li>
                <li>Your pin appears on the home map and the mobile app</li>
              </ul>
            </div>
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
            >
              Back to the map
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-[#c0622f]/10 text-[#c0622f] px-3 py-1.5 rounded-full text-sm font-semibold mb-5">
            <MapPin className="w-4 h-4" />
            Free during our launch period
          </div>
          <h1 className="text-5xl font-serif font-bold text-foreground mb-4 leading-tight">
            Pin your business<br />on the map
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            Get your independently-owned establishment discovered by locals and visitors exploring the area. Visible on both our web map and mobile app.
          </p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Star, title: "Free to start", body: "No charge during our launch. We'll give you plenty of notice before any pricing kicks in." },
            { icon: MapPin, title: "On every map", body: "Your pin shows on the home page and in the mobile app's Nearby tab." },
            { icon: Clock, title: "Live in 24 hrs", body: "Submit today, reviewed by our team, and live on the map within a day." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="border border-border rounded-lg p-5">
              <div className="w-9 h-9 rounded-full bg-[#c0622f]/10 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-[#c0622f]" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Store className="w-5 h-5 text-[#c0622f]" /> Business info
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Business name <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="e.g. The Garden Café"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Type <span className="text-destructive">*</span>
                </label>
                <select
                  {...register("type")}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Select type…</option>
                  {ESTABLISHMENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input
                  {...register("phone")}
                  placeholder="(555) 000-0000"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Tell locals what makes your place special…"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#c0622f]" /> Location
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Street address <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("address")}
                  placeholder="123 Main St"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  State <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("state")}
                  placeholder="FL"
                  maxLength={2}
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary uppercase"
                />
                {errors.state && <p className="text-xs text-destructive mt-1">{errors.state.message}</p>}
              </div>

              <div className="sm:col-span-3">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  City <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("city")}
                  placeholder="Tampa"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Contact & links</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Contact email <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("contactEmail")}
                  type="email"
                  placeholder="you@yourbusiness.com"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.contactEmail && <p className="text-xs text-destructive mt-1">{errors.contactEmail.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Website</label>
                <input
                  {...register("website")}
                  placeholder="https://yourbusiness.com"
                  className="w-full border border-input rounded-md px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                {errors.website && <p className="text-xs text-destructive mt-1">{errors.website.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Instagram handle</label>
                <div className="flex items-center border border-input rounded-md overflow-hidden bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                  <span className="px-3 text-sm text-muted-foreground border-r border-input py-2.5 bg-muted">@</span>
                  <input
                    {...register("instagramHandle")}
                    placeholder="yourbusiness"
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Free during our launch period. No payment info required.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#c0622f] text-white px-8 py-3 rounded-md font-semibold hover:bg-[#a85228] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
            >
              {isPending ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
