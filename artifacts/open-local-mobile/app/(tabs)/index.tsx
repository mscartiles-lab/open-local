import {
  useListVendors,
  useListEstablishments,
} from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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

import { MiniMap, type MapPin } from "@/components/MiniMap";
import { VendorCard } from "@/components/VendorCard";
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

  const pins: MapPin[] = useMemo(() => {
    const vendorPins = (vendors ?? [])
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => ({
        key: `v-${v.id}`,
        latitude: v.latitude!,
        longitude: v.longitude!,
        iconName: "shopping-bag" as const,
        color: "#3c4a26",
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
      <FlatList
        data={isLoading || isError ? [] : items}
        keyExtractor={(item) => `${item.kind}-${item.data.id}`}
        renderItem={({ item }) =>
          item.kind === "vendor" ? (
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
          )
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={s.header}>
              <Text style={s.wordmark}>The Locals</Text>
              <Text style={s.tagline}>
                Producers, makers, and small businesses near you
              </Text>
            </View>

            <View style={s.mapWrap}>
              <MiniMap
                pins={pins}
                radiusMiles={25}
                height={200}
                emptyHint="No mapped locations yet"
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
                  style={[
                    s.segChip,
                    segment === seg.key && s.segChipActive,
                  ]}
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
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.empty}>
              <Feather name="compass" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>Nothing here yet</Text>
              <Text style={s.emptySubtitle}>
                Check back as more locals join.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
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
    listContent: {
      paddingTop: topPad + 12,
      paddingBottom: bottomPad,
      paddingHorizontal: 16,
      gap: 10,
    },
    header: { marginBottom: 14, paddingHorizontal: 4 },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    mapWrap: {
      marginBottom: 14,
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
    empty: { alignItems: "center", paddingTop: 40, gap: 8 },
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
