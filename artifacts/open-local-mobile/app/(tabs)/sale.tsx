import {
  useGetLocalNowFeed,
  useListVendors,
} from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedProductCard } from "@/components/FeedProductCard";
import { MiniMap, type MapPin } from "@/components/MiniMap";
import { useColors } from "@/hooks/useColors";
import { haversineDistanceMiles } from "@/utils/distance";
import type { ProductWithVendor, Vendor } from "@/lib/api-client";

export default function SaleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
    data: feed,
    isLoading,
    isError,
    refetch: refetchFeed,
  } = useGetLocalNowFeed();

  const {
    data: vendors,
    refetch: refetchVendors,
  } = useListVendors();

  // Map vendorSlug → vendor for location lookups
  const vendorBySlug = useMemo(() => {
    const m = new Map<string, Vendor>();
    (vendors ?? []).forEach((v) => m.set(v.slug, v));
    return m;
  }, [vendors]);

  const allItems: ProductWithVendor[] = feed?.surplus ?? [];

  // Vendor pins for the map (only vendors with surplus items)
  const pins: MapPin[] = useMemo(() => {
    const seen = new Set<string>();
    const result: MapPin[] = [];
    for (const item of allItems) {
      if (seen.has(item.vendorSlug)) continue;
      seen.add(item.vendorSlug);
      const v = vendorBySlug.get(item.vendorSlug);
      if (!v?.latitude || !v?.longitude) continue;
      result.push({
        key: `v-${v.slug}`,
        latitude: v.latitude,
        longitude: v.longitude,
        iconName: "tag" as const,
        color: "#e8520a",
        shape: "circle" as const,
        label: v.name,
        sublabel: v.location ?? undefined,
      });
    }
    return result;
  }, [allItems, vendorBySlug]);

  // Split into in-radius and beyond
  const { inRadius, beyond } = useMemo(() => {
    if (!userLocation) return { inRadius: allItems, beyond: [] as ProductWithVendor[] };
    const inR: ProductWithVendor[] = [];
    const out: ProductWithVendor[] = [];
    for (const item of allItems) {
      const v = vendorBySlug.get(item.vendorSlug);
      if (!v?.latitude || !v?.longitude) {
        out.push(item);
      } else {
        const dist = haversineDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          v.latitude,
          v.longitude,
        );
        (dist <= mapRadius ? inR : out).push(item);
      }
    }
    return { inRadius: inR, beyond: out };
  }, [allItems, userLocation, mapRadius, vendorBySlug]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchFeed(), refetchVendors()]);
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
          emptyHint="No surplus vendors mapped"
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
          <Text style={s.wordmark}>Sale</Text>
          <Text style={s.tagline}>Market-leftover discounts near you</Text>
        </View>
      </View>

      {/* Floating scrollable list panel */}
      <FlatList
        data={isLoading || isError ? [] : inRadius}
        keyExtractor={(item: ProductWithVendor) => `sale-${item.id}`}
        style={s.list}
        renderItem={({ item }: { item: ProductWithVendor }) => (
          <View style={s.itemWrap}>
            <FeedProductCard
              item={item}
              onPress={() => router.push(`/vendor/${item.vendorSlug}`)}
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
              <View style={s.panelTitleRow}>
                <View style={[s.titleIcon, { backgroundColor: colors.primary }]}>
                  <Feather name="tag" size={15} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.panelTitle, { color: colors.foreground }]}>
                    Market surplus
                  </Text>
                  <Text style={[s.panelSubtitle, { color: colors.mutedForeground }]}>
                    Rescue before it&apos;s gone
                  </Text>
                </View>
              </View>
              {isLoading && (
                <View style={s.inlineLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
              {isError && (
                <View style={s.inlineLoading}>
                  <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                    Could not load sale items
                  </Text>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.emptyPanel}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                {userLocation ? "No surplus nearby" : "No surplus today"}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {userLocation
                  ? `Nothing within ${mapRadius} mi — scroll down to see more`
                  : "Check back after the next market — vendors post leftovers in the evening."}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ backgroundColor: colors.background }}>
            {beyond.length > 0 && userLocation ? (
              <>
                <BeyondDivider radius={mapRadius} count={beyond.length} colors={colors} />
                {beyond.map((item) => (
                  <View key={`beyond-sale-${item.id}`} style={s.itemWrap}>
                    <FeedProductCard
                      item={item}
                      onPress={() => router.push(`/vendor/${item.vendorSlug}`)}
                    />
                  </View>
                ))}
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
      paddingBottom: 14,
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
    panelTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    titleIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    panelTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
    },
    panelSubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      marginTop: 1,
    },
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
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
      textAlign: "center",
      marginTop: 6,
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
  });
