import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
// Quick-reference data
// ---------------------------------------------------------------------------
const QUICK_REF: { vendorType: string; permit: PermitKind; agency: string }[] =
  [
    { vendorType: "Home baker", permit: "none", agency: "Cottage Food exempt" },
    {
      vendorType: "Packaged honey / granola",
      permit: "none",
      agency: "Cottage Food exempt",
    },
    {
      vendorType: "Farm with refrigerated items",
      permit: "fdacs",
      agency: "FDACS",
    },
    { vendorType: "Food truck / hot food", permit: "dbpr", agency: "DBPR" },
    { vendorType: "Lemonade / smoothies", permit: "dbpr", agency: "DBPR" },
    {
      vendorType: "Candles / crafts / jewelry",
      permit: "none",
      agency: "None required",
    },
  ];

// ---------------------------------------------------------------------------
// Accordion section data
// ---------------------------------------------------------------------------
type AccordionSection = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  items: { heading?: string; lines: string[] }[];
};

const SECTIONS: AccordionSection[] = [
  {
    id: "cottage",
    icon: "home",
    title: "Florida Cottage Food Law (\u00a7500.80)",
    items: [
      {
        lines: [
          "No permit required \u2014 exempt from food safety regulations.",
          "$250,000 annual gross sales cap.",
          "Shelf-stable foods only (no refrigeration needed).",
          "Sell online, at farmers markets, from home, or direct-to-consumer.",
          "No wholesale or retail store sales.",
          "Home kitchen only \u2014 no commercial kitchen required.",
          "Florida sales only.",
        ],
      },
    ],
  },
  {
    id: "allowed",
    icon: "check-circle",
    title: "Allowed Cottage Foods",
    items: [
      {
        lines: [
          "Baked goods (breads, cakes, cookies, pies)",
          "Jams and jellies (high-acid fruit only)",
          "Honey and syrups",
          "Roasted nuts and nut butters",
          "Granola and dry mixes",
          "Candy and fudge",
          "Pasta (dried)",
          "Dried fruits and vegetables",
        ],
      },
    ],
  },
  {
    id: "prohibited",
    icon: "x-circle",
    title: "Prohibited Cottage Foods",
    items: [
      {
        lines: [
          "Anything requiring refrigeration (TCS foods)",
          "Meat, poultry, or seafood products",
          "Cut fruits or vegetables",
          "Raw sprouts",
          "Home-canned goods",
          "Dairy as a standalone product",
          "Pet food",
        ],
      },
    ],
  },
  {
    id: "labeling",
    icon: "tag",
    title: "Required Product Labeling",
    items: [
      {
        lines: [
          "Seller name and home address",
          "Product name",
          "Ingredient list (by weight, descending)",
          "Net weight or volume",
          "Allergen warnings (per federal standard)",
          "Required statement in 10pt contrasting font:\n\u201cMade in a cottage food operation that is not subject to Florida\u2019s food safety regulations.\u201d",
        ],
      },
    ],
  },
  {
    id: "fdacs",
    icon: "clipboard",
    title: "FDACS Permit",
    items: [
      {
        heading: "Who needs it",
        lines: [
          "Pre-packaged non-cottage foods",
          "Refrigerated or frozen products",
          "Wholesale or retail businesses",
          "Mobile vendors selling packaged goods",
        ],
      },
      {
        heading: "How to apply",
        lines: ["Visit foodpermit.fdacs.gov to start your application online."],
      },
    ],
  },
  {
    id: "dbpr",
    icon: "truck",
    title: "DBPR License",
    items: [
      {
        heading: "Who needs it",
        lines: [
          "Ready-to-eat foods served on-site",
          "Food trucks and mobile kitchens",
          "Hot food, smoothies, or fresh juice",
        ],
      },
      {
        heading: "Fee schedule (approximate)",
        lines: [
          "1\u20133 days: ~$91",
          "4\u201330 days: ~$105",
          "Annual license: ~$456",
        ],
      },
      {
        heading: "How to apply",
        lines: [
          "Visit myfloridalicense.com to apply for a food service license.",
        ],
      },
    ],
  },
  {
    id: "universal",
    icon: "list",
    title: "Universal Requirements",
    items: [
      {
        lines: [
          "Florida sales tax registration \u2014 call 850-488-6800 or visit floridarevenue.com",
          "Local business license / occupational permit (check your city and county)",
          "General liability insurance (strongly recommended)",
          "DBA registration at sunbiz.org if selling under a trade name",
          "Event-specific permits for markets or fairs (check with organiser)",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Permit badge
// ---------------------------------------------------------------------------
function PermitBadge({ kind }: { kind: PermitKind }) {
  const label =
    kind === "none" ? "None" : kind === "fdacs" ? "FDACS" : "DBPR";
  const bg =
    kind === "none" ? "#16a34a" : kind === "fdacs" ? "#d97706" : "#dc2626";
  return (
    <View style={[badge.pill, { backgroundColor: bg }]}>
      <Text style={badge.text}>{label}</Text>
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
// Accordion card
// ---------------------------------------------------------------------------
function AccordionCard({
  section,
  colors,
}: {
  section: AccordionSection;
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
          <Feather name={section.icon} size={17} color={colors.primary} />
        </View>
        <Text style={s.title}>{section.title}</Text>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {open && (
        <View style={s.body}>
          {section.items.map((group, gi) => (
            <View key={gi} style={gi > 0 ? s.groupGap : undefined}>
              {group.heading ? (
                <Text style={s.groupHeading}>{group.heading}</Text>
              ) : null}
              {group.lines.map((line, li) => (
                <View key={li} style={s.bulletRow}>
                  <Text style={s.bullet}>\u2022</Text>
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
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;
  const s = screenStyles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Compliance Info</Text>
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
          <Text style={s.disclaimerText}>
            This is a reference summary, not legal advice. Vendors should verify
            requirements with FDACS, DBPR, and their local county before
            selling.
          </Text>
        </View>

        {/* Quick reference table */}
        <Text style={s.sectionLabel}>Quick Reference</Text>
        <View style={s.tableCard}>
          {/* Table header */}
          <View style={[s.tableRow, s.tableHeaderRow]}>
            <Text style={[s.tableCell, s.tableHCell, s.col1]}>
              Vendor Type
            </Text>
            <Text style={[s.tableCell, s.tableHCell, s.col2]}>Permit</Text>
            <Text style={[s.tableCell, s.tableHCell, s.col3]}>Agency</Text>
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
                <PermitBadge kind={item.permit} />
              </View>
              <Text style={[s.tableCell, s.tableBodyCell, s.col3]}>
                {item.agency}
              </Text>
            </View>
          ))}
        </View>

        {/* Accordion sections */}
        <Text style={s.sectionLabel}>Detailed Guides</Text>
        {SECTIONS.map((section) => (
          <AccordionCard key={section.id} section={section} colors={colors} />
        ))}

        {/* Official links */}
        <Text style={s.sectionLabel}>Official Resources</Text>
        <View style={s.linksCard}>
          {[
            {
              label: "FDACS Food Permit Portal",
              url: "https://foodpermit.fdacs.gov",
            },
            {
              label: "DBPR License Application",
              url: "https://www.myfloridalicense.com",
            },
            {
              label: "Florida Sunbiz (DBA registration)",
              url: "https://dos.myflorida.com/sunbiz",
            },
            {
              label: "FL Dept. of Revenue (sales tax)",
              url: "https://floridarevenue.com",
            },
          ].map(({ label, url }, i, arr) => (
            <TouchableOpacity
              key={url}
              style={[s.linkRow, i < arr.length - 1 && s.linkRowBorder]}
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
        <Text style={s.footer}>
          Sources: FL Statute \u00a7500.80 (2025), FDACS, DBPR, UF/IFAS
          Extension, FL Farmers Market Toolkit
        </Text>
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
