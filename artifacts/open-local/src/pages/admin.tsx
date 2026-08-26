import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tag, Plus, Trash2, Loader2, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/layout/Layout";
import UsersAdminTab from "@/components/admin/UsersAdminTab";
import EstablishmentsAdminTab from "@/components/admin/EstablishmentsAdminTab";
import SupportAdminTab from "@/components/admin/SupportAdminTab";
import CertificationsAdminTab from "@/components/admin/CertificationsAdminTab";
import IpLogsAdminTab from "@/components/admin/IpLogsAdminTab";
import InvitesAdminTab from "@/components/admin/InvitesAdminTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  useListVendors, 
  useUpdateVendor, 
  useDeleteVendor, 
  useListProducts, 
  useUpdateProduct, 
  useDeleteProduct, 
  useCreateProduct,
  getListVendorsQueryKey,
  getListProductsQueryKey,
  getGetMarketplaceStatsQueryKey,
  getListFeaturedVendorsQueryKey,
  getListFeaturedProductsQueryKey,
  ListingType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const productSchema = z.object({
  vendorId: z.coerce.number().int().positive("Please select a vendor"),
  name: z.string().min(2, "Name is required"),
  description: z.string().min(10, "Description is required"),
  priceDollars: z.coerce.number().positive("Price must be positive"),
  unit: z.string().min(1, "Unit is required (e.g., 'bag', 'lb')"),
  category: z.string().min(2, "Category is required"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  inStock: z.boolean().default(true),
  featured: z.boolean().default(false),
  listingType: z.enum(["regular", "batch_drop", "surplus", "pre_order"]).default("regular"),
  originalPriceDollars: z.coerce.number().min(0).optional().or(z.literal("").transform(() => undefined)),
  availableUntil: z.string().optional().or(z.literal("")),
  pickupNote: z.string().optional().or(z.literal("")),
});

export default function Admin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // Queries
  const { data: vendors, isLoading: vendorsLoading } = useListVendors();
  const { data: products, isLoading: productsLoading } = useListProducts();

  // Mutations
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();

  const productForm = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      priceDollars: 0,
      unit: "item",
      category: "",
      imageUrl: "",
      inStock: true,
      featured: false,
      listingType: "regular",
      originalPriceDollars: undefined,
      availableUntil: "",
      pickupNote: "",
    },
  });

  const watchListingType = productForm.watch("listingType");

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMarketplaceStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFeaturedVendorsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFeaturedProductsQueryKey() });
  };

  const handleToggleVendorFeatured = (id: number, currentStatus: boolean) => {
    updateVendor.mutate(
      { id, data: { featured: !currentStatus } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({
            title: t("admin.vendorUpdated"),
            description: !currentStatus ? t("admin.vendorFeatured") : t("admin.vendorUnfeatured"),
          });
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorUpdatingVendor") })
      }
    );
  };

  const handleDeleteVendor = (id: number) => {
    deleteVendor.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: t("admin.vendorDeleted") });
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorDeletingVendor") })
      }
    );
  };

  const handleToggleProductFeatured = (id: number, currentStatus: boolean) => {
    updateProduct.mutate(
      { id, data: { featured: !currentStatus } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({
            title: t("admin.productUpdated"),
            description: !currentStatus ? t("admin.productFeatured") : t("admin.productUnfeatured"),
          });
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorUpdatingProduct") })
      }
    );
  };

  const handleToggleProductStock = (id: number, currentStatus: boolean) => {
    updateProduct.mutate(
      { id, data: { inStock: !currentStatus } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({
            title: t("admin.productUpdated"),
            description: !currentStatus ? t("admin.productInStock") : t("admin.productOutOfStock"),
          });
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorUpdatingProduct") })
      }
    );
  };

  const handleDeleteProduct = (id: number) => {
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: t("admin.productDeleted") });
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorDeletingProduct") })
      }
    );
  };

  const onSubmitProduct = (values: z.infer<typeof productSchema>) => {
    const originalPriceCents = values.listingType === 'surplus' && values.originalPriceDollars 
      ? Math.round(values.originalPriceDollars * 100) 
      : null;
      
    const availableUntil = (values.listingType === 'batch_drop' || values.listingType === 'pre_order') && values.availableUntil 
      ? new Date(values.availableUntil).toISOString() 
      : null;
      
    const pickupNote = (values.listingType === 'batch_drop' || values.listingType === 'pre_order') && values.pickupNote 
      ? values.pickupNote 
      : null;

    createProduct.mutate(
      {
        data: {
          vendorId: values.vendorId,
          name: values.name,
          description: values.description,
          priceCents: Math.round(values.priceDollars * 100),
          unit: values.unit,
          category: values.category,
          imageUrl: values.imageUrl || "https://images.unsplash.com/photo-1595858603623-68d839352e64?auto=format&fit=crop&q=80&w=800",
          inStock: values.inStock,
          featured: values.featured,
          listingType: values.listingType as ListingType,
          originalPriceCents,
          availableUntil,
          pickupNote,
        }
      },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: t("admin.productCreated") });
          setIsAddProductOpen(false);
          productForm.reset();
        },
        onError: () => toast({ variant: "destructive", title: t("admin.errorCreatingProduct") })
      }
    );
  };

  return (
    <Layout>
      <div className="bg-muted border-b border-border py-12 mb-8">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{t("admin.pageTitle")}</h1>
              <p className="text-lg text-muted-foreground font-sans">
                {t("admin.manageDescription")}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a
                href="/search-insights"
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-amber-700 transition-colors mt-1 flex-shrink-0"
              >
                <BarChart3 className="w-4 h-4" />
                {t("admin.demandSignals")}
              </a>
              <a
                href="/master-list"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors mt-1 flex-shrink-0"
              >
                <Tag className="w-4 h-4" />
                {t("admin.masterProductList")}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 pb-24">
        <Tabs defaultValue="vendors" className="w-full">
          <TabsList className="mb-8 flex-wrap h-auto">
            <TabsTrigger value="vendors" className="text-lg px-8">{t("admin.tabProducers")}</TabsTrigger>
            <TabsTrigger value="products" className="text-lg px-8">{t("admin.tabProducts")}</TabsTrigger>
            <TabsTrigger value="establishments" className="text-lg px-8">{t("admin.tabBusinesses")}</TabsTrigger>
            <TabsTrigger value="users" className="text-lg px-8">{t("admin.tabUsers")}</TabsTrigger>
            <TabsTrigger value="support" className="text-lg px-8">{t("admin.tabSupport")}</TabsTrigger>
            <TabsTrigger value="certifications" className="text-lg px-8">{t("admin.tabCertifications")}</TabsTrigger>
            <TabsTrigger value="ip-logs" className="text-lg px-8">{t("admin.tabIpLogs")}</TabsTrigger>
            <TabsTrigger value="invites" className="text-lg px-8">{t("admin.tabInvites")}</TabsTrigger>
          </TabsList>

          <TabsContent value="establishments" className="space-y-6">
            <EstablishmentsAdminTab />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersAdminTab />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <SupportAdminTab />
          </TabsContent>

          <TabsContent value="certifications" className="space-y-6">
            <CertificationsAdminTab />
          </TabsContent>

          <TabsContent value="ip-logs" className="space-y-6">
            <IpLogsAdminTab />
          </TabsContent>

          <TabsContent value="invites" className="space-y-6">
            <InvitesAdminTab />
          </TabsContent>

          <TabsContent value="vendors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.allProducers")}</CardTitle>
              </CardHeader>
              <CardContent>
                {vendorsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : vendors && vendors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.colName")}</TableHead>
                          <TableHead>{t("admin.colCategory")}</TableHead>
                          <TableHead>{t("admin.colLocation")}</TableHead>
                          <TableHead>{t("admin.colFeatured")}</TableHead>
                          <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendors.map((vendor) => (
                          <TableRow key={vendor.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{vendor.name}</span>
                                {vendor.flaggedForFollowup && (
                                  <span
                                    className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-amber-100 text-amber-800"
                                    title={t("admin.noProductsAlert")}
                                  >
                                    {t("admin.needsFollowup")}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{vendor.category}</TableCell>
                            <TableCell>{vendor.location}, {vendor.region}</TableCell>
                            <TableCell>
                              <Switch 
                                checked={vendor.featured} 
                                onCheckedChange={() => handleToggleVendorFeatured(vendor.id, vendor.featured)} 
                                disabled={updateVendor.isPending}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("admin.deleteVendorTitle", { name: vendor.name })}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("admin.deleteVendorWarning")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteVendor(vendor.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      {t("admin.delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">{t("admin.noProducers")}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold">{t("admin.allProducts")}</h2>
              <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> {t("admin.addProduct")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("admin.addNewProduct")}</DialogTitle>
                    <DialogDescription>
                      {t("admin.createProductDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...productForm}>
                    <form onSubmit={productForm.handleSubmit(onSubmitProduct)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={productForm.control}
                          name="vendorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("admin.fieldProducer")}</FormLabel>
                              <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value ? String(field.value) : undefined}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("admin.selectProducer")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {vendors?.map(v => (
                                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("admin.fieldProductName")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("admin.placeholderProductName")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("admin.fieldCategory")}</FormLabel>
                              <FormControl>
                                <Input placeholder={t("admin.placeholderCategory")} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={productForm.control}
                            name="priceDollars"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("admin.fieldPrice")}</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="8.50" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={productForm.control}
                            name="unit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("admin.fieldUnit")}</FormLabel>
                                <FormControl>
                                  <Input placeholder={t("admin.placeholderUnit")} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <FormField
                        control={productForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("admin.fieldDescription")}</FormLabel>
                            <FormControl>
                              <Textarea placeholder={t("admin.placeholderDescription")} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={productForm.control}
                        name="imageUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("admin.fieldImageUrl")}</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="font-serif font-bold text-lg">{t("admin.fieldListingType")}</h4>
                        <FormField
                          control={productForm.control}
                          name="listingType"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("admin.selectListingType")} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="regular">{t("admin.listingRegular")}</SelectItem>
                                  <SelectItem value="batch_drop">{t("admin.listingBatchDrop")}</SelectItem>
                                  <SelectItem value="surplus">{t("admin.listingMarketSurplus")}</SelectItem>
                                  <SelectItem value="pre_order">{t("admin.listingPreOrder")}</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {watchListingType === 'surplus' && (
                          <FormField
                            control={productForm.control}
                            name="originalPriceDollars"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("admin.fieldOriginalPrice")}</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" placeholder="12.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {(watchListingType === 'batch_drop' || watchListingType === 'pre_order') && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={productForm.control}
                              name="availableUntil"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("admin.fieldAvailableUntil")}</FormLabel>
                                  <FormControl>
                                    <Input type="datetime-local" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={productForm.control}
                              name="pickupNote"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("admin.fieldPickupNote")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Pickup Saturday 9AM-1PM at farmer's market..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-8 pt-4 border-t border-border">
                        <FormField
                          control={productForm.control}
                          name="inStock"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">{t("admin.fieldInStock")}</FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={productForm.control}
                          name="featured"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 w-full">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">{t("admin.fieldFeatured")}</FormLabel>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                        {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("admin.saveProduct")}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                {productsLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : products && products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.colProduct")}</TableHead>
                          <TableHead>{t("admin.colProducer")}</TableHead>
                          <TableHead>{t("admin.colPrice")}</TableHead>
                          <TableHead>{t("admin.colType")}</TableHead>
                          <TableHead>{t("admin.colInStock")}</TableHead>
                          <TableHead>{t("admin.colFeatured")}</TableHead>
                          <TableHead className="text-right">{t("admin.colActions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.vendorName}</TableCell>
                            <TableCell>${(product.priceCents / 100).toFixed(2)} / {product.unit}</TableCell>
                            <TableCell className="capitalize">{product.listingType?.replace('_', ' ')}</TableCell>
                            <TableCell>
                              <Switch 
                                checked={product.inStock} 
                                onCheckedChange={() => handleToggleProductStock(product.id, product.inStock)} 
                                disabled={updateProduct.isPending}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch 
                                checked={product.featured} 
                                onCheckedChange={() => handleToggleProductFeatured(product.id, product.featured)} 
                                disabled={updateProduct.isPending}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("admin.deleteProductTitle", { name: product.name })}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("admin.deleteProductWarning")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProduct(product.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      {t("admin.delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">{t("admin.noProducts")}</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
