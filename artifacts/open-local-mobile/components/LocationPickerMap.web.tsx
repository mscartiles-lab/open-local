/**
 * Web-only fallback for the native location picker.
 *
 * Keeping this in a platform-specific file prevents Metro's web bundle from
 * traversing the native react-native-maps import used by LocationPickerMap.tsx.
 */
import { Feather } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface Props {
  onChange: (loc: PickedLocation) => void;
  hint?: string;
  initial?: PickedLocation | null;
  height?: number;
}

export function LocationPickerMap({
  initial,
  height = 260,
}: Props) {
  const { t } = useTranslation();
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        {
          height,
          backgroundColor: colors.muted,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather name="map-pin" size={24} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        {t("locationPicker.webFallback")}
      </Text>
      {initial ? (
        <Text style={[styles.coordinates, { color: colors.primary }]}>
          {initial.latitude.toFixed(5)}, {initial.longitude.toFixed(5)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  coordinates: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
});