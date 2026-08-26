import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { getBaseUrl } from "@/lib/api-client/custom-fetch";
import { useColors } from "@/hooks/useColors";

type ApiErrorDetailsProps = {
  errors: Array<{
    label: string;
    error: unknown;
  }>;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function formatError(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as {
      status?: unknown;
      statusText?: unknown;
      url?: unknown;
    };
    if (typeof candidate.status === "number") {
      const statusText =
        typeof candidate.statusText === "string" && candidate.statusText
          ? ` ${candidate.statusText}`
          : "";
      const requestUrl =
        typeof candidate.url === "string" && candidate.url
          ? `\nRequest: ${candidate.url}`
          : "";
      return `HTTP status: ${candidate.status}${statusText}\nError: ${errorMessage(error)}${requestUrl}`;
    }
  }

  return `Network/fetch error: ${errorMessage(error)}`;
}

export function ApiErrorDetails({ errors }: ApiErrorDetailsProps) {
  const colors = useColors();
  const availableErrors = errors.filter(({ error }) => error != null);
  if (availableErrors.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.heading, { color: colors.foreground }]}>
        Diagnostic details
      </Text>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>
        API base: {getBaseUrl()}
      </Text>
      {availableErrors.map(({ label, error }) => (
        <Text key={label} style={[styles.detail, { color: colors.mutedForeground }]}>
          {label}: {formatError(error)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  heading: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
  },
  detail: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
});