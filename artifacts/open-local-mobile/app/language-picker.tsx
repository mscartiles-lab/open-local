import React from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { setLanguage, SUPPORTED_LANGUAGES } from "@/i18n";
import i18n from "@/i18n";

export default function LanguagePickerScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const LANG_LABELS: Record<string, string> = {
    en: t("languagePicker.english"),
    es: t("languagePicker.spanish"),
    vi: t("languagePicker.vietnamese"),
    "pt-BR": t("languagePicker.portuguese"),
    fr: t("languagePicker.french"),
  };

  const currentLang = i18n.language;

  const handleSelect = async (code: string) => {
    await setLanguage(code);
    router.back();
  };

  const s = styles(colors, insets.top);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>{t("languagePicker.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.list}>
        {SUPPORTED_LANGUAGES.map((lang, i) => {
          const selected = currentLang === lang.code || currentLang.startsWith(lang.code);
          return (
            <TouchableOpacity
              key={lang.code}
              style={[
                s.row,
                i < SUPPORTED_LANGUAGES.length - 1 && s.rowBorder,
                selected && { backgroundColor: colors.primary + "10" },
              ]}
              onPress={() => handleSelect(lang.code)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`language-option-${lang.code}`}
            >
              <Text style={[s.langName, selected && { color: colors.primary, fontFamily: "DMSans_700Bold" }]}>
                {LANG_LABELS[lang.code] ?? lang.label}
              </Text>
              {selected && (
                <Feather name="check" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: topInset + 12,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 18,
      color: colors.foreground,
    },
    list: {
      marginTop: 16,
      marginHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    langName: {
      fontFamily: "DMSans_500Medium",
      fontSize: 16,
      color: colors.foreground,
    },
  });
