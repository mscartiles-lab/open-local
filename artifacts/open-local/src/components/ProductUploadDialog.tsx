import { useState, useRef, useCallback } from "react";
import { X, Image as ImageIcon, Video, Upload, Loader2, Plus, Trash2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCreateProduct } from "@workspace/api-client-react";
import { TIER_PHOTO_LIMIT, TIER_VIDEO_LIMIT, type TierId } from "@/lib/tiers";

export type ListingType = "regular" | "batch_drop" | "surplus" | "pre_order";

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
  uploading?: boolean;
  url?: string;
  error?: string;
}

interface Props {
  open: boolean;
  vendorId: number;
  vendorCategory: string;
  tier: TierId;
  defaultType?: ListingType;
  onClose: () => void;
  onCreated: () => void;
}

async function uploadFile(file: File): Promise<string> {
  const metaRes = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!metaRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await metaRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

  return `/api/storage${objectPath}`;
}

const LISTING_TYPES: { value: ListingType; label: string; description: string; color: string }[] = [
  { value: "regular", label: "Regular", description: "Standard item always on your storefront.", color: "bg-stone-100 text-stone-700 border-stone-200" },
  { value: "batch_drop", label: "Batch drop", description: "Fresh release — shows up in Local Near Me Now.", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "surplus", label: "Surplus", description: "End-of-market discount. Requires original price.", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { value: "pre_order", label: "Pre-order", description: "Reserve for upcoming market pickup.", color: "bg-sky-100 text-sky-800 border-sky-200" },
];

export default function ProductUploadDialog({ open, vendorId, vendorCategory, tier, defaultType = "regular", onClose, onCreated }: Props) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();

  const [listingType, setListingType] = useState<ListingType>(defaultType);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [originalPriceDollars, setOriginalPriceDollars] = useState("");
  const [unit, setUnit] = useState("item");
  const [availableUntil, setAvailableUntil] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const photoLimit = TIER_PHOTO_LIMIT[tier];
  const videoLimit = TIER_VIDEO_LIMIT[tier];
  const photos = media.filter((m) => m.type === "image");
  const videos = media.filter((m) => m.type === "video");

  const addFiles = useCallback((files: FileList | null, type: "image" | "video") => {
    if (!files) return;
    const limit = type === "image" ? photoLimit - photos.length : videoLimit - videos.length;
    if (limit <= 0) return;
    const newItems: MediaFile[] = Array.from(files).slice(0, limit).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type,
    }));
    setMedia((prev) => [...prev, ...newItems]);
  }, [photoLimit, videoLimit, photos.length, videos.length]);

  const removeMedia = useCallback((preview: string) => {
    setMedia((prev) => {
      const item = prev.find((m) => m.preview === preview);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.preview !== preview);
    });
  }, []);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = "Name is required (min 2 chars)";
    if (!description.trim() || description.trim().length < 10) e.description = "Description too short (min 10 chars)";
    const price = parseFloat(priceDollars);
    if (isNaN(price) || price <= 0) e.price = "Price must be a positive number";
    if (!unit.trim()) e.unit = "Unit is required (e.g. loaf, bag, lb, item)";
    if (listingType === "surplus") {
      const orig = parseFloat(originalPriceDollars);
      if (isNaN(orig) || orig <= 0) e.originalPrice = "Original price is required for surplus";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);

    try {
      // Upload all media first
      const updatedMedia = [...media];
      for (let i = 0; i < updatedMedia.length; i++) {
        const m = updatedMedia[i];
        if (!m.url) {
          updatedMedia[i] = { ...m, uploading: true };
          setMedia([...updatedMedia]);
          try {
            const url = await uploadFile(m.file);
            updatedMedia[i] = { ...updatedMedia[i], uploading: false, url };
            setMedia([...updatedMedia]);
          } catch {
            updatedMedia[i] = { ...updatedMedia[i], uploading: false, error: "Upload failed" };
            setMedia([...updatedMedia]);
            toast({ title: `Failed to upload ${m.file.name}`, variant: "destructive" });
            setSubmitting(false);
            return;
          }
        }
      }

      const primaryImageUrl =
        updatedMedia.find((m) => m.type === "image")?.url ??
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=80";

      const payload = {
        vendorId,
        name: name.trim(),
        description: description.trim(),
        priceCents: Math.round(parseFloat(priceDollars) * 100),
        unit: unit.trim(),
        category: vendorCategory,
        imageUrl: primaryImageUrl,
        inStock: true,
        featured: false,
        listingType,
        originalPriceCents:
          listingType === "surplus" && originalPriceDollars
            ? Math.round(parseFloat(originalPriceDollars) * 100)
            : null,
        availableUntil: listingType === "pre_order" && availableUntil ? availableUntil : null,
        pickupNote: listingType === "pre_order" && pickupNote ? pickupNote : null,
      };

      createProduct.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({
              title: listingType === "batch_drop" ? "Batch is live!" : listingType === "surplus" ? "Surplus listed" : listingType === "pre_order" ? "Pre-order open" : "Product added",
              description: `${name.trim()} is now visible on your storefront.`,
            });
            handleClose();
            onCreated();
          },
          onError: (err) => {
            toast({ title: "Couldn't save product", description: (err as Error).message, variant: "destructive" });
          },
          onSettled: () => setSubmitting(false),
        },
      );
    } catch (err) {
      toast({ title: "Something went wrong", description: (err as Error).message, variant: "destructive" });
      setSubmitting(false);
    }
  }

  function handleClose() {
    media.forEach((m) => URL.revokeObjectURL(m.preview));
    setMedia([]);
    setName(""); setDescription(""); setPriceDollars(""); setOriginalPriceDollars("");
    setUnit("item"); setAvailableUntil(""); setPickupNote("");
    setListingType(defaultType); setErrors({});
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add a product</DialogTitle>
          <DialogDescription>Fill in the details below. Photos make a big difference.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Listing type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">Listing type</label>
            <div className="grid grid-cols-2 gap-2">
              {LISTING_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setListingType(lt.value)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all",
                    listingType === lt.value
                      ? `${lt.color} ring-2 ring-primary`
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <p className="text-sm font-semibold">{lt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{lt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Product name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={listingType === "batch_drop" ? "Sourdough miche" : listingType === "surplus" ? "Sunday market pastry box" : "Whole-grain bread"}
              className={cn(errors.name && "border-destructive")}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is it, how is it made, who is it for? A couple sentences goes a long way."
              className={cn("min-h-[80px]", errors.description && "border-destructive")}
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* Price row */}
          <div className="grid grid-cols-3 gap-3">
            <div className={listingType === "surplus" ? "" : "col-span-2"}>
              <label className="mb-1.5 block text-sm font-semibold">
                {listingType === "surplus" ? "Sale price ($) *" : "Price ($) *"}
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="0.00"
                className={cn(errors.price && "border-destructive")}
              />
              {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price}</p>}
            </div>
            {listingType === "surplus" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold">Original ($) *</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={originalPriceDollars}
                  onChange={(e) => setOriginalPriceDollars(e.target.value)}
                  placeholder="0.00"
                  className={cn(errors.originalPrice && "border-destructive")}
                />
                {errors.originalPrice && <p className="mt-1 text-xs text-destructive">{errors.originalPrice}</p>}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold">Unit *</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="loaf, bag, lb…"
                className={cn(errors.unit && "border-destructive")}
              />
              {errors.unit && <p className="mt-1 text-xs text-destructive">{errors.unit}</p>}
            </div>
          </div>

          {/* Pre-order fields */}
          {listingType === "pre_order" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-sky-50 border border-sky-200 p-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-sky-900">Available until</label>
                <Input
                  type="datetime-local"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-sky-900">Pickup note</label>
                <Input
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder="Pick up Saturday at the market"
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold">
                Photos{" "}
                <span className="font-normal text-muted-foreground">
                  ({photos.length}/{photoLimit} · {tier} plan)
                </span>
              </label>
              {photos.length < photoLimit && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add photo
                </button>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple={photoLimit > 1}
              className="hidden"
              onChange={(e) => addFiles(e.target.files, "image")}
            />

            {photos.length === 0 ? (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted py-10 text-center transition hover:bg-muted/70"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Add photos</p>
                  <p className="text-xs text-muted-foreground">Up to {photoLimit} photo{photoLimit !== 1 ? "s" : ""} on your {tier} plan</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                  <Upload className="h-3.5 w-3.5" />
                  Choose photos
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((m, i) => (
                  <div key={m.preview} className="relative aspect-square">
                    <img src={m.preview} alt="" className="h-full w-full rounded-lg object-cover border border-border" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        Cover
                      </span>
                    )}
                    {m.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    {m.error && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-900/70">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(m.preview)}
                      className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < photoLimit && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/70 transition"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Add</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Video (Standard+ only) */}
          {videoLimit > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Video{" "}
                  <span className="font-normal text-muted-foreground">
                    ({videos.length}/{videoLimit})
                  </span>
                </label>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => addFiles(e.target.files, "video")}
              />
              {videos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex w-full items-center gap-4 rounded-xl border border-dashed border-border bg-muted px-5 py-4 transition hover:bg-muted/70"
                >
                  <Video className="h-7 w-7 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">Add a short video</p>
                    <p className="text-xs text-muted-foreground">Show your process or the finished product</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-2">
                  {videos.map((m) => (
                    <div key={m.preview} className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3">
                      <Video className="h-5 w-5 shrink-0 text-primary" />
                      <p className="flex-1 truncate text-sm text-foreground">{m.file.name}</p>
                      {m.uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      <button type="button" onClick={() => removeMedia(m.preview)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {videoLimit === 0 && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
              📹 Video uploads available on Standard and Premium plans.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || createProduct.isPending}>
              {(submitting || createProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Uploading…" : "Save product"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
