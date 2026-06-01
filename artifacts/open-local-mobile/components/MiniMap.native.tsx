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
import {
  haversineDistanceMiles,
  latDeltaForMiles,
  milesToMeters,
} from "@/utils/distance";

export type MapPin = {
  key: string;
  latitude: number;
  longitude: number;
  color?: string;
  iconName?: keyof typeof Feather.glyphMap;
  label?: string;
  sublabel?: string;
  shape?: "circle" | "square";
};

interface MiniMapProps {
  pins?: MapPin[];
  radiusMiles?: number;
  height?: number;
  emptyHint?: string;
  fullBleed?: boolean;
  showControls?: boolean;
  onPinPress?: (key: string) => void;
  onUserLocationChange?: (loc: { latitude: number; longitude: number } | null) => void;
  onRadiusChange?: (miles: number) => void;
}

const FLORIDA_CENTER = { latitude: 27.9944024, longitude: -81.7602544 };
const QUICK_PICKS = [5, 10, 25, 50] as const;

function deltaForRadius(miles: number) {
  return latDeltaForMiles(miles);
}

export function MiniMap({
  pins = [],
  radiusMiles: initialRadius = 25,
  height = 200,
  emptyHint,
  fullBleed = false,
  showControls = false,
  onPinPress,
  onUserLocationChange,
  onRadiusChange,
}: MiniMapProps) {
  const colors = useColors();
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState(initialRadius);
  const [autoLocated, setAutoLocated] = useState(false);
  const mapRef = useRef<unknown>(null);

  // Auto-request permission and locate on mount once permission state is known
  useEffect(() => {
    if (autoLocated || !permission) return;
    if (permission.granted) {
      setAutoLocated(true);
      locateUser();
    } else if (permission.canAskAgain) {
      setAutoLocated(true);
      requestPermission().then((result) => {
        if (result.granted) locateUser();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.status, permission?.granted]);

  // Animate map to user location when it becomes available
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    const delta = deltaForRadius(radius);
    (
      mapRef.current as {
        animateToRegion: (
          r: {
            latitude: number;
            longitude: number;
            latitudeDelta: number;
            longitudeDelta: number;
          },
          duration: number,
        ) => void;
      }
    ).animateToRegion(
      { ...userLocation, latitudeDelta: delta, longitudeDelta: delta },
      1200,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  async function locateUser() {
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(next);
      onUserLocationChange?.(next);
    } catch {
      // ignore — user stays on Florida center
    } finally {
      setLocating(false);
    }
  }

  // Web fallback — Metro replaces this file with MiniMap.web.tsx on web builds,
  // but the Platform guard stays so unit tests don't blow up.
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.webCard,
          {
            height,
            backgroundColor: colors.muted,
            borderColor: colors.border,
          },
          fullBleed && styles.flush,
        ]}
      >
        <Feather name="map" size={28} color={colors.mutedForeground} />
        <Text style={[styles.webText, { color: colors.mutedForeground }]}>
          Map view available in the iOS/Android app
        </Text>
        {pins.length > 0 && (
          <Text style={[styles.webHint, { color: colors.mutedForeground }]}>
            {pins.length} location{pins.length !== 1 ? "s" : ""} nearby
          </Text>
        )}
      </View>
    );
  }

  // Lazy-require so the web bundle never tries to import react-native-maps.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps") as typeof import("react-native-maps");
  const MapView = Maps.default;
  const { Circle, Marker, Callout } = Maps;

  const locationGranted = permission?.granted === true;
  const center = userLocation ?? FLORIDA_CENTER;
  const delta = deltaForRadius(radius);

  // When the user's location is known, only show pins within the chosen radius.
  const visiblePins = userLocation
    ? pins.filter(
        (p) =>
          haversineDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            p.latitude,
            p.longitude,
          ) <= radius,
      )
    : pins;

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
        showsUserLocation={locationGranted}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        zoomEnabled
        scrollEnabled
      >
        {/* Radius circle around user */}
        {locationGranted && userLocation && (
          <Circle
            center={userLocation}
            radius={milesToMeters(radius)}
            strokeColor={colors.primary}
            strokeWidth={1.5}
            fillColor={`${colors.primary}18`}
          />
        )}

        {visiblePins.map((pin) => {
          const distMi = userLocation
            ? haversineDistanceMiles(
                userLocation.latitude,
                userLocation.longitude,
                pin.latitude,
                pin.longitude,
              ).toFixed(1)
            : null;

          return (
            <Marker
              key={pin.key}
              coordinate={{
                latitude: pin.latitude,
                longitude: pin.longitude,
              }}
            >
              {/* Custom pin shape */}
              <View
                style={[
                  styles.pin,
                  pin.shape === "square" && styles.pinSquare,
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

              {/* Callout bubble on tap */}
              {pin.label ? (
                <Callout
                  tooltip={false}
                  onPress={() => onPinPress?.(pin.key)}
                >
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{pin.label}</Text>
                    {pin.sublabel ? (
                      <Text style={styles.calloutSub}>{pin.sublabel}</Text>
                    ) : null}
                    {distMi ? (
                      <Text
                        style={[
                          styles.calloutDist,
                          { color: pin.color ?? colors.primary },
                        ]}
                      >
                        {distMi} mi away
                      </Text>
                    ) : null}
                    {onPinPress ? (
                      <Text
                        style={[
                          styles.calloutLink,
                          { color: pin.color ?? colors.primary },
                        ]}
                      >
                        Tap to view →
                      </Text>
                    ) : null}
                  </View>
                </Callout>
              ) : null}
            </Marker>
          );
        })}
      </MapView>

      {/* Legend — top-right */}
      {showControls && (
        <View
          style={[styles.legend, { backgroundColor: `${colors.card}F2` }]}
        >
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: "#e8520a" }]} />
            <Text style={[styles.legendLabel, { color: colors.foreground }]}>
              Vendors
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                styles.legendDotSquare,
                { backgroundColor: "#c0622f" },
              ]}
            />
            <Text style={[styles.legendLabel, { color: colors.foreground }]}>
              Businesses
            </Text>
          </View>
        </View>
      )}

      {/* Bottom-left: count badge + radius picker */}
      {showControls && (
        <View style={styles.bottomLeft}>
          <View
            style={[styles.countBadge, { backgroundColor: `${colors.card}F2` }]}
          >
            <View style={styles.countRow}>
              <View
                style={[styles.countDot, { backgroundColor: "#e8520a" }]}
              />
              <View
                style={[
                  styles.countDot,
                  styles.countDotSquare,
                  { backgroundColor: "#c0622f" },
                ]}
              />
            </View>
            <Text style={[styles.countText, { color: colors.foreground }]}>
              {userLocation
                ? `${visiblePins.length} place${visiblePins.length !== 1 ? "s" : ""} within ${radius} mi`
                : `${pins.length} place${pins.length !== 1 ? "s" : ""} on the map`}
            </Text>
          </View>

          <View
            style={[
              styles.radiusPicker,
              { backgroundColor: `${colors.card}F2` },
            ]}
          >
            <View style={styles.radiusHeader}>
              <Text
                style={[styles.radiusLabel, { color: colors.mutedForeground }]}
              >
                Radius
              </Text>
              <Text style={[styles.radiusValue, { color: colors.primary }]}>
                {radius} mi
              </Text>
            </View>
            <View style={styles.radiusBtns}>
              {QUICK_PICKS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radiusBtn,
                    r === radius
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.muted },
                  ]}
                  onPress={() => { setRadius(r); onRadiusChange?.(r); }}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.radiusBtnText,
                      {
                        color:
                          r === radius ? "#fff" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Locate-me / recenter — bottom-right */}
      <TouchableOpacity
        style={[
          styles.recenterBtn,
          fullBleed && styles.recenterBtnFull,
          { backgroundColor: colors.card },
        ]}
        onPress={locationGranted ? locateUser : requestPermission}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather
            name={locationGranted ? "crosshair" : "map-pin"}
            size={15}
            color={colors.primary}
          />
        )}
      </TouchableOpacity>

      {/* "Enable location" pill — shown while permission is not granted */}
      {!locationGranted && (
        <TouchableOpacity
          style={[styles.locationPill, { backgroundColor: colors.card }]}
          onPress={requestPermission}
        >
          <Feather name="map-pin" size={12} color={colors.primary} />
          <Text
            style={[styles.locationPillText, { color: colors.foreground }]}
          >
            Enable location
          </Text>
        </TouchableOpacity>
      )}

      {/* Empty-state hint chip */}
      {pins.length === 0 && emptyHint ? (
        <View style={[styles.emptyChip, { backgroundColor: colors.card }]}>
          <Text
            style={[styles.emptyChipText, { color: colors.mutedForeground }]}
          >
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
  // Pin markers
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pinSquare: {
    borderRadius: 5,
  },
  // Callout bubble
  callout: {
    width: 160,
    padding: 10,
    gap: 2,
  },
  calloutTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#1a1a1a",
    marginBottom: 1,
  },
  calloutSub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: "#666",
  },
  calloutDist: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    marginTop: 3,
  },
  calloutLink: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    marginTop: 4,
  },
  // Legend
  legend: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotSquare: {
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
  },
  // Bottom-left controls
  bottomLeft: {
    position: "absolute",
    bottom: 10,
    left: 10,
    gap: 6,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  countRow: {
    flexDirection: "row",
    gap: 3,
  },
  countDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  countDotSquare: {
    borderRadius: 2,
  },
  countText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
  },
  radiusPicker: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  radiusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  radiusLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  radiusValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  radiusBtns: {
    flexDirection: "row",
    gap: 4,
  },
  radiusBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
  // Recenter button
  recenterBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  // "Enable location" pill
  locationPill: {
    position: "absolute",
    bottom: 54,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  locationPillText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  // Empty-state chip
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
