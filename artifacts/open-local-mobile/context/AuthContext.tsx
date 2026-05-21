import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiFetch } from "@/lib/api";
import type { AvatarStyle } from "@/lib/unlockCatalog";

const SESSION_KEY = "ol_session";
const SEEN_ONBOARDING_KEY = "ol_seen_onboarding_v1";

export interface AppUser {
  id: number;
  email: string;
  username: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
  role: "vendor" | "shopper";
  zip: string | null;
  state: string;
  paused: boolean;
  trialEndsAt: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  sessionToken: string | null;
  setSession: (token: string, user: AppUser) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);

  const loadMe = useCallback(async (token: string) => {
    try {
      const data = await apiFetch<{ user: AppUser }>("/api/auth/me", { token });
      setUser(data.user);
    } catch {
      await AsyncStorage.removeItem(SESSION_KEY);
      setSessionToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, seen] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(SEEN_ONBOARDING_KEY),
        ]);
        setHasSeenOnboarding(seen === "1");
        if (token) {
          setSessionToken(token);
          await loadMe(token);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe]);

  const setSession = useCallback(
    async (token: string, nextUser: AppUser) => {
      await AsyncStorage.setItem(SESSION_KEY, token);
      setSessionToken(token);
      setUser(nextUser);
      await AsyncStorage.setItem(SEEN_ONBOARDING_KEY, "1");
      setHasSeenOnboarding(true);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    if (sessionToken) await loadMe(sessionToken);
  }, [sessionToken, loadMe]);

  const logout = useCallback(async () => {
    const token = sessionToken;
    setUser(null);
    setSessionToken(null);
    await AsyncStorage.removeItem(SESSION_KEY);
    if (token) {
      try {
        await apiFetch("/api/auth/logout", { method: "POST", token });
      } catch {
        // ignore
      }
    }
  }, [sessionToken]);

  const markOnboardingSeen = useCallback(async () => {
    await AsyncStorage.setItem(SEEN_ONBOARDING_KEY, "1");
    setHasSeenOnboarding(true);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      sessionToken,
      setSession,
      refreshUser,
      logout,
      hasSeenOnboarding,
      markOnboardingSeen,
    }),
    [
      user,
      loading,
      sessionToken,
      setSession,
      refreshUser,
      logout,
      hasSeenOnboarding,
      markOnboardingSeen,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
