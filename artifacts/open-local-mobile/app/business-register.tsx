import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { LocationPickerMap, type PickedLocation } from "@/components/LocationPickerMap";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { TIERS, TIER_ORDER, type TierId } from "@/lib/tiers";

const BUSINESS_TYPES = [
  "Café",
  "Restaurant",
  "Bar / Brewery",
  "Boutique",
  "Gallery",
  "Bookshop",
  "Bakery",
  "Farm Stand",
  "Spa / Wellness",
  "Fitness",
  "Market",
  "Other",
];

type Step = "basics" | "contact" | "tier" | "confirm";
const STEPS: Step[] = ["basics", "contact", "tier", "confirm"];

interface FormState {
  name: string;
  type: string;
  description: string;
  address: string;
  city: string;
  contactEmail: string;
  phone: string;
  websiteUrl: string;
  instagramHandle: string;
  latitude: number | null;
  longitude: number | null;
  tier: TierId;
}

const INITIAL: FormState = {
  name: "",
  type: "",
  description: "",
  address: "",
  city: "",
  contactEmail: "",
  phone: "",
  websiteUrl: "",
  instagramHandle: "",
  latitude: null,
  longitude: null,
  tier: "middle",
};

export default function BusinessRegisterScreen() {
  const colors = useColors();
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));
  const setLatLng = (loc: PickedLocation) =>
    setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }));

  const stepIndex = STEPS.indexOf(step);

  const canAdvance =
    step === "basics"
      ? form.name.trim().length >= 2 &&
        form.type.length > 0 &&
        form.description.trim().length >= 20 &&
        form.address.trim().length >= 2 &&
        form.city.trim().length >= 2
      : step === "contact"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)
      : true;

  const goBack = () => {
    if (stepIndex === 0) router.back();
    else setStep(STEPS[stepIndex - 1]);
  };

  const advance = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/establishments/submit", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim(),
          address: form.address.trim(),
          city: form.city.trim(),
          state: "FL",
          contactEmail: form.contactEmail.trim(),
          phone: form.phone.trim() || undefined,
          website: form.websiteUrl.trim() || undefined,
          instagramHandle: form.instagramHandle.trim() || undefined,
          latitude: form.latitude ?? undefined,
          longitude: form.longitude ?? undefined,
          tier: form.tier,
        }),
        token: null,
      });
      setDone(true);
    } catch (e) {
      Alert.alert(
        "Error",
        e instanceof Error ? e.message : "Could not submit. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const c = colors;

  if (done) {
    return (
      <SafeAreaView
        style={[s.safe, { backgroundColor: c.background }]}
        edges={["top", "bottom"]}
      >
        <View style={s.doneWrap}>
          <View style={[s.doneIcon, { backgroundColor: c.primary + "20" }]}>
            <Feather name="check-circle" size={40} color={c.primary} />
          </View>
          <Text style={[s.doneTitle, { color: c.foreground }]}>
            You're live!
          </Text>
          <Text style={[s.doneBody, { color: c.mutedForeground }]}>
            Your business is now listed on Open Local. Shoppers in your area can
            find you on the map right away.
          </Text>
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => router.replace("/(tabs)" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[s.safe, { backgroundColor: c.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={goBack} hitSlop={12} style={s.headerBtn}>
            <Feather name="chevron-left" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[s.headerTitle, { color: c.foreground }]}>
            Pin your business
          </Text>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={s.headerBtn}
          >
            <Feather name="x" size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {/* Progress */}
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

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 0: Basics ────────────────────────────── */}
          {step === "basics" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  About your business
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  Tell shoppers what you offer and where to find you.
                </Text>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Business name *
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => set("name", v)}
                  placeholder="The Corner Café"
                  placeholderTextColor={c.mutedForeground}
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Category *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {BUSINESS_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => set("type", form.type === t ? "" : t)}
                      style={[
                        s.chip,
                        {
                          backgroundColor:
                            form.type === t ? c.primary : c.card,
                          borderColor:
                            form.type === t ? c.primary : c.border,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          s.chipText,
                          {
                            color:
                              form.type === t ? "#fff" : c.foreground,
                          },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Street address *
                </Text>
                <TextInput
                  value={form.address}
                  onChangeText={(v) => set("address", v)}
                  placeholder="123 Main St"
                  placeholderTextColor={c.mutedForeground}
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>City *</Text>
                <TextInput
                  value={form.city}
                  onChangeText={(v) => set("city", v)}
                  placeholder="Sarasota"
                  placeholderTextColor={c.mutedForeground}
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Description *{" "}
                  <Text style={{ color: c.mutedForeground, fontFamily: "DMSans_400Regular" }}>
                    (min 20 chars)
                  </Text>
                </Text>
                <TextInput
                  value={form.description}
                  onChangeText={(v) => set("description", v)}
                  placeholder="Tell shoppers what makes your business special…"
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    s.input,
                    s.textarea,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
                {form.description.trim().length > 0 &&
                  form.description.trim().length < 20 && (
                    <Text style={[s.hint, { color: "#dc2626" }]}>
                      {20 - form.description.trim().length} more characters needed
                    </Text>
                  )}
              </View>

              {/* Map picker */}
              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Pin your location
                </Text>
                <LocationPickerMap
                  onChange={setLatLng}
                  hint={[form.address, form.city].filter(Boolean).join(" ")}
                  initial={
                    form.latitude != null && form.longitude != null
                      ? { latitude: form.latitude, longitude: form.longitude }
                      : null
                  }
                  height={240}
                />
              </View>
            </View>
          )}

          {/* ── Step 1: Contact ───────────────────────────── */}
          {step === "contact" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  Contact & links
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  How should shoppers and Open Local reach you?
                </Text>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Contact email *
                </Text>
                <TextInput
                  value={form.contactEmail}
                  onChangeText={(v) => set("contactEmail", v)}
                  placeholder="hello@yourbusiness.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>Phone</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(v) => set("phone", v)}
                  placeholder="(941) 555-0100"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="phone-pad"
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>Website</Text>
                <TextInput
                  value={form.websiteUrl}
                  onChangeText={(v) => set("websiteUrl", v)}
                  placeholder="https://yourbusiness.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>
                  Instagram handle
                </Text>
                <TextInput
                  value={form.instagramHandle}
                  onChangeText={(v) => set("instagramHandle", v)}
                  placeholder="yourcafe"
                  placeholderTextColor={c.mutedForeground}
                  autoCapitalize="none"
                  style={[
                    s.input,
                    {
                      color: c.foreground,
                      borderColor: c.border,
                      backgroundColor: c.muted,
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* ── Step 2: Tier ─────────────────────────────── */}
          {step === "tier" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  Choose a plan
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  Subscription fees are currently waived — pick the tier that
                  fits your goals and upgrade anytime.
                </Text>
              </View>

              {/* Waived notice */}
              <View
                style={[
                  s.waivedBanner,
                  { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
                ]}
              >
                <Feather name="gift" size={18} color="#16a34a" />
                <Text style={s.waivedText}>
                  All plans are free while we grow the community. 🎉
                </Text>
              </View>

              {TIER_ORDER.map((id) => {
                const tier = TIERS[id];
                const selected = form.tier === id;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => setForm((f) => ({ ...f, tier: id }))}
                    activeOpacity={0.8}
                    style={[
                      s.tierCard,
                      {
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: selected
                          ? c.primary + "0d"
                          : c.card,
                      },
                    ]}
                  >
                    <View style={s.tierHeader}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.tierName, { color: c.foreground }]}
                        >
                          {tier.name}
                        </Text>
                        <Text
                          style={[
                            s.tierTagline,
                            { color: c.mutedForeground },
                          ]}
                        >
                          {tier.tagline}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.tierRadio,
                          {
                            borderColor: selected ? c.primary : c.border,
                            backgroundColor: selected
                              ? c.primary
                              : "transparent",
                          },
                        ]}
                      >
                        {selected && (
                          <Feather name="check" size={12} color="#fff" />
                        )}
                      </View>
                    </View>
                    <View style={s.tierFeatures}>
                      {tier.features.map((f) => (
                        <View key={f} style={s.featureRow}>
                          <Feather
                            name="check"
                            size={13}
                            color={selected ? c.primary : "#16a34a"}
                          />
                          <Text
                            style={[
                              s.featureText,
                              { color: c.mutedForeground },
                            ]}
                          >
                            {f}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Step 3: Confirm ──────────────────────────── */}
          {step === "confirm" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>
                  Review & submit
                </Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  Your business goes live immediately on Open Local.
                </Text>
              </View>

              <View
                style={[
                  s.reviewCard,
                  { backgroundColor: c.card, borderColor: c.border },
                ]}
              >
                <Row label="Name" value={form.name} colors={c} />
                <Row label="Type" value={form.type} colors={c} />
                <Row label="Address" value={form.address} colors={c} />
                <Row label="City" value={`${form.city}, FL`} colors={c} />
                <Row label="Email" value={form.contactEmail} colors={c} />
                {form.phone ? (
                  <Row label="Phone" value={form.phone} colors={c} />
                ) : null}
                {form.websiteUrl ? (
                  <Row label="Website" value={form.websiteUrl} colors={c} />
                ) : null}
                <Row
                  label="Plan"
                  value={TIERS[form.tier].name}
                  colors={c}
                />
                {form.latitude != null && form.longitude != null ? (
                  <Row
                    label="Pin"
                    value={`${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)}`}
                    colors={c}
                  />
                ) : null}
              </View>
            </View>
          )}

          {/* Next / Submit button */}
          <TouchableOpacity
            style={[
              s.nextBtn,
              {
                backgroundColor: c.primary,
                opacity: canAdvance ? 1 : 0.4,
              },
            ]}
            onPress={step === "confirm" ? handleSubmit : advance}
            disabled={!canAdvance || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.nextBtnText}>
                {step === "confirm" ? "List my business" : "Continue"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={s.reviewRow}>
      <Text style={[s.reviewLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[s.reviewValue, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 36, alignItems: "center" },
  headerTitle: {
    flex: 1,
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    textAlign: "center",
  },
  progressTrack: { height: 3, width: "100%" },
  progressFill: { height: 3 },
  stepLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 4,
  },
  h1: { fontFamily: "DMSans_700Bold", fontSize: 24, fontWeight: "700" },
  body: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 6 },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 4 },
  fieldGap: { gap: 0 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  textarea: { minHeight: 90, paddingTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: "DMSans_500Medium", fontSize: 12 },
  waivedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  waivedText: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#166534",
  },
  tierCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tierName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  tierTagline: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  tierRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  tierFeatures: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  nextBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  nextBtnText: {
    color: "#fff",
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  reviewRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
    gap: 12,
  },
  reviewLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    width: 70,
  },
  reviewValue: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13 },
  doneWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 26,
    fontWeight: "700",
  },
  doneBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  doneBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 },
});
