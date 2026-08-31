import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

import QRCode from "react-native-qrcode-svg";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const DEEP_LINK = "open-local-mobile://";
const APP_STORE_URL = "https://apps.apple.com/us/app/open-local/id6778445620";

type QRModes = "deeplink" | "appstore";

export default function QRCodeShareScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [mode, setMode] = useState<QRModes>("deeplink");
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const s = styles(colors, topPad);

  const qrValue = mode === "deeplink" ? DEEP_LINK : APP_STORE_URL;
  const qrSubtitle =
    mode === "deeplink"
      ? t("adminQR.openInApp")
      : t("adminQR.downloadFromStore");

  const handleCopyLink = () => {
    // Linking.openURL is not ideal for copying — Alert to let user know to screenshot
    Alert.alert(t("adminQR.screenshotTitle"), t("adminQR.screenshotMessage"));
  };

  if (!user?.isAdmin) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Feather name="x" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={s.title}>{t("adminQR.title")}</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.unauthorized}>
          <Feather name="lock" size={48} color={colors.mutedForeground} />
          <Text style={s.unauthorizedText}>{t("adminQR.unauthorized")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>{t("adminQR.title")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode Toggle */}
        <View style={s.toggleCard}>
          <Text style={s.sectionLabel}>{t("adminQR.qrType")}</Text>
          <View style={s.toggleRow}>
            <TouchableOpacity
              style={[
                s.toggleOption,
                mode === "deeplink" && { backgroundColor: colors.primary + "18", borderColor: colors.primary },
              ]}
              onPress={() => setMode("deeplink")}
              activeOpacity={0.7}
            >
              <Feather
                name="smartphone"
                size={18}
                color={mode === "deeplink" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  s.toggleLabel,
                  mode === "deeplink" && { color: colors.primary },
                ]}
              >
                {t("adminQR.optionDeepLink")}
              </Text>
              <Text style={s.toggleDesc}>{t("adminQR.optionDeepLinkDesc")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.toggleOption,
                mode === "appstore" && { backgroundColor: colors.primary + "18", borderColor: colors.primary },
              ]}
              onPress={() => setMode("appstore")}
              activeOpacity={0.7}
            >
              <Feather
                name="download"
                size={18}
                color={mode === "appstore" ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  s.toggleLabel,
                  mode === "appstore" && { color: colors.primary },
                ]}
              >
                {t("adminQR.optionAppStore")}
              </Text>
              <Text style={s.toggleDesc}>{t("adminQR.optionAppStoreDesc")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Code Display */}
        <View style={s.qrCard}>
          <View style={s.qrWrapper}>
            <View style={s.qrContainer}>
              <QRCode
                value={qrValue}
                size={220}
                backgroundColor={colors.card}
                color={colors.foreground}
              />
            </View>
          </View>
          <Text style={s.qrSubtitle}>{qrSubtitle}</Text>
          <Text style={s.qrUrl} numberOfLines={1}>
            {qrValue}
          </Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={handleCopyLink} activeOpacity={0.7}>
            <Feather name="image" size={18} color={colors.primary} />
            <Text style={s.actionBtnText}>{t("adminQR.screenshotTip")}</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>{t("adminQR.hint")}</Text>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topPad + 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 18,
      color: colors.foreground,
    },
    scroll: { flex: 1 },
    content: {
      padding: 16,
      gap: 16,
    },
    sectionLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    toggleCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    toggleRow: {
      flexDirection: "row",
      gap: 10,
    },
    toggleOption: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      gap: 4,
    },
    toggleLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.foreground,
      marginTop: 4,
    },
    toggleDesc: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 15,
    },
    qrCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center",
      gap: 12,
    },
    qrWrapper: {
      padding: 16,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    qrContainer: {
      borderRadius: 8,
      overflow: "hidden",
    },
    qrSubtitle: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    qrUrl: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    actions: {
      gap: 8,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    actionBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
    hint: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
    },
    unauthorized: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingBottom: 80,
    },
    unauthorizedText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 15,
      color: colors.mutedForeground,
    },
  });
