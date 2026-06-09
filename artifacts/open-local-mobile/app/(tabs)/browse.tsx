import { useListVendors } from "@/lib/api-client";
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
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { VendorCard } from "@/components/VendorCard";
import type { Vendor } from "@/lib/api-client";

export default function BrowseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: vendors, isLoading, isError, refetch } = useListVendors({
    search: search.trim() || undefined,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.headerWrap, { paddingTop: topPad + 12 }]}>
        <Text style={s.title}>Browse</Text>
        <View style={s.searchRow}>
          <Feather
            name="search"
            size={16}
            color={colors.mutedForeground}
            style={s.searchIcon}
          />
          <TextInput
            style={s.searchInput}
            placeholder="Search vendors…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Couldn't load vendors</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vendors ?? []}
          keyExtractor={(item: Vendor) => String(item.id)}
          renderItem={({ item }: { item: Vendor }) => (
            <VendorCard
              vendor={item}
              onPress={() => router.push(`/vendor/${item.slug}`)}
            />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(vendors && vendors.length > 0)}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="search" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>No vendors found</Text>
              <Text style={s.emptySubtitle}>Try a different search term</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    headerWrap: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
      marginBottom: 10,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 40,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
      flex: 1,
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
      color: colors.foreground,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: bottomPad,
      gap: 10,
    },
    empty: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 17,
      color: colors.foreground,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    retryBtn: {
      marginTop: 16,
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
