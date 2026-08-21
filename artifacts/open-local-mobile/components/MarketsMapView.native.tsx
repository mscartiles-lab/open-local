import { Feather } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Market } from "@/lib/api-client";

const FLORIDA_CENTER = { latitude: 27.6, longitude: -82.5 };
const MARKET_COLOR = "#166534";

interface Props {
  markets: Market[];
  colors: ReturnType<typeof useColors>;
  onMarketPress: (market: Market) => void;
}

export function MarketsMapView({ markets, colors, onMarketPress }: Props) {
  const { t } = useTranslation();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps") as typeof import("react-native-maps");
  const MapView = Maps.default;
  const { Marker, Callout } = Maps;
  const mappedMarkets = markets.filter(
    (market) => market.latitude != null && market.longitude != null,
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...FLORIDA_CENTER, latitudeDelta: 4, longitudeDelta: 4 }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {mappedMarkets.map((market) => (
          <Marker
            key={market.id}
            coordinate={{ latitude: market.latitude!, longitude: market.longitude! }}
            onPress={() => onMarketPress(market)}
          >
            <View style={styles.pin}>
              <Feather name="map-pin" size={13} color="#fff" />
            </View>
            <Callout tooltip={false} onPress={() => onMarketPress(market)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName} numberOfLines={2}>
                  {market.name}
                </Text>
                <Text style={styles.calloutCity}>
                  {market.city}, {market.region}
                </Text>
                {market.day || market.time ? (
                  <Text style={styles.calloutSchedule}>
                    {[market.day, market.time].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
                {market.slug ? (
                  <Text style={[styles.calloutLink, { color: MARKET_COLOR }]}>
                    {t("markets.viewMarket")}
                  </Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.badge, { backgroundColor: `${colors.card}F0` }]}>
        <Text style={[styles.badgeText, { color: colors.foreground }]}>
          {mappedMarkets.length} market{mappedMarkets.length !== 1 ? "s" : ""} on map
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MARKET_COLOR,
    borderWidth: 2.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  callout: { minWidth: 160, maxWidth: 220, padding: 10, gap: 3 },
  calloutName: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    fontWeight: "600",
    color: "#111",
  },
  calloutCity: { fontSize: 11, fontFamily: "DMSans_400Regular", color: "#666" },
  calloutSchedule: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: "#555",
    marginTop: 1,
  },
  calloutLink: {
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    fontWeight: "600",
    marginTop: 4,
  },
  badge: {
    position: "absolute",
    bottom: 16,
    left: 16,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  badgeText: { fontSize: 12, fontFamily: "DMSans_500Medium", fontWeight: "500" },
});