import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { latDeltaForMiles, milesToMeters } from "@/utils/distance";

export type MapPin = {
  key: string;
  latitude: number;
  longitude: number;
  color?: string;
  iconName?: keyof typeof Feather.glyphMap;
};

interface MiniMapProps {
  pins?: MapPin[];
  radiusMiles?: number;
  height?: number;
  emptyHint?: string;
  /** Drop the rounded corners + border so the map can fill the whole screen. */
  fullBleed?: boolean;
}

const FLORIDA_CENTER = { latitude: 27.9944024, longitude: -81.7602544 };

export function MiniMap({
  pins = [],
  radiusMiles = 25,
  height = 200,
  emptyHint,
  fullBleed = false,
}: MiniMapProps) {
  const colors = useColors();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (permission?.granted && !userLocation) {
      locateUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]);

  async function locateUser() {
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      // ignore
    } finally {
      setLocating(false);
    }
  }

  // Web: skip the heavy native MapView; show a compact "enable in app" card.
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webCard,
          { height, backgroundColor: colors.muted, borderColor: colors.border },
          fullBleed && styles.flush,
        ]}
      >
        <Feather name="map" size={28} color={colors.mutedForeground} />
        <Text style={[styles.webText, { color: colors.mutedForeground }]}>
          Map view available in the iOS/Android app
        </Text>
        {pins.length > 0 ? (
          <Text style={[styles.webHint, { color: colors.mutedForeground }]}>
            {pins.length} location{pins.length !== 1 ? "s" : ""} nearby
          </Text>
        ) : null}
      </View>
    );
  }

  // Lazy-require react-native-maps so web build never tries to bundle it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps") as typeof import("react-native-maps");
  const MapView = Maps.default;
  const { Circle, Marker } = Maps;

  if (!permission) {
    return (
      <View
        style={[
          styles.permCard,
          { height, backgroundColor: colors.muted, borderColor: colors.border },
          fullBleed && styles.flush,
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permCard,
          { height, backgroundColor: colors.muted, borderColor: colors.border },
          fullBleed && styles.flush,
        ]}
      >
        <Feather name="map-pin" size={22} color={colors.primary} />
        <Text style={[styles.permTitle, { color: colors.foreground }]}>
          See what's near you
        </Text>
        <TouchableOpacity
          style={[styles.permBtn, { backgroundColor: colors.primary }]}
          onPress={requestPermission}
        >
          <Text
            style={[styles.permBtnText, { color: colors.primaryForeground }]}
          >
            Enable location
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const center = userLocation ?? FLORIDA_CENTER;
  const delta = latDeltaForMiles(radiusMiles);

  return (
    <View
      style={[
        styles.mapWrap,
        { height, borderColor: colors.border },
        fullBleed && styles.flush,
      ]}
    >
      <MapView
        ref={mapRef as never}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          ...center,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={milesToMeters(radiusMiles)}
            strokeColor={colors.primary}
            strokeWidth={1.5}
            fillColor={`${colors.primary}18`}
          />
        )}
        {pins.map((pin) => (
          <Marker
            key={pin.key}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
          >
            <View
              style={[
                styles.pin,
                {
                  backgroundColor: pin.color ?? colors.primary,
                  borderColor: colors.card,
                },
              ]}
            >
              <Feather
                name={pin.iconName ?? "map-pin"}
                size={11}
                color="#fff"
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity
        style={[
          styles.recenterBtn,
          fullBleed && styles.recenterBtnFull,
          { backgroundColor: colors.card },
        ]}
        onPress={locateUser}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name="crosshair" size={15} color={colors.primary} />
        )}
      </TouchableOpacity>

      {pins.length === 0 && emptyHint ? (
        <View style={[styles.emptyChip, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyChipText, { color: colors.mutedForeground }]}>
            {emptyHint}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  flush: {
    borderRadius: 0,
    borderWidth: 0,
  },
  webCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  webText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  webHint: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  permCard: {
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  permTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
  permBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginTop: 4,
  },
  permBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 13,
  },
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  recenterBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  recenterBtnFull: {
    bottom: undefined,
    top: 150,
    right: 16,
  },
  emptyChip: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  emptyChipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
});
