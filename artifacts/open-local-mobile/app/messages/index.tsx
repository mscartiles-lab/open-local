import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type ConvSummary = {
  id: number;
  shopperUserId: number;
  vendorId: number;
  updatedAt: string;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderUserId: number } | null;
  shopper: { id: number; username: string } | null;
  vendor: { id: number; name: string; imageUrl: string; slug: string } | null;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MessagesScreen() {
  const { user, sessionToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [convs, setConvs] = useState<ConvSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) { setLoading(false); return; }
    fetch(`${BASE}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((r) => r.json())
      .then((data) => { setConvs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [sessionToken]);

  const s = styles(colors, insets.top);

  if (!user) {
    return (
      <View style={[s.container, s.center]}>
        <Feather name="message-circle" size={40} color={colors.textSecondary} />
        <Text style={s.emptyTitle}>Sign in to view messages</Text>
      </View>
    );
  }

  const renderItem = ({ item: conv }: { item: ConvSummary }) => {
    const isShopper = user.id === conv.shopperUserId;
    const name = isShopper ? conv.vendor?.name ?? "Vendor" : `@${conv.shopper?.username ?? "user"}`;
    const img = isShopper ? conv.vendor?.imageUrl : null;
    const hasUnread = conv.unreadCount > 0;

    return (
      <TouchableOpacity
        style={s.row}
        onPress={() => router.push(`/messages/${conv.id}` as any)}
        activeOpacity={0.7}
      >
        <View style={s.avatar}>
          {img ? (
            <Image source={{ uri: img }} style={s.avatarImg} />
          ) : (
            <View style={[s.avatarImg, s.avatarFallback]}>
              <Feather name="shopping-bag" size={18} color={colors.primary} />
            </View>
          )}
          {hasUnread && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{conv.unreadCount > 9 ? "9+" : conv.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={s.rowContent}>
          <View style={s.rowTop}>
            <Text style={[s.rowName, hasUnread && s.rowNameBold]} numberOfLines={1}>{name}</Text>
            {conv.lastMessage && (
              <Text style={s.rowTime}>{timeAgo(conv.lastMessage.createdAt)}</Text>
            )}
          </View>
          {conv.lastMessage ? (
            <Text style={[s.rowPreview, hasUnread && s.rowPreviewBold]} numberOfLines={1}>
              {conv.lastMessage.senderUserId === user.id ? "You: " : ""}
              {conv.lastMessage.body}
            </Text>
          ) : (
            <Text style={s.rowPreviewEmpty}>No messages yet</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Messages</Text>
      </View>
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : convs.length === 0 ? (
        <View style={s.center}>
          <Feather name="message-circle" size={40} color={colors.textSecondary} />
          <Text style={s.emptyTitle}>No conversations yet</Text>
          <Text style={s.emptyBody}>Visit a vendor and tap "Message" to start one.</Text>
        </View>
      ) : (
        <FlatList
          data={convs}
          keyExtractor={(c) => String(c.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, topInset: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: topInset },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
    header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerTitle: { fontSize: 22, fontFamily: "DMSans_700Bold", color: colors.text },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, backgroundColor: colors.background },
    avatar: { position: "relative" },
    avatarImg: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
    avatarFallback: { backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
    badge: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    badgeText: { color: "#fff", fontSize: 10, fontFamily: "DMSans_700Bold" },
    rowContent: { flex: 1 },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
    rowName: { fontSize: 15, fontFamily: "DMSans_500Medium", color: colors.text, flex: 1 },
    rowNameBold: { fontFamily: "DMSans_700Bold" },
    rowTime: { fontSize: 12, color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
    rowPreview: { fontSize: 13, color: colors.textSecondary, fontFamily: "DMSans_400Regular" },
    rowPreviewBold: { color: colors.text, fontFamily: "DMSans_500Medium" },
    rowPreviewEmpty: { fontSize: 13, color: colors.textSecondary, fontStyle: "italic", fontFamily: "DMSans_400Regular" },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
    emptyTitle: { fontSize: 17, fontFamily: "DMSans_600SemiBold", color: colors.text, textAlign: "center" },
    emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: "center", fontFamily: "DMSans_400Regular" },
  });
