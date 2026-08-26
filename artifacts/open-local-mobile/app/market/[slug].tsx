import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
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

import { useGetMarket, useListVendors, getListVendorsQueryKey } from "@/lib/api-client";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

export default function MarketDetailScreen() {
  const { t } = useTranslation();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: market, isLoading, isError } = useGetMarket(slug ?? "");

  const vendorParams = market ? { marketName: market.name } : undefined;
  const { data: marketVendors, isLoading: vendorsLoading } = useListVendors(
    vendorParams,
    { query: { enabled: !!market, queryKey: getListVendorsQueryKey(vendorParams) } },
  );

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const s = styles(colors);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const openMaps = () => {
    if (market?.address) {
      openLink(`https://maps.google.com/?q=${encodeURIComponent(market.address)}`);
    } else if (market?.latitude && market?.longitude) {
      openLink(`https://maps.google.com/?q=${market.latitude},${market.longitude}`);
    }
  };

  if (isLoading) {
    return (
      <View style={[s.container, s.center]}>
        <Stack.Screen options={{ title: t("marketDetail.loadingTitle") }} />
        <ActivityIndicator color="#166534" />
      </View>
    );
  }

  if (isError || !market) {
    return (
      <View style={[s.container, s.center]}>
        <Stack.Screen options={{ title: t("marketDetail.notFoundTitle") }} />
        <Feather name="map-pin" size={40} color={colors.mutedForeground} />
        <Text style={[s.emptyTitle, { color: colors.foreground }]}>{t("marketDetail.notFound")}</Text>
        <TouchableOpacity onPress={() => router.back()} style={[s.retryBtn, { backgroundColor: "#166534" }]}>
          <Text style={s.retryText}>{t("marketDetail.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingBottom: bottomPad }]}>
      <Stack.Screen options={{ title: market.name, headerBackTitle: t("marketDetail.backLabel") }} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Banner */}
        {(market.featuredImageUrl || market.imageUrl) ? (
          <Image
            source={{ uri: market.featuredImageUrl ?? market.imageUrl ?? "" }}
            style={s.banner}
            contentFit="cover"
          />
        ) : (
          <View style={[s.banner, { backgroundColor: "#243316" }]}>
            <Feather name="map-pin" size={40} color="rgba(255,255,255,0.2)" />
          </View>
        )}

        <View style={s.content}>
          {/* Header */}
          <View style={s.headerRow}>
            <View style={[s.logoWrap, { backgroundColor: "#dcfce7" }]}>
              {market.logoUrl ? (
                <Image source={{ uri: market.logoUrl }} style={s.logo} contentFit="cover" />
              ) : (
                <Text style={[s.logoText, { color: "#166534" }]}>
                  {market.name[0]?.toUpperCase() ?? "M"}
                </Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[s.marketName, { color: colors.foreground }]} numberOfLines={2}>
                  {market.name}
                </Text>
                {market.verified && (
                  <Feather name="check-circle" size={16} color="#16a34a" />
                )}
              </View>
              <Text style={[s.cityText, { color: colors.mutedForeground }]}>
                {market.city}, {market.region}
              </Text>
            </View>
          </View>

          {/* Schedule */}
          {(market.day || market.time) && (
            <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={18} color="#166534" />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoLabel, { color: colors.foreground }]}>{market.day ?? t("marketDetail.marketDayFallback")}</Text>
                {market.time && (
                  <Text style={[s.infoValue, { color: colors.mutedForeground }]}>{market.time}</Text>
                )}
              </View>
            </View>
          )}

          {/* Address */}
          {market.address && (
            <TouchableOpacity
              style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={openMaps}
              activeOpacity={0.7}
            >
              <Feather name="map-pin" size={18} color="#166534" />
              <View style={{ flex: 1 }}>
                <Text style={[s.infoLabel, { color: colors.foreground }]}>{market.address}</Text>
                <Text style={[s.infoValue, { color: "#166534" }]}>{t("marketDetail.openInMaps")}</Text>
              </View>
              <Feather name="external-link" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}

          {/* Description */}
          {market.description && (
            <View>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>{t("marketDetail.aboutMarket")}</Text>
              <Text style={[s.description, { color: colors.mutedForeground }]}>
                {market.description}
              </Text>
            </View>
          )}

          {/* Tags */}
          {market.tags && market.tags.length > 0 && (
            <View>
              <Text style={[s.sectionTitle, { color: colors.foreground }]}>{t("marketDetail.tags")}</Text>
              <View style={s.tagRow}>
                {market.tags.map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Vendors at this market */}
          <View>
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>{t("marketDetail.vendorsAtMarket")}</Text>
            {vendorsLoading ? (
              <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: "center" }]}>
                <ActivityIndicator color="#166534" size="small" />
              </View>
            ) : marketVendors && marketVendors.length > 0 ? (
              <View style={{ gap: 8 }}>
                {marketVendors.map((vendor) => (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[s.vendorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/vendor/${vendor.slug}` as never)}
                    activeOpacity={0.7}
                  >
                    {vendor.imageUrl ? (
                      <Image source={{ uri: vendor.imageUrl }} style={s.vendorThumb} contentFit="cover" />
                    ) : (
                      <View style={[s.vendorThumb, { backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center" }]}>
                        <Feather name="shopping-bag" size={18} color="#166534" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[s.vendorName, { color: colors.foreground }]} numberOfLines={1}>{vendor.name}</Text>
                      <Text style={[s.vendorCategory, { color: colors.mutedForeground }]} numberOfLines={1}>{vendor.category}</Text>
                      {(vendor.tagline || vendor.description) ? (
                        <Text style={[s.vendorTagline, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {vendor.tagline || vendor.description}
                        </Text>
                      ) : null}
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[s.emptyVendors, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="shopping-bag" size={24} color={colors.mutedForeground} />
                <Text style={[s.emptyVendorText, { color: colors.mutedForeground }]}>{t("marketDetail.noVendorsLinked")}</Text>
              </View>
            )}
          </View>

          {/* Contact actions */}
          <View style={s.actionSection}>
            {market.contactEmail && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: "#166534" }]}
                onPress={() => openLink(`mailto:${market.contactEmail}?subject=Vendor application — ${market.name}`)}
              >
                <Feather name="mail" size={18} color="#fff" />
                <Text style={s.actionBtnText}>{t("marketDetail.applyAsVendor")}</Text>
              </TouchableOpacity>
            )}

            {market.websiteUrl && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => openLink(market.websiteUrl!)}
              >
                <Feather name="globe" size={18} color={colors.foreground} />
                <Text style={[s.actionBtnText, { color: colors.foreground }]}>{t("marketDetail.visitWebsite")}</Text>
              </TouchableOpacity>
            )}

            {market.instagramHandle && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => openLink(`https://instagram.com/${market.instagramHandle}`)}
              >
                <Feather name="instagram" size={18} color={colors.foreground} />
                <Text style={[s.actionBtnText, { color: colors.foreground }]}>@{market.instagramHandle}</Text>
              </TouchableOpacity>
            )}

            {market.facebookUrl && (
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => openLink(market.facebookUrl!)}
              >
                <Feather name="facebook" size={18} color={colors.foreground} />
                <Text style={[s.actionBtnText, { color: colors.foreground }]}>{t("marketDetail.facebook")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", gap: 12 },
    banner: { width: "100%", height: 200, alignItems: "center", justifyContent: "center" },
    content: { padding: 16, gap: 16 },
    headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    logoWrap: {
      width: 56, height: 56, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
    },
    logo: { width: 56, height: 56, borderRadius: 14 },
    logoText: { fontSize: 24, fontFamily: "DMSans_700Bold", fontWeight: "700" },
    marketName: { fontSize: 22, fontFamily: "DMSans_700Bold", fontWeight: "700", lineHeight: 28 },
    cityText: { fontSize: 13, fontFamily: "DMSans_400Regular", marginTop: 2 },
    infoCard: {
      borderRadius: 12, borderWidth: 1, padding: 14,
      flexDirection: "row", alignItems: "flex-start", gap: 12,
    },
    infoLabel: { fontSize: 14, fontFamily: "DMSans_600SemiBold", fontWeight: "600" },
    infoValue: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 2 },
    sectionTitle: { fontSize: 16, fontFamily: "DMSans_700Bold", fontWeight: "700", marginBottom: 6 },
    description: { fontSize: 14, fontFamily: "DMSans_400Regular", lineHeight: 22 },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tag: {
      paddingHorizontal: 10, paddingVertical: 4,
      backgroundColor: "#dcfce7", borderRadius: 20,
      borderWidth: 1, borderColor: "#bbf7d0",
    },
    tagText: { fontSize: 12, fontFamily: "DMSans_600SemiBold", color: "#166534" },
    actionSection: { gap: 10, marginTop: 4 },
    actionBtn: {
      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
      flexDirection: "row", alignItems: "center", gap: 10,
    },
    actionBtnText: { fontSize: 15, fontFamily: "DMSans_600SemiBold", fontWeight: "600", color: "#fff" },
    emptyTitle: { fontSize: 16, fontFamily: "DMSans_600SemiBold" },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
    retryText: { color: "#fff", fontFamily: "DMSans_600SemiBold", fontSize: 14 },
    vendorCard: {
      borderRadius: 12, borderWidth: 1, padding: 12,
      flexDirection: "row", alignItems: "center", gap: 12,
    },
    vendorThumb: { width: 44, height: 44, borderRadius: 10 },
    vendorName: { fontSize: 14, fontFamily: "DMSans_600SemiBold", fontWeight: "600" },
    vendorCategory: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 },
    vendorTagline: { fontSize: 12, fontFamily: "DMSans_400Regular", marginTop: 1 },
    emptyVendors: {
      borderRadius: 12, borderWidth: 1, borderStyle: "dashed",
      padding: 20, alignItems: "center", gap: 8,
    },
    emptyVendorText: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  });
