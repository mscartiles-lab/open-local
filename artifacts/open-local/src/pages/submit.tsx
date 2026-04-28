import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wheat,
  Carrot,
  HandHeart,
  Beer,
  Hammer,
  Soup,
  Beef,
  Flower2,
  Coffee,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  AtSign,
  Phone,
  Globe,
  Instagram,
  Facebook,
  Plus,
  Minus,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateVendor,
  getListVendorsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const categories = [
  { name: "Bakery", icon: Wheat, image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80" },
  { name: "Farm", icon: Carrot, image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1200&q=80" },
  { name: "Apiary", icon: HandHeart, image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80" },
  { name: "Brewery", icon: Beer, image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80" },
  { name: "Crafts", icon: Hammer, image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80" },
  { name: "Pantry", icon: Soup, image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80" },
  { name: "Butcher", icon: Beef, image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&q=80" },
  { name: "Florist", icon: Flower2, image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80" },
  { name: "Coffee", icon: Coffee, image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80" },
  { name: "Other", icon: Sparkles, image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80" },
] as const;

const popularCities = [
  "Miami",
  "Tampa",
  "Orlando",
  "Jacksonville",
  "St. Petersburg",
  "Fort Lauderdale",
  "Gainesville",
  "Tallahassee",
  "Sarasota",
  "Key West",
];

const formSchema = z.object({
  category: z.string().min(2, "Pick a category."),
  name: z.string().min(2, "Add your business name."),
  tagline: z.string().min(10, "A short one-liner that tells people what you make."),
  description: z.string().min(20, "Tell us a sentence or two about what you make."),
  location: z.string().min(2, "Pick or type a city."),
  region: z.string().min(2),
  established: z.coerce.number().int().min(1800).max(new Date().getFullYear()),
  contactEmail: z.string().email("Enter a valid email."),
  imageUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  marketsText: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

const stepFields: Record<number, (keyof FormValues)[]> = {
  1: ["category"],
  2: ["name", "tagline", "description", "location", "region"],
  3: ["contactEmail", "imageUrl", "websiteUrl", "phone", "instagramHandle", "facebookUrl", "marketsText"],
};

export default function Submit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createVendor = useCreateVendor();

  const [step, setStep] = useState(1);
  const [showOptionalContact, setShowOptionalContact] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      category: "",
      name: "",
      tagline: "",
      description: "",
      location: "",
      region: "Florida",
      established: new Date().getFullYear(),
      contactEmail: "",
      imageUrl: "",
      websiteUrl: "",
      phone: "",
      instagramHandle: "",
      facebookUrl: "",
      marketsText: "",
    },
  });

  const watchedCategory = form.watch("category");
  const watchedName = form.watch("name");
  const watchedLocation = form.watch("location");

  const defaultImage = useMemo(() => {
    const match = categories.find((c) => c.name === watchedCategory);
    return match?.image ?? "";
  }, [watchedCategory]);

  function pickCategory(name: string) {
    form.setValue("category", name, { shouldValidate: true });
    setStep(2);
  }

  async function nextStep() {
    const fields = stepFields[step];
    const valid = await form.trigger(fields);
    if (!valid) return;
    setStep(step + 1);
  }

  function prevStep() {
    setStep(Math.max(1, step - 1));
  }

  async function publish() {
    const fields = stepFields[3];
    const valid = await form.trigger(fields);
    if (!valid) return;
    const values = form.getValues();
    const slug = values.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const instagramHandleClean = values.instagramHandle?.replace(/^@/, "");

    createVendor.mutate(
      {
        data: {
          ...values,
          slug,
          imageUrl: values.imageUrl || defaultImage,
          websiteUrl: values.websiteUrl || null,
          phone: values.phone || null,
          instagramHandle: instagramHandleClean || null,
          facebookUrl: values.facebookUrl || null,
          marketsText: values.marketsText || null,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
          toast({
            title: "You're on Open Local",
            description: "Your business has been published.",
          });
          setLocation(`/vendors/${data.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Couldn't publish your business",
            description: "Please try again in a moment.",
          });
        },
      },
    );
  }

  return (
    <Layout>
      <div className="bg-muted border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
          <div className="text-center">
            <p className="text-sm tracking-[0.2em] uppercase text-primary font-semibold mb-3">
              Three quick steps
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-3">
              List your business on Open Local
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              We'll help neighbors and visitors find what you make. Free to list, takes about a minute.
            </p>
          </div>

          <Stepper step={step} />
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-10 md:py-14">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StepHeader
                eyebrow="Step 1"
                title="What do you make?"
                subtitle="Pick the category that fits best — you can always change it later."
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mt-8">
                {categories.map(({ name, icon: Icon }) => {
                  const selected = watchedCategory === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => pickCategory(name)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-3 rounded-lg border bg-card px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selected
                          ? "border-primary ring-2 ring-primary"
                          : "border-border",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-primary group-hover:bg-primary/10",
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </span>
                      <span className="font-serif font-semibold text-foreground">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-6">
                Tap a category to continue.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StepHeader
                eyebrow="Step 2"
                title="Tell us about your business"
                subtitle="A few quick details so people know what you're about."
              />

              <div className="mt-8 space-y-6">
                <Field
                  label="Business name"
                  required
                  error={form.formState.errors.name?.message}
                >
                  <Input
                    placeholder="Wynwood Loaf"
                    autoFocus
                    {...form.register("name")}
                  />
                </Field>

                <Field
                  label="One-line tagline"
                  required
                  hint="What you make, in a sentence."
                  error={form.formState.errors.tagline?.message}
                >
                  <Input
                    placeholder="Sourdough and Cuban-style breads from a Miami garage bakery."
                    {...form.register("tagline")}
                  />
                </Field>

                <Field
                  label="Short story"
                  required
                  hint="A couple of sentences about who you are and how you make it."
                  error={form.formState.errors.description?.message}
                >
                  <Textarea
                    placeholder="A two-baker shop turning out naturally leavened miches and guava cream cheese danishes. We mill some of our own flour from Florida-grown grains."
                    className="min-h-[140px]"
                    {...form.register("description")}
                  />
                </Field>

                <Field
                  label="City"
                  required
                  error={form.formState.errors.location?.message}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {popularCities.map((city) => {
                        const selected = watchedLocation === city;
                        return (
                          <button
                            key={city}
                            type="button"
                            onClick={() =>
                              form.setValue("location", city, {
                                shouldValidate: true,
                              })
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/50",
                            )}
                          >
                            {city}
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Or type another Florida city"
                        className="pl-9"
                        value={form.watch("location")}
                        onChange={(e) =>
                          form.setValue("location", e.target.value, {
                            shouldValidate: true,
                          })
                        }
                      />
                    </div>
                  </div>
                </Field>

                <input type="hidden" {...form.register("region")} />
              </div>

              <NavRow
                onBack={prevStep}
                onNext={nextStep}
                nextLabel="Continue"
                disabled={false}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <StepHeader
                eyebrow="Step 3"
                title="How can people reach you?"
                subtitle="Just an email is enough. Add a cover photo and socials if you'd like."
              />

              <div className="mt-8 space-y-6">
                <Field
                  label="Email"
                  required
                  hint="Shown on your public profile so people can reach out."
                  error={form.formState.errors.contactEmail?.message}
                >
                  <div className="relative">
                    <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="hello@yourbusiness.com"
                      className="pl-9"
                      autoFocus
                      {...form.register("contactEmail")}
                    />
                  </div>
                </Field>

                <Field
                  label="Cover photo"
                  hint={
                    defaultImage
                      ? `Leave blank and we'll use a clean ${watchedCategory.toLowerCase()} cover.`
                      : "Paste an image URL — a wide shot of your storefront, farm, or studio."
                  }
                  error={form.formState.errors.imageUrl?.message}
                >
                  <Input
                    placeholder="https://..."
                    {...form.register("imageUrl")}
                  />
                  {defaultImage && !form.watch("imageUrl") && (
                    <div className="mt-3 overflow-hidden rounded-md border border-border">
                      <img
                        src={defaultImage}
                        alt="Default cover preview"
                        className="h-32 w-full object-cover"
                      />
                      <p className="bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                        Using this as your cover unless you add your own.
                      </p>
                    </div>
                  )}
                </Field>

                <button
                  type="button"
                  onClick={() => setShowOptionalContact((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  {showOptionalContact ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {showOptionalContact ? "Hide" : "Add"} more details (optional)
                </button>

                <AnimatePresence>
                  {showOptionalContact && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-6 pt-2">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                          <Field
                            label="Phone"
                            error={form.formState.errors.phone?.message}
                          >
                            <div className="relative">
                              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="(555) 123-4567"
                                className="pl-9"
                                {...form.register("phone")}
                              />
                            </div>
                          </Field>
                          <Field
                            label="Website"
                            error={form.formState.errors.websiteUrl?.message}
                          >
                            <div className="relative">
                              <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="https://..."
                                className="pl-9"
                                {...form.register("websiteUrl")}
                              />
                            </div>
                          </Field>
                          <Field
                            label="Instagram"
                            error={form.formState.errors.instagramHandle?.message}
                          >
                            <div className="relative">
                              <Instagram className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="@yourhandle"
                                className="pl-9"
                                {...form.register("instagramHandle")}
                              />
                            </div>
                          </Field>
                          <Field
                            label="Facebook"
                            error={form.formState.errors.facebookUrl?.message}
                          >
                            <div className="relative">
                              <Facebook className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                placeholder="https://facebook.com/..."
                                className="pl-9"
                                {...form.register("facebookUrl")}
                              />
                            </div>
                          </Field>
                        </div>
                        <Field
                          label="Markets you sell at"
                          hint="Separate with commas — e.g. Wynwood Saturday Market, Coconut Grove Sunday Market."
                          error={form.formState.errors.marketsText?.message}
                        >
                          <Textarea
                            placeholder="Wynwood Saturday Market, Coconut Grove Sunday Market"
                            className="min-h-[80px]"
                            {...form.register("marketsText")}
                          />
                        </Field>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {watchedName && (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                      Preview
                    </p>
                    <p className="font-serif text-xl font-bold text-foreground">
                      {watchedName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {watchedCategory} · {watchedLocation || "Florida"}
                    </p>
                  </div>
                )}
              </div>

              <NavRow
                onBack={prevStep}
                onNext={publish}
                nextLabel={
                  createVendor.isPending ? "Publishing..." : "Publish your business"
                }
                nextIcon={
                  createVendor.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="ml-2 h-4 w-4" />
                  )
                }
                disabled={createVendor.isPending}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Category", "Story", "Contact"];
  return (
    <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  done && "bg-primary text-primary-foreground",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground border border-border",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-semibold sm:block",
                  active || done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {n < labels.length && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-16 transition-colors",
                  done ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-2">
        {eyebrow}
      </p>
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
        {title}
      </h2>
      <p className="text-muted-foreground max-w-lg mx-auto">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
  nextIcon,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextIcon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <Button type="button" onClick={onNext} disabled={disabled} className="px-6">
        {nextLabel}
        {nextIcon ?? <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
