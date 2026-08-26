import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type Msg = {
  id: number;
  conversationId: number;
  senderUserId: number;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type ConvDetail = {
  conversation: { id: number; shopperUserId: number; vendorId: number };
  shopper: { id: number; username: string } | null;
  vendor: { id: number; name: string; imageUrl: string; slug: string } | null;
  messages: Msg[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ConversationScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, sessionToken } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!sessionToken || !id) return;
    fetch(`${BASE}/api/messages/conversations/${id}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
        // Mark as read
        fetch(`${BASE}/api/messages/conversations/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
      })
      .catch(() => setLoading(false));
  }, [id, sessionToken]);

  useEffect(() => {
    if (detail?.messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [detail?.messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || !sessionToken || !id) return;
    setSending(true);
    const res = await fetch(`${BASE}/api/messages/conversations/${id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      const msg: Msg = await res.json();
      setDetail((prev) =>
        prev ? { ...prev, messages: [...prev.messages, msg] } : prev,
      );
      setDraft("");
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
    setSending(false);
  };

  const s = styles(colors, insets);
  const isShopper = user && detail ? user.id === detail.conversation.shopperUserId : false;
  const otherName = detail
    ? isShopper
      ? detail.vendor?.name ?? t("common.vendorFallback")
      : `@${detail.shopper?.username ?? t("common.userFallback")}`
    : "";
  const otherImg = detail && isShopper ? detail.vendor?.imageUrl : null;

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.bottom + 60}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        {otherImg ? (
          <Image source={{ uri: otherImg }} style={s.headerImg} />
        ) : (
          <View style={[s.headerImg, s.headerImgFallback]}>
            <Feather name="shopping-bag" size={16} color={colors.primary} />
          </View>
        )}
        <Text style={s.headerTitle} numberOfLines={1}>{otherName}</Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={detail?.messages ?? []}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={s.messageList}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Feather name="message-circle" size={32} color={colors.mutedForeground} />
              <Text style={s.emptyText}>{t("messages.sayHello")}</Text>
            </View>
          }
          renderItem={({ item: msg }) => {
            const mine = user ? msg.senderUserId === user.id : false;
            return (
              <View style={[s.bubbleRow, mine ? s.bubbleRowMine : s.bubbleRowOther]}>
                <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleOther]}>
                  <Text style={[s.bubbleText, mine ? s.bubbleTextMine : s.bubbleTextOther]}>
                    {msg.body}
                  </Text>
                </View>
                <Text style={[s.time, mine ? s.timeMine : s.timeOther]}>{timeAgo(msg.createdAt)}</Text>
              </View>
            );
          }}
        />
      )}

      {/* Compose */}
      <View style={s.compose}>
        <TextInput
          style={s.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t("messages.messagePlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!draft.trim() || sending) && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!draft.trim() || sending}
        >
          <Feather name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: insets.top },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    backBtn: { padding: 4 },
    headerImg: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
    headerImgFallback: { backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
    headerTitle: { flex: 1, fontSize: 16, fontFamily: "DMSans_600SemiBold", color: colors.text },
    messageList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    emptyWrap: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, fontFamily: "DMSans_400Regular" },
    bubbleRow: { marginVertical: 3 },
    bubbleRowMine: { alignItems: "flex-end" },
    bubbleRowOther: { alignItems: "flex-start" },
    bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, lineHeight: 21, fontFamily: "DMSans_400Regular" },
    bubbleTextMine: { color: "#fff" },
    bubbleTextOther: { color: colors.text },
    time: { fontSize: 11, marginTop: 2, fontFamily: "DMSans_400Regular", color: colors.mutedForeground },
    timeMine: { textAlign: "right", marginRight: 2 },
    timeOther: { marginLeft: 2 },
    compose: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: "DMSans_400Regular",
      color: colors.text,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
