import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { useColors } from "@/hooks/useColors";
import type { Product } from "@/lib/api-client";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Props {
  product: Product;
}

export function ProductListItem({ product }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <View style={s.row}>
      <Image
        source={{ uri: product.imageUrl }}
        style={s.image}
        contentFit="cover"
        transition={150}
      />
      <View style={s.content}>
        <Text style={s.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={s.category} numberOfLines={1}>
          {product.category}
        </Text>
        <View style={s.priceRow}>
          <Text style={s.price}>
            {formatPrice(product.priceCents)}/{product.unit}
          </Text>
          {!product.inStock && (
            <Text style={s.outOfStock}>· Out of stock</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    image: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: colors.muted,
    },
    content: { flex: 1 },
    name: {
      fontFamily: "DMSans_500Medium",
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 2,
    },
    category: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    priceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    price: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      color: colors.primary,
    },
    outOfStock: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.destructive,
    },
  });
