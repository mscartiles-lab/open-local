import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { TIERS, TIER_ORDER } from "@/lib/tiers";

export default function TiersScreen() {
  const colors = useColors();
  const [selected, setSelected] = useState<string>("middle");

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Vendor plans
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Waived notice */}
        <View style={[styles.waivedBanner, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
          <View style={styles.waivedIconWrap}>
            <Feather name="gift" size={20} color="#16a34a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waivedTitle}>Subscription fees are waived 🎉</Text>
            <Text style={styles.waivedBody}>
              Enjoy full access to Open Local completely free while we grow our community. We'll give you plenty of heads-up before anything changes.
            </Text>
          </View>
        </View>

        {/* Plans overview — informational */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Plans preview — no payment needed right now
        </Text>

        {TIER_ORDER.map((id) => {
          const tier = TIERS[id];
          const featured = id === "middle";
          const isSelected = selected === id;
          return (
            <Pressable
              key={id}
              onPress={() => setSelected(id)}
              style={[
                styles.tierCard,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                  backgroundColor: isSelected ? colors.primary + "08" : colors.background,
                },
              ]}
            >
              {featured ? (
                <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.popularText}>Most popular</Text>
                </View>
              ) : null}
              <Text style={[styles.tierName, { color: colors.foreground }]}>
                {tier.name}
              </Text>
              <Text style={[styles.tierTagline, { color: colors.mutedForeground }]}>
                {tier.tagline}
              </Text>
              <Text style={[styles.tierPrice, { color: colors.foreground }]}>
                ${tier.priceMonthly.toFixed(2)}
                <Text style={[styles.tierPriceUnit, { color: colors.mutedForeground }]}>
                  {" / mo"}
                </Text>
              </Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                {tier.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Feather name="check" size={16} color={colors.primary} />
                    <Text style={[styles.featureText, { color: colors.foreground }]}>
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Feather name="check-circle" size={18} color="#fff" />
          <Text style={styles.ctaText}>Got it — start selling</Text>
        </Pressable>

        <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
          You'll get an email before subscriptions go live. No surprise charges.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  waivedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  waivedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  waivedTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: "#15803d",
    marginBottom: 4,
  },
  waivedBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#166534",
    lineHeight: 19,
  },
  sectionLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -4,
  },
  tierCard: { borderRadius: 16, padding: 18, gap: 4 },
  popularBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  popularText: { color: "#fff", fontFamily: "DMSans_600SemiBold", fontSize: 11 },
  tierName: { fontFamily: "DMSans_700Bold", fontSize: 20 },
  tierTagline: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  tierPrice: { fontFamily: "DMSans_700Bold", fontSize: 28, marginTop: 8 },
  tierPriceUnit: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  featureRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  featureText: { fontFamily: "DMSans_400Regular", fontSize: 14, flex: 1 },
  cta: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  ctaText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 },
  fineprint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
