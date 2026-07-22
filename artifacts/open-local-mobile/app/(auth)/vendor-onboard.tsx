import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

type Step = "category" | "story" | "availability" | "contact" | "verify";
const STEPS: Step[] = ["category", "story", "availability", "contact", "verify"];

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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ORDER_OPTIONS = [
  { value: "open_local_storefront", label: "Order via Open Local storefront" },
  { value: "website", label: "Order on my website" },
  { value: "preorder_required", label: "Pre-order required" },
  { value: "farmers_market", label: "Find me at the farmers market" },
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

interface VerifyState {
  verificationId: number;
  devCode: string | null;
}

export default function VendorOnboardScreen() {
  const colors = useColors();
  const { user, sessionToken } = useAuth();

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

  // Step 3 — Availability
  const [pickupAddress, setPickupAddress] = useState("");
  const [openDays, setOpenDays] = useState<string[]>([]);
  const [openHours, setOpenHours] = useState("");
  const [howToOrder, setHowToOrder] = useState<string[]>([]);
  const [marketsText, setMarketsText] = useState("");

  // Step 4 — Contact
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [established, setEstablished] = useState("");
  const [showOptionals, setShowOptionals] = useState(false);

  // Step 5 — Verify
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null);
  const [code, setCode] = useState("");

  const stepIndex = STEPS.indexOf(step);

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission", "Allow location to fill in your city and ZIP, or enter manually.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const places = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const place = places[0];
      if (place?.city) setCity(place.city);
      if (place?.postalCode) setZipCode(place.postalCode);
    } catch {
      // ignore
    } finally {
      setLocating(false);
    }
  }, []);

  const toggleDay = (full: string) => {
    setOpenDays((prev) => prev.includes(full) ? prev.filter((d) => d !== full) : [...prev, full]);
  };

  const toggleOrder = (val: string) => {
    setHowToOrder((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const goBack = () => {
    setError(null);
    const idx = STEPS.indexOf(step);
    if (idx === 0) router.back();
    else setStep(STEPS[idx - 1]);
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case "category": return !!category;
      case "story": return name.trim().length >= 2 && tagline.trim().length >= 10 && description.trim().length >= 20 && city.trim().length >= 2;
      case "availability": return true;
      case "contact": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
      case "verify": return code.length === 6;
    }
  };

  const startVerification = async () => {
    setSubmitting(true);
    setError(null);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    const vendorPayload = {
      category,
      name: name.trim(),
      slug,
      tagline: tagline.trim(),
      description: description.trim(),
      location: city.trim(),
      zipCode: zipCode.trim() || null,
      region: "Florida",
      contactEmail: contactEmail.trim().toLowerCase(),
      imageUrl: DEFAULT_COVERS[category] ?? DEFAULT_COVERS["Other"],
      established: established ? parseInt(established, 10) : new Date().getFullYear(),
      phone: phone.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      instagramHandle: instagramHandle.replace(/^@/, "").trim() || null,
      facebookUrl: null,
      marketsText: marketsText.trim() || null,
      pickupAddress: pickupAddress.trim() || null,
      openDays: openDays.length ? openDays : null,
      openHours: openHours.trim() || null,
      howToOrder: howToOrder.length ? howToOrder.join(", ") : null,
    };
    try {
      const res = await apiFetch<{ verificationId: number; devFallback: boolean; devCode: string | null }>(
        "/api/auth/email/start",
        {
          method: "POST",
          body: JSON.stringify({ email: contactEmail.trim().toLowerCase(), vendorPayload }),
          token: sessionToken,
        },
      );
      setVerifyState({ verificationId: res.verificationId, devCode: res.devFallback ? res.devCode : null });
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send verification code");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async () => {
    if (!verifyState) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/email/verify", {
        method: "POST",
        body: JSON.stringify({ verificationId: verifyState.verificationId, code: code.trim() }),
        token: sessionToken,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code — try again");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!verifyState) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ verificationId: number; devFallback: boolean; devCode: string | null }>(
        "/api/auth/email/resend",
        { method: "POST", body: JSON.stringify({ verificationId: verifyState.verificationId }), token: sessionToken },
      );
      setVerifyState({ verificationId: res.verificationId, devCode: res.devFallback ? res.devCode : null });
      Alert.alert("Code resent", "Check your email for a new code.");
    } catch {
      Alert.alert("Error", "Could not resend code. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const advance = () => {
    setError(null);
    if (step === "contact") {
      startVerification();
    } else if (step === "verify") {
      submitCode();
    } else {
      const idx = STEPS.indexOf(step);
      setStep(STEPS[idx + 1]);
    }
  };

  const c = colors;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={goBack} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[s.headerTitle, { color: c.foreground }]}>
            {step === "verify" ? "Verify email" : "Onboard your business"}
          </Text>
          <Pressable onPress={() => router.replace("/(tabs)")} hitSlop={12}>
            <Feather name="x" size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={[s.progressTrack, { backgroundColor: c.border }]}>
          <View
            style={[
              s.progressFill,
              { backgroundColor: c.primary, width: `${((stepIndex + 1) / STEPS.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={[s.stepLabel, { color: c.mutedForeground }]}>
          Step {stepIndex + 1} of {STEPS.length}
        </Text>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 1: Category ─────────────────────────────────── */}
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
                      onPress={() => { setCategory(value); advance(); }}
                      style={[
                        s.catTile,
                        {
                          borderColor: active ? c.primary : c.border,
                          backgroundColor: active ? c.primary + "12" : c.background,
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

          {/* ── Step 2: Story ────────────────────────────────────── */}
          {step === "story" && (
            <View style={{ gap: 20 }}>
              <Text style={[s.h1, { color: c.foreground }]}>Tell us about your business</Text>

              <FieldGroup label="Business name *">
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Wynwood Loaf"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="One-line tagline *" hint="What you make, in a sentence.">
                <TextInput
                  value={tagline}
                  onChangeText={setTagline}
                  placeholder="Sourdough and Cuban-style breads from a Miami garage bakery."
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Short story *" hint="Two sentences about who you are and what you make.">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="A two-baker shop turning out naturally leavened miches..."
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[s.input, s.textarea, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="City *">
                <View style={s.chipRow}>
                  {POPULAR_CITIES.map((ct) => (
                    <Pressable
                      key={ct}
                      onPress={() => setCity(ct)}
                      style={[
                        s.chip,
                        {
                          borderColor: city === ct ? c.primary : c.border,
                          backgroundColor: city === ct ? c.primary : c.background,
                        },
                      ]}
                    >
                      <Text style={[s.chipText, { color: city === ct ? "#fff" : c.foreground }]}>{ct}</Text>
                    </Pressable>
                  ))}
                </View>
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

          {/* ── Step 3: Availability ─────────────────────────────── */}
          {step === "availability" && (
            <View style={{ gap: 20 }}>
              <Text style={[s.h1, { color: c.foreground }]}>Availability & ordering</Text>
              <Text style={[s.body, { color: c.mutedForeground }]}>
                All fields optional — fill in whatever applies.
              </Text>

              <FieldGroup label="Pickup or selling location" hint="Where do customers find or pick up orders?">
                <TextInput
                  value={pickupAddress}
                  onChangeText={setPickupAddress}
                  placeholder="Address, market booth, farm gate…"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </FieldGroup>

              <FieldGroup label="Days you're available">
                <View style={s.chipRow}>
                  {DAYS.map((d, i) => {
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
                            backgroundColor: active ? c.primary : c.background,
                          },
                        ]}
                      >
                        <Text style={[s.chipText, { color: active ? "#fff" : c.foreground }]}>{d}</Text>
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

              <FieldGroup label="How do customers order?">
                {ORDER_OPTIONS.map(({ value, label }) => {
                  const active = howToOrder.includes(value);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => toggleOrder(value)}
                      style={[
                        s.orderOption,
                        {
                          borderColor: active ? c.primary : c.border,
                          backgroundColor: active ? c.primary + "0D" : c.background,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.orderCheck,
                          { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primary : "transparent" },
                        ]}
                      >
                        {active && <Feather name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={[s.orderLabel, { color: c.foreground }]}>{label}</Text>
                    </Pressable>
                  );
                })}
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
            </View>
          )}

          {/* ── Step 4: Contact ──────────────────────────────────── */}
          {step === "contact" && (
            <View style={{ gap: 20 }}>
              <Text style={[s.h1, { color: c.foreground }]}>How can people reach you?</Text>
              <Text style={[s.body, { color: c.mutedForeground }]}>
                Just an email is enough. We'll send a 6-digit code to verify it and publish your listing.
              </Text>

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

              <View style={[s.coverNote, { backgroundColor: c.muted, borderColor: c.border }]}>
                <Feather name="image" size={16} color={c.mutedForeground} />
                <Text style={[s.coverNoteText, { color: c.mutedForeground }]}>
                  We'll use a clean {category.toLowerCase()} cover photo for now. You can upload your own from the vendor dashboard after publishing.
                </Text>
              </View>

              {/* Optional details */}
              <Pressable onPress={() => setShowOptionals((v) => !v)} style={s.optionalToggle}>
                <Feather name={showOptionals ? "minus" : "plus"} size={16} color={c.primary} />
                <Text style={[s.optionalToggleText, { color: c.primary }]}>
                  {showOptionals ? "Hide" : "Add"} more details (optional)
                </Text>
              </Pressable>

              {showOptionals && (
                <View style={{ gap: 16 }}>
                  <FieldGroup label="Phone">
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={c.mutedForeground}
                      keyboardType="phone-pad"
                      style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                    />
                  </FieldGroup>
                  <FieldGroup label="Website">
                    <TextInput
                      value={websiteUrl}
                      onChangeText={setWebsiteUrl}
                      placeholder="https://..."
                      placeholderTextColor={c.mutedForeground}
                      autoCapitalize="none"
                      style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                    />
                  </FieldGroup>
                  <FieldGroup label="Instagram">
                    <TextInput
                      value={instagramHandle}
                      onChangeText={setInstagramHandle}
                      placeholder="@yourhandle"
                      placeholderTextColor={c.mutedForeground}
                      autoCapitalize="none"
                      style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                    />
                  </FieldGroup>
                  <FieldGroup label="Year established">
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

              {/* Preview */}
              {name ? (
                <View style={[s.preview, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[s.previewLabel, { color: c.mutedForeground }]}>Preview</Text>
                  <Text style={[s.previewName, { color: c.foreground }]}>{name}</Text>
                  <Text style={[s.previewMeta, { color: c.mutedForeground }]}>
                    {category} · {city || "Florida"}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* ── Step 5: Verify ───────────────────────────────────── */}
          {step === "verify" && (
            <View style={{ gap: 16 }}>
              <View style={[s.verifyIcon, { backgroundColor: c.primary + "18" }]}>
                <Feather name="mail" size={28} color={c.primary} />
              </View>
              <Text style={[s.h1, { color: c.foreground, textAlign: "center" }]}>
                Check your email
              </Text>
              <Text style={[s.body, { color: c.mutedForeground, textAlign: "center" }]}>
                We sent a 6-digit code to{" "}
                <Text style={{ fontFamily: "DMSans_600SemiBold", color: c.foreground }}>
                  {contactEmail}
                </Text>
                . Enter it below to publish your listing.
              </Text>

              {verifyState?.devCode ? (
                <View style={[s.devBanner, { backgroundColor: c.muted, borderColor: c.border }]}>
                  <Text style={[s.label, { color: c.foreground }]}>
                    Demo mode — your code is{" "}
                    <Text style={{ fontFamily: "DMSans_700Bold", letterSpacing: 4 }}>{verifyState.devCode}</Text>
                  </Text>
                </View>
              ) : null}

              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="000000"
                placeholderTextColor={c.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  s.input,
                  s.codeInput,
                  { color: c.foreground, borderColor: c.border, backgroundColor: c.muted },
                ]}
              />

              <Pressable onPress={resendCode} disabled={submitting} style={{ alignSelf: "center" }}>
                <Text style={[s.linkText, { color: c.primary }]}>Send a new code</Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text style={[s.errorText, { color: "#c0622f" }]}>{error}</Text>
          ) : null}
        </ScrollView>

        {/* Footer CTA — hidden on category step (tapping a tile advances automatically) */}
        {step !== "category" && (
          <View style={s.footer}>
            <Pressable
              onPress={advance}
              disabled={!canAdvance() || submitting}
              style={[
                s.primaryBtn,
                { backgroundColor: !canAdvance() || submitting ? c.muted : c.primary },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.primaryBtnText}>
                  {step === "contact"
                    ? "Send verification code"
                    : step === "verify"
                      ? "Verify & publish listing"
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

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>
      {children}
      {hint ? <Text style={[s.hint, { color: colors.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 17 },
  progressTrack: { height: 3, marginHorizontal: 16, borderRadius: 99 },
  progressFill: { height: 3, borderRadius: 99 },
  stepLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 2,
  },
  scroll: { padding: 20, paddingBottom: 40, gap: 8 },
  h1: { fontFamily: "DMSans_700Bold", fontSize: 24 },
  body: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  input: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  textarea: { minHeight: 100, paddingTop: 12 },
  codeInput: { fontSize: 28, letterSpacing: 10, textAlign: "center" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catTile: {
    width: "30%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
  },
  catEmoji: { fontSize: 28 },
  catLabel: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontFamily: "DMSans_600SemiBold", fontSize: 13 },
  orderOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  orderCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orderLabel: { fontFamily: "DMSans_500Medium", fontSize: 14, flex: 1 },
  coverNote: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  coverNoteText: { fontFamily: "DMSans_400Regular", fontSize: 13, flex: 1, lineHeight: 19 },
  optionalToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  optionalToggleText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  preview: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 2,
  },
  previewLabel: { fontFamily: "DMSans_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  previewName: { fontFamily: "DMSans_700Bold", fontSize: 18 },
  previewMeta: { fontFamily: "DMSans_400Regular", fontSize: 13 },
  verifyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  devBanner: { borderRadius: 12, borderWidth: 1, padding: 12 },
  linkText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  errorText: { fontFamily: "DMSans_500Medium", fontSize: 13, marginTop: 4 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 16, paddingBottom: 24 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 16 },
});
