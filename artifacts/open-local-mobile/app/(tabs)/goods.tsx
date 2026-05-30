import { useListProducts } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
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
import { Image } from "expo-image";

import { useColors } from "@/hooks/useColors";
import type { Product } from "@workspace/api-client-react";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const LISTING_LABELS: Record<string, string> = {
  batch_drop: "Just Dropped",
  surplus: "Surplus",
  pre_order: "Pre-Order",
  regular: "",
};

const FILTERS = [
  { key: undefined, label: "All" },
  { key: "batch_drop", label: "Dropped" },
  { key: "pre_order", label: "Pre-Order" },
  { key: "surplus", label: "Surplus" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function GoodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const { data: allProducts, isLoading, isError, refetch } = useListProducts();

  const filtered = (allProducts ?? []).filter((p) => {
    const matchesFilter = filter == null || p.listingType === filter;
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.headerWrap, { paddingTop: topPad + 12 }]}>
        <Text style={s.title}>Goods</Text>
        <View style={s.searchRow}>
          <Feather name="search" size={16} color={colors.mutedForeground} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search goods…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <View style={s.chipRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={String(f.key)}
              style={[s.chip, filter === f.key && s.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.chipText, filter === f.key && s.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Couldn't load goods</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: Product) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.row}
          renderItem={({ item }: { item: Product }) => {
            const label = LISTING_LABELS[item.listingType] ?? "";
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/vendor/${item.vendorId}`)}
              >
                <Image
                  source={{ uri: item.imageUrl ?? undefined }}
                  style={s.cardImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={s.cardBody}>
                  {label ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{label}</Text>
                    </View>
                  ) : null}
                  <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{formatPrice(item.priceCents)}</Text>
                    <Text style={s.unit}>/{item.unit}</Text>
                  </View>
                  {!item.inStock && (
                    <Text style={s.outOfStock}>Out of stock</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="shopping-bag" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No goods found</Text>
              <Text style={s.emptySubtitle}>Check back as vendors add products</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    headerWrap: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 40,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
      color: colors.foreground,
    },
    chipRow: { flexDirection: "row", gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    chipTextActive: { color: colors.primaryForeground },
    listContent: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: bottomPad,
      gap: 12,
    },
    row: { gap: 12 },
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: {
      width: "100%",
      height: 130,
      backgroundColor: colors.muted,
    },
    cardBody: { padding: 10, gap: 4 },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    badgeText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 10,
      color: colors.primaryForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cardName: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 18,
    },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
    price: {
      fontFamily: "DMSans_700Bold",
      fontSize: 15,
      color: colors.primary,
    },
    unit: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    outOfStock: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.destructive,
    },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 17,
      color: colors.foreground,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: 16,
      paddingVertical: 10,
      paddingHorizontal: 24,
      backgroundColor: colors.primary,
      borderRadius: 20,
    },
    retryText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.primaryForeground,
    },
  });
