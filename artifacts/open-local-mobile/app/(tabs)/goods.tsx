import {
  useListProducts,
  useListVendors,
} from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

import { MiniMap, type MapPin } from "@/components/MiniMap";
import { useColors } from "@/hooks/useColors";
import { haversineDistanceMiles } from "@/utils/distance";
import type { Product, Vendor } from "@/lib/api-client";

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

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function GoodsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRadius, setMapRadius] = useState(25);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const screenH = Dimensions.get("window").height;
  const mapPeek = Math.round(screenH * 0.4);

  const {
    data: allProducts,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useListProducts();

  const {
    data: vendors,
    refetch: refetchVendors,
  } = useListVendors();

  // Map vendorId → vendor for location lookups
  const vendorById = useMemo(() => {
    const m = new Map<number, Vendor>();
    (vendors ?? []).forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  // Vendor pins for the map
  const pins: MapPin[] = useMemo(
    () =>
      (vendors ?? [])
        .filter((v) => v.latitude != null && v.longitude != null)
        .map((v) => ({
          key: `v-${v.slug}`,
          latitude: v.latitude!,
          longitude: v.longitude!,
          iconName: "shopping-bag" as const,
          color: "#e8520a",
          shape: "circle" as const,
          label: v.name,
          sublabel: v.location ?? undefined,
        })),
    [vendors],
  );

  // Apply text/type filters
  const filtered = useMemo(
    () =>
      (allProducts ?? []).filter((p) => {
        const matchesType = filter == null || p.listingType === filter;
        const matchesSearch =
          !search.trim() ||
          p.name.toLowerCase().includes(search.trim().toLowerCase());
        return matchesType && matchesSearch;
      }),
    [allProducts, filter, search],
  );

  // Split into in-radius and beyond based on vendor location
  const { inRadius, beyond } = useMemo(() => {
    if (!userLocation) return { inRadius: filtered, beyond: [] as Product[] };
    const inR: Product[] = [];
    const out: Product[] = [];
    for (const p of filtered) {
      const v = vendorById.get(p.vendorId);
      if (!v?.latitude || !v?.longitude) {
        out.push(p);
      } else {
        const dist = haversineDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          v.latitude,
          v.longitude,
        );
        (dist <= mapRadius ? inR : out).push(p);
      }
    }
    return { inRadius: inR, beyond: out };
  }, [filtered, userLocation, mapRadius, vendorById]);

  const isLoading = productsLoading;
  const isError = productsError;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchVendors()]);
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* Full-screen map background */}
      <View style={s.mapLayer}>
        <MiniMap
          pins={pins}
          radiusMiles={mapRadius}
          height={screenH}
          emptyHint="No mapped vendors yet"
          fullBleed
          showControls
          onUserLocationChange={setUserLocation}
          onRadiusChange={setMapRadius}
          onPinPress={(key) => {
            if (key.startsWith("v-")) router.push(`/vendor/${key.slice(2)}`);
          }}
        />
      </View>

      {/* Floating title */}
      <View style={[s.floatHeader, { top: topPad + 8 }]}>
        <View style={s.brandPill}>
          <Text style={s.wordmark}>Goods</Text>
          <Text style={s.tagline}>Products from local makers near you</Text>
        </View>
      </View>

      {/* Floating scrollable list panel */}
      <FlatList
        data={isLoading || isError ? [] : inRadius}
        keyExtractor={(item: Product) => `goods-${item.id}`}
        style={s.list}
        renderItem={({ item }: { item: Product }) => (
          <View style={s.itemWrap}>
            <ProductCard
              product={item}
              colors={colors}
              onPress={() => {
                const v = vendorById.get(item.vendorId);
                if (v) router.push(`/vendor/${v.slug}`);
              }}
            />
          </View>
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={{ height: mapPeek, pointerEvents: "none" }} />
            <View style={s.panelHead}>
              <View style={s.grabber} />
              {/* Search */}
              <View style={s.searchRow}>
                <Feather
                  name="search"
                  size={15}
                  color={colors.mutedForeground}
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  style={[s.searchInput, { color: colors.foreground }]}
                  placeholder="Search goods…"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
              {/* Filters */}
              <View style={s.chipRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={String(f.key)}
                    style={[s.chip, filter === f.key && s.chipActive]}
                    onPress={() => setFilter(f.key)}
                  >
                    <Text
                      style={[
                        s.chipText,
                        filter === f.key && s.chipTextActive,
                        { color: filter === f.key ? colors.primaryForeground : colors.mutedForeground },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isLoading && (
                <View style={s.inlineLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
              {isError && (
                <View style={s.inlineLoading}>
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                    Could not load goods
                  </Text>
                  <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                    <Text style={[s.retryText, { color: colors.primaryForeground }]}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.emptyPanel}>
              <Feather name="shopping-bag" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                {userLocation ? "No goods nearby" : "No goods found"}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {userLocation
                  ? `Nothing within ${mapRadius} mi — scroll down to see more`
                  : "Check back as vendors add products"}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ backgroundColor: colors.background }}>
            {beyond.length > 0 && userLocation ? (
              <>
                <BeyondDivider radius={mapRadius} count={beyond.length} colors={colors} />
                {beyond.map((item) => {
                  const v = vendorById.get(item.vendorId);
                  return (
                    <View key={`beyond-${item.id}`} style={s.itemWrap}>
                      <ProductCard
                        product={item}
                        colors={colors}
                        onPress={() => {
                          if (v) router.push(`/vendor/${v.slug}`);
                        }}
                      />
                    </View>
                  );
                })}
              </>
            ) : null}
            <View style={s.panelFooter} />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={mapPeek}
          />
        }
      />
    </View>
  );
}

function ProductCard({
  product: p,
  colors,
  onPress,
}: {
  product: Product;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const label = LISTING_LABELS[p.listingType] ?? "";
  return (
    <TouchableOpacity
      style={[productStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: p.imageUrl ?? undefined }}
        style={productStyles.image}
        contentFit="cover"
        transition={200}
      />
      <View style={productStyles.body}>
        {label ? (
          <View style={[productStyles.badge, { backgroundColor: colors.primary }]}>
            <Text style={[productStyles.badgeText, { color: colors.primaryForeground }]}>
              {label}
            </Text>
          </View>
        ) : null}
        <Text style={[productStyles.name, { color: colors.foreground }]} numberOfLines={2}>
          {p.name}
        </Text>
        <View style={productStyles.priceRow}>
          <Text style={[productStyles.price, { color: colors.primary }]}>
            {formatPrice(p.priceCents)}
          </Text>
          <Text style={[productStyles.unit, { color: colors.mutedForeground }]}>
            /{p.unit}
          </Text>
        </View>
        {!p.inStock && (
          <Text style={productStyles.outOfStock}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function BeyondDivider({
  radius,
  count,
  colors,
}: {
  radius: number;
  count: number;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={beyondStyles.wrap}>
      <View style={[beyondStyles.line, { backgroundColor: colors.border }]} />
      <View style={beyondStyles.center}>
        <Text style={[beyondStyles.label, { color: colors.mutedForeground }]}>
          Beyond {radius} mi
        </Text>
        <Text style={[beyondStyles.count, { color: colors.mutedForeground }]}>
          {count} more
        </Text>
      </View>
      <View style={[beyondStyles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const productStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  image: {
    width: 88,
    height: 88,
    backgroundColor: "#f0ede8",
  },
  body: {
    flex: 1,
    padding: 10,
    gap: 3,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 1 },
  price: { fontFamily: "DMSans_700Bold", fontSize: 15 },
  unit: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  outOfStock: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#dc2626",
  },
});

const beyondStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  line: { flex: 1, height: 1 },
  center: { alignItems: "center", gap: 1 },
  label: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  count: { fontFamily: "DMSans_400Regular", fontSize: 11 },
});

const styles = (
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    mapLayer: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" },
    list: { flex: 1, backgroundColor: "transparent" },
    listContent: { paddingBottom: 0 },
    floatHeader: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      pointerEvents: "box-none",
    },
    brandPill: {
      flex: 1,
      alignSelf: "flex-start",
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 22,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    panelHead: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
      gap: 10,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 4,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
    },
    chipRow: { flexDirection: "row", gap: 8 },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
    chipTextActive: {},
    inlineLoading: { paddingVertical: 16, alignItems: "center", gap: 10 },
    itemWrap: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    emptyPanel: {
      backgroundColor: colors.background,
      alignItems: "center",
      paddingTop: 28,
      paddingBottom: 40,
      gap: 8,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 16,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    panelFooter: {
      backgroundColor: colors.background,
      minHeight: bottomPad + 40,
    },
    retryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderRadius: 18,
    },
    retryText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  });
