import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Store, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateVendor, getListVendorsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  tagline: z.string().min(10, "Tagline should be a bit more descriptive."),
  description: z.string().min(20, "Tell us your story."),
  category: z.string().min(2, "Category is required."),
  location: z.string().min(2, "Location is required."),
  region: z.string().min(2, "Region is required."),
  contactEmail: z.string().email("Invalid email address."),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Must be a valid image URL").optional().or(z.literal("")),
  established: z.coerce.number().int().min(1800).max(new Date().getFullYear()),
  phone: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  marketsText: z.string().optional().or(z.literal("")),
});

export default function Submit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createVendor = useCreateVendor();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      category: "",
      location: "",
      region: "Florida",
      contactEmail: "",
      websiteUrl: "",
      imageUrl: "",
      established: new Date().getFullYear(),
      phone: "",
      instagramHandle: "",
      facebookUrl: "",
      marketsText: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const slug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const instagramHandleClean = values.instagramHandle?.replace(/^@/, '');
    
    createVendor.mutate(
      {
        data: {
          ...values,
          slug,
          websiteUrl: values.websiteUrl || null,
          imageUrl: values.imageUrl || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800", // Fallback if empty, though we're avoiding unsplash normally, here it's just a default value for a form
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
            title: "Producer added!",
            description: "Your business has been listed on Open Local.",
          });
          setLocation(`/vendors/${data.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Something went wrong.",
            description: "Please try again later.",
          });
        },
      }
    );
  }

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12 mb-12">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <Store className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">List your business</h1>
          <p className="text-lg text-muted-foreground font-sans">
            Join the directory of independent makers, farmers, and artisans in Florida.
          </p>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 pb-24">
        <Card className="border-border shadow-xl rounded-none">
          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                <div className="space-y-4">
                  <h3 className="font-serif font-bold text-xl border-b border-border pb-2">The Basics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Roasters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Coffee, Ceramics, Farm..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="Small-batch single origin coffee roasted in..." {...field} />
                        </FormControl>
                        <FormDescription>A short one-sentence summary.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>The Story</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about your process, history, and what makes your goods unique." 
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="font-serif font-bold text-xl border-b border-border pb-2">Location & Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City / Town</FormLabel>
                          <FormControl>
                            <Input placeholder="Miami" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Region</FormLabel>
                          <FormControl>
                            <Input placeholder="Florida" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="established"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Established</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2015" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="font-serif font-bold text-xl border-b border-border pb-2">Contact & Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Public Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="hello@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cover Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <FormDescription>A wide shot of your storefront, farm, or studio.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-6">
                  <h3 className="font-serif font-bold text-xl border-b border-border pb-2">Help people find you (optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="instagramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram Handle</FormLabel>
                          <FormControl>
                            <Input placeholder="@acmeroasters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="facebookUrl"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Facebook URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://facebook.com/acmeroasters" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketsText"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Markets you sell at</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Miami Farmers Market, Coconut Grove Market" {...field} />
                          </FormControl>
                          <FormDescription>Separate multiple markets with commas.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto px-8 py-6 text-lg font-bold"
                    disabled={createVendor.isPending}
                  >
                    {createVendor.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    List Your Business
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
