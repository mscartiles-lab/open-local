import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import type { Vendor } from "@workspace/api-client-react";

interface Props {
  vendor: Vendor;
  onPress: () => void;
  rightAction?: React.ReactNode;
}

export function VendorCard({ vendor, onPress, rightAction }: Props) {
  const colors = useColors();
  const s = styles(colors);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.avatarWrap}>
        <View style={s.avatar}>
          <Text style={s.avatarLetter}>
            {vendor.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={s.content}>
        <View style={s.topRow}>
          <Text style={s.name} numberOfLines={1}>
            {vendor.name}
          </Text>
          {vendor.featured && (
            <View style={s.featuredBadge}>
              <Text style={s.featuredText}>Featured</Text>
            </View>
          )}
        </View>
        <Text style={s.tagline} numberOfLines={1}>
          {vendor.tagline}
        </Text>
        <View style={s.meta}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
          <Text style={s.metaText}>{vendor.location}</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.metaText}>{vendor.category}</Text>
        </View>
      </View>
      {rightAction ? (
        <View style={s.rightAction}>{rightAction}</View>
      ) : (
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    avatarWrap: {},
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: {
      fontFamily: "DMSans_700Bold",
      fontSize: 20,
      color: colors.primary,
    },
    content: { flex: 1 },
    topRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    name: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
    },
    featuredBadge: {
      backgroundColor: colors.primary,
      borderRadius: 4,
      paddingVertical: 1,
      paddingHorizontal: 5,
    },
    featuredText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 9,
      color: colors.primaryForeground,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    meta: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    dot: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    rightAction: {},
  });
