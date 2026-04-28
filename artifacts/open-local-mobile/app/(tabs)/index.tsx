import { useGetLocalNowFeed } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { FeedProductCard } from "@/components/FeedProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import type { ProductWithVendor } from "@workspace/api-client-react";

type FeedSection = "batch_drop" | "surplus" | "pre_order";

const SECTION_CONFIG: Record<
  FeedSection,
  { label: string; accentHex: string }
> = {
  batch_drop: { label: "Just Dropped", accentHex: "#3c4a26" },
  surplus: { label: "Surplus Rescue", accentHex: "#7a5c00" },
  pre_order: { label: "Pre-Orders", accentHex: "#1a4a6e" },
};

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: feed, isLoading, isError, refetch } = useGetLocalNowFeed();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const sections: { key: FeedSection; items: ProductWithVendor[] }[] = (
    [
      { key: "batch_drop" as const, items: feed?.batchDrops ?? [] },
      { key: "surplus" as const, items: feed?.surplus ?? [] },
      { key: "pre_order" as const, items: feed?.preOrders ?? [] },
    ] as { key: FeedSection; items: ProductWithVendor[] }[]
  ).filter((s) => s.items.length > 0);

  const s = styles(colors, topPad, bottomPad);

  if (isLoading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.emptyIcon}>⚠️</Text>
        <Text style={s.emptyTitle}>Could not load feed</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const allEmpty = sections.length === 0;

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={s.header}>
          <Text style={s.wordmark}>open local</Text>
          <Text style={s.tagline}>Local Near Me Now</Text>
        </View>

        {allEmpty ? (
          <View style={s.emptyContainer}>
            <Text style={s.emptyIconLg}>🌱</Text>
            <Text style={s.emptyTitle}>Nothing live right now</Text>
            <Text style={s.emptySubtitle}>
              Check back soon — vendors drop fresh batches throughout the day.
            </Text>
          </View>
        ) : (
          sections.map((section) => {
            const cfg = SECTION_CONFIG[section.key];
            return (
              <View key={section.key} style={s.sectionWrap}>
                <SectionHeader
                  label={cfg.label}
                  accent={cfg.accentHex}
                />
                <FlatList
                  data={section.items}
                  keyExtractor={(item) => String(item.id)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.hList}
                  renderItem={({ item }) => (
                    <FeedProductCard
                      item={item}
                      onPress={() =>
                        router.push(`/vendor/${item.vendorSlug}`)
                      }
                    />
                  )}
                  scrollEnabled={section.items.length > 1}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    scrollContent: {
      paddingTop: topPad + 16,
      paddingBottom: bottomPad,
    },
    header: { paddingHorizontal: 20, marginBottom: 24 },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    sectionWrap: { marginBottom: 28 },
    hList: { paddingHorizontal: 20, gap: 12 },
    emptyContainer: {
      alignItems: "center",
      paddingHorizontal: 40,
      paddingTop: 80,
    },
    emptyIconLg: { fontSize: 48, marginBottom: 16 },
    emptyIcon: { fontSize: 36, marginBottom: 12 },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 17,
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 8,
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
    },
    retryBtn: {
      marginTop: 20,
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
