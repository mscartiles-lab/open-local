import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch, apiUrl } from "@/lib/api";
import { LocationPickerMap, type PickedLocation } from "@/components/LocationPickerMap";
import {
  TIERS,
  TIER_ORDER,
  TIER_PHOTO_LIMIT,
  TIER_VIDEO_LIMIT,
  PREMIUM_INCLUDED_LOCATIONS,
  ADDITIONAL_LOCATION_PRICE_MONTHLY,
  type TierId,
} from "@/lib/tiers";

type Step = "category" | "story" | "tier" | "photos" | "availability" | "verify";
const STEPS: Step[] = ["category", "story", "tier", "photos", "availability", "verify"];

const CATEGORIES = [
  { value: "Bakery", emoji: "🌾" },
  { value: "Farm", emoji: "🥕" },
  { value: "Apiary", emoji: "🍯" },
  { value: "Brewery", emoji: "🍺" },
  { value: "Crafts", emoji: "🔨" },
  { value: "Pantry", emoji: "🥣" },
  { value: "Butcher", emoji: "🥩" },
  { value: "Florist", emoji: "🌸" },
  { value: "Coffee", emoji: "☕" },
  { value: "Other", emoji: "✨" },
] as const;

const POPULAR_CITIES = [
  "Miami", "Tampa", "Orlando", "Jacksonville", "St. Petersburg",
  "Fort Lauderdale", "Gainesville", "Tallahassee", "Sarasota", "Key West",
];

const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ORDER_OPTIONS = [
  { value: "email_to_order", label: "Email to order" },
  { value: "walk_in", label: "Walk-in / first-come-first-served" },
  { value: "open_local_storefront", label: "Order via Open Local storefront" },
];

const DEFAULT_COVERS: Record<string, string> = {
  Bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80",
  Farm: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=1200&q=80",
  Apiary: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1200&q=80",
  Brewery: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200&q=80",
  Crafts: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80",
  Pantry: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200&q=80",
  Butcher: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1200&q=80",
  Florist: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200&q=80",
  Coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
  Other: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80",
};

interface PickedMedia {
  uri: string;
  type: "image" | "video";
  mimeType: string;
  fileName: string;
  fileSize?: number;
}

interface VerifyState {
  verificationId: number;
  devCode: string | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function uploadMedia(
  media: PickedMedia,
  token: string | null,
): Promise<string> {
  const metaRes = await apiFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    {
      method: "POST",
      body: JSON.stringify({
        name: media.fileName,
        size: media.fileSize ?? 0,
        contentType: media.mimeType,
      }),
      token,
    },
  );

  const fileRes = await fetch(media.uri);
  const blob = await fileRes.blob();

  const putRes = await fetch(metaRes.uploadURL, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": media.mimeType },
  });
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

  return `/api/storage${metaRes.objectPath}`;
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────

export default function VendorOnboardScreen() {
  const colors = useColors();
  const { user, sessionToken } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState<Step>("category");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Category
  const [category, setCategory] = useState("");

  // Step 2 — Story
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [locating, setLocating] = useState(false);

  // Step 3 — Tier
  const [selectedTier, setSelectedTier] = useState<TierId>("middle");
  const [stripeLoading, setStripeLoading] = useState(false);

  // Step 4 — Photos
  const [pickedMedia, setPickedMedia] = useState<PickedMedia[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Step 5 — Availability
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [openDays, setOpenDays] = useState<string[]>([]);
  const [openHours, setOpenHours] = useState("");
  const [howToOrder, setHowToOrder] = useState<string[]>([]);
  const [marketsText, setMarketsText] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [established, setEstablished] = useState("");

  // Step 6 — Verify
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null);
  const [code, setCode] = useState("");

  // ─── Navigation ──────────────────────────────

  const stepIndex = STEPS.indexOf(step);

  const goBack = useCallback(() => {
    setError(null);
    const idx = STEPS.indexOf(step);
    if (idx === 0) router.back();
    else {
      setStep(STEPS[idx - 1]);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [step]);

  const goToStep = useCallback((s: Step) => {
    setError(null);
    setStep(s);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // ─── Location ────────────────────────────────

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission",
          "Allow location access to fill in your city and ZIP automatically, or enter manually.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place?.city) setCity(place.city);
      if (place?.postalCode) setZipCode(place.postalCode);
    } catch {
      // silently ignore
    } finally {
      setLocating(false);
    }
  }, []);

  // ─── Tier / Stripe ───────────────────────────

  const openStripeCheckout = useCallback(async () => {
    if (!sessionToken) return;
    setStripeLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ url: string; trialDays: number }>(
        "/api/billing/vendor/checkout",
        {
          method: "POST",
          body: JSON.stringify({ tier: selectedTier }),
          token: sessionToken,
        },
      );
      if (res.url) {
        await Linking.openURL(res.url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing");
    } finally {
      setStripeLoading(false);
    }
  }, [sessionToken, selectedTier]);

  // ─── Media picking ───────────────────────────

  const photoLimit = TIER_PHOTO_LIMIT[selectedTier];
  const videoLimit = TIER_VIDEO_LIMIT[selectedTier];
  const currentPhotos = pickedMedia.filter((m) => m.type === "image");
  const currentVideos = pickedMedia.filter((m) => m.type === "video");
  const canAddPhoto = currentPhotos.length < photoLimit;
  const canAddVideo = videoLimit > 0 && currentVideos.length < videoLimit;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.85,
      allowsMultipleSelection: photoLimit > 1,
      selectionLimit: photoLimit - currentPhotos.length,
    });
    if (result.canceled) return;

    const newItems: PickedMedia[] = result.assets.map((asset, i) => ({
      uri: asset.uri,
      type: "image",
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? `photo_${Date.now()}_${i}.jpg`,
      fileSize: asset.fileSize,
    }));
    setPickedMedia((prev) => {
      const combined = [...prev, ...newItems];
      return combined.slice(0, photoLimit + videoLimit);
    });
  }, [photoLimit, videoLimit, currentPhotos.length]);

  const pickVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to upload videos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "videos",
      videoMaxDuration: 120,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setPickedMedia((prev) => [
      ...prev,
      {
        uri: asset.uri,
        type: "video",
        mimeType: asset.mimeType ?? "video/mp4",
        fileName: asset.fileName ?? `video_${Date.now()}.mp4`,
        fileSize: asset.fileSize,
      },
    ]);
  }, []);

  const removeMedia = useCallback((uri: string) => {
    setPickedMedia((prev) => prev.filter((m) => m.uri !== uri));
  }, []);

  const uploadAllMedia = useCallback(async (): Promise<string[]> => {
    if (pickedMedia.length === 0) return [];
    setUploadingMedia(true);
    try {
      const urls = await Promise.all(
        pickedMedia.map((m) => uploadMedia(m, sessionToken)),
      );
      setUploadedUrls(urls);
      return urls;
    } finally {
      setUploadingMedia(false);
    }
  }, [pickedMedia, sessionToken]);

  // ─── Toggles ─────────────────────────────────

  const toggleDay = useCallback((full: string) => {
    setOpenDays((prev) =>
      prev.includes(full) ? prev.filter((d) => d !== full) : [...prev, full],
    );
  }, []);

  const toggleOrder = useCallback((val: string) => {
    setHowToOrder((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  // ─── Verification ────────────────────────────

  const startVerification = useCallback(async (email: string, mediaUrls: string[]) => {
    setSubmitting(true);
    setError(null);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const primaryImageUrl =
      mediaUrls[0] ?? DEFAULT_COVERS[category] ?? DEFAULT_COVERS["Other"];

    const vendorPayload = {
      category,
      name: name.trim(),
      slug,
      tagline: tagline.trim(),
      description: description.trim(),
      location: city.trim(),
      zipCode: zipCode.trim() || null,
      region: "Florida",
      contactEmail: email.trim().toLowerCase(),
      imageUrl: primaryImageUrl,
      established: established ? parseInt(established, 10) : new Date().getFullYear(),
      phone: phone.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      instagramHandle: instagramHandle.replace(/^@/, "").trim() || null,
      facebookUrl: null,
      marketsText: marketsText.trim() || null,
      pickupAddress: pickupAddress.trim() || null,
      latitude: pickupLat ?? null,
      longitude: pickupLng ?? null,
      openDays: openDays.length ? openDays : null,
      openHours: openHours.trim() || null,
      howToOrder: howToOrder.length ? howToOrder.join(", ") : null,
    };

    try {
      const res = await apiFetch<{
        verificationId: number;
        devFallback: boolean;
        devCode: string | null;
      }>("/api/auth/email/start", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          vendorPayload,
        }),
        token: sessionToken,
      });
      setVerifyState({
        verificationId: res.verificationId,
        devCode: res.devFallback ? res.devCode : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification code");
    } finally {
      setSubmitting(false);
    }
  }, [
    name, category, tagline, description, city, zipCode, established,
    phone, websiteUrl, instagramHandle, marketsText, pickupAddress,
    pickupLat, pickupLng, openDays, openHours, howToOrder, sessionToken,
  ]);

  const submitCode = useCallback(async () => {
    if (!verifyState) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({
          verificationId: verifyState.verificationId,
          code: code.trim(),
        }),
        token: sessionToken,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setSubmitting(false);
    }
  }, [verifyState, code, sessionToken]);

  const resendCode = useCallback(async () => {
    if (!verifyState) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        verificationId: number;
        devFallback: boolean;
        devCode: string | null;
      }>("/api/auth/email/resend", {
        method: "POST",
        body: JSON.stringify({ verificationId: verifyState.verificationId }),
        token: sessionToken,
      });
      setVerifyState({
        verificationId: res.verificationId,
        devCode: res.devFallback ? res.devCode : null,
      });
      Alert.alert("Code resent", "Check your email for a new 6-digit code.");
    } catch {
      Alert.alert("Error", "Could not resend code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }, [verifyState, sessionToken]);

  // ─── Advance handler ──────────────────────────

  const advance = useCallback(async () => {
    setError(null);

    if (step === "photos") {
      // Upload all picked media before advancing
      if (pickedMedia.length > 0 && uploadedUrls.length === 0) {
        try {
          await uploadAllMedia();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed — try again");
          return;
        }
      }
      goToStep("availability");
      return;
    }

    if (step === "verify") {
      if (verifyState) {
        await submitCode();
      } else {
        // Start verification (also triggers upload if not done yet)
        if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
          setError("Please enter a valid email address");
          return;
        }
        let mediaUrls = uploadedUrls;
        if (pickedMedia.length > 0 && uploadedUrls.length === 0) {
          try {
            mediaUrls = await uploadAllMedia();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Upload failed — try again");
            return;
          }
        }
        await startVerification(contactEmail, mediaUrls);
      }
      return;
    }

    goToStep(STEPS[stepIndex + 1]);
  }, [
    step, stepIndex, pickedMedia, uploadedUrls, verifyState,
    contactEmail, uploadAllMedia, startVerification, submitCode, goToStep,
  ]);

  const canAdvance = (): boolean => {
    switch (step) {
      case "category": return !!category;
      case "story":
        return (
          name.trim().length >= 2 &&
          tagline.trim().length >= 5 &&
          description.trim().length >= 20 &&
          city.trim().length >= 2
        );
      case "tier": return true;
      case "photos": return true;
      case "availability": return true;
      case "verify":
        if (verifyState) return code.trim().length === 6;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
    }
  };

  const c = colors;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: c.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ── Header ── */}
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={goBack} hitSlop={12} style={s.headerBtn}>
            <Feather name="chevron-left" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[s.headerTitle, { color: c.foreground }]} numberOfLines={1}>
            {step === "verify" && verifyState
              ? "Enter your code"
              : step === "verify"
              ? "Verify your email"
              : "Onboard your business"}
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            hitSlop={12}
            style={s.headerBtn}
          >
            <Feather name="x" size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {/* ── Progress bar ── */}
        <View style={[s.progressTrack, { backgroundColor: c.border }]}>
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: c.primary,
                width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
              },
            ]}
          />
        </View>
        <Text style={[s.stepLabel, { color: c.mutedForeground }]}>
          Step {stepIndex + 1} of {STEPS.length}
        </Text>

        {/* ── Scrollable body ── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── STEP 1: Category ─────────────────────────────── */}
          {step === "category" && (
            <View style={{ gap: 16 }}>
              <Text style={[s.h1, { color: c.foreground }]}>What do you make?</Text>
              <Text style={[s.body, { color: c.mutedForeground }]}>
                Pick the category that fits best — you can change it later.
              </Text>
              <View style={s.catGrid}>
                {CATEGORIES.map(({ value, emoji }) => {
                  const active = category === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => {
                        setCategory(value);
                        // Auto-advance after brief visual feedback
                        setTimeout(() => goToStep("story"), 120);
                      }}
                      style={[
                        s.catTile,
                        {
                          borderColor: active ? c.primary : c.border,
                          backgroundColor: active ? c.primary + "18" : c.card,
                          borderWidth: active ? 2 : 1,
                        },
                      ]}
                    >
                      <Text style={s.catEmoji}>{emoji}</Text>
                      <Text style={[s.catLabel, { color: c.foreground }]}>{value}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── STEP 2: Story ────────────────────────────────── */}
          {step === "story" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  Tell us about your business
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  This is your public profile. Be specific and personal.
                </Text>
              </View>

              <FieldGroup label="Business name *">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Wynwood Loaf"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                  returnKeyType="next"
                  autoCapitalize="words"
                />
              </FieldGroup>

              <FieldGroup
                label="One-line tagline *"
                hint="What you make, in a sentence. (min 5 chars)"
              >
                <TextInput
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Sourdough and Cuban-style breads from a Miami garage bakery."
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                  returnKeyType="next"
                />
              </FieldGroup>

              <FieldGroup
                label="Short story *"
                hint="Two sentences about who you are and what you make. (min 20 chars)"
              >
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="A two-baker shop turning out naturally leavened miches and Cuban pan tostado from a home kitchen."
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[s.input, s.textarea, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="City *">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.chipScrollRow}
                >
                  {POPULAR_CITIES.map((ct) => (
                    <Pressable
                      key={ct}
                      onPress={() => setCity(ct)}
                      style={[
                        s.chip,
                        {
                          borderColor: city === ct ? c.primary : c.border,
                          backgroundColor: city === ct ? c.primary : c.card,
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: city === ct ? "#fff" : c.foreground }]}>
                        {ct}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Or type another city"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted, marginTop: 8 }]}
                />
              </FieldGroup>

              <FieldGroup label="ZIP code (optional)">
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    value={zipCode}
                    onChangeText={setZipCode}
                    placeholder="33101"
                    placeholderTextColor={c.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={10}
                    style={[s.input, { flex: 1, color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                  />
                  <Pressable
                    onPress={useMyLocation}
                    disabled={locating}
                    style={[s.iconBtn, { borderColor: c.border, backgroundColor: c.muted }]}
                  >
                    {locating ? (
                      <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                      <Feather name="navigation" size={18} color={c.primary} />
                    )}
                  </Pressable>
                </View>
              </FieldGroup>
            </View>
          )}

          {/* ── STEP 3: Tier ─────────────────────────────────── */}
          {step === "tier" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>Choose your plan</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  Your first 30–60 days are free. Subscribe now or later from your dashboard.
                </Text>
              </View>

              {TIER_ORDER.map((tierId) => {
                const tier = TIERS[tierId];
                const active = selectedTier === tierId;
                const isPremium = tierId === "premium";
                return (
                  <Pressable
                    key={tierId}
                    onPress={() => setSelectedTier(tierId)}
                    style={[
                      s.tierCard,
                      {
                        borderColor: active ? c.primary : c.border,
                        backgroundColor: active ? c.primary + "0A" : c.card,
                        borderWidth: active ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={s.tierCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.tierName, { color: c.foreground }]}>
                            {tier.name}
                          </Text>
                          {isPremium && (
                            <View style={[s.premiumBadge, { backgroundColor: "#f59e0b" + "20" }]}>
                              <Text style={s.premiumBadgeText}>⭐ Best</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[s.tierTagline, { color: c.mutedForeground }]}>
                          {tier.tagline}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[s.tierPrice, { color: c.foreground }]}>
                          ${tier.priceMonthly.toFixed(2)}
                        </Text>
                        <Text style={[s.tierPriceSub, { color: c.mutedForeground }]}>/mo</Text>
                      </View>
                    </View>

                    <View style={[s.tierDivider, { backgroundColor: c.border }]} />

                    {tier.features.map((f) => (
                      <View key={f} style={s.tierFeatureRow}>
                        <Feather name="check" size={14} color={active ? c.primary : c.mutedForeground} />
                        <Text style={[s.tierFeatureText, { color: c.foreground }]}>{f}</Text>
                      </View>
                    ))}

                    {tierId === "premium" && (
                      <View style={[s.locationNote, { backgroundColor: "#f59e0b" + "15", borderColor: "#f59e0b" + "40" }]}>
                        <Feather name="map-pin" size={13} color="#d97706" />
                        <Text style={[s.locationNoteText, { color: "#92400e" }]}>
                          {PREMIUM_INCLUDED_LOCATIONS} selling locations included · +${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo each additional
                        </Text>
                      </View>
                    )}

                    <View style={[s.tierRadio, { borderColor: active ? c.primary : c.border }]}>
                      {active && (
                        <View style={[s.tierRadioFill, { backgroundColor: c.primary }]} />
                      )}
                    </View>
                  </Pressable>
                );
              })}

              {/* Subscribe button */}
              <Pressable
                onPress={openStripeCheckout}
                disabled={stripeLoading || !sessionToken}
                style={[
                  s.stripeBtn,
                  {
                    backgroundColor: c.primary,
                    opacity: stripeLoading ? 0.7 : 1,
                  },
                ]}
              >
                {stripeLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Feather name="credit-card" size={16} color="#fff" />
                )}
                <Text style={s.stripeBtnText}>
                  {stripeLoading ? "Opening…" : "Subscribe now (opens browser)"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => goToStep("photos")}
                style={s.skipBtn}
              >
                <Text style={[s.skipBtnText, { color: c.mutedForeground }]}>
                  Skip for now — set up billing later
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── STEP 4: Photos ───────────────────────────────── */}
          {step === "photos" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>Add photos & videos</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  {selectedTier === "basic"
                    ? "Basic plan: 1 cover photo."
                    : selectedTier === "middle"
                    ? "Standard plan: up to 5 photos + 1 video."
                    : "Premium plan: up to 20 photos + 5 videos."}
                  {" "}The first photo becomes your cover.
                </Text>
              </View>

              {/* Tier limit note */}
              <View style={[s.limitNote, { backgroundColor: c.muted, borderColor: c.border }]}>
                <Feather name="info" size={14} color={c.mutedForeground} />
                <Text style={[s.limitNoteText, { color: c.mutedForeground }]}>
                  Photos: {currentPhotos.length}/{photoLimit}
                  {videoLimit > 0 ? `  ·  Videos: ${currentVideos.length}/${videoLimit}` : "  ·  Videos: not included on Basic"}
                </Text>
              </View>

              {/* Picked thumbnails */}
              {pickedMedia.length > 0 && (
                <View style={s.thumbGrid}>
                  {pickedMedia.map((m, idx) => (
                    <View key={m.uri} style={s.thumbWrap}>
                      <Image
                        source={{ uri: m.uri }}
                        style={s.thumb}
                        contentFit="cover"
                      />
                      {m.type === "video" && (
                        <View style={s.videoBadge}>
                          <Feather name="video" size={11} color="#fff" />
                        </View>
                      )}
                      {idx === 0 && (
                        <View style={[s.coverBadge, { backgroundColor: c.primary }]}>
                          <Text style={s.coverBadgeText}>Cover</Text>
                        </View>
                      )}
                      <Pressable
                        onPress={() => removeMedia(m.uri)}
                        style={s.removeThumb}
                        hitSlop={4}
                      >
                        <Feather name="x" size={12} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Pick buttons */}
              <View style={{ gap: 10 }}>
                {canAddPhoto && (
                  <Pressable
                    onPress={pickImage}
                    style={[s.pickBtn, { borderColor: c.border, backgroundColor: c.muted }]}
                  >
                    <Feather name="image" size={20} color={c.primary} />
                    <Text style={[s.pickBtnText, { color: c.foreground }]}>
                      {currentPhotos.length === 0 ? "Add cover photo" : "Add another photo"}
                    </Text>
                  </Pressable>
                )}
                {canAddVideo && (
                  <Pressable
                    onPress={pickVideo}
                    style={[s.pickBtn, { borderColor: c.border, backgroundColor: c.muted }]}
                  >
                    <Feather name="video" size={20} color={c.primary} />
                    <Text style={[s.pickBtnText, { color: c.foreground }]}>
                      {currentVideos.length === 0 ? "Add a short video" : "Add another video"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {pickedMedia.length === 0 && (
                <Text style={[s.skipNote, { color: c.mutedForeground }]}>
                  You can skip this — we'll use a clean {category.toLowerCase()} cover photo from our library.
                </Text>
              )}
            </View>
          )}

          {/* ── STEP 5: Availability ─────────────────────────── */}
          {step === "availability" && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  Availability & ordering
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  All fields optional — fill in whatever applies.
                </Text>
              </View>

              <FieldGroup label="How do customers order?" hint="Check all that apply.">
                {ORDER_OPTIONS.map(({ value, label }) => {
                  const active = howToOrder.includes(value);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => toggleOrder(value)}
                      style={[
                        s.checkRow,
                        {
                          borderColor: active ? c.primary : c.border,
                          backgroundColor: active ? c.primary + "0D" : c.card,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.checkbox,
                          {
                            borderColor: active ? c.primary : c.border,
                            backgroundColor: active ? c.primary : "transparent",
                          },
                        ]}
                      >
                        {active && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[s.checkLabel, { color: c.foreground }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </FieldGroup>

              <FieldGroup label="Pickup / selling location" hint="Address, market booth, farm gate…">
                <TextInput
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder="123 NW 2nd Ave, Miami"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Pin your exact location" hint="Helps shoppers find you on the map.">
                <LocationPickerMap
                  onChange={(loc: PickedLocation) => {
                    setPickupLat(loc.latitude);
                    setPickupLng(loc.longitude);
                  }}
                  hint={pickupAddress || city}
                  initial={
                    pickupLat != null && pickupLng != null
                      ? { latitude: pickupLat, longitude: pickupLng }
                      : null
                  }
                  height={240}
                />
              </FieldGroup>

              <FieldGroup label="Days you're available">
                <View style={s.chipWrap}>
                  {DAYS_SHORT.map((d, i) => {
                    const full = DAYS_FULL[i];
                    const active = openDays.includes(full);
                    return (
                      <Pressable
                        key={d}
                        onPress={() => toggleDay(full)}
                        style={[
                          s.chip,
                          {
                            borderColor: active ? c.primary : c.border,
                            backgroundColor: active ? c.primary : c.card,
                          },
                        ]}
                      >
                        <Text style={[s.chipText, { color: active ? "#fff" : c.foreground }]}>
                          {d}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FieldGroup>

              <FieldGroup label="Hours" hint="e.g. 'Saturdays 8 am – 1 pm'">
                <TextInput
                  value={openHours}
                  onChangeText={setOpenHours}
                  placeholder="Saturdays 8 am – 1 pm"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Markets or pop-ups you attend" hint="Comma-separated">
                <TextInput
                  value={marketsText}
                  onChangeText={setMarketsText}
                  placeholder="Wynwood Saturday Market, Coconut Grove Sunday Market…"
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[s.input, s.textarea, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Instagram handle (optional)">
                <TextInput
                  value={instagramHandle}
                  onChangeText={setInstagramHandle}
                  placeholder="@yourbusiness"
                  placeholderTextColor={c.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Phone (optional)">
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="phone-pad"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Website (optional)">
                <TextInput
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://yourbusiness.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Year established (optional)">
                <TextInput
                  value={established}
                  onChangeText={setEstablished}
                  placeholder={String(new Date().getFullYear())}
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>
            </View>
          )}

          {/* ── STEP 6: Verify ───────────────────────────────── */}
          {step === "verify" && !verifyState && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>Verify your email</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  We'll send a 6-digit code to confirm your email and publish your listing.
                </Text>
              </View>

              <FieldGroup label="Contact email *" hint="Shown on your public profile.">
                <TextInput
                  value={contactEmail}
                  onChangeText={setContactEmail}
                  placeholder="hello@yourbusiness.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              {uploadingMedia && (
                <View style={[s.uploadingNote, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <ActivityIndicator size="small" color={c.primary} />
                  <Text style={[s.uploadingText, { color: c.mutedForeground }]}>
                    Uploading {pickedMedia.length} media file{pickedMedia.length !== 1 ? "s" : ""}…
                  </Text>
                </View>
              )}
            </View>
          )}

          {step === "verify" && verifyState && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>Enter the code</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 6 }]}>
                  We sent a 6-digit code to{" "}
                  <Text style={{ color: c.foreground, fontWeight: "600" }}>
                    {contactEmail}
                  </Text>
                  . Check your inbox (and spam).
                </Text>
              </View>

              {verifyState.devCode && (
                <View style={[s.devNote, { backgroundColor: "#fef3c7", borderColor: "#fcd34d" }]}>
                  <Feather name="terminal" size={14} color="#92400e" />
                  <Text style={[s.devNoteText, { color: "#92400e" }]}>
                    Dev mode — code: <Text style={{ fontWeight: "700" }}>{verifyState.devCode}</Text>
                  </Text>
                </View>
              )}

              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={c.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                style={[
                  s.codeInput,
                  {
                    color: c.foreground,
                    borderColor: c.border,
                    backgroundColor: c.muted,
                    letterSpacing: 14,
                    fontSize: 32,
                  },
                ]}
                autoFocus
              />

              <Pressable onPress={resendCode} disabled={submitting} style={s.resendBtn}>
                <Text style={[s.resendText, { color: c.primary }]}>Resend code</Text>
              </Pressable>
            </View>
          )}

          {/* ── Error banner ── */}
          {!!error && (
            <View style={[s.errorBanner, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
              <Feather name="alert-circle" size={16} color="#dc2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Bottom CTA (not shown on category step — tap-to-advance) ── */}
        {step !== "category" && (
          <View style={[s.footer, { borderTopColor: c.border, backgroundColor: c.background }]}>
            <Pressable
              onPress={advance}
              disabled={!canAdvance() || submitting || uploadingMedia}
              style={[
                s.ctaBtn,
                {
                  backgroundColor:
                    canAdvance() && !submitting && !uploadingMedia
                      ? c.primary
                      : c.muted,
                },
              ]}
            >
              {(submitting || uploadingMedia) ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={[
                    s.ctaBtnText,
                    {
                      color:
                        canAdvance() && !submitting ? "#fff" : c.mutedForeground,
                    },
                  ]}
                >
                  {step === "verify" && verifyState
                    ? "Publish my business 🎉"
                    : step === "verify"
                    ? "Send code"
                    : step === "photos" && pickedMedia.length > 0 && uploadedUrls.length === 0
                    ? "Upload & continue"
                    : "Continue"}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36, alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "DMSans_600SemiBold",
  },
  progressTrack: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  stepLabel: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 2,
    fontFamily: "DMSans_400Regular",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 0 },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaBtnText: { fontSize: 17, fontWeight: "700", fontFamily: "DMSans_700Bold" },

  // ── Category grid
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catTile: {
    width: "47%",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 15, fontWeight: "600", fontFamily: "DMSans_600SemiBold" },

  // ── Tier cards
  tierCard: {
    borderRadius: 16,
    padding: 18,
    gap: 8,
    position: "relative",
  },
  tierCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingRight: 28,
  },
  tierName: { fontSize: 18, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  tierTagline: { fontSize: 13, marginTop: 2, fontFamily: "DMSans_400Regular" },
  tierPrice: { fontSize: 22, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  tierPriceSub: { fontSize: 12, fontFamily: "DMSans_400Regular" },
  tierDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  tierFeatureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 2 },
  tierFeatureText: { fontSize: 13, flex: 1, fontFamily: "DMSans_400Regular", lineHeight: 18 },
  tierRadio: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tierRadioFill: { width: 10, height: 10, borderRadius: 5 },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  premiumBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400e", fontFamily: "DMSans_700Bold" },
  locationNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  locationNoteText: { fontSize: 12, flex: 1, fontFamily: "DMSans_400Regular" },
  stripeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  stripeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
  },
  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipBtnText: { fontSize: 14, fontFamily: "DMSans_400Regular" },

  // ── Photos
  thumbGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { width: 88, height: 88, borderRadius: 10, overflow: "hidden" },
  thumb: { width: 88, height: 88 },
  videoBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
    padding: 3,
  },
  coverBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", fontFamily: "DMSans_700Bold" },
  removeThumb: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
  },
  pickBtnText: { fontSize: 15, fontWeight: "500", fontFamily: "DMSans_500Medium" },
  limitNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  limitNoteText: { fontSize: 13, fontFamily: "DMSans_400Regular" },
  skipNote: { fontSize: 13, textAlign: "center", fontFamily: "DMSans_400Regular", lineHeight: 18 },

  // ── Availability
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 15, flex: 1, fontFamily: "DMSans_400Regular" },
  chipScrollRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "500", fontFamily: "DMSans_500Medium" },

  // ── Fields
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#666", fontFamily: "DMSans_600SemiBold" },
  fieldHint: { fontSize: 12, color: "#999", marginTop: -2, fontFamily: "DMSans_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "DMSans_400Regular",
  },
  textarea: { minHeight: 96, paddingTop: 12 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Verify
  codeInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    textAlign: "center",
    fontFamily: "DMSans_700Bold",
  },
  resendBtn: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontSize: 15, fontWeight: "500", fontFamily: "DMSans_500Medium" },
  devNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  devNoteText: { fontSize: 13, flex: 1, fontFamily: "DMSans_400Regular" },
  uploadingNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  uploadingText: { fontSize: 13, fontFamily: "DMSans_400Regular" },

  // ── Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    fontFamily: "DMSans_400Regular",
    lineHeight: 20,
  },

  // ── Common
  h1: { fontSize: 26, fontWeight: "700", fontFamily: "DMSans_700Bold", lineHeight: 32 },
  body: { fontSize: 15, lineHeight: 22, fontFamily: "DMSans_400Regular" },
});
