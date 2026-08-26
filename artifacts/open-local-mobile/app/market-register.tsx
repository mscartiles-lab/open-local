import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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

// Stable English keys submitted to the server
const DAY_KEYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const TAG_KEYS = [
  "Organic", "Dog-Friendly", "Live Music", "Kids Activities",
  "Prepared Foods", "Plants & Flowers", "Artisan Crafts",
  "Year-Round", "Seasonal", "Indoor", "Outdoor",
] as const;

type Step = "basics" | "contact" | "confirm";
const STEPS: Step[] = ["basics", "contact", "confirm"];

interface FormState {
  name: string;
  city: string;
  address: string;
  day: string;
  time: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  contactEmail: string;
  phone: string;
  websiteUrl: string;
  instagramHandle: string;
  logoUrl: string;
  tags: string[];
}

const INITIAL: FormState = {
  name: "", city: "", address: "", day: "", time: "", description: "",
  latitude: null, longitude: null,
  contactEmail: "", phone: "", websiteUrl: "", instagramHandle: "", logoUrl: "",
  tags: [],
};

export default function MarketRegisterScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const [step, setStep] = useState<Step>("basics");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setLatLng = (loc: PickedLocation) =>
    setForm((f) => ({ ...f, latitude: loc.latitude, longitude: loc.longitude }));
  const toggleTag = (tag: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((tg) => tg !== tag) : [...f.tags, tag],
    }));

  const stepIndex = STEPS.indexOf(step);

  const canAdvance = step === "basics"
    ? form.name.trim().length >= 2 && form.city.trim().length >= 1
    : step === "contact"
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)
    : true;

  const goBack = () => {
    if (stepIndex === 0) router.back();
    else setStep(STEPS[stepIndex - 1]);
  };

  const advance = () => {
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await apiFetch("/api/markets/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim(),
          region: "FL",
          address: form.address.trim() || undefined,
          day: form.day || undefined,
          time: form.time.trim() || undefined,
          description: form.description.trim() || undefined,
          contactEmail: form.contactEmail.trim(),
          phone: form.phone.trim() || undefined,
          websiteUrl: form.websiteUrl.trim() || undefined,
          instagramHandle: form.instagramHandle.trim() || undefined,
          logoUrl: form.logoUrl.trim() || undefined,
          tags: form.tags.length ? form.tags : undefined,
          latitude: form.latitude ?? undefined,
          longitude: form.longitude ?? undefined,
        }),
        token: null,
      });
      setDone(true);
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("marketRegister.errorSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  const c = colors;

  if (done) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
        <View style={s.doneWrap}>
          <View style={[s.doneIcon, { backgroundColor: "#16653420" }]}>
            <Feather name="check-circle" size={40} color="#166534" />
          </View>
          <Text style={[s.doneTitle, { color: c.foreground }]}>{t("marketRegister.youAreListed")}</Text>
          <Text style={[s.doneBody, { color: c.mutedForeground }]}>
            {t("marketRegister.doneBody")}
          </Text>
          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: "#166534" }]}
            onPress={() => router.replace("/(tabs)/markets")}
            activeOpacity={0.85}
          >
            <Text style={s.doneBtnText}>{t("marketRegister.browseMarkets")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={goBack} hitSlop={12} style={s.headerBtn}>
            <Feather name="chevron-left" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[s.headerTitle, { color: c.foreground }]}>{t("marketRegister.title")}</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.headerBtn}>
            <Feather name="x" size={22} color={c.mutedForeground} />
          </Pressable>
        </View>

        {/* Progress */}
        <View style={[s.progressTrack, { backgroundColor: c.border }]}>
          <View
            style={[s.progressFill, {
              backgroundColor: "#166534",
              width: `${((stepIndex + 1) / STEPS.length) * 100}%`,
            }]}
          />
        </View>
        <Text style={[s.stepLabel, { color: c.mutedForeground }]}>
          {t("marketRegister.stepOf", { step: stepIndex + 1, total: STEPS.length })}
        </Text>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step 0: Basics ─────────────────────────────── */}
          {step === "basics" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>{t("marketRegister.aboutMarket")}</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  {t("marketRegister.aboutMarketBody")}
                </Text>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.marketName")} *</Text>
                <TextInput
                  value={form.name}
                  onChangeText={(v) => set("name", v)}
                  placeholder="Sarasota Farmers Market"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.city")} *</Text>
                <TextInput
                  value={form.city}
                  onChangeText={(v) => set("city", v)}
                  placeholder="Sarasota"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                  autoCapitalize="words"
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.streetAddress")}</Text>
                <TextInput
                  value={form.address}
                  onChangeText={(v) => set("address", v)}
                  placeholder="1st St & Lemon Ave"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.marketDay")}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {DAY_KEYS.map((d) => {
                    const DAY_LABEL_MAP: Record<string, string> = {
                      "Monday": t("marketRegister.dayMon"),
                      "Tuesday": t("marketRegister.dayTue"),
                      "Wednesday": t("marketRegister.dayWed"),
                      "Thursday": t("marketRegister.dayThu"),
                      "Friday": t("marketRegister.dayFri"),
                      "Saturday": t("marketRegister.daySat"),
                      "Sunday": t("marketRegister.daySun"),
                    };
                    return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => set("day", form.day === d ? "" : d)}
                      style={[
                        s.chip,
                        {
                          backgroundColor: form.day === d ? "#166534" : c.card,
                          borderColor: form.day === d ? "#166534" : c.border,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.chipText, { color: form.day === d ? "#fff" : c.foreground }]}>
                        {DAY_LABEL_MAP[d] ?? d.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.hours")}</Text>
                <TextInput
                  value={form.time}
                  onChangeText={(v) => set("time", v)}
                  placeholder="7am – 1pm"
                  placeholderTextColor={c.mutedForeground}
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.description")}</Text>
                <TextInput
                  value={form.description}
                  onChangeText={(v) => set("description", v)}
                  placeholder={t("marketRegister.descriptionPlaceholder")}
                  placeholderTextColor={c.mutedForeground}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[s.input, s.textarea, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.tags")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {TAG_KEYS.map((tag) => {
                    const on = form.tags.includes(tag);
                    const TAG_LABEL_MAP: Record<string, string> = {
                      "Organic": t("marketRegister.tagOrganic"),
                      "Dog-Friendly": t("marketRegister.tagDogFriendly"),
                      "Live Music": t("marketRegister.tagLiveMusic"),
                      "Kids Activities": t("marketRegister.tagKidsActivities"),
                      "Prepared Foods": t("marketRegister.tagPreparedFoods"),
                      "Plants & Flowers": t("marketRegister.tagPlantsFlowers"),
                      "Artisan Crafts": t("marketRegister.tagArtisanCrafts"),
                      "Year-Round": t("marketRegister.tagYearRound"),
                      "Seasonal": t("marketRegister.tagSeasonal"),
                      "Indoor": t("marketRegister.tagIndoor"),
                      "Outdoor": t("marketRegister.tagOutdoor"),
                    };
                    return (
                      <TouchableOpacity
                        key={tag}
                        onPress={() => toggleTag(tag)}
                        style={[
                          s.chip,
                          {
                            backgroundColor: on ? "#166534" : c.card,
                            borderColor: on ? "#166534" : c.border,
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, { color: on ? "#fff" : c.foreground }]}>
                          {TAG_LABEL_MAP[tag] ?? tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Map picker */}
              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.pinYourLocation")}</Text>
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

          {/* ── Step 1: Contact ────────────────────────────── */}
          {step === "contact" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>{t("marketRegister.contactDetails")}</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  {t("marketRegister.contactDetailsBody")}
                </Text>
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.contactEmail")} *</Text>
                <TextInput
                  value={form.contactEmail}
                  onChangeText={(v) => set("contactEmail", v)}
                  placeholder="manager@yourmarket.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.phone")}</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(v) => set("phone", v)}
                  placeholder="(941) 555-0100"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="phone-pad"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.website")}</Text>
                <TextInput
                  value={form.websiteUrl}
                  onChangeText={(v) => set("websiteUrl", v)}
                  placeholder="https://yourmarket.com"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.instagramHandle")}</Text>
                <TextInput
                  value={form.instagramHandle}
                  onChangeText={(v) => set("instagramHandle", v)}
                  placeholder="sarasotafarmersmarket"
                  placeholderTextColor={c.mutedForeground}
                  autoCapitalize="none"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>

              <View style={s.fieldGap}>
                <Text style={[s.label, { color: c.foreground }]}>{t("marketRegister.logoUrl")}</Text>
                <TextInput
                  value={form.logoUrl}
                  onChangeText={(v) => set("logoUrl", v)}
                  placeholder="https://…/logo.png"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="url"
                  autoCapitalize="none"
                  style={[s.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.muted }]}
                />
              </View>
            </View>
          )}

          {/* ── Step 2: Confirm ────────────────────────────── */}
          {step === "confirm" && (
            <View style={{ gap: 18 }}>
              <View>
                <Text style={[s.h1, { color: c.foreground }]}>{t("marketRegister.reviewAndSubmit")}</Text>
                <Text style={[s.body, { color: c.mutedForeground, marginTop: 4 }]}>
                  {t("marketRegister.reviewBody")}
                </Text>
              </View>

              <View style={[s.reviewCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Row label={t("marketRegister.rowName")} value={form.name} colors={c} />
                <Row label={t("marketRegister.rowCity")} value={form.city} colors={c} />
                {form.address ? <Row label={t("marketRegister.rowAddress")} value={form.address} colors={c} /> : null}
                {form.day ? <Row label={t("marketRegister.rowDay")} value={({
                    "Monday": t("marketRegister.dayMon"),
                    "Tuesday": t("marketRegister.dayTue"),
                    "Wednesday": t("marketRegister.dayWed"),
                    "Thursday": t("marketRegister.dayThu"),
                    "Friday": t("marketRegister.dayFri"),
                    "Saturday": t("marketRegister.daySat"),
                    "Sunday": t("marketRegister.daySun"),
                  } as Record<string, string>)[form.day] ?? form.day} colors={c} /> : null}
                {form.time ? <Row label={t("marketRegister.rowHours")} value={form.time} colors={c} /> : null}
                <Row label={t("marketRegister.rowEmail")} value={form.contactEmail} colors={c} />
                {form.phone ? <Row label={t("marketRegister.rowPhone")} value={form.phone} colors={c} /> : null}
                {form.latitude != null && form.longitude != null ? (
                  <Row
                    label={t("marketRegister.rowPin")}
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
              { backgroundColor: "#166534", opacity: canAdvance ? 1 : 0.4 },
            ]}
            onPress={step === "confirm" ? handleSubmit : advance}
            disabled={!canAdvance || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.nextBtnText}>
                  {step === "confirm" ? t("marketRegister.listMyMarket") : t("marketRegister.continue")}
                </Text>}
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
      <Text style={[s.reviewLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[s.reviewValue, { color: colors.foreground }]} numberOfLines={2}>
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
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 4 },
  h1: { fontFamily: "DMSans_700Bold", fontSize: 24, fontWeight: "700" },
  body: { fontFamily: "DMSans_400Regular", fontSize: 14, lineHeight: 20 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 13, marginBottom: 6 },
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
  nextBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  nextBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 },
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
  reviewLabel: { fontFamily: "DMSans_500Medium", fontSize: 13, width: 70 },
  reviewValue: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13 },
  doneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  doneIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  doneTitle: { fontFamily: "DMSans_700Bold", fontSize: 26, fontWeight: "700" },
  doneBody: { fontFamily: "DMSans_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  doneBtnText: { color: "#fff", fontFamily: "DMSans_700Bold", fontSize: 15 },
});
