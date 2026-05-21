import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";

import { getUnlock, zoneStyle, type AvatarStyle } from "@/lib/unlockCatalog";

const BG = "fef3c7,fed7aa,fde68a,fdba74";

export function dicebearUrl(seed: string, style: AvatarStyle): string {
  return `https://api.dicebear.com/9.x/${style}/png?seed=${encodeURIComponent(
    seed,
  )}&backgroundColor=${BG}`;
}

interface AvatarProps {
  seed: string;
  style: AvatarStyle;
  equipped?: string[];
  size?: number;
}

export default function Avatar({
  seed,
  style,
  equipped,
  size = 64,
}: AvatarProps) {
  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <Image
        source={{ uri: dicebearUrl(seed, style) }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#fef3c7",
        }}
        contentFit="cover"
      />
      {(equipped ?? []).map((key) => {
        const def = getUnlock(key);
        if (!def?.asset || !def.zone) return null;
        return (
          <Image
            key={key}
            source={{ uri: def.asset }}
            style={zoneStyle(def.zone)}
            contentFit="contain"
            pointerEvents="none"
          />
        );
      })}
    </View>
  );
}
