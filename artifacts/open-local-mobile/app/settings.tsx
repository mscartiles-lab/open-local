import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

export default function SettingsScreen() {
  const colors = useColors();
  const { theme, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 20 : insets.top;

  const s = styles(colors, topPad);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.section}>Appearance</Text>
        <View style={s.card}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <View style={[s.iconWrap, { backgroundColor: colors.muted }]}>
                <Feather
                  name={theme === "dark" ? "moon" : "sun"}
                  size={16}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={s.rowLabel}>Dark mode</Text>
                <Text style={s.rowSub}>
                  {theme === "dark" ? "Currently on" : "Currently off"}
                </Text>
              </View>
            </View>
            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        <Text style={s.section}>About</Text>
        <View style={s.card}>
          <View style={[s.row, s.rowBorderless]}>
            <View style={s.rowLeft}>
              <View style={[s.iconWrap, { backgroundColor: colors.muted }]}>
                <Feather name="info" size={16} color={colors.primary} />
              </View>
              <Text style={s.rowLabel}>Open Local</Text>
            </View>
            <Text style={s.rowValue}>Local Sourcing & Experiences</Text>
          </View>
        </View>
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
    content: {
      padding: 16,
      gap: 8,
    },
    section: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 16,
      marginBottom: 4,
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowBorderless: { borderBottomWidth: 0 },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: {
      fontFamily: "DMSans_500Medium",
      fontSize: 15,
      color: colors.foreground,
    },
    rowSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    rowValue: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
  });
