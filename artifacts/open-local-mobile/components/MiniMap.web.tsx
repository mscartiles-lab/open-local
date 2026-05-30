import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type MapPin = {
  key: string;
  latitude: number;
  longitude: number;
  color?: string;
  iconName?: keyof typeof Feather.glyphMap;
};

interface MiniMapProps {
  pins?: MapPin[];
  radiusMiles?: number;
  height?: number;
  emptyHint?: string;
  fullBleed?: boolean;
}

export function MiniMap({
  pins = [],
  height = 200,
  fullBleed = false,
}: MiniMapProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.webCard,
        { height, backgroundColor: colors.muted, borderColor: colors.border },
        fullBleed && styles.flush,
      ]}
    >
      <Feather name="map" size={28} color={colors.mutedForeground} />
      <Text style={[styles.webText, { color: colors.mutedForeground }]}>
        Map view available in the iOS/Android app
      </Text>
      {pins.length > 0 ? (
        <Text style={[styles.webHint, { color: colors.mutedForeground }]}>
          {pins.length} location{pins.length !== 1 ? "s" : ""} nearby
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  webCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  flush: {
    borderRadius: 0,
    borderWidth: 0,
  },
  webText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  webHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
});
