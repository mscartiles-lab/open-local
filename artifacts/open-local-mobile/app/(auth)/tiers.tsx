import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Linking,
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

  const openBillingOnWeb = async () => {
    const url = `https://${process.env.EXPO_PUBLIC_DOMAIN}/billing`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  };

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
        <View
          style={[
            styles.trialBanner,
            { borderColor: colors.primary, backgroundColor: colors.muted },
          ]}
        >
          <Feather name="gift" size={18} color={colors.primary} />
          <Text style={[styles.trialText, { color: colors.foreground }]}>
            Start with a free 30-day trial. Cancel anytime.
          </Text>
        </View>

        {TIER_ORDER.map((id) => {
          const tier = TIERS[id];
          const featured = id === "middle";
          return (
            <View
              key={id}
              style={[
                styles.tierCard,
                {
                  borderColor: featured ? colors.primary : colors.border,
                  borderWidth: featured ? 2 : 1,
                  backgroundColor: colors.background,
                },
              ]}
            >
              {featured ? (
                <View
                  style={[
                    styles.popularBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
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
                <Text
                  style={[styles.tierPriceUnit, { color: colors.mutedForeground }]}
                >
                  {" / mo"}
                </Text>
              </Text>
              <View style={{ gap: 8, marginTop: 12 }}>
                {tier.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Feather name="check" size={16} color={colors.primary} />
                    <Text
                      style={[styles.featureText, { color: colors.foreground }]}
                    >
                      {f}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Pressable
          onPress={openBillingOnWeb}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Feather name="external-link" size={18} color="#fff" />
          <Text style={styles.ctaText}>Continue checkout on web</Text>
        </Pressable>
        <Text style={[styles.fineprint, { color: colors.mutedForeground }]}>
          Payments are processed on the web app for now. Sign in there with the
          same email to start your trial.
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
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  trialText: { fontFamily: "DMSans_500Medium", fontSize: 14, flex: 1 },
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
  tierPrice: {
    fontFamily: "DMSans_700Bold",
    fontSize: 28,
    marginTop: 8,
  },
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
