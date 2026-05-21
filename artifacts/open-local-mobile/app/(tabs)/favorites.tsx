import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { useColors } from "@/hooks/useColors";
import { MiniMap, type MapPin } from "@/components/MiniMap";
import { VendorCard } from "@/components/VendorCard";
import type { Vendor } from "@workspace/api-client-react";

export const FAVORITES_KEY = "open_local_favorites";

export async function getFavoriteVendors(): Promise<Vendor[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Vendor[];
  } catch {
    return [];
  }
}

export async function toggleFavorite(vendor: Vendor): Promise<boolean> {
  const current = await getFavoriteVendors();
  const exists = current.some((v) => v.id === vendor.id);
  if (exists) {
    const updated = current.filter((v) => v.id !== vendor.id);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return false;
  } else {
    const updated = [vendor, ...current];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return true;
  }
}

export async function isFavorite(vendorId: number): Promise<boolean> {
  const current = await getFavoriteVendors();
  return current.some((v) => v.id === vendorId);
}

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Vendor[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  useFocusEffect(
    useCallback(() => {
      getFavoriteVendors().then(setFavorites);
    }, [])
  );

  const removeFavorite = async (vendor: Vendor) => {
    await toggleFavorite(vendor);
    setFavorites((prev) => prev.filter((v) => v.id !== vendor.id));
  };

  const pins: MapPin[] = favorites
    .filter((v) => v.latitude != null && v.longitude != null)
    .map((v) => ({
      key: `v-${v.id}`,
      latitude: v.latitude!,
      longitude: v.longitude!,
      iconName: "heart" as const,
      color: "#3c4a26",
    }));

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <VendorCard
            vendor={item}
            onPress={() => router.push(`/vendor/${item.slug}`)}
            rightAction={
              <TouchableOpacity
                onPress={() => removeFavorite(item)}
                style={s.removeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            }
          />
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={s.headerWrap}>
              <Text style={s.title}>Saved</Text>
              <Text style={s.subtitle}>
                {favorites.length > 0
                  ? `${favorites.length} vendor${favorites.length !== 1 ? "s" : ""}`
                  : "Your saved vendors appear here"}
              </Text>
            </View>
            <View style={s.mapWrap}>
              <MiniMap
                pins={pins}
                radiusMiles={50}
                height={180}
                emptyHint={
                  favorites.length > 0
                    ? "Your saved vendors aren't mapped yet"
                    : "Save vendors to see them here"
                }
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="heart" size={40} color={colors.mutedForeground} />
            <Text style={s.emptyTitle}>No saved vendors yet</Text>
            <Text style={s.emptySubtitle}>
              Tap the heart on any vendor page to save them here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerWrap: {
      paddingHorizontal: 4,
      marginBottom: 14,
    },
    title: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
      marginBottom: 2,
    },
    subtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    mapWrap: { marginBottom: 14 },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: topPad + 12,
      paddingBottom: bottomPad,
      gap: 10,
    },
    removeBtn: {
      padding: 6,
      borderRadius: 16,
      backgroundColor: colors.muted,
    },
    empty: { alignItems: "center", paddingTop: 100, gap: 10, paddingHorizontal: 40 },
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
      lineHeight: 20,
    },
  });
