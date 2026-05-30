import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
        <Label>Vendors</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goods">
        <Icon sf={{ default: "basket", selected: "basket.fill" }} />
        <Label>Goods</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="listings">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Listings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="sale">
        <Icon sf={{ default: "tag", selected: "tag.fill" }} />
        <Label>Sale</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="events">
        <Icon sf={{ default: "calendar", selected: "calendar" }} />
        <Label>Events</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="favorites">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>Favorites</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isWeb ? 34 : insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vendors",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="storefront" tintColor={color} size={22} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="goods"
        options={{
          title: "Goods",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="basket" tintColor={color} size={22} />
            ) : (
              <Feather name="shopping-bag" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: "Listings",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="sale"
        options={{
          title: "Sale",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="tag" tintColor={color} size={22} />
            ) : (
              <Feather name="tag" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={22} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="heart" tintColor={color} size={22} />
            ) : (
              <Feather name="heart" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen name="final-sale" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
