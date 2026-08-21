import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Linking } from "react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const WEB_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type MenuItem = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  subtitle: string;
  route: string;
};

// MENU_ITEMS built inside component so labels re-translate on language change

export default function MoreScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  // On web, the fixed tab bar is 84px tall. Leave enough scrolling room for
  // the final Resources action to sit fully above it.
  const bottomPad = Platform.OS === "web" ? 100 : insets.bottom + 60;
  const s = styles(colors, topPad, bottomPad);

  const MENU_ITEMS: MenuItem[] = [
    { id: "wholesale", icon: "package", label: t("more.wholesale"), subtitle: t("more.wholesaleSubtitle"), route: "/wholesale" },
    { id: "markets", icon: "map-pin", label: t("more.marketDirectory"), subtitle: t("more.marketDirectorySubtitle"), route: "/markets" },
    { id: "messages", icon: "message-circle", label: t("more.messages"), subtitle: t("more.messagesSubtitle"), route: "/messages" },
    { id: "about", icon: "info", label: t("more.about"), subtitle: t("more.aboutSubtitle"), route: "/about" },
    { id: "compliance", icon: "file-text", label: t("more.compliance"), subtitle: t("more.complianceSubtitle"), route: "/compliance" },
    { id: "settings", icon: "settings", label: t("more.settings"), subtitle: t("more.settingsSubtitle"), route: "/settings" },
    { id: "language", icon: "globe", label: t("more.language"), subtitle: t("more.languageSubtitle"), route: "/language-picker" },
  ];

  const handleLogout = () => {
    Alert.alert(t("more.signOutConfirmTitle"), t("more.signOutConfirmMessage"), [
      { text: t("more.signOutConfirmCancel"), style: "cancel" },
      { text: t("more.signOutConfirmOk"), style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>{t("more.title")}</Text>

        {/* Account section */}
        {user ? (
          <>
            <Text style={s.sectionLabel}>{t("more.account")}</Text>
            <View style={s.card}>
              <View style={[s.row, s.rowBorder]}>
                <Avatar
                  seed={user.avatarSeed}
                  style={user.avatarStyle as any}
                  size={44}
                />
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>@{user.username}</Text>
                  <Text style={s.rowSubtitle}>{user.email}</Text>
                </View>
                <View
                  style={[
                    s.rolePill,
                    {
                      backgroundColor:
                        user.role === "vendor"
                          ? colors.primary + "18"
                          : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.rolePillText,
                      {
                        color:
                          user.role === "vendor"
                            ? colors.primary
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {user.role === "vendor" ? t("more.roleVendor") : t("more.roleShopper")}
                  </Text>
                </View>
              </View>

              {/* Rewards — all logged-in users */}
              <TouchableOpacity
                style={[s.row, s.rowBorder]}
                onPress={() => Linking.openURL(`${WEB_BASE}/rewards`)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="star" size={18} color={colors.primary} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{t("more.rewards")}</Text>
                  <Text style={s.rowSubtitle}>{t("more.rewardsSoon")}</Text>
                </View>
                <Feather name="external-link" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              {/* Vendor-only: Dashboard + Billing */}
              {user.role === "vendor" && (
                <>
                  <TouchableOpacity
                    style={[s.row, s.rowBorder]}
                    onPress={() => Linking.openURL(`${WEB_BASE}/dashboard/${user.vendorSlug ?? ""}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name="layout" size={18} color={colors.primary} />
                    </View>
                    <View style={s.rowText}>
                      <Text style={s.rowLabel}>{t("more.myDashboard")}</Text>
                      <Text style={s.rowSubtitle}>{t("more.myDashboardSubtitle")}</Text>
                    </View>
                    <Feather name="external-link" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.row, s.rowBorder]}
                    onPress={() => Linking.openURL(`${WEB_BASE}/billing`)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.iconWrap, { backgroundColor: colors.muted }]}>
                      <Feather name="credit-card" size={18} color={colors.primary} />
                    </View>
                    <View style={s.rowText}>
                      <Text style={s.rowLabel}>{t("more.billingPlan")}</Text>
                      <Text style={s.rowSubtitle}>{t("more.billingPlanSubtitle")}</Text>
                    </View>
                    <Feather name="external-link" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={s.row}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: "#fef2f2" }]}>
                  <Feather name="log-out" size={18} color="#dc2626" />
                </View>
                <View style={s.rowText}>
                  <Text style={[s.rowLabel, { color: "#dc2626" }]}>
                    {t("more.signOut")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>{t("more.account")}</Text>
            <View style={s.card}>
              <TouchableOpacity
                style={[s.row, s.rowBorder]}
                onPress={() => router.push("/(auth)/signup" as any)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="user-plus" size={18} color={colors.primary} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{t("more.joinOpenLocal")}</Text>
                  <Text style={s.rowSubtitle}>{t("more.joinOpenLocalSubtitle")}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.row}
                onPress={() => router.push("/(auth)/login" as any)}
                activeOpacity={0.7}
              >
                <View style={[s.iconWrap, { backgroundColor: colors.muted }]}>
                  <Feather name="log-in" size={18} color={colors.primary} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{t("more.signIn")}</Text>
                  <Text style={s.rowSubtitle}>{t("more.signInSubtitle")}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* For Businesses section */}
        <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("more.forBusinesses")}</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={s.row}
            onPress={() => router.push("/business-register" as any)}
            activeOpacity={0.7}
          >
            <View style={[s.iconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="map-pin" size={18} color={colors.primary} />
            </View>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>{t("more.pinYourBusiness")}</Text>
              <Text style={s.rowSubtitle}>{t("more.pinYourBusinessSubtitle")}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t("more.sectionResources")}</Text>
        <View style={s.card}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[s.row, i < MENU_ITEMS.length - 1 && s.rowBorder]}
              onPress={() => router.push(item.id === "language" ? "/language-picker" as any : item.route as any)}
              activeOpacity={0.7}
              accessibilityRole="button"
              testID={item.id === "language" ? "more-language" : undefined}
            >
              <View style={s.iconWrap}>
                <Feather name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={s.rowText}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Text style={s.rowSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>
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
    scroll: { flex: 1 },
    content: {
      paddingTop: topPad + 16,
      paddingBottom: bottomPad + 8,
      paddingHorizontal: 16,
    },
    pageTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 28,
      color: colors.foreground,
      marginBottom: 24,
    },
    sectionLabel: {
      fontFamily: "DMSans_700Bold",
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 2,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1 },
    rowLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
    },
    rowSubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    rolePill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    rolePillText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 11,
    },
  });
