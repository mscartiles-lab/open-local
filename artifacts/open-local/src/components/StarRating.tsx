import { Star } from "lucide-react";

export default function StarRating({
  rating,
  size = 16,
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            width={size}
            height={size}
            className={n <= rounded ? "text-amber-500" : "text-muted-foreground/30"}
            fill={n <= rounded ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
