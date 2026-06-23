import { Feather } from "@expo/vector-icons";
import { Linking } from "react-native";
import React, { useState } from "react";
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

// ---------------------------------------------------------------------------
// About paragraphs
// ---------------------------------------------------------------------------
const ABOUT_PARAGRAPHS = [
  "Some of the best things you'll ever taste, wear, or bring into your home weren't made in a factory or shipped across the country. They were grown in a backyard garden, baked in a home kitchen, or handcrafted by someone in your own neighborhood who poured real care into every single one. The problem has never been that these makers don't exist — it's that they've been nearly impossible to find.",
  "Open Local was built to change that.",
  "We're a hyperlocal marketplace that connects shoppers directly with the farmers, vendors, and makers who live and work in their community. No algorithms pushing big brands to the top. No middlemen taking cuts. Just a direct line between you and the people behind the product — wherever you are.",
  "Whether you're in the heart of a city, a quiet suburb, or a small town with more talent than anyone realizes, Open Local is designed to surface what's already around you. Pull up the app and discover the honey producer two miles away, the ceramic artist who sells at your weekend farmers market, the cottage baker who makes the best sourdough you've ever had. These aren't just purchases — they're connections to real people doing what they love, right where you live.",
  "Shopping local has always mattered. It keeps money circulating in your community, supports independent livelihoods, and puts you in touch with the kind of quality and care that mass production simply can\u2019t replicate. But \u201cshop local\u201d only works when people can actually find who to shop from. That\u2019s the gap Open Local closes.",
  "For vendors, Open Local is a launchpad. Whether you're a cottage food baker just getting started, a farmer looking to reach more customers beyond the market, or an established maker ready to grow — Open Local gives you a storefront, visibility, and a community of shoppers who are actively looking for exactly what you make.",
  "For shoppers, it's the easiest way to put your dollars where your values are — not just when it's convenient, but every time.",
];

// ---------------------------------------------------------------------------
// Quick-reference table data
// ---------------------------------------------------------------------------
type PermitKind = "none" | "fdacs" | "dbpr";

const QUICK_REF: {
  vendorType: string;
  permit: PermitKind;
  agency: string;
}[] = [
  { vendorType: "Home baker", permit: "none", agency: "Cottage Food exempt" },
  { vendorType: "Packaged honey / granola", permit: "none", agency: "Cottage Food exempt" },
  { vendorType: "Farm with refrigerated items", permit: "fdacs", agency: "FDACS" },
  { vendorType: "Food truck / hot food", permit: "dbpr", agency: "DBPR" },
  { vendorType: "Lemonade / smoothies", permit: "dbpr", agency: "DBPR" },
  { vendorType: "Candles / crafts / jewelry", permit: "none", agency: "None required" },
];

// ---------------------------------------------------------------------------
// Accordion section data
// ---------------------------------------------------------------------------
type Section = {
  id: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  items: { heading?: string; lines: string[] }[];
};

const SECTIONS: Section[] = [
  {
    id: "cottage",
    icon: "home",
    title: "Florida Cottage Food Law (§500.80)",
    items: [
      {
        lines: [
          "No permit required — completely exempt from food safety regulations.",
          "$250,000 annual gross sales cap.",
          "Shelf-stable foods only (no refrigeration required).",
          "Sell online, at farmers markets, from home, or direct-to-consumer.",
          "No wholesale or retail store sales.",
          "Home kitchen only — no commercial kitchen required.",
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
          "Anything requiring refrigeration (TCS / temperature-controlled foods)",
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
          'Required statement in 10pt contrasting font:\n"Made in a cottage food operation that is not subject to Florida\'s food safety regulations."',
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
          "1–3 days: ~$91",
          "4–30 days: ~$105",
          "Annual license: ~$456",
        ],
      },
      {
        heading: "How to apply",
        lines: ["Visit myfloridalicense.com to apply for a food service license."],
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
          "Florida sales tax registration — call 850-488-6800 or visit floridarevenue.com",
          "Local business license / occupational permit (check your city and county)",
          "General liability insurance (strongly recommended)",
          "DBA (fictitious name) registration at sunbiz.org if selling under a trade name",
          "Event-specific permits for markets or fairs (check with organiser)",
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// About card
// ---------------------------------------------------------------------------
function AboutCard() {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const s = cardStyles(colors);

  return (
    <View style={[s.card, { marginBottom: 24 }]}>
      <TouchableOpacity
        style={s.header}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={[s.iconWrap, { backgroundColor: "#fef3c7" }]}>
          <Feather name="info" size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>About Open Local</Text>
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 12,
              color: colors.mutedForeground,
              marginTop: 1,
            }}
          >
            Local Sourcing and Experiences
          </Text>
        </View>
        <Feather
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.mutedForeground}
        />
      </TouchableOpacity>

      {open && (
        <View style={[s.body, { gap: 12 }]}>
          {ABOUT_PARAGRAPHS.map((para, i) => (
            <Text
              key={i}
              style={{
                fontFamily:
                  para === "Open Local was built to change that."
                    ? "DMSans_700Bold"
                    : "DMSans_400Regular",
                fontSize: 14,
                color: colors.foreground,
                lineHeight: 22,
              }}
            >
              {para}
            </Text>
          ))}
          <Text
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 15,
              color: colors.primary,
              marginTop: 4,
            }}
          >
            Open Local. Shop the community around you.
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Permit badge
// ---------------------------------------------------------------------------
function PermitBadge({ kind }: { kind: PermitKind }) {
  const label = kind === "none" ? "None" : kind === "fdacs" ? "FDACS" : "DBPR";
  const bg =
    kind === "none"
      ? "#16a34a"
      : kind === "fdacs"
        ? "#d97706"
        : "#dc2626";

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
function AccordionCard({ section }: { section: Section }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const s = cardStyles(colors);

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

function cardStyles(colors: ReturnType<typeof useColors>) {
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
// Quick reference table
// ---------------------------------------------------------------------------
function QuickRefTable() {
  const colors = useColors();
  const s = tableStyles(colors);

  return (
    <View style={s.card}>
      {/* Header row */}
      <View style={[s.row, s.headerRow]}>
        <Text style={[s.cell, s.hCell, s.col1]}>Vendor Type</Text>
        <Text style={[s.cell, s.hCell, s.col2]}>Permit Needed</Text>
        <Text style={[s.cell, s.hCell, s.col3]}>Agency</Text>
      </View>

      {QUICK_REF.map((item, i) => (
        <View
          key={i}
          style={[s.row, i % 2 === 0 ? s.rowEven : s.rowOdd]}
        >
          <Text style={[s.cell, s.bodyCell, s.col1]}>{item.vendorType}</Text>
          <View style={[s.cell, s.col2, { justifyContent: "flex-start" }]}>
            <PermitBadge kind={item.permit} />
          </View>
          <Text style={[s.cell, s.bodyCell, s.col3]}>{item.agency}</Text>
        </View>
      ))}
    </View>
  );
}

function tableStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: colors.radius,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      marginBottom: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerRow: {
      backgroundColor: colors.muted,
    },
    rowEven: { backgroundColor: colors.card },
    rowOdd: { backgroundColor: colors.background },
    cell: {
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    hCell: {
      fontFamily: "DMSans_700Bold",
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    bodyCell: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.foreground,
    },
    col1: { flex: 2.2 },
    col2: { flex: 1.4, flexDirection: "row", alignItems: "center" },
    col3: { flex: 1.8 },
  });
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ResourcesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const s = screenStyles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <Text style={s.pageTitle}>Florida Vendor Resources</Text>
        <Text style={s.pageSubtitle}>
          Compliance guide for local producers, makers, and vendors
        </Text>

        {/* About Open Local */}
        <AboutCard />

        {/* Disclaimer */}
        <View style={s.disclaimer}>
          <Feather name="alert-triangle" size={14} color="#d97706" style={s.disclaimerIcon} />
          <Text style={s.disclaimerText}>
            This is a reference summary, not legal advice. Vendors should verify
            requirements with FDACS, DBPR, and their local county before
            selling.
          </Text>
        </View>

        {/* Quick reference table */}
        <Text style={s.sectionLabel}>Quick Reference</Text>
        <QuickRefTable />

        {/* Accordion sections */}
        <Text style={s.sectionLabel}>Detailed Guides</Text>
        {SECTIONS.map((section) => (
          <AccordionCard key={section.id} section={section} />
        ))}

        {/* Useful links */}
        <Text style={s.sectionLabel}>Official Resources</Text>
        <View style={s.linksCard}>
          {[
            { label: "FDACS Food Permit Portal", url: "https://foodpermit.fdacs.gov" },
            { label: "DBPR License Application", url: "https://www.myfloridalicense.com" },
            { label: "Florida Sunbiz (DBA registration)", url: "https://dos.myflorida.com/sunbiz" },
            { label: "FL Dept. of Revenue (sales tax)", url: "https://floridarevenue.com" },
          ].map(({ label, url }, i, arr) => (
            <TouchableOpacity
              key={url}
              style={[s.linkRow, i < arr.length - 1 && s.linkRowBorder]}
              onPress={() => Linking.openURL(url)}
              activeOpacity={0.7}
            >
              <Text style={s.linkLabel}>{label}</Text>
              <Feather name="external-link" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          Sources: FL Statute §500.80 (2025), FDACS, DBPR, UF/IFAS Extension,
          FL Farmers Market Toolkit
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
    scroll: { flex: 1 },
    content: {
      paddingTop: topPad + 16,
      paddingBottom: bottomPad + 8,
      paddingHorizontal: 16,
    },
    pageTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
      marginBottom: 4,
    },
    pageSubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 16,
      lineHeight: 20,
    },
    disclaimer: {
      backgroundColor: "#fffbeb",
      borderRadius: colors.radius,
      borderWidth: 1,
      borderColor: "#fde68a",
      padding: 12,
      flexDirection: "row",
      gap: 8,
      marginBottom: 24,
      alignItems: "flex-start",
    },
    disclaimerIcon: { marginTop: 1 },
    disclaimerText: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: "#92400e",
      lineHeight: 18,
    },
    sectionLabel: {
      fontFamily: "DMSans_700Bold",
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 4,
    },
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
      marginBottom: 8,
      textAlign: "center",
    },
  });
}
