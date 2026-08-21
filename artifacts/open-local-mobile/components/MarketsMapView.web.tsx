import { Feather } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Market } from "@/lib/api-client";

interface Props {
  markets: Market[];
  colors: ReturnType<typeof useColors>;
  onMarketPress: (market: Market) => void;
}

export function MarketsMapView({ colors }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.fallback}>
      <Feather name="map" size={36} color={colors.mutedForeground} />
      <Text style={[styles.fallbackText, { color: colors.mutedForeground }]}>
        {t("markets.mapAvailableMobile")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    textAlign: "center",
  },
});