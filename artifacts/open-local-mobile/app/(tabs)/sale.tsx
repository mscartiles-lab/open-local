import { useGetLocalNowFeed } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FeedProductCard } from "@/components/FeedProductCard";
import { useColors } from "@/hooks/useColors";

export default function SaleScreen() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useGetLocalNowFeed();

  const items = data?.surplus ?? [];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
          <Feather name="tag" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Sale</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Market-leftover discounts. Rescue before it's gone.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Feather name="package" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No surplus today
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            Check back after the next market — vendors post leftovers in the
            evening.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <FeedProductCard
              item={item}
              onPress={() => router.push(`/vendor/${item.vendorSlug}`)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: "DMSans_700Bold", fontSize: 22 },
  subtitle: { fontFamily: "DMSans_400Regular", fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingBottom: 120 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 8 },
  emptyBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
