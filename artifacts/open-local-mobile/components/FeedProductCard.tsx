import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

import { useColors } from "@/hooks/useColors";
import type { ProductWithVendor } from "@/lib/api-client";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const LISTING_LABELS: Record<string, string> = {
  batch_drop: "Just Dropped",
  surplus: "Surplus",
  pre_order: "Pre-Order",
  regular: "",
};

interface Props {
  item: ProductWithVendor;
  onPress: () => void;
}

export function FeedProductCard({ item, onPress }: Props) {
  const colors = useColors();
  const s = styles(colors);

  const label = LISTING_LABELS[item.listingType] ?? "";
  const hasDiscount =
    item.originalPriceCents != null && item.originalPriceCents > item.priceCents;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: item.imageUrl }}
        style={s.image}
        contentFit="cover"
        transition={200}
      />
      <View style={s.body}>
        {label ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{label}</Text>
          </View>
        ) : null}
        <Text style={s.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={s.vendor} numberOfLines={1}>
          {item.vendorName}
        </Text>
        <View style={s.priceRow}>
          <Text style={s.price}>{formatPrice(item.priceCents)}</Text>
          {hasDiscount && (
            <Text style={s.original}>
              {formatPrice(item.originalPriceCents!)}
            </Text>
          )}
          <Text style={s.unit}>/{item.unit}</Text>
        </View>
        {!item.inStock && (
          <Text style={s.outOfStock}>Out of stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      width: 180,
      backgroundColor: colors.card,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    image: {
      width: 180,
      height: 130,
      backgroundColor: colors.muted,
    },
    body: { padding: 10 },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
      marginBottom: 6,
    },
    badgeText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 10,
      color: colors.primaryForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    name: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 2,
      lineHeight: 18,
    },
    vendor: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 6,
    },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    price: {
      fontFamily: "DMSans_700Bold",
      fontSize: 15,
      color: colors.primary,
    },
    original: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      textDecorationLine: "line-through",
    },
    unit: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    outOfStock: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      color: colors.destructive,
      marginTop: 4,
    },
  });
