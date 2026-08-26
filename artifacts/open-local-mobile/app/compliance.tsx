import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PermitKind = "none" | "fdacs" | "dbpr";

// ---------------------------------------------------------------------------
// Permit badge
// ---------------------------------------------------------------------------
function PermitBadge({ kind, label }: { kind: PermitKind; label: string }) {
  const bg =
    kind === "none" ? "#16a34a" : kind === "fdacs" ? "#d97706" : "#dc2626";
  // FDACS and DBPR are official acronyms; display them as-is
  const displayLabel = kind === "fdacs" ? "FDACS" : kind === "dbpr" ? "DBPR" : label;
  return (
    <View style={[badge.pill, { backgroundColor: bg }]}>
      <Text style={badge.text}>{displayLabel}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  pill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.3,
  },
});

// ---------------------------------------------------------------------------
// Accordion card — receives already-translated strings
// ---------------------------------------------------------------------------
type AccordionGroup = { heading?: string; lines: string[] };

function AccordionCard({
  icon,
  title,
  groups,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  groups: AccordionGroup[];
  colors: ReturnType<typeof useColors>;
}) {
  const [open, setOpen] = useState(false);
  const s = accordionStyles(colors);

  return (
    <View style={s.card}>
      <TouchableOpacity
        style={s.header}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={s.iconWrap}>
          <Feather name={icon} size={17} color={colors.primary} />
        </View>
        <Text style={s.title}>{title}</Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {open && (
        <View style={s.body}>
          {groups.map((group, gi) => (
            <View key={gi} style={gi > 0 ? s.groupGap : undefined}>
              {group.heading ? (
                <Text style={s.groupHeading}>{group.heading}</Text>
              ) : null}
              {group.lines.map((line, li) => (
                <View key={li} style={s.bulletRow}>
                  <Text style={s.bullet}>•</Text>
                  <Text style={s.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function accordionStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      marginBottom: 10,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 10,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
    },
    body: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    groupGap: { marginTop: 12 },
    groupHeading: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    bulletRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 5,
    },
    bullet: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.primary,
      lineHeight: 20,
    },
    bulletText: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
  });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ComplianceScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const s = screenStyles(colors, topPad, bottomPad);

  // ---------------------------------------------------------------------------
  // Quick-reference table data — all user-visible strings from locale
  // ---------------------------------------------------------------------------
  const QUICK_REF: { vendorType: string; permit: PermitKind; agency: string }[] = [
    { vendorType: t("compliance.quickHomeBaker"),       permit: "none",  agency: t("compliance.quickAgencyCottage") },
    { vendorType: t("compliance.quickPackagedGoods"),   permit: "none",  agency: t("compliance.quickAgencyCottage") },
    { vendorType: t("compliance.quickFarmRefrigerated"),permit: "fdacs", agency: "FDACS" },
    { vendorType: t("compliance.quickFoodTruck"),       permit: "dbpr",  agency: "DBPR" },
    { vendorType: t("compliance.quickJuiceBar"),        permit: "dbpr",  agency: "DBPR" },
    { vendorType: t("compliance.quickCrafts"),          permit: "none",  agency: t("compliance.quickAgencyNone") },
  ];

  // ---------------------------------------------------------------------------
  // Accordion sections — all text from locale
  // ---------------------------------------------------------------------------
  type SectionDef = {
    id: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    title: string;
    groups: AccordionGroup[];
  };

  const SECTIONS: SectionDef[] = [
    {
      id: "cottage",
      icon: "home",
      title: t("compliance.sCottageTitle"),
      groups: [{
        lines: [
          t("compliance.sCottageLine0"),
          t("compliance.sCottageLine1"),
          t("compliance.sCottageLine2"),
          t("compliance.sCottageLine3"),
          t("compliance.sCottageLine4"),
          t("compliance.sCottageLine5"),
          t("compliance.sCottageLine6"),
        ],
      }],
    },
    {
      id: "allowed",
      icon: "check-circle",
      title: t("compliance.sAllowedTitle"),
      groups: [{
        lines: [
          t("compliance.sAllowedLine0"),
          t("compliance.sAllowedLine1"),
          t("compliance.sAllowedLine2"),
          t("compliance.sAllowedLine3"),
          t("compliance.sAllowedLine4"),
          t("compliance.sAllowedLine5"),
          t("compliance.sAllowedLine6"),
          t("compliance.sAllowedLine7"),
        ],
      }],
    },
    {
      id: "prohibited",
      icon: "x-circle",
      title: t("compliance.sProhibitedTitle"),
      groups: [{
        lines: [
          t("compliance.sProhibitedLine0"),
          t("compliance.sProhibitedLine1"),
          t("compliance.sProhibitedLine2"),
          t("compliance.sProhibitedLine3"),
          t("compliance.sProhibitedLine4"),
          t("compliance.sProhibitedLine5"),
          t("compliance.sProhibitedLine6"),
        ],
      }],
    },
    {
      id: "labeling",
      icon: "tag",
      title: t("compliance.sLabelingTitle"),
      groups: [{
        lines: [
          t("compliance.sLabelingLine0"),
          t("compliance.sLabelingLine1"),
          t("compliance.sLabelingLine2"),
          t("compliance.sLabelingLine3"),
          t("compliance.sLabelingLine4"),
          t("compliance.sLabelingLine5"),
        ],
      }],
    },
    {
      id: "fdacs",
      icon: "clipboard",
      title: t("compliance.sFdacsTitle"),
      groups: [
        {
          heading: t("compliance.sFdacsHead0"),
          lines: [
            t("compliance.sFdacsLine0"),
            t("compliance.sFdacsLine1"),
            t("compliance.sFdacsLine2"),
            t("compliance.sFdacsLine3"),
          ],
        },
        {
          heading: t("compliance.sFdacsHead1"),
          lines: [t("compliance.sFdacsLine4")],
        },
      ],
    },
    {
      id: "dbpr",
      icon: "truck",
      title: t("compliance.sDbprTitle"),
      groups: [
        {
          heading: t("compliance.sDbprHead0"),
          lines: [
            t("compliance.sDbprLine0"),
            t("compliance.sDbprLine1"),
            t("compliance.sDbprLine2"),
          ],
        },
        {
          heading: t("compliance.sDbprHead1"),
          lines: [
            t("compliance.sDbprLine3"),
            t("compliance.sDbprLine4"),
            t("compliance.sDbprLine5"),
          ],
        },
        {
          heading: t("compliance.sDbprHead2"),
          lines: [t("compliance.sDbprLine6")],
        },
      ],
    },
    {
      id: "universal",
      icon: "list",
      title: t("compliance.sUniversalTitle"),
      groups: [{
        lines: [
          t("compliance.sUniversalLine0"),
          t("compliance.sUniversalLine1"),
          t("compliance.sUniversalLine2"),
          t("compliance.sUniversalLine3"),
          t("compliance.sUniversalLine4"),
        ],
      }],
    },
  ];

  // Official links — labels translated, URLs stay verbatim
  const LINKS = [
    { label: t("compliance.linkFdacs"), url: "https://foodpermit.fdacs.gov" },
    { label: t("compliance.linkDbpr"),  url: "https://www.myfloridalicense.com" },
    { label: t("compliance.linkSunbiz"),url: "https://dos.myflorida.com/sunbiz" },
    { label: t("compliance.linkRevenue"),url: "https://floridarevenue.com" },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("compliance.headerTitle")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Feather
            name="alert-triangle"
            size={14}
            color="#d97706"
            style={{ marginTop: 1 }}
          />
          <Text style={s.disclaimerText}>{t("compliance.disclaimer")}</Text>
        </View>

        {/* Quick reference table */}
        <Text style={s.sectionLabel}>{t("compliance.quickReference")}</Text>
        <View style={s.tableCard}>
          {/* Table header */}
          <View style={[s.tableRow, s.tableHeaderRow]}>
            <Text style={[s.tableCell, s.tableHCell, s.col1]}>
              {t("compliance.colVendorType")}
            </Text>
            <Text style={[s.tableCell, s.tableHCell, s.col2]}>
              {t("compliance.colPermit")}
            </Text>
            <Text style={[s.tableCell, s.tableHCell, s.col3]}>
              {t("compliance.colAgency")}
            </Text>
          </View>
          {QUICK_REF.map((item, i) => (
            <View
              key={i}
              style={[
                s.tableRow,
                i % 2 === 0 ? s.tableRowEven : s.tableRowOdd,
              ]}
            >
              <Text style={[s.tableCell, s.tableBodyCell, s.col1]}>
                {item.vendorType}
              </Text>
              <View style={[s.tableCell, s.col2, s.tableCellCenter]}>
                <PermitBadge kind={item.permit} label={t("compliance.permitNone")} />
              </View>
              <Text style={[s.tableCell, s.tableBodyCell, s.col3]}>
                {item.agency}
              </Text>
            </View>
          ))}
        </View>

        {/* Accordion sections */}
        <Text style={s.sectionLabel}>{t("compliance.detailedGuides")}</Text>
        {SECTIONS.map((section) => (
          <AccordionCard
            key={section.id}
            icon={section.icon}
            title={section.title}
            groups={section.groups}
            colors={colors}
          />
        ))}

        {/* Official links */}
        <Text style={s.sectionLabel}>{t("compliance.officialResources")}</Text>
        <View style={s.linksCard}>
          {LINKS.map(({ label, url }, i) => (
            <TouchableOpacity
              key={url}
              style={[s.linkRow, i < LINKS.length - 1 && s.linkRowBorder]}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.7}
            >
              <Text style={s.linkLabel}>{label}</Text>
              <Feather
                name="external-link"
                size={14}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={s.footer}>{t("compliance.footer")}</Text>
      </ScrollView>
    </View>
  );
}

function screenStyles(
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) {
  return StyleSheet.create({
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
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: bottomPad + 16,
    },
    disclaimer: {
      backgroundColor: "#fffbeb",
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: "#fde68a",
      padding: 12,
      flexDirection: "row",
      gap: 8,
      marginBottom: 20,
      alignItems: "flex-start",
    },
    disclaimerText: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: "#92400e",
      lineHeight: 18,
    },
    sectionLabel: {
      fontFamily: "DMSans_700Bold",
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
    },
    tableCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 20,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    tableHeaderRow: { backgroundColor: colors.muted },
    tableRowEven: { backgroundColor: colors.card },
    tableRowOdd: { backgroundColor: colors.background },
    tableCell: { paddingVertical: 10, paddingHorizontal: 10 },
    tableHCell: {
      fontFamily: "DMSans_700Bold",
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    tableBodyCell: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.foreground,
    },
    tableCellCenter: {
      flexDirection: "row",
      alignItems: "center",
    },
    col1: { flex: 2.2 },
    col2: { flex: 1.4 },
    col3: { flex: 1.8 },
    linksCard: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      marginBottom: 10,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    linkRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    linkLabel: {
      fontFamily: "DMSans_500Medium",
      fontSize: 14,
      color: colors.primary,
      flex: 1,
    },
    footer: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 16,
      marginTop: 8,
      textAlign: "center",
    },
  });
}
