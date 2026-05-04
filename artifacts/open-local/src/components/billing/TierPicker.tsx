import { CheckCircle, Sparkles } from "lucide-react";
import { TIERS, TIER_ORDER, type TierId } from "@/lib/tiers";

interface Props {
  selected: TierId;
  onSelect: (tier: TierId) => void;
  trialDays?: number;
  isEarlyBird?: boolean;
  trialAppliesTo?: TierId[];
}

export function TierPicker({
  selected,
  onSelect,
  trialDays = 0,
  isEarlyBird = false,
  trialAppliesTo = ["basic", "middle", "premium"],
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {TIER_ORDER.map((id) => {
        const tier = TIERS[id];
        const isSelected = selected === id;
        const showTrial = isEarlyBird && trialDays > 0 && trialAppliesTo.includes(id);
        const isPremium = id === "premium";

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`relative text-left rounded-2xl border-2 p-5 transition-all ${
              isSelected
                ? "border-primary bg-primary/5 shadow-md"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {isPremium && (
              <div className="absolute -top-2.5 left-5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Most visible
              </div>
            )}
            <div className="flex items-start justify-between mb-2 mt-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tier.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-serif font-bold text-foreground">${tier.priceMonthly.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 mt-1 ${
                isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
              }`}>
                {isSelected && <CheckCircle className="w-5 h-5 text-primary-foreground -m-0.5" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{tier.tagline}</p>
            {showTrial && (
              <p className="text-xs font-semibold text-amber-700 mb-3">
                {trialDays} days free
              </p>
            )}
            <ul className="space-y-1.5">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-foreground">
                  <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
