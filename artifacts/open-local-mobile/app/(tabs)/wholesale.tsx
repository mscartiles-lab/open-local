import { useListWholesaleListings } from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import type { WholesaleListing } from "@/lib/api-client";


function formatPrice(price: number | null, unit: string | null) {
  if (price == null) return null;
  return `$${Number(price).toFixed(2)}${unit ? `/${unit}` : ""}`;
}

function WholesaleListCard({
  listing,
  colors,
  onPress,
}: {
  listing: WholesaleListing;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const priceStr = formatPrice(listing.pricePerUnit, listing.unit);
  const isExpired = listing.expiresAt ? new Date(listing.expiresAt) < new Date() : false;

  return (
    <TouchableOpacity
      style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {listing.imageUrl ? (
        <Image
          source={{ uri: listing.imageUrl }}
          style={cardStyles.cardImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[cardStyles.cardImagePlaceholder, { backgroundColor: colors.muted }]}>
          <Feather name="package" size={28} color={colors.mutedForeground} />
        </View>
      )}

      <View style={cardStyles.cardBody}>
        <View style={cardStyles.topRow}>
          {listing.category && (
            <View style={[cardStyles.badge, { backgroundColor: "#dcfce7" }]}>
              <Text style={[cardStyles.badgeText, { color: "#166534" }]}>{listing.category}</Text>
            </View>
          )}
          {isExpired && (
            <View style={[cardStyles.badge, { backgroundColor: "#fee2e2" }]}>
              <Text style={[cardStyles.badgeText, { color: "#991b1b" }]}>{t("wholesale.expired")}</Text>
            </View>
          )}
        </View>

        <Text style={[cardStyles.title, { color: colors.foreground }]} numberOfLines={2}>
          {listing.title}
        </Text>

        {listing.description ? (
          <Text style={[cardStyles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {listing.description}
          </Text>
        ) : null}

        <View style={cardStyles.metaRow}>
          {priceStr && (
            <Text style={[cardStyles.price, { color: "#166534" }]}>{priceStr}</Text>
          )}
          {listing.minOrderQty > 1 && (
            <View style={[cardStyles.minQtyPill, { backgroundColor: colors.muted }]}>
              <Text style={[cardStyles.minQtyText, { color: colors.mutedForeground }]}>
                {t("wholesale.minQty", { qty: listing.minOrderQty })}
              </Text>
            </View>
          )}
        </View>

        <Text style={[cardStyles.vendorName, { color: colors.mutedForeground }]}>
          {listing.vendorName}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardImage: {
    width: 96,
    height: 96,
  },
  cardImagePlaceholder: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    fontWeight: "700",
  },
  title: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 18,
  },
  desc: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  price: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    fontWeight: "700",
  },
  minQtyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  minQtyText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
  },
  vendorName: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    marginTop: 2,
  },
});

export default function WholesaleScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const CATEGORIES = [
    { key: undefined as string | undefined, label: t("wholesale.filterAll") },
    { key: "Farm", label: t("wholesale.filterFarm") },
    { key: "Bakery", label: t("wholesale.filterBakery") },
    { key: "Apiary", label: t("wholesale.filterApiary") },
    { key: "Pantry", label: t("wholesale.filterPantry") },
    { key: "Other", label: t("wholesale.filterOther") },
  ];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const {
    data: listings,
    isLoading,
    isError,
    refetch,
  } = useListWholesaleListings({
    search: search.trim() || undefined,
    category,
  });

  const filtered = useMemo(() => listings ?? [], [listings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <Text style={[s.title, { color: colors.foreground }]}>{t("wholesale.title")}</Text>
        <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
          {t("wholesale.subtitle")}
        </Text>

        {/* Search */}
        <View style={[s.searchRow, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder={t("wholesale.searchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Category chips */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          renderItem={({ item }) => {
            const active = item.key === category;
            return (
              <TouchableOpacity
                onPress={() => setCategory(item.key)}
                style={[
                  s.chip,
                  active
                    ? { backgroundColor: "#166534", borderColor: "#166534" }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[s.chipText, { color: active ? "#fff" : colors.foreground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
          style={{ marginTop: 8 }}
        />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color="#166534" />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            {t("wholesale.couldNotLoad")}
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: "#166534" }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>{t("errorFallback.tryAgain")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: WholesaleListing) => String(item.id)}
          renderItem={({ item }: { item: WholesaleListing }) => (
            <WholesaleListCard
              listing={item}
              colors={colors}
              onPress={() => router.push(`/vendor/${item.vendorSlug}`)}
            />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#166834" />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                {t("wholesale.noListings")}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {search || category
                  ? t("wholesale.emptySearch")
                  : t("wholesale.emptyAll")}
              </Text>
            </View>
          }
        />
      )}
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
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontFamily: "DMSans_700Bold",
      fontWeight: "700",
    },
    subtitle: {
      fontSize: 13,
      fontFamily: "DMSans_400Regular",
      marginTop: 2,
      marginBottom: 10,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
    },
    searchInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 13,
      fontFamily: "DMSans_500Medium",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "DMSans_600SemiBold",
      fontWeight: "600",
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: "DMSans_400Regular",
      textAlign: "center",
      lineHeight: 18,
    },
    retryBtn: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
    },
    retryText: {
      color: "#fff",
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
    },
  });
