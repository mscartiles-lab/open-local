import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import StarRating from "@/components/StarRating";
import Avatar from "@/components/Avatar";
import { useTranslation } from "react-i18next";

const SESSION_KEY = "ol_session";

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  verified: boolean;
  createdAt: string;
  username: string;
  avatarSeed: string;
  avatarStyle: string;
}

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem(SESSION_KEY);
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

export default function VendorReviews({ vendorId }: { vendorId: number }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/vendors/${vendorId}/reviews`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setReviews(data.reviews);
      setReviewCount(data.reviewCount);
      setAverageRating(data.averageRating);
    } catch (e) {
      toast({ variant: "destructive", title: t("reviews.loadError"), description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [vendorId]);

  const myReview = reviews.find((r) => user && r.username === user.username);

  const submit = async () => {
    if (rating < 1) {
      toast({ variant: "destructive", title: t("reviews.ratingPrompt") });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/vendors/${vendorId}/reviews`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      setRating(0);
      setComment("");
      toast({ title: t("reviews.posted") });
      await load();
    } catch (e) {
      toast({ variant: "destructive", title: t("reviews.postError"), description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const r = await fetch(`/api/reviews/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
      toast({ title: t("reviews.deleted") });
      await load();
    } catch (e) {
      toast({ variant: "destructive", title: t("reviews.deleteError"), description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <StarRating rating={averageRating} size={24} />
        <div className="text-sm text-muted-foreground">
          {averageRating > 0 ? averageRating.toFixed(1) : t("reviews.noRatings")} · {t("reviews.reviewCount", { count: reviewCount })}
        </div>
      </div>

      {user && !myReview && (
        <div className="border border-border rounded-xl p-6 bg-muted/40 space-y-3">
          <h4 className="font-semibold text-sm">{t("reviews.leave")}</h4>
          <StarRating rating={rating} size={28} interactive onChange={setRating} />
          <Textarea
            placeholder={t("reviews.placeholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
          />
          <Button size="sm" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t("reviews.post")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("reviews.empty")}</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="flex gap-3 border-b border-border pb-6 last:border-0">
              <Avatar seed={r.avatarSeed} style={r.avatarStyle as any} size={40} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">@{r.username}</span>
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      <BadgeCheck className="w-3 h-3" /> {t("reviews.verified")}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  {user?.username === r.username && (
                    <button onClick={() => remove(r.id)} className="ml-auto text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <StarRating rating={r.rating} size={14} />
                {r.comment && <p className="text-sm text-foreground/80 mt-1">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
