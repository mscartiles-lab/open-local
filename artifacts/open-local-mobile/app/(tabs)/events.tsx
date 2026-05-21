import { useListEvents, useListVendors } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniMap, type MapPin } from "@/components/MiniMap";
import { useColors } from "@/hooks/useColors";
import type { EventItem } from "@workspace/api-client-react";

const EVENT_COLOR = "#1a4a6e";

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: events,
    isLoading,
    isError,
    refetch,
  } = useListEvents({ upcoming: true });

  // Vendors give the map some context even though events have no lat/lng yet.
  const { data: vendors } = useListVendors();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const pins: MapPin[] = useMemo(
    () =>
      (vendors ?? [])
        .filter((v) => v.latitude != null && v.longitude != null)
        .map((v) => ({
          key: `v-${v.id}`,
          latitude: v.latitude!,
          longitude: v.longitude!,
          iconName: "shopping-bag" as const,
          color: "#3c4a26",
        })),
    [vendors],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <FlatList
        data={isLoading || isError ? [] : (events ?? [])}
        keyExtractor={(item: EventItem) => String(item.id)}
        renderItem={({ item }: { item: EventItem }) => (
          <EventCard event={item} colors={colors} />
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={s.header}>
              <Text style={s.wordmark}>Events</Text>
              <Text style={s.tagline}>
                Markets, pop-ups, and gatherings near you
              </Text>
            </View>

            <View style={s.mapWrap}>
              <MiniMap
                pins={pins}
                radiusMiles={25}
                height={200}
                emptyHint="No locations mapped"
              />
            </View>

            {isLoading && (
              <View style={s.inline}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {isError && (
              <View style={s.inline}>
                <Text style={s.emptyTitle}>Could not load events</Text>
                <TouchableOpacity style={s.retryBtn} onPress={onRefresh}>
                  <Text style={s.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.empty}>
              <Feather
                name="calendar"
                size={36}
                color={colors.mutedForeground}
              />
              <Text style={s.emptyTitle}>No upcoming events</Text>
              <Text style={s.emptySubtitle}>
                Check back soon — organizers add new events all the time.
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

function EventCard({
  event,
  colors,
}: {
  event: EventItem;
  colors: ReturnType<typeof useColors>;
}) {
  const start = new Date(event.startsAt);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLabel = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const handlePress = () => {
    if (event.ticketUrl) {
      Linking.openURL(event.ticketUrl).catch(() => {});
    }
  };

  return (
    <TouchableOpacity
      style={[
        evStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={!event.ticketUrl}
    >
      <View style={[evStyles.dateBlock, { backgroundColor: `${EVENT_COLOR}18` }]}>
        <Text style={[evStyles.dateMonth, { color: EVENT_COLOR }]}>
          {start.toLocaleDateString(undefined, { month: "short" }).toUpperCase()}
        </Text>
        <Text style={[evStyles.dateDay, { color: EVENT_COLOR }]}>
          {start.getDate()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[evStyles.title, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {event.title}
        </Text>
        <Text
          style={[evStyles.meta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {dateLabel} · {timeLabel}
        </Text>
        <Text
          style={[evStyles.meta, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {event.venueName} · {event.city}
          {event.state ? `, ${event.state}` : ""}
        </Text>
        <View style={evStyles.badgeRow}>
          {event.isFree ? (
            <View
              style={[evStyles.badge, { backgroundColor: `${EVENT_COLOR}18` }]}
            >
              <Text style={[evStyles.badgeText, { color: EVENT_COLOR }]}>
                Free
              </Text>
            </View>
          ) : event.priceCents != null ? (
            <View
              style={[evStyles.badge, { backgroundColor: colors.muted }]}
            >
              <Text
                style={[
                  evStyles.badgeText,
                  { color: colors.mutedForeground },
                ]}
              >
                ${(event.priceCents / 100).toFixed(0)}
              </Text>
            </View>
          ) : null}
          {event.category ? (
            <View style={[evStyles.badge, { backgroundColor: colors.muted }]}>
              <Text
                style={[
                  evStyles.badgeText,
                  { color: colors.mutedForeground },
                ]}
              >
                {event.category}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const evStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  dateBlock: {
    width: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dateMonth: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dateDay: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
    lineHeight: 24,
  },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    marginBottom: 4,
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
});

const styles = (
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: {
      paddingTop: topPad + 12,
      paddingBottom: bottomPad,
      paddingHorizontal: 16,
      gap: 10,
    },
    header: { marginBottom: 14, paddingHorizontal: 4 },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    mapWrap: { marginBottom: 14 },
    inline: { paddingVertical: 24, alignItems: "center", gap: 10 },
    empty: { alignItems: "center", paddingTop: 40, gap: 8 },
    emptyTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 16,
      color: colors.foreground,
      textAlign: "center",
    },
    emptySubtitle: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      paddingHorizontal: 40,
    },
    retryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 20,
      backgroundColor: colors.primary,
      borderRadius: 18,
    },
    retryText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.primaryForeground,
    },
  });
