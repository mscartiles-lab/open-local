import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import Avatar from "@/components/Avatar";
import { useAuth, type AppUser } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";
import { AVATAR_STYLES, type AvatarStyle } from "@/lib/unlockCatalog";

type Step = "role" | "profile" | "avatar" | "email" | "verify";

interface StartResponse {
  verificationId: number;
  email: string;
  expiresAt: string;
  devFallback: boolean;
  devCode: string | null;
}

interface VerifyResponse {
  user: AppUser;
  sessionToken: string;
  sessionExpiresAt: string;
}

export default function SignupScreen() {
  const colors = useColors();
  const { setSession } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const initialRole: "vendor" | "shopper" =
    params.role === "vendor" ? "vendor" : "shopper";

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"vendor" | "shopper">(initialRole);
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [zip, setZip] = useState("");
  const [locating, setLocating] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("thumbs");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRole && step === "role") {
      // Pre-selected from onboarding modal — let user confirm with one tap
    }
  }, [initialRole, step]);

  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const t = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const data = await apiFetch<{ available: boolean }>(
          `/api/auth/check-username?username=${encodeURIComponent(username)}`,
        );
        setUsernameAvailable(data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const useMyLocation = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location permission",
          "Allow location to auto-fill your ZIP, or enter it manually.",
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      const place = places[0];
      if (place?.postalCode) setZip(place.postalCode);
    } catch {
      // ignore
    } finally {
      setLocating(false);
    }
  }, []);

  const startVerification = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<StartResponse>("/api/auth/signup/start", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          role,
          zip: zip.trim() || undefined,
          state: "FL",
          avatarSeed: username.trim().toLowerCase(),
          avatarStyle,
        }),
      });
      setVerificationId(res.verificationId);
      setDevCode(res.devFallback ? res.devCode : null);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!verificationId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<StartResponse>("/api/auth/signup/resend", {
        method: "POST",
        body: JSON.stringify({ verificationId }),
      });
      setDevCode(res.devFallback ? res.devCode : null);
      Alert.alert("Code resent", "Check your email for a new 6-digit code.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend code");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch<VerifyResponse>("/api/auth/signup/verify", {
        method: "POST",
        body: JSON.stringify({ verificationId, code: code.trim() }),
      });
      await setSession(res.sessionToken, res.user);
      router.replace("/");
      if (res.user.role === "vendor") {
        setTimeout(() => router.push("/(auth)/tiers"), 300);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setSubmitting(false);
    }
  };

  const canNext = useMemo(() => {
    switch (step) {
      case "role":
        return !!role;
      case "profile":
        return username.length >= 3 && usernameAvailable === true;
      case "avatar":
        return !!avatarStyle;
      case "email":
        return /.+@.+\..+/.test(email);
      case "verify":
        return code.length === 6;
    }
  }, [step, role, username, usernameAvailable, avatarStyle, email, code]);

  const next = () => {
    setError(null);
    if (step === "role") setStep("profile");
    else if (step === "profile") setStep("avatar");
    else if (step === "avatar") setStep("email");
    else if (step === "email") startVerification();
    else if (step === "verify") verifyCode();
  };

  const back = () => {
    setError(null);
    if (step === "profile") setStep("role");
    else if (step === "avatar") setStep("profile");
    else if (step === "email") setStep("avatar");
    else if (step === "verify") setStep("email");
    else router.back();
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={back} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {step === "verify" ? "Verify email" : "Join Open Local"}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === "role" && (
            <View style={{ gap: 14 }}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                I'm joining as a…
              </Text>
              <RoleChip
                active={role === "shopper"}
                onPress={() => setRole("shopper")}
                title="Shopper"
                body="Discover local makers, save favorites, earn avatar unlocks"
                colors={colors}
              />
              <RoleChip
                active={role === "vendor"}
                onPress={() => setRole("vendor")}
                title="Vendor / Business"
                body="List products, run pre-orders & batch drops"
                colors={colors}
              />
            </View>
          )}

          {step === "profile" && (
            <View style={{ gap: 16 }}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                Pick a username
              </Text>
              <View>
                <TextInput
                  value={username}
                  onChangeText={(v) =>
                    setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())
                  }
                  placeholder="yourname"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.hint,
                    {
                      color:
                        usernameAvailable === false
                          ? "#c0622f"
                          : usernameAvailable === true
                            ? colors.primary
                            : colors.mutedForeground,
                    },
                  ]}
                >
                  {checkingUsername
                    ? "Checking…"
                    : usernameAvailable === true
                      ? "✓ Available"
                      : usernameAvailable === false
                        ? "Already taken"
                        : "3–24 letters, numbers, underscores"}
                </Text>
              </View>

              <Text style={[styles.label, { color: colors.foreground }]}>
                ZIP code (optional)
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={zip}
                  onChangeText={setZip}
                  placeholder="33101"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      color: colors.foreground,
                      borderColor: colors.border,
                      backgroundColor: colors.muted,
                    },
                  ]}
                />
                <Pressable
                  onPress={useMyLocation}
                  disabled={locating}
                  style={[
                    styles.iconBtn,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                >
                  {locating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Feather name="navigation" size={18} color={colors.primary} />
                  )}
                </Pressable>
              </View>
            </View>
          )}

          {step === "avatar" && (
            <View style={{ gap: 16 }}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                Pick your look
              </Text>
              <View style={styles.avatarGrid}>
                {AVATAR_STYLES.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setAvatarStyle(s)}
                    style={[
                      styles.avatarTile,
                      {
                        borderColor:
                          avatarStyle === s ? colors.primary : colors.border,
                        backgroundColor: colors.muted,
                      },
                    ]}
                  >
                    <Avatar seed={username || "preview"} style={s} size={56} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === "email" && (
            <View style={{ gap: 16 }}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                What's your email?
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                We'll send a 6-digit code to verify it.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                  },
                ]}
              />
            </View>
          )}

          {step === "verify" && (
            <View style={{ gap: 16 }}>
              <Text style={[styles.h1, { color: colors.foreground }]}>
                Enter the code
              </Text>
              <Text style={[styles.body, { color: colors.mutedForeground }]}>
                We sent a 6-digit code to {email}. It expires in 10 minutes.
              </Text>
              {devCode ? (
                <View
                  style={[
                    styles.devBanner,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                >
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Demo mode — your code is {devCode}
                  </Text>
                </View>
              ) : null}
              <TextInput
                value={code}
                onChangeText={(v) =>
                  setCode(v.replace(/[^0-9]/g, "").slice(0, 6))
                }
                placeholder="000000"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={6}
                style={[
                  styles.input,
                  styles.codeInput,
                  {
                    color: colors.foreground,
                    borderColor: colors.border,
                    backgroundColor: colors.muted,
                  },
                ]}
              />
              <Pressable onPress={resendCode} disabled={submitting}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Resend code
                </Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: "#c0622f" }]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={next}
            disabled={!canNext || submitting}
            style={[
              styles.primaryBtn,
              {
                backgroundColor:
                  !canNext || submitting ? colors.muted : colors.primary,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {step === "email"
                  ? "Send code"
                  : step === "verify"
                    ? "Verify & continue"
                    : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleChip({
  active,
  onPress,
  title,
  body,
  colors,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  body: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roleChip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.muted : colors.background,
          borderWidth: active ? 2 : 1,
        },
      ]}
    >
      <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: "DMSans_700Bold", fontSize: 17 },
  scroll: { padding: 20, gap: 16, paddingBottom: 40 },
  h1: { fontFamily: "DMSans_700Bold", fontSize: 22 },
  body: { fontFamily: "DMSans_400Regular", fontSize: 14 },
  label: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  input: {
    fontFamily: "DMSans_500Medium",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center" },
  hint: { fontFamily: "DMSans_400Regular", fontSize: 12, marginTop: 6 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChip: {
    padding: 16,
    borderRadius: 14,
    gap: 4,
  },
  choiceTitle: { fontFamily: "DMSans_600SemiBold", fontSize: 16 },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  avatarTile: {
    width: 80,
    height: 80,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  devBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  linkText: { fontFamily: "DMSans_600SemiBold", fontSize: 14 },
  errorText: { fontFamily: "DMSans_500Medium", fontSize: 13 },
  footer: {
    padding: 16,
    paddingBottom: 24,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
});
