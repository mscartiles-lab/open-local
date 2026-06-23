import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
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

const PARAGRAPHS: { text: string; bold?: boolean }[] = [
  {
    text: "Some of the best things you'll ever taste, wear, or bring into your home weren't made in a factory or shipped across the country. They were grown in a backyard garden, baked in a home kitchen, or handcrafted by someone in your own neighborhood who poured real care into every single one. The problem has never been that these makers don't exist \u2014 it's that they've been nearly impossible to find.",
  },
  { text: "Open Local was built to change that.", bold: true },
  {
    text: "We\u2019re a hyperlocal marketplace that connects shoppers directly with the farmers, vendors, and makers who live and work in their community. No algorithms pushing big brands to the top. No middlemen taking cuts. Just a direct line between you and the people behind the product \u2014 wherever you are.",
  },
  {
    text: "Whether you\u2019re in the heart of a city, a quiet suburb, or a small town with more talent than anyone realizes, Open Local is designed to surface what\u2019s already around you. Pull up the app and discover the honey producer two miles away, the ceramic artist who sells at your weekend farmers market, the cottage baker who makes the best sourdough you\u2019ve ever had. These aren\u2019t just purchases \u2014 they\u2019re connections to real people doing what they love, right where you live.",
  },
  {
    text: "Shopping local has always mattered. It keeps money circulating in your community, supports independent livelihoods, and puts you in touch with the kind of quality and care that mass production simply can\u2019t replicate. But \u201cshop local\u201d only works when people can actually find who to shop from. That\u2019s the gap Open Local closes.",
  },
  {
    text: "For vendors, Open Local is a launchpad. Whether you\u2019re a cottage food baker just getting started, a farmer looking to reach more customers beyond the market, or an established maker ready to grow \u2014 Open Local gives you a storefront, visibility, and a community of shoppers who are actively looking for exactly what you make.",
  },
  {
    text: "For shoppers, it\u2019s the easiest way to put your dollars where your values are \u2014 not just when it\u2019s convenient, but every time.",
  },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
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
          <Text style={s.brandTagline}>Local Sourcing and Experiences</Text>
        </View>

        {/* Body paragraphs */}
        <View style={s.body}>
          {PARAGRAPHS.map((p, i) => (
            <Text
              key={i}
              style={[s.para, p.bold && s.paraBold]}
            >
              {p.text}
            </Text>
          ))}
        </View>

        {/* Closer */}
        <Text style={s.closer}>Open Local. Shop the community around you.</Text>
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
