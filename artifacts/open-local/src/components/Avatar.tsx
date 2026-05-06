import type { AvatarStyle } from "@/context/UserContext";
import { getUnlock, zoneStyle } from "@/lib/unlockCatalog";

interface AvatarProps {
  seed: string;
  style: AvatarStyle;
  equipped?: string[];
  size?: number; // pixels
  className?: string; // extra classes for the outer container
  ringClassName?: string; // border ring around the base avatar
}

const BG = "fef3c7,fed7aa,fde68a,fdba74";

export function dicebearUrl(seed: string, style: AvatarStyle): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BG}`;
}

export default function Avatar({
  seed,
  style,
  equipped,
  size = 64,
  className = "",
  ringClassName = "",
}: AvatarProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={dicebearUrl(seed, style)}
        alt=""
        className={`w-full h-full rounded-full bg-amber-50 ${ringClassName}`}
      />
      {(equipped ?? []).map((key) => {
        const def = getUnlock(key);
        if (!def?.asset || !def.zone) return null;
        return (
          <img
            key={key}
            src={def.asset}
            alt=""
            className="absolute pointer-events-none select-none"
            style={zoneStyle(def.zone)}
            draggable={false}
          />
        );
      })}
    </div>
  );
}
