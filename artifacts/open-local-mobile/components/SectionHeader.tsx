import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  accent?: string;
}

export function SectionHeader({ label, accent }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={s.row}>
      <View style={[s.accent, accent ? { backgroundColor: accent } : {}]} />
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 12,
      gap: 8,
    },
    accent: {
      width: 4,
      height: 18,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    label: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 16,
      color: colors.foreground,
    },
  });
