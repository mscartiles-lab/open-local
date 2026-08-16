import {
  useListVendors,
  useListEstablishments,
} from "@/lib/api-client";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { haversineDistanceMiles } from "@/utils/distance";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Avatar from "@/components/Avatar";
import { MiniMap, type MapPin } from "@/components/MiniMap";
import { VendorCard } from "@/components/VendorCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type {
  Establishment,
  Vendor,
} from "@/lib/api-client";

type LocalItem =
  | { kind: "vendor"; data: Vendor }
  | { kind: "establishment"; data: Establishment };

type Segment = "all" | "vendors" | "businesses";

const ESTABLISHMENT_COLOR = "#c0622f";

export default function TheLocalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [segment, setSegment] = useState<Segment>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [mapRadius, setMapRadius] = useState(0.5);

  const {
    data: vendors,
    isLoading: vendorsLoading,
    isError: vendorsError,
    refetch: refetchVendors,
  } = useListVendors({ search: search.trim() || undefined });
  const {
    data: establishments,
    isLoading: estLoading,
    isError: estError,
    refetch: refetchEst,
  } = useListEstablishments();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const screenH = Dimensions.get("window").height;
  // Map takes the top 50% of the screen; list scrolls in the bottom half.
  const mapHeight = Math.max(Math.round(screenH * 0.50), 280);

  // Map expansion — auto-triggered when list is scrolled down, or toggled manually
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapHeightAnim = useRef(new Animated.Value(mapHeight)).current;
  const flatListRef = useRef<FlatList>(null);
  const SCROLL_EXPAND_THRESHOLD = 60;

  useEffect(() => {
    Animated.spring(mapHeightAnim, {
      toValue: mapExpanded ? screenH : mapHeight,
      useNativeDriver: false,
      speed: 16,
      bounciness: 0,
    }).start();
  }, [mapExpanded, mapHeightAnim, mapHeight, screenH]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    if (y > SCROLL_EXPAND_THRESHOLD && !mapExpanded) {
      setMapExpanded(true);
    }
  }

  function handleShowList() {
    setMapExpanded(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const pins: MapPin[] = useMemo(() => {
    const vendorPins = (vendors ?? [])
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
      }));
    const estPins = (establishments ?? [])
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        key: `e-${e.id}`,
        latitude: e.latitude!,
        longitude: e.longitude!,
        iconName: "home" as const,
        color: ESTABLISHMENT_COLOR,
        shape: "square" as const,
        label: e.name,
        sublabel: [e.city, e.state].filter(Boolean).join(", ") || undefined,
      }));
    if (segment === "vendors") return vendorPins;
    if (segment === "businesses") return estPins;
    return [...vendorPins, ...estPins];
  }, [vendors, establishments, segment]);

  const items: LocalItem[] = useMemo(() => {
    const vendorItems: LocalItem[] = (vendors ?? []).map((v) => ({
      kind: "vendor",
      data: v,
    }));
    const estItems: LocalItem[] = (establishments ?? []).map((e) => ({
      kind: "establishment",
      data: e,
    }));
    if (segment === "vendors") return vendorItems;
    if (segment === "businesses") return estItems;
    return [...vendorItems, ...estItems];
  }, [vendors, establishments, segment]);

  // Split into in-radius and beyond using mapCenter (follows drags) or GPS
  const filterCenter = mapCenter ?? userLocation;
  const { inRadiusItems, beyondItems } = useMemo(() => {
    if (!filterCenter) return { inRadiusItems: items, beyondItems: [] as LocalItem[] };
    const inR: LocalItem[] = [];
    const out: LocalItem[] = [];
    for (const item of items) {
      const lat = item.data.latitude;
      const lng = item.data.longitude;
      if (!lat || !lng) { out.push(item); continue; }
      const dist = haversineDistanceMiles(filterCenter.latitude, filterCenter.longitude, lat, lng);
      (dist <= mapRadius ? inR : out).push(item);
    }
    return { inRadiusItems: inR, beyondItems: out };
  }, [items, filterCenter, mapRadius]);

  const isLoading = vendorsLoading || estLoading;
  const isError = vendorsError && estError;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchVendors(), refetchEst()]);
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      {/* Map — animates between 50% and full-screen height */}
      <Animated.View style={{ height: mapHeightAnim }}>
        <MiniMap
          pins={pins}
          radiusMiles={mapRadius}
          height={mapExpanded ? undefined : mapHeight}
          emptyHint="No mapped locations yet"
          showControls
          fullBleed={mapExpanded}
          onPinPress={(key) => {
            if (key.startsWith("v-")) router.push(`/vendor/${key.slice(2)}`);
          }}
          onUserLocationChange={(loc) => {
            setUserLocation(loc);
            if (loc) setMapCenter(loc);
          }}
          onRadiusChange={setMapRadius}
          onMapCenterChange={setMapCenter}
        />
        {/* Brand + profile bar floating over the map */}
        <View style={[s.floatHeader, { top: topPad + 8 }]}>
          <View style={s.brandPill}>
            <Text style={s.wordmark}>Vendors</Text>
            <Text style={s.tagline}>Local producers & makers near you</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.gearBtn}
              onPress={() => router.push("/settings")}
              accessibilityLabel="Settings"
            >
              <Feather name="settings" size={18} color={colors.foreground} />
            </TouchableOpacity>
            {user ? (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/more" as any)}
                accessibilityLabel="Your profile"
              >
                <Avatar seed={user.avatarSeed} style={user.avatarStyle} size={44} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/(auth)/signup")}
                style={s.signInBtn}
              >
                <Text style={s.signInText}>Sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {/* Expand / collapse button — always visible at bottom-centre of map */}
        <TouchableOpacity
          style={[s.expandBtn, mapExpanded && s.expandBtnFull]}
          onPress={mapExpanded ? handleShowList : () => setMapExpanded(true)}
          accessibilityLabel={mapExpanded ? "Show list" : "Expand map"}
        >
          <Feather
            name={mapExpanded ? "list" : "maximize-2"}
            size={14}
            color={colors.foreground}
          />
          <Text style={[s.expandBtnText, { color: colors.foreground }]}>
            {mapExpanded ? "Show list" : "Full map"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* List panel — scrolls below the map, no overlap */}
      <FlatList
        ref={flatListRef}
        data={isLoading || isError ? [] : inRadiusItems}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        style={s.list}
        renderItem={({ item }) => (
          <View style={s.itemWrap}>
            {item.kind === "vendor" ? (
              <VendorCard
                vendor={item.data}
                onPress={() => router.push(`/vendor/${item.data.slug}`)}
              />
            ) : (
              <EstablishmentCard
                establishment={item.data}
                colors={colors}
                onPress={() => {
                  if (item.data.website) {
                    router.push(item.data.website as `${string}:${string}`);
                  }
                }}
              />
            )}
          </View>
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={s.panelHead}>
              <View style={s.grabber} />
              {/* Search bar */}
              <View style={[s.searchRow, { backgroundColor: colors.muted }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                <TextInput
                  style={[s.searchInput, { color: colors.foreground }]}
                  placeholder="Search vendors…"
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={s.segmentRow}>
                {(
                  [
                    { key: "all", label: "All" },
                    { key: "vendors", label: "Vendors" },
                    { key: "businesses", label: "Businesses" },
                  ] as { key: Segment; label: string }[]
                ).map((seg) => (
                  <TouchableOpacity
                    key={seg.key}
                    style={[s.segChip, segment === seg.key && s.segChipActive]}
                    onPress={() => setSegment(seg.key)}
                  >
                    <Text
                      style={[
                        s.segChipText,
                        segment === seg.key && s.segChipTextActive,
                      ]}
                    >
                      {seg.label}
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
                <View style={s.inlineError}>
                  <Text style={s.emptyTitle}>Could not load locals</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                    <Text style={s.retryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.emptyPanel}>
              <Feather name="compass" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>Nothing here yet</Text>
              <Text style={s.emptySubtitle}>
                Check back as more locals join.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={{ backgroundColor: colors.background }}>
            {beyondItems.length > 0 && filterCenter ? (
              <>
                <BeyondDivider
                  radius={mapRadius}
                  count={beyondItems.length}
                  colors={colors}
                />
                {beyondItems.map((item) => (
                  <View key={`beyond-${item.kind}-${item.data.id}`} style={s.itemWrap}>
                    {item.kind === "vendor" ? (
                      <VendorCard
                        vendor={item.data}
                        onPress={() => router.push(`/vendor/${item.data.slug}`)}
                      />
                    ) : (
                      <EstablishmentCard
                        establishment={item.data}
                        colors={colors}
                        onPress={() => {
                          if (item.data.website) {
                            router.push(item.data.website as `${string}:${string}`);
                          }
                        }}
                      />
                    )}
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
            progressViewOffset={mapHeight}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces
      />

    </View>
  );
}

function EstablishmentCard({
  establishment: e,
  colors,
  onPress,
}: {
  establishment: Establishment;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[estStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[estStyles.icon, { backgroundColor: `${ESTABLISHMENT_COLOR}22` }]}>
        <Feather name="home" size={20} color={ESTABLISHMENT_COLOR} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[estStyles.name, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {e.name}
        </Text>
        <Text
          style={[estStyles.meta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {e.type} · {e.city}, {e.state}
        </Text>
      </View>
      {e.website ? (
        <Feather name="external-link" size={16} color={colors.mutedForeground} />
      ) : (
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      )}
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
    <View style={bdStyles.wrap}>
      <View style={[bdStyles.line, { backgroundColor: colors.border }]} />
      <View style={bdStyles.center}>
        <Text style={[bdStyles.label, { color: colors.mutedForeground }]}>
          Beyond {radius} mi
        </Text>
        <Text style={[bdStyles.count, { color: colors.mutedForeground }]}>
          {count} more
        </Text>
      </View>
      <View style={[bdStyles.line, { backgroundColor: colors.border }]} />
    </View>
  );
}

const bdStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: "transparent",
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

const estStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
});

const styles = (
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1, backgroundColor: colors.background },
    expandBtn: {
      position: "absolute",
      bottom: 10,
      alignSelf: "center",
      left: "35%",
      right: "35%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
      zIndex: 20,
    },
    expandBtnFull: {
      bottom: bottomPad + 20,
    },
    expandBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
    },
    listContent: {
      paddingBottom: bottomPad,
    },
    searchRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 38,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
    },
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
    panelHead: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 8,
      paddingHorizontal: 16,
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
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    gearBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    signInBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: colors.primary,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    signInText: {
      color: "#fff",
      fontFamily: "DMSans_700Bold",
      fontSize: 13,
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
    segmentRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 14,
      paddingHorizontal: 2,
    },
    segChip: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.muted,
    },
    segChipActive: {
      backgroundColor: colors.primary,
    },
    segChipText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    segChipTextActive: {
      color: colors.primaryForeground,
    },
    inlineLoading: { paddingVertical: 28, alignItems: "center" },
    inlineError: { paddingVertical: 28, alignItems: "center", gap: 10 },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 16,
      color: colors.foreground,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    retryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderRadius: 18,
    },
    retryText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.primaryForeground,
    },
  });
