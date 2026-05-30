import { useListEvents, useListVendors } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
  const screenH = Dimensions.get("window").height;
  const mapPeek = Math.round(screenH * 0.4);

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
      {/* Full-screen map background */}
      <View style={s.mapLayer}>
        <MiniMap
          pins={pins}
          radiusMiles={25}
          height={screenH}
          emptyHint="No locations mapped"
          fullBleed
        />
      </View>

      {/* Floating title over the map */}
      <View style={[s.floatHeader, { top: topPad + 8 }]}>
        <View style={s.brandPill}>
          <Text style={s.wordmark}>Events</Text>
          <Text style={s.tagline}>Markets & pop-ups near you</Text>
        </View>
      </View>

      {/* Floating, scrollable list panel above the map */}
      <FlatList
        data={isLoading || isError ? [] : (events ?? [])}
        keyExtractor={(item: EventItem) => String(item.id)}
        style={s.list}
        renderItem={({ item }: { item: EventItem }) => (
          <View style={s.itemWrap}>
            <EventCard event={item} colors={colors} />
          </View>
        )}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Transparent spacer keeps the map visible & tappable */}
            <View style={{ height: mapPeek, pointerEvents: "none" }} />
            <View style={s.panelHead}>
              <View style={s.grabber} />
              <Text style={s.panelTitle}>Upcoming events</Text>

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
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={s.emptyPanel}>
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
        ListFooterComponent={<View style={s.panelFooter} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            progressViewOffset={mapPeek}
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
    mapLayer: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" },
    list: { flex: 1, backgroundColor: "transparent" },
    listContent: {
      paddingBottom: bottomPad,
    },
    floatHeader: {
      position: "absolute",
      left: 16,
      right: 16,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      pointerEvents: "box-none",
    },
    brandPill: {
      flex: 1,
      alignSelf: "flex-start",
      backgroundColor: colors.background,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    panelHead: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 8,
      paddingHorizontal: 16,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
    },
    grabber: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    panelTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 17,
      color: colors.foreground,
      marginBottom: 12,
    },
    itemWrap: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingBottom: 10,
    },
    panelFooter: {
      backgroundColor: colors.background,
      minHeight: bottomPad + 40,
    },
    emptyPanel: {
      backgroundColor: colors.background,
      alignItems: "center",
      paddingTop: 28,
      paddingBottom: 60,
      gap: 8,
    },
    wordmark: {
      fontFamily: "DMSans_700Bold",
      fontSize: 22,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    inline: { paddingVertical: 24, alignItems: "center", gap: 10 },
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
