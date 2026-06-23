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

type MenuItem = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  subtitle: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
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
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>More</Text>

        <Text style={s.sectionLabel}>Resources</Text>
        <View style={s.card}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.id}
              style={[s.row, i < MENU_ITEMS.length - 1 && s.rowBorder]}
              onPress={() => router.push(item.route as `/${string}`)}
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
  });
