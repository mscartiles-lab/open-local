import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export function OnboardingGate() {
  const { loading, user, hasSeenOnboarding, markOnboardingSeen } = useAuth();
  const colors = useColors();

  const visible = !loading && !user && !hasSeenOnboarding;

  const handleChoose = async (role: "shopper" | "vendor") => {
    await markOnboardingSeen();
    router.push({ pathname: "/(auth)/signup", params: { role } });
  };

  const handleSkip = async () => {
    await markOnboardingSeen();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={[styles.icon, { backgroundColor: colors.primary }]}>
            <Feather name="map-pin" size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Welcome to Open Local
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Local Sourcing and Experiences
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            How will you use Open Local?
          </Text>

          <Pressable
            style={[styles.choice, { borderColor: colors.primary }]}
            onPress={() => handleChoose("shopper")}
          >
            <View
              style={[styles.choiceIcon, { backgroundColor: colors.primary }]}
            >
              <Feather name="shopping-bag" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
                I'm a shopper
              </Text>
              <Text
                style={[
                  styles.choiceBody,
                  { color: colors.mutedForeground },
                ]}
              >
                Discover local makers, batch drops & events
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            style={[styles.choice, { borderColor: colors.primary }]}
            onPress={() => handleChoose("vendor")}
          >
            <View
              style={[styles.choiceIcon, { backgroundColor: "#c0622f" }]}
            >
              <Feather name="briefcase" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.choiceTitle, { color: colors.foreground }]}>
                I'm a vendor or business
              </Text>
              <Text
                style={[
                  styles.choiceBody,
                  { color: colors.mutedForeground },
                ]}
              >
                List products, run pre-orders, reach locals
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          </Pressable>

          <Pressable onPress={handleSkip} style={styles.skip}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Maybe later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 22,
  },
  tagline: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    marginTop: -6,
  },
  body: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 6,
    textAlign: "center",
  },
  choice: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
  },
  choiceBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  skip: {
    marginTop: 8,
    padding: 8,
  },
  skipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
});
