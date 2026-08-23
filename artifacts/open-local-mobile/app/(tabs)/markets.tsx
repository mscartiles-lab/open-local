import { useListMarkets } from "@/lib/api-client";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useRef } from "react";
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
import { ApiErrorDetails } from "@/components/ApiErrorDetails";
import type { Market } from "@/lib/api-client";
import { MarketsMapView } from "@/components/MarketsMapView";

// DAYS built inside component so labels re-translate on language change

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
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const DAYS = [
    { key: undefined as string | undefined, label: t("markets.filterAll") },
    { key: "Saturday", label: t("markets.filterSat") },
    { key: "Sunday", label: t("markets.filterSun") },
    { key: "Friday", label: t("markets.filterFri") },
    { key: "Wednesday", label: t("markets.filterWed") },
    { key: "Tuesday", label: t("markets.filterTue") },
  ];
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState<string | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const {
    data: markets,
    isLoading,
    isError,
    refetch,
    error: marketsQueryError,
  } = useListMarkets({
    search: search.trim() || undefined,
    day: dayFilter,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateToMarket = (market: Market) => {
    if (market.slug) {
      router.push(`/market/${market.slug}`);
    }
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.foreground }]}>{t("markets.title")}</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
              {t("markets.subtitle")}
            </Text>
          </View>

          {/* Register button + List/Map toggle */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={() => router.push("/market-register")}
              style={[styles2.registerBtn, { backgroundColor: "#166534" }]}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles2.registerBtnText}>{t("markets.listYours")}</Text>
            </TouchableOpacity>

            <View style={[s.toggle, { borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setViewMode("list")}
                style={[
                  s.toggleBtn,
                  viewMode === "list"
                    ? { backgroundColor: MARKET_COLOR }
                    : { backgroundColor: colors.card },
                ]}
              >
                <Feather
                  name="list"
                  size={15}
                  color={viewMode === "list" ? "#fff" : colors.mutedForeground}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("map")}
                style={[
                  s.toggleBtn,
                  { borderLeftWidth: 1, borderLeftColor: colors.border },
                  viewMode === "map"
                    ? { backgroundColor: MARKET_COLOR }
                    : { backgroundColor: colors.card },
                ]}
              >
                <Feather
                  name="map"
                  size={15}
                  color={viewMode === "map" ? "#fff" : colors.mutedForeground}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={[s.searchRow, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder={t("markets.searchPlaceholder")}
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
          <ApiErrorDetails
            errors={[{ label: "Markets", error: marketsQueryError }]}
          />
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: "#166634" }]}
            onPress={() => refetch()}
          >
            <Text style={s.retryText}>{t("common.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === "map" ? (
        /* ── Map mode ── */
        <View style={{ flex: 1 }}>
          <MarketsMapView
            markets={markets ?? []}
            colors={colors}
            onMarketPress={navigateToMarket}
          />
        </View>
      ) : (
        /* ── List mode ── */
        <FlatList
          data={markets ?? []}
          keyExtractor={(item: Market) => String(item.id)}
          renderItem={({ item }: { item: Market }) => (
            <MarketListCard
              market={item}
              colors={colors}
              onPress={() => navigateToMarket(item)}
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
                {t("markets.noMarketsFound")}
              </Text>
              <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
                {search || dayFilter
                  ? t("markets.tryDifferentFilter")
                  : t("markets.listingsWillAppear")}
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
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 10,
      gap: 10,
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
    },
    toggle: {
      flexDirection: "row",
      borderWidth: 1,
      borderRadius: 8,
      overflow: "hidden",
      alignSelf: "flex-start",
      marginTop: 4,
    },
    toggleBtn: {
      width: 36,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
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

const MARKET_COLOR = "#166534";

type ViewMode = "list" | "map";
