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
import { useTranslation } from "react-i18next";

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

export default function ProductUploadDialog({ open, vendorId, vendorCategory, tier, defaultType = "regular", onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const createProduct = useCreateProduct();

  const LISTING_TYPES: { value: ListingType; label: string; description: string; color: string }[] = [
    { value: "regular", label: t("productUpload.typeRegularLabel"), description: t("productUpload.typeRegularDesc"), color: "bg-stone-100 text-stone-700 border-stone-200" },
    { value: "batch_drop", label: t("productUpload.typeBatchDropLabel"), description: t("productUpload.typeBatchDropDesc"), color: "bg-amber-100 text-amber-800 border-amber-200" },
    { value: "surplus", label: t("productUpload.typeSurplusLabel"), description: t("productUpload.typeSurplusDesc"), color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    { value: "pre_order", label: t("productUpload.typePreOrderLabel"), description: t("productUpload.typePreOrderDesc"), color: "bg-sky-100 text-sky-800 border-sky-200" },
  ];

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
    if (!name.trim() || name.trim().length < 2) e.name = t("productUpload.errorNameRequired");
    if (!description.trim() || description.trim().length < 10) e.description = t("productUpload.errorDescriptionShort");
    const price = parseFloat(priceDollars);
    if (isNaN(price) || price <= 0) e.price = t("productUpload.errorPricePositive");
    if (!unit.trim()) e.unit = t("productUpload.errorUnitRequired");
    if (listingType === "surplus") {
      const orig = parseFloat(originalPriceDollars);
      if (isNaN(orig) || orig <= 0) e.originalPrice = t("productUpload.errorOriginalPriceRequired");
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
            updatedMedia[i] = { ...updatedMedia[i], uploading: false, error: t("productUpload.uploadFailed") };
            setMedia([...updatedMedia]);
            toast({ title: t("productUpload.toastFailedToUpload", { fileName: m.file.name }), variant: "destructive" });
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
              title: listingType === "batch_drop"
                ? t("productUpload.toastBatchLive")
                : listingType === "surplus"
                ? t("productUpload.toastSurplusListed")
                : listingType === "pre_order"
                ? t("productUpload.toastPreOrderOpen")
                : t("productUpload.toastProductAdded"),
              description: t("productUpload.toastVisibleOnStorefront", { name: name.trim() }),
            });
            handleClose();
            onCreated();
          },
          onError: (err) => {
            toast({ title: t("productUpload.toastCouldntSave"), description: (err as Error).message, variant: "destructive" });
          },
          onSettled: () => setSubmitting(false),
        },
      );
    } catch (err) {
      toast({ title: t("productUpload.toastSomethingWentWrong"), description: (err as Error).message, variant: "destructive" });
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
          <DialogTitle className="font-serif text-2xl">{t("productUpload.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("productUpload.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Listing type */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-foreground">{t("productUpload.listingTypeLabel")}</label>
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
            <label className="mb-1.5 block text-sm font-semibold">{t("productUpload.nameLabel")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                listingType === "batch_drop"
                  ? t("productUpload.namePlaceholderBatchDrop")
                  : listingType === "surplus"
                  ? t("productUpload.namePlaceholderSurplus")
                  : t("productUpload.namePlaceholderDefault")
              }
              className={cn(errors.name && "border-destructive")}
              autoFocus
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">{t("productUpload.descriptionLabel")}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("productUpload.descriptionPlaceholder")}
              className={cn("min-h-[80px]", errors.description && "border-destructive")}
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* Price row */}
          <div className="grid grid-cols-3 gap-3">
            <div className={listingType === "surplus" ? "" : "col-span-2"}>
              <label className="mb-1.5 block text-sm font-semibold">
                {listingType === "surplus" ? t("productUpload.salePriceLabel") : t("productUpload.priceLabel")}
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
                <label className="mb-1.5 block text-sm font-semibold">{t("productUpload.originalPriceLabel")}</label>
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
              <label className="mb-1.5 block text-sm font-semibold">{t("productUpload.unitLabel")}</label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={t("productUpload.unitPlaceholder")}
                className={cn(errors.unit && "border-destructive")}
              />
              {errors.unit && <p className="mt-1 text-xs text-destructive">{errors.unit}</p>}
            </div>
          </div>

          {/* Pre-order fields */}
          {listingType === "pre_order" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-sky-50 border border-sky-200 p-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-sky-900">{t("productUpload.availableUntilLabel")}</label>
                <Input
                  type="datetime-local"
                  value={availableUntil}
                  onChange={(e) => setAvailableUntil(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-sky-900">{t("productUpload.pickupNoteLabel")}</label>
                <Input
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  placeholder={t("productUpload.pickupNotePlaceholder")}
                  className="bg-white"
                />
              </div>
            </div>
          )}

          {/* Photos */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold">
                {t("productUpload.photosLabel")}{" "}
                <span className="font-normal text-muted-foreground">
                  ({photos.length}/{photoLimit} · {tier} {t("productUpload.planSuffix")})
                </span>
              </label>
              {photos.length < photoLimit && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("productUpload.addPhotoButton")}
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
                  <p className="text-sm font-semibold text-foreground">{t("productUpload.addPhotosEmptyTitle")}</p>
                  <p className="text-xs text-muted-foreground">{t("productUpload.addPhotosEmptyHint", { count: photoLimit, tier })}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                  <Upload className="h-3.5 w-3.5" />
                  {t("productUpload.choosePhotosButton")}
                </span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((m, i) => (
                  <div key={m.preview} className="relative aspect-square">
                    <img src={m.preview} alt="" className="h-full w-full rounded-lg object-cover border border-border" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {t("productUpload.coverBadge")}
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
                    <span className="text-[10px]">{t("productUpload.addPhotoThumbnailButton")}</span>
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
                  {t("productUpload.videoLabel")}{" "}
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
                    <p className="text-sm font-semibold text-foreground">{t("productUpload.addVideoTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("productUpload.addVideoHint")}</p>
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
              📹 {t("productUpload.videoUpgradeHint")}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              {t("productUpload.cancelButton")}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || createProduct.isPending}>
              {(submitting || createProduct.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? t("productUpload.uploadingButton") : t("productUpload.saveButton")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
