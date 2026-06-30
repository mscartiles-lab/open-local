import { useGetLocalNowFeed, useListVendors } from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedProductCard } from "@/components/FeedProductCard";
import { MiniMap, type MapPin } from "@/components/MiniMap";
import { useColors } from "@/hooks/useColors";
import type { ProductWithVendor, Vendor } from "@/lib/api-client";

export default function FinalSaleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const screenH = Dimensions.get("window").height;
  const mapPeek = Math.round(screenH * 0.4);

  const { data, isLoading, refetch, isRefetching } = useGetLocalNowFeed();
  const { data: vendors } = useListVendors();

  const items: ProductWithVendor[] = data?.surplus ?? [];

  const vendorById = useMemo(() => {
    const m = new Map<number, Vendor>();
    (vendors ?? []).forEach((v) => m.set(v.id, v));
    return m;
  }, [vendors]);

  const pins: MapPin[] = useMemo(() => {
    const seen = new Set<number>();
    const result: MapPin[] = [];
    for (const item of items) {
      if (seen.has(item.vendorId)) continue;
      seen.add(item.vendorId);
      const v = vendorById.get(item.vendorId);
      if (!v?.latitude || !v?.longitude) continue;
      result.push({
        key: `v-${v.slug}`,
        latitude: v.latitude,
        longitude: v.longitude,
        iconName: "tag",
        color: "#c0622f",
        shape: "circle",
        label: v.name,
        sublabel: v.location ?? undefined,
      });
    }
    return result;
  }, [items, vendorById]);

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* Full-screen map background */}
      <View style={s.mapLayer}>
        <MiniMap
          pins={pins}
          radiusMiles={0.5}
          height={screenH}
          emptyHint="No surplus vendor locations mapped"
          fullBleed
          showControls
          onUserLocationChange={setUserLocation}
          onPinPress={(key) => {
            if (key.startsWith("v-")) router.push(`/vendor/${key.slice(2)}`);
          }}
        />
      </View>

      {/* Floating title over the map */}
      <View style={[s.floatHeader, { top: topPad + 8 }]}>
        <View style={s.brandPill}>
          <View style={s.brandRow}>
            <View style={s.headerIcon}>
              <Feather name="tag" size={16} color="#fff" />
            </View>
            <View>
              <Text style={s.wordmark}>Final Sale</Text>
              <Text style={s.tagline}>Market-leftover discounts. Rescue it before it spoils.</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Floating scrollable list panel */}
      <FlatList
        data={isLoading ? [] : items}
        keyExtractor={(p) => String(p.id)}
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={{ height: mapPeek, pointerEvents: "none" }} />
            <View style={s.panelHead}>
              <View style={s.grabber} />
              <Text style={s.panelTitle}>
                {items.length > 0 ? `${items.length} surplus item${items.length !== 1 ? "s" : ""}` : "Surplus items"}
              </Text>
              {isLoading && (
                <View style={s.inline}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.itemWrap}>
            <FeedProductCard
              item={item}
              onPress={() => router.push(`/vendor/${item.vendorSlug}`)}
            />
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.emptyPanel}>
              <Feather name="package" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                No surplus today
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                Check back after the next market — vendors post leftovers in the evening.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={s.panelFooter} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            progressViewOffset={mapPeek}
          />
        }
      />
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
    mapLayer: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" },
    list: { flex: 1, backgroundColor: "transparent" },
    listContent: { paddingBottom: 0 },
    floatHeader: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 10,
      pointerEvents: "box-none",
    },
    brandPill: {
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
    brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#c0622f",
      alignItems: "center",
      justifyContent: "center",
    },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 18,
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
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
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    panelTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 17,
      color: colors.foreground,
    },
    inline: { paddingVertical: 24, alignItems: "center" },
    itemWrap: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    panelFooter: {
      backgroundColor: colors.background,
      minHeight: bottomPad + 40,
    },
    emptyPanel: {
      backgroundColor: colors.background,
      alignItems: "center",
      paddingTop: 28,
      paddingBottom: 60,
      gap: 8,
      paddingHorizontal: 32,
    },
    emptyTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 16,
      marginTop: 8,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      textAlign: "center",
    },
  });
