import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export default function AboutScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const s = styles(colors, topPad, bottomPad);

  const paragraphs: { text: string; bold?: boolean }[] = [
    { text: t("about.p1") },
    { text: t("about.p2"), bold: true },
    { text: t("about.p3") },
    { text: t("about.p4") },
    { text: t("about.p5") },
    { text: t("about.p6") },
    { text: t("about.p7") },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("about.headerTitle")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark */}
        <View style={s.brandWrap}>
          <View style={s.brandDot}>
            <Feather name="map-pin" size={22} color={colors.primaryForeground} />
          </View>
          <Text style={s.brandName}>Open Local</Text>
          <Text style={s.brandTagline}>{t("about.tagline")}</Text>
        </View>

        {/* Body paragraphs */}
        <View style={s.body}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={[s.para, p.bold && s.paraBold]}>
              {p.text}
            </Text>
          ))}
        </View>

        {/* Closer */}
        <Text style={s.closer}>{t("about.closer")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = (
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topPad + 8,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 17,
      color: colors.foreground,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: bottomPad + 16,
    },
    brandWrap: {
      alignItems: "center",
      marginBottom: 32,
    },
    brandDot: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    brandName: {
      fontFamily: "DMSans_700Bold",
      fontSize: 24,
      color: colors.foreground,
      marginBottom: 4,
    },
    brandTagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    body: { gap: 16 },
    para: {
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 24,
    },
    paraBold: {
      fontFamily: "DMSans_700Bold",
      fontSize: 17,
      color: colors.primary,
    },
    closer: {
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
      color: colors.primary,
      marginTop: 28,
      textAlign: "center",
    },
  });
