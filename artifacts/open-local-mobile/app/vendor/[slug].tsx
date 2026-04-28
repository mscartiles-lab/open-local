import { useGetVendorBySlug, useListVendorProducts } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { ProductListItem } from "@/components/ProductListItem";
import { isFavorite, toggleFavorite } from "@/app/(tabs)/favorites";

export default function VendorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const { data: vendor, isLoading: loadingVendor } = useGetVendorBySlug(slug ?? "");
  const { data: products, isLoading: loadingProducts } = useListVendorProducts(
    vendor?.id ?? 0,
    { query: { enabled: !!vendor?.id, queryKey: ["vendor-products", vendor?.id] } },
  );

  useEffect(() => {
    if (vendor) {
      isFavorite(vendor.id).then(setSaved);
    }
  }, [vendor?.id]);

  const handleSave = async () => {
    if (!vendor) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isNowSaved = await toggleFavorite(vendor);
    setSaved(isNowSaved);
  };

  const s = styles(colors, topPad, bottomPad);

  if (loadingVendor) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={[s.container, s.center]}>
        <Text style={s.errorText}>Vendor not found</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.primaryForeground} />
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inStockCount = (products ?? []).filter((p) => p.inStock).length;

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={handleSave}
          >
            <Feather
              name="heart"
              size={22}
              color={saved ? colors.destructive : colors.foreground}
            />
          </TouchableOpacity>
        </View>

        <View style={s.heroSection}>
          <View style={s.categoryBadge}>
            <Text style={s.categoryText}>{vendor.category}</Text>
          </View>
          <Text style={s.vendorName}>{vendor.name}</Text>
          <Text style={s.tagline}>{vendor.tagline}</Text>
          <View style={s.metaRow}>
            <Feather name="map-pin" size={13} color={colors.mutedForeground} />
            <Text style={s.metaText}>{vendor.location}</Text>
            {vendor.established > 0 && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.metaText}>Est. {vendor.established}</Text>
              </>
            )}
          </View>
        </View>

        {vendor.description ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.description}>{vendor.description}</Text>
          </View>
        ) : null}

        {vendor.marketsText ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Markets</Text>
            <Text style={s.description}>{vendor.marketsText}</Text>
          </View>
        ) : null}

        <View style={s.linksRow}>
          {vendor.websiteUrl ? (
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => Linking.openURL(vendor.websiteUrl!)}
            >
              <Feather name="globe" size={15} color={colors.primary} />
              <Text style={s.linkText}>Website</Text>
            </TouchableOpacity>
          ) : null}
          {vendor.instagramHandle ? (
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() =>
                Linking.openURL(`https://instagram.com/${vendor.instagramHandle}`)
              }
            >
              <Feather name="instagram" size={15} color={colors.primary} />
              <Text style={s.linkText}>Instagram</Text>
            </TouchableOpacity>
          ) : null}
          {vendor.phone ? (
            <TouchableOpacity
              style={s.linkBtn}
              onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
            >
              <Feather name="phone" size={15} color={colors.primary} />
              <Text style={s.linkText}>Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Products{" "}
            {inStockCount > 0 ? (
              <Text style={s.stockBadge}>{inStockCount} in stock</Text>
            ) : null}
          </Text>
          {loadingProducts ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 16 }}
            />
          ) : (products ?? []).length === 0 ? (
            <Text style={s.emptyProducts}>No products listed yet.</Text>
          ) : (
            <View style={s.productsList}>
              {(products ?? []).map((p) => (
                <ProductListItem key={p.id} product={p} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topPad: number, bottomPad: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: bottomPad },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    heroSection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
    categoryBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.muted,
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginBottom: 10,
    },
    categoryText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: colors.primary,
    },
    vendorName: {
      fontFamily: "DMSans_700Bold",
      fontSize: 28,
      color: colors.foreground,
      marginBottom: 6,
      lineHeight: 33,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 15,
      color: colors.mutedForeground,
      marginBottom: 10,
      lineHeight: 21,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    metaDot: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sectionTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 8,
    },
    stockBadge: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    description: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 21,
    },
    linksRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    linkText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: colors.primary,
    },
    productsList: { gap: 1 },
    emptyProducts: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
    },
    errorText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 16,
      color: colors.mutedForeground,
      marginBottom: 16,
    },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 20,
    },
    backBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.primaryForeground,
    },
  });
