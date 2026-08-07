/**
 * LocationPickerMap — drop a draggable pin to set exact lat/lng.
 * Uses react-native-maps (lazy-required so web bundles don't choke).
 * For geocoding it uses the free Nominatim API (no API key).
 */
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const FLORIDA_CENTER = { latitude: 27.9, longitude: -81.7 };
const DEFAULT_DELTA = 4.5;
const PINNED_DELTA = 0.006;

export interface PickedLocation {
  latitude: number;
  longitude: number;
}

interface Props {
  onChange: (loc: PickedLocation) => void;
  /** Hint address/city to geocode when "Find on map" is pressed */
  hint?: string;
  initial?: PickedLocation | null;
  height?: number;
}

async function geocodeHint(query: string): Promise<PickedLocation | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + " FL USA")}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.[0]) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export function LocationPickerMap({ onChange, hint, initial, height = 260 }: Props) {
  const colors = useColors();
  const [position, setPosition] = useState<PickedLocation | null>(initial ?? null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const mapRef = useRef<unknown>(null);

  type AnimateToRegion = (r: {
    latitude: number; longitude: number;
    latitudeDelta: number; longitudeDelta: number;
  }, ms: number) => void;

  const animateTo = (loc: PickedLocation, delta = PINNED_DELTA) => {
    (mapRef.current as { animateToRegion: AnimateToRegion } | null)?.animateToRegion(
      { ...loc, latitudeDelta: delta, longitudeDelta: delta }, 600,
    );
  };

  const handleLocate = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setPosition(next);
      onChange(next);
      animateTo(next);
    } catch {
      // silently ignore
    } finally {
      setLocating(false);
    }
  };

  const handleGeocode = async () => {
    if (!hint || hint.trim().length < 2) return;
    setGeocoding(true);
    const result = await geocodeHint(hint);
    if (result) {
      setPosition(result);
      onChange(result);
      animateTo(result);
    }
    setGeocoding(false);
  };

  // Web fallback
  if (Platform.OS === "web") {
    return (
      <View style={[styles.webCard, { backgroundColor: colors.muted, borderColor: colors.border, height }]}>
        <Feather name="map-pin" size={24} color={colors.mutedForeground} />
        <Text style={[styles.webText, { color: colors.mutedForeground }]}>
          Map pin available in the iOS/Android app
        </Text>
        {position && (
          <Text style={[styles.webCoords, { color: colors.primary }]}>
            {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
          </Text>
        )}
      </View>
    );
  }

  // Lazy-require react-native-maps so web bundle never imports it
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require("react-native-maps") as typeof import("react-native-maps");
  const MapView = Maps.default;
  const { Marker } = Maps;

  const center = position ?? FLORIDA_CENTER;
  const delta = position ? PINNED_DELTA : DEFAULT_DELTA;

  return (
    <View style={{ gap: 10 }}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.toolBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={handleLocate}
          disabled={locating}
          activeOpacity={0.75}
        >
          {locating
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Feather name="navigation" size={14} color={colors.primary} />}
          <Text style={[styles.toolBtnText, { color: colors.foreground }]}>
            {locating ? "Locating…" : "Use my location"}
          </Text>
        </TouchableOpacity>

        {hint && hint.trim().length > 0 && (
          <TouchableOpacity
            style={[styles.toolBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={handleGeocode}
            disabled={geocoding}
            activeOpacity={0.75}
          >
            {geocoding
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="search" size={14} color={colors.primary} />}
            <Text style={[styles.toolBtnText, { color: colors.foreground }]}>
              {geocoding ? "Finding…" : "Find on map"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Map */}
      <View style={[styles.mapWrap, { borderColor: colors.border, height }]}>
        <MapView
          ref={mapRef as never}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...center, latitudeDelta: delta, longitudeDelta: delta }}
          showsUserLocation={false}
          showsCompass={false}
          toolbarEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          onPress={(e: { nativeEvent: { coordinate: PickedLocation } }) => {
            const loc = e.nativeEvent.coordinate;
            setPosition(loc);
            onChange(loc);
          }}
        >
          {position && (
            <Marker
              coordinate={position}
              draggable
              onDragEnd={(e: { nativeEvent: { coordinate: PickedLocation } }) => {
                const loc = e.nativeEvent.coordinate;
                setPosition(loc);
                onChange(loc);
              }}
            />
          )}
        </MapView>

        {!position && (
          <View style={styles.hint} pointerEvents="none">
            <View style={[styles.hintBubble, { backgroundColor: colors.card }]}>
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                Tap map or press "Find on map" to drop a pin
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Coordinates display */}
      {position && (
        <Text style={[styles.coords, { color: colors.mutedForeground }]}>
          📍 {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}
        </Text>
      )}

      <Text style={[styles.help, { color: colors.mutedForeground }]}>
        Tap the map or drag the pin to set your exact location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolBtnText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  mapWrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  hint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 12,
  },
  hintBubble: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hintText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  coords: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
  help: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  // Web fallback
  webCard: {
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  webText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  webCoords: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
  },
});
