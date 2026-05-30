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

const LISTING_TYPES = [
  { key: "batch_drop", label: "Batch Drop", icon: "zap", color: "#e8520a" },
  { key: "pre_order", label: "Pre-Order", icon: "clock", color: "#3c6e1a" },
  { key: "surplus", label: "Surplus", icon: "percent", color: "#c0622f" },
] as const;

type ListingKey = (typeof LISTING_TYPES)[number]["key"];

export default function ListingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeType, setActiveType] = useState<ListingKey>("batch_drop");
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const { data: allProducts, isLoading, isError, refetch } = useListProducts();
  const products = (allProducts ?? []).filter((p) => p.listingType === activeType);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const activeConfig = LISTING_TYPES.find((t) => t.key === activeType)!;

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.headerWrap, { paddingTop: topPad + 12 }]}>
        <Text style={s.title}>Listings</Text>
        <Text style={s.subtitle}>Special drops, pre-orders & surplus</Text>
        <View style={s.typeRow}>
          {LISTING_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                s.typeCard,
                activeType === t.key && { borderColor: t.color, backgroundColor: t.color + "15" },
              ]}
              onPress={() => setActiveType(t.key)}
            >
              <Feather
                name={t.icon as any}
                size={18}
                color={activeType === t.key ? t.color : colors.mutedForeground}
              />
              <Text
                style={[
                  s.typeLabel,
                  activeType === t.key && { color: t.color, fontFamily: "DMSans_700Bold" },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={activeConfig.color} />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Couldn't load listings</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: activeConfig.color }]} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products ?? []}
          keyExtractor={(item: Product) => String(item.id)}
          renderItem={({ item }: { item: Product }) => (
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
                <View style={[s.badge, { backgroundColor: activeConfig.color }]}>
                  <Feather name={activeConfig.icon as any} size={10} color="#fff" />
                  <Text style={s.badgeText}>{activeConfig.label}</Text>
                </View>
                <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
                <View style={s.priceRow}>
                  <Text style={[s.price, { color: activeConfig.color }]}>
                    {formatPrice(item.priceCents)}
                  </Text>
                  {item.originalPriceCents != null && item.originalPriceCents > item.priceCents && (
                    <Text style={s.original}>{formatPrice(item.originalPriceCents)}</Text>
                  )}
                  <Text style={s.unit}>/{item.unit}</Text>
                </View>
                {item.availableUntil && (
                  <Text style={s.until}>
                    Until {new Date(item.availableUntil).toLocaleDateString()}
                  </Text>
                )}
                {!item.inStock && <Text style={s.outOfStock}>Out of stock</Text>}
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name={activeConfig.icon as any} size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No {activeConfig.label.toLowerCase()} listings</Text>
              <Text style={s.emptySubtitle}>Check back soon</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeConfig.color} />
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
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 6,
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
    },
    subtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    typeRow: { flexDirection: "row", gap: 8 },
    typeCard: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    typeLabel: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: bottomPad,
      gap: 10,
    },
    card: {
      flexDirection: "row",
      backgroundColor: colors.card,
      borderRadius: 12,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: {
      width: 100,
      height: 100,
      backgroundColor: colors.muted,
    },
    cardBody: { flex: 1, padding: 12, gap: 4 },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
      gap: 4,
    },
    badgeText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 10,
      color: "#fff",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cardName: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 20,
    },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    price: {
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
    },
    original: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      textDecorationLine: "line-through",
    },
    unit: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    until: {
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
      borderRadius: 20,
    },
    retryText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: "#fff",
    },
  });
