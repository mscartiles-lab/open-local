import {
  useListVendors,
  useListEstablishments,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
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

import Avatar from "@/components/Avatar";
import { MiniMap, type MapPin } from "@/components/MiniMap";
import { VendorCard } from "@/components/VendorCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type {
  Establishment,
  Vendor,
} from "@workspace/api-client-react";

type LocalItem =
  | { kind: "vendor"; data: Vendor }
  | { kind: "establishment"; data: Establishment };

type Segment = "all" | "vendors" | "businesses";

const ESTABLISHMENT_COLOR = "#c0622f";

export default function TheLocalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [segment, setSegment] = useState<Segment>("all");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: vendors,
    isLoading: vendorsLoading,
    isError: vendorsError,
    refetch: refetchVendors,
  } = useListVendors();
  const {
    data: establishments,
    isLoading: estLoading,
    isError: estError,
    refetch: refetchEst,
  } = useListEstablishments();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;
  const screenH = Dimensions.get("window").height;
  // How much of the map stays visible before the floating list panel begins.
  // Set so the panel head peeks at the bottom and a micro-scroll reveals the list.
  const mapPeek = Math.round(screenH * 0.4);

  const pins: MapPin[] = useMemo(() => {
    const vendorPins = (vendors ?? [])
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => ({
        key: `v-${v.id}`,
        latitude: v.latitude!,
        longitude: v.longitude!,
        iconName: "shopping-bag" as const,
        color: "#e8520a",
      }));
    const estPins = (establishments ?? [])
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => ({
        key: `e-${e.id}`,
        latitude: e.latitude!,
        longitude: e.longitude!,
        iconName: "home" as const,
        color: ESTABLISHMENT_COLOR,
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
    // Interleave a bit so it doesn't feel split
    return [...vendorItems, ...estItems];
  }, [vendors, establishments, segment]);

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
      {/* Full-screen map background */}
      <View style={s.mapLayer}>
        <MiniMap
          pins={pins}
          radiusMiles={25}
          height={screenH}
          emptyHint="No mapped locations yet"
          fullBleed
        />
      </View>

      {/* Floating brand + profile bar over the map */}
      <View style={[s.floatHeader, { top: topPad + 8 }]}>
        <View style={s.brandPill}>
          <Text style={s.wordmark}>Vendors</Text>
          <Text style={s.tagline}>Local producers & makers near you</Text>
        </View>
        {user ? (
          <TouchableOpacity
            onLongPress={logout}
            onPress={() => {
              if (user.role === "vendor") router.push("/(auth)/tiers");
            }}
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

      {/* Floating, scrollable list panel above the map */}
      <FlatList
        data={isLoading || isError ? [] : items}
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
            {/* Transparent spacer keeps the map visible & tappable */}
            <View style={{ height: mapPeek, pointerEvents: "none" }} />
            <View style={s.panelHead}>
              <View style={s.grabber} />
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
        ListFooterComponent={<View style={s.panelFooter} />}
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
    mapLayer: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" },
    list: { flex: 1, backgroundColor: "transparent" },
    listContent: {
      paddingBottom: bottomPad,
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
