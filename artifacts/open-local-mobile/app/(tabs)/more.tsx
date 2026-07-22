import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
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

type MenuItem = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  subtitle: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "messages",
    icon: "message-circle",
    label: "Messages",
    subtitle: "Direct messages with vendors",
    route: "/messages",
  },
  {
    id: "about",
    icon: "info",
    label: "About",
    subtitle: "Our story and mission",
    route: "/about",
  },
  {
    id: "compliance",
    icon: "file-text",
    label: "Compliance Info",
    subtitle: "Florida vendor permits and requirements",
    route: "/compliance",
  },
  {
    id: "settings",
    icon: "settings",
    label: "Settings",
    subtitle: "Appearance and preferences",
    route: "/settings",
  },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const s = styles(colors, topPad, bottomPad);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>More</Text>

        {/* Account section */}
        {user ? (
          <>
            <Text style={s.sectionLabel}>Account</Text>
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
                    {user.role === "vendor" ? "Vendor" : "Shopper"}
                  </Text>
                </View>
              </View>
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
                    Sign out
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={s.sectionLabel}>Account</Text>
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
                  <Text style={s.rowLabel}>Join Open Local</Text>
                  <Text style={s.rowSubtitle}>Create a free account</Text>
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
                  <Text style={s.rowLabel}>Sign in</Text>
                  <Text style={s.rowSubtitle}>Already have an account?</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={[s.sectionLabel, { marginTop: 20 }]}>Resources</Text>
        <View style={s.card}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[s.row, i < MENU_ITEMS.length - 1 && s.rowBorder]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
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
