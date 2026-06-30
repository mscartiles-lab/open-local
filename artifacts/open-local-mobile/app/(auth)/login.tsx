import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

import { useAuth, type AppUser } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

type Step = "email" | "verify";

interface LoginStartResponse {
  verificationId: number;
  devFallback?: boolean;
  devCode?: string | null;
}

interface LoginVerifyResponse {
  user: AppUser;
  sessionToken: string;
}

export default function LoginScreen() {
  const colors = useColors();
  const { setSession } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState<number | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<LoginStartResponse>("/api/auth/login/start", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setVerificationId(data.verificationId);
      setDevCode(data.devCode ?? null);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<LoginVerifyResponse>("/api/auth/login/verify", {
        method: "POST",
        body: JSON.stringify({ verificationId, code }),
      });
      await setSession(data.sessionToken, data.user);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    setStep("email");
    setCode("");
    setVerificationId(null);
    setDevCode(null);
    setError(null);
  };

  const canProceed = step === "email" ? emailValid : code.length === 6;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>

          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Feather name="log-in" size={26} color="#fff" />
          </View>

          <Text style={[styles.h1, { color: colors.foreground }]}>
            {step === "email" ? "Welcome back" : "Enter your code"}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {step === "email"
              ? "Enter the email you signed up with and we'll send you a login code."
              : `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
          </Text>

          {/* Email step */}
          {step === "email" && (
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                },
              ]}
            />
          )}

          {/* Verify step */}
          {step === "verify" && (
            <View style={{ gap: 12, width: "100%" }}>
              {devCode ? (
                <View style={[styles.devBanner, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    Demo mode — your code is {devCode}
                  </Text>
                </View>
              ) : null}
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
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
              <Pressable onPress={resendCode}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Resend code
                </Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text style={[styles.errorText, { color: "#c0622f" }]}>{error}</Text>
          ) : null}

          {/* Primary button */}
          <Pressable
            onPress={step === "email" ? sendCode : verifyCode}
            disabled={!canProceed || submitting}
            style={[
              styles.primaryBtn,
              { backgroundColor: !canProceed || submitting ? colors.muted : colors.primary },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {step === "email" ? "Send code" : "Sign in"}
              </Text>
            )}
          </Pressable>

          {/* Switch to sign up */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              Don't have an account?{" "}
            </Text>
            <Pressable onPress={() => router.replace("/(auth)/signup" as any)}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>
                Sign up
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 8,
    padding: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  h1: {
    fontFamily: "DMSans_700Bold",
    fontSize: 26,
    textAlign: "center",
  },
  sub: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
  },
  codeInput: {
    textAlign: "center",
    fontSize: 28,
    letterSpacing: 8,
    fontFamily: "DMSans_700Bold",
  },
  devBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: "100%",
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  linkText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  primaryBtn: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  switchText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
  },
  switchLink: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
  },
});
