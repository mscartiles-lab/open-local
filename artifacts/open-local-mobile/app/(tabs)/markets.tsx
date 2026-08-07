import { useListMarkets } from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { useColors } from "@/hooks/useColors";
import type { Market } from "@/lib/api-client";

const DAYS = [
  { key: undefined as string | undefined, label: "All" },
  { key: "Saturday", label: "Sat" },
  { key: "Sunday", label: "Sun" },
  { key: "Friday", label: "Fri" },
  { key: "Wednesday", label: "Wed" },
  { key: "Tuesday", label: "Tue" },
] as const;

function MarketListCard({
  market,
  colors,
  onPress,
}: {
  market: Market;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Logo / initial */}
      <View style={[cardStyles.logo, { backgroundColor: "#dcfce7" }]}>
        {market.logoUrl ? null : (
          <Text style={[cardStyles.logoText, { color: "#166534" }]}>
            {market.name[0]?.toUpperCase() ?? "M"}
          </Text>
        )}
      </View>

      <View style={cardStyles.body}>
        <View style={cardStyles.nameRow}>
          <Text
            style={[cardStyles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {market.name}
          </Text>
          {market.verified && (
            <Feather name="check-circle" size={13} color="#16a34a" />
          )}
        </View>

        <Text style={[cardStyles.city, { color: colors.mutedForeground }]}>
          {market.city}, {market.region}
        </Text>

        {(market.day || market.time) && (
          <View style={cardStyles.scheduleRow}>
            <Feather name="calendar" size={11} color={colors.mutedForeground} />
            <Text style={[cardStyles.schedule, { color: colors.mutedForeground }]}>
              {[market.day, market.time].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}

        {market.address ? (
          <View style={cardStyles.scheduleRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[cardStyles.schedule, { color: colors.mutedForeground }]} numberOfLines={1}>
              {market.address}
            </Text>
          </View>
        ) : null}
      </View>

      <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
    </TouchableOpacity>
  );
}

const styles2 = StyleSheet.create({
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  registerBtnText: {
    color: "#fff",
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    fontWeight: "700",
  },
  body: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  name: {
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
    fontWeight: "600",
    flex: 1,
  },
  city: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  schedule: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    flex: 1,
  },
});

export default function MarketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const {
    data: markets,
    isLoading,
    isError,
    refetch,
  } = useListMarkets({
    search: search.trim() || undefined,
    day: dayFilter,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={[s.title, { color: colors.foreground }]}>Markets</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              Florida Farmers Market Directory
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/market-register")}
            style={[styles2.registerBtn, { backgroundColor: "#166534" }]}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={14} color="#fff" />
            <Text style={styles2.registerBtnText}>List yours</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[s.searchRow, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or city…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Day chips */}
        <FlatList
          horizontal
          data={DAYS}
          keyExtractor={(item) => item.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          renderItem={({ item }) => {
            const active = item.key === dayFilter;
            return (
              <TouchableOpacity
                onPress={() => setDayFilter(item.key)}
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
            Could not load markets
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: "#166534" }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={markets ?? []}
          keyExtractor={(item: Market) => String(item.id)}
          renderItem={({ item }: { item: Market }) => (
            <MarketListCard
              market={item}
              colors={colors}
              onPress={() =>
                item.slug
                  ? router.push(`/market/${item.slug}`)
                  : undefined
              }
            />
          )}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#166834" />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="map-pin" size={36} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>
                No markets found
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {search || dayFilter
                  ? "Try a different search or day filter"
                  : "Florida farmers market listings will appear here"}
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
  _bottomPad: number,
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
