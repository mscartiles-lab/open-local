import Slider from "@react-native-community/slider";
import { useListVendors, useListEstablishments } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  haversineDistanceMiles,
  latDeltaForMiles,
  milesToMeters,
} from "@/utils/distance";
import type { Vendor, Establishment } from "@workspace/api-client-react";

const MIN_MILES = 1;
const MAX_MILES = 100;
const DEFAULT_MILES = 25;

const QUICK_PICKS = [5, 10, 25, 50] as const;

const FLORIDA_CENTER = { latitude: 27.9944024, longitude: -81.7602544 };

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState(DEFAULT_MILES);
  const [sliderValue, setSliderValue] = useState(DEFAULT_MILES);
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [selectedEstablishment, setSelectedEstablishment] = useState<Establishment | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 60;

  const { data: vendors } = useListVendors();
  const { data: establishments } = useListEstablishments();

  const mappableVendors = (vendors ?? []).filter(
    (v) => v.latitude != null && v.longitude != null,
  );

  const nearbyVendors = userLocation
    ? mappableVendors.filter(
        (v) =>
          haversineDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            v.latitude!,
            v.longitude!,
          ) <= radius,
      )
    : mappableVendors;

  const mappableEstablishments = (establishments ?? []).filter(
    (e) => e.latitude != null && e.longitude != null,
  );

  const nearbyEstablishments = userLocation
    ? mappableEstablishments.filter(
        (e) =>
          haversineDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            e.latitude!,
            e.longitude!,
          ) <= radius,
      )
    : mappableEstablishments;

  useEffect(() => {
    if (permission?.granted) {
      locateUser();
    }
  }, [permission?.granted]);

  const locateUser = async () => {
    setLocating(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setUserLocation(coords);
      mapRef.current?.animateToRegion(regionFor(coords, radius), 800);
    } catch {
    } finally {
      setLocating(false);
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result.granted) locateUser();
  };

  const regionFor = (
    center: { latitude: number; longitude: number },
    r: number,
  ): Region => {
    const delta = latDeltaForMiles(r);
    return { ...center, latitudeDelta: delta, longitudeDelta: delta };
  };

  const applyRadius = (r: number) => {
    const snapped = Math.round(r);
    setRadius(snapped);
    setSliderValue(snapped);
    setSelected(null);
    if (userLocation) {
      mapRef.current?.animateToRegion(regionFor(userLocation, snapped), 500);
    }
  };

  const handleSliderChange = (v: number) => {
    setSliderValue(Math.round(v));
  };

  const handleSliderComplete = (v: number) => {
    Haptics.selectionAsync();
    applyRadius(v);
  };

  const handleQuickPick = (r: number) => {
    Haptics.selectionAsync();
    applyRadius(r);
  };

  const handleMarkerPress = (vendor: Vendor) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(vendor);
    setSelectedEstablishment(null);
  };

  const handleEstablishmentPress = (est: Establishment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEstablishment(est);
    setSelected(null);
  };

  const s = styles(colors, topPad, bottomPad);

  if (Platform.OS === "web") {
    return (
      <WebFallback
        vendors={nearbyVendors}
        userLocation={userLocation}
        radius={radius}
        sliderValue={sliderValue}
        onSliderChange={setSliderValue}
        onSliderComplete={applyRadius}
        onQuickPick={applyRadius}
        colors={colors}
        topPad={topPad}
        bottomPad={bottomPad}
      />
    );
  }

  if (!permission) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[s.container, s.center, { paddingHorizontal: 32 }]}>
        <View style={s.permissionIcon}>
          <Feather name="map-pin" size={32} color={colors.primary} />
        </View>
        <Text style={s.permissionTitle}>Find Vendors Near You</Text>
        <Text style={s.permissionBody}>
          Open Local needs your location to show vendors within your area on the
          map.
        </Text>
        <TouchableOpacity
          style={s.permissionBtn}
          onPress={handleRequestPermission}
        >
          <Feather name="crosshair" size={16} color={colors.primaryForeground} />
          <Text style={s.permissionBtnText}>Enable Location</Text>
        </TouchableOpacity>
        {!permission.canAskAgain && (
          <Text style={s.settingsHint}>
            Location was denied. Enable it in Settings to continue.
          </Text>
        )}
      </View>
    );
  }

  const mapCenter = userLocation ?? FLORIDA_CENTER;

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regionFor(mapCenter, radius)}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelected(null)}
      >
        {userLocation && (
          <Circle
            center={userLocation}
            radius={milesToMeters(radius)}
            strokeColor={colors.primary}
            strokeWidth={1.5}
            fillColor={`${colors.primary}18`}
          />
        )}
        {nearbyVendors.map((vendor) => (
          <Marker
            key={`v-${vendor.id}`}
            coordinate={{
              latitude: vendor.latitude!,
              longitude: vendor.longitude!,
            }}
            onPress={() => handleMarkerPress(vendor)}
          >
            <View
              style={[s.pin, selected?.id === vendor.id && s.pinSelected]}
            >
              <Feather
                name="shopping-bag"
                size={12}
                color={
                  selected?.id === vendor.id
                    ? colors.primaryForeground
                    : colors.primary
                }
              />
            </View>
          </Marker>
        ))}

        {nearbyEstablishments.map((est) => (
          <Marker
            key={`e-${est.id}`}
            coordinate={{
              latitude: est.latitude!,
              longitude: est.longitude!,
            }}
            onPress={() => handleEstablishmentPress(est)}
          >
            <View
              style={[
                s.estPin,
                selectedEstablishment?.id === est.id && s.estPinSelected,
              ]}
            >
              <Feather
                name="home"
                size={12}
                color="#fff"
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <View style={s.controlCard}>
          <View style={s.radiusLabelRow}>
            <Text style={s.radiusLabel}>Search radius</Text>
            <Text style={s.radiusValue}>{sliderValue} mi</Text>
          </View>

          <Slider
            style={s.slider}
            minimumValue={MIN_MILES}
            maximumValue={MAX_MILES}
            step={1}
            value={sliderValue}
            onValueChange={handleSliderChange}
            onSlidingComplete={handleSliderComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />

          <View style={s.quickRow}>
            {QUICK_PICKS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.quickChip, radius === r && s.quickChipActive]}
                onPress={() => handleQuickPick(r)}
              >
                <Text
                  style={[
                    s.quickChipText,
                    radius === r && s.quickChipTextActive,
                  ]}
                >
                  {r} mi
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.locateBtn}
              onPress={locateUser}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="crosshair" size={17} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.countBadge}>
          <Text style={s.countText}>
            {nearbyVendors.length + nearbyEstablishments.length} place
            {nearbyVendors.length + nearbyEstablishments.length !== 1 ? "s" : ""} within {radius} mi
            {!userLocation ? " · Set your location" : ""}
          </Text>
        </View>
      </View>

      {selected && (
        <View style={[s.vendorPanel, { paddingBottom: bottomPad }]}>
          <View style={s.panelHandle} />
          <View style={s.panelRow}>
            <View style={s.panelAvatar}>
              <Text style={s.panelAvatarLetter}>
                {selected.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.panelInfo}>
              <Text style={s.panelName} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={s.panelMeta} numberOfLines={1}>
                {selected.category} · {selected.location}
              </Text>
              {userLocation && (
                <Text style={s.panelDist}>
                  {haversineDistanceMiles(
                    userLocation.latitude,
                    userLocation.longitude,
                    selected.latitude!,
                    selected.longitude!,
                  ).toFixed(1)}{" "}
                  mi away
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={s.viewBtn}
              onPress={() => router.push(`/vendor/${selected.slug}`)}
            >
              <Text style={s.viewBtnText}>View</Text>
              <Feather name="arrow-right" size={14} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {selectedEstablishment && (
        <View style={[s.vendorPanel, { paddingBottom: bottomPad }]}>
          <View style={s.panelHandle} />
          <View style={s.panelRow}>
            <View style={[s.panelAvatar, { backgroundColor: "#c0622f20" }]}>
              <Feather name="home" size={20} color="#c0622f" />
            </View>
            <View style={s.panelInfo}>
              <Text style={s.panelName} numberOfLines={1}>
                {selectedEstablishment.name}
              </Text>
              <Text style={s.panelMeta} numberOfLines={1}>
                {selectedEstablishment.type} · {selectedEstablishment.city}, {selectedEstablishment.state}
              </Text>
              {userLocation && (
                <Text style={[s.panelDist, { color: "#c0622f" }]}>
                  {haversineDistanceMiles(
                    userLocation.latitude,
                    userLocation.longitude,
                    selectedEstablishment.latitude!,
                    selectedEstablishment.longitude!,
                  ).toFixed(1)}{" "}
                  mi away
                </Text>
              )}
            </View>
            {selectedEstablishment.website ? (
              <TouchableOpacity
                style={[s.viewBtn, { backgroundColor: "#c0622f" }]}
                onPress={() => router.push(selectedEstablishment.website as `${string}:${string}`)}
              >
                <Text style={s.viewBtnText}>Visit</Text>
                <Feather name="external-link" size={14} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={[s.viewBtn, { backgroundColor: "#c0622f40" }]}>
                <Text style={[s.viewBtnText, { color: "#c0622f" }]}>{selectedEstablishment.type}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

interface WebFallbackProps {
  vendors: Vendor[];
  userLocation: { latitude: number; longitude: number } | null;
  radius: number;
  sliderValue: number;
  onSliderChange: (v: number) => void;
  onSliderComplete: (v: number) => void;
  onQuickPick: (v: number) => void;
  colors: ReturnType<typeof useColors>;
  topPad: number;
  bottomPad: number;
}

function WebFallback({
  vendors,
  userLocation,
  radius,
  sliderValue,
  onSliderChange,
  onSliderComplete,
  onQuickPick,
  colors,
  topPad,
  bottomPad,
}: WebFallbackProps) {
  const router = useRouter();
  const s = styles(colors, topPad, bottomPad);

  return (
    <View style={s.container}>
      <View style={[s.webHeader, { paddingTop: topPad + 12 }]}>
        <Text style={s.webTitle}>Nearby</Text>

        <View style={s.controlCard}>
          <View style={s.radiusLabelRow}>
            <Text style={s.radiusLabel}>Search radius</Text>
            <Text style={s.radiusValue}>{sliderValue} mi</Text>
          </View>
          <Slider
            style={s.slider}
            minimumValue={MIN_MILES}
            maximumValue={MAX_MILES}
            step={1}
            value={sliderValue}
            onValueChange={onSliderChange}
            onSlidingComplete={onSliderComplete}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <View style={s.quickRow}>
            {QUICK_PICKS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.quickChip, radius === r && s.quickChipActive]}
                onPress={() => onQuickPick(r)}
              >
                <Text
                  style={[
                    s.quickChipText,
                    radius === r && s.quickChipTextActive,
                  ]}
                >
                  {r} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={s.countText}>
          {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} within{" "}
          {radius} mi
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          paddingTop: 8,
          gap: 10,
        }}
      >
        {vendors.length === 0 ? (
          <View style={[s.center, { paddingTop: 40 }]}>
            <Text style={s.permissionBody}>No mapped vendors in this area.</Text>
          </View>
        ) : (
          vendors.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={s.webCard}
              onPress={() => router.push(`/vendor/${v.slug}`)}
              activeOpacity={0.85}
            >
              <View style={s.panelAvatar}>
                <Text style={s.panelAvatarLetter}>
                  {v.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.panelName}>{v.name}</Text>
                <Text style={s.panelMeta}>
                  {v.category} · {v.location}
                </Text>
                {userLocation && (
                  <Text style={s.panelDist}>
                    {haversineDistanceMiles(
                      userLocation.latitude,
                      userLocation.longitude,
                      v.latitude!,
                      v.longitude!,
                    ).toFixed(1)}{" "}
                    mi away
                  </Text>
                )}
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = (
  colors: ReturnType<typeof useColors>,
  topPad: number,
  bottomPad: number,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 12,
      paddingBottom: 8,
      gap: 6,
    },
    controlCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
      gap: 4,
    },
    radiusLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    radiusLabel: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
      color: colors.mutedForeground,
    },
    radiusValue: {
      fontFamily: "DMSans_700Bold",
      fontSize: 20,
      color: colors.primary,
    },
    slider: {
      width: "100%",
      height: 36,
      marginVertical: 2,
    },
    quickRow: {
      flexDirection: "row",
      gap: 6,
      alignItems: "center",
    },
    quickChip: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 8,
      alignItems: "center",
      backgroundColor: colors.muted,
    },
    quickChipActive: { backgroundColor: colors.primary },
    quickChipText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    quickChipTextActive: { color: colors.primaryForeground },
    locateBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    countText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },

    pin: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    pinSelected: {
      backgroundColor: colors.primary,
      transform: [{ scale: 1.25 }],
    },
    estPin: {
      width: 28,
      height: 28,
      borderRadius: 7,
      backgroundColor: "#c0622f",
      borderWidth: 1.5,
      borderColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    estPinSelected: {
      backgroundColor: "#a85228",
      transform: [{ scale: 1.25 }],
    },

    vendorPanel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 12,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 10,
    },
    panelHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 14,
    },
    panelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    panelAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    panelAvatarLetter: {
      fontFamily: "DMSans_700Bold",
      fontSize: 18,
      color: colors.primary,
    },
    panelInfo: { flex: 1 },
    panelName: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 2,
    },
    panelMeta: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      color: colors.mutedForeground,
    },
    panelDist: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
      color: colors.primary,
      marginTop: 2,
    },
    viewBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 9,
      paddingHorizontal: 14,
    },
    viewBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      color: colors.primaryForeground,
    },

    permissionIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    permissionTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 22,
      color: colors.foreground,
      textAlign: "center",
      marginBottom: 10,
    },
    permissionBody: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 28,
    },
    permissionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 24,
      paddingVertical: 13,
      paddingHorizontal: 28,
    },
    permissionBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 15,
      color: colors.primaryForeground,
    },
    settingsHint: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 16,
      lineHeight: 19,
    },

    webHeader: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    webTitle: {
      fontFamily: "DMSans_700Bold",
      fontSize: 26,
      color: colors.foreground,
    },
    webCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
  });
