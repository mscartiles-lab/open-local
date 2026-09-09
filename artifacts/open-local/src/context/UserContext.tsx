import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type UserRole = "vendor" | "shopper" | "admin";
export type AvatarStyle =
  | "thumbs"
  | "adventurer"
  | "fun-emoji"
  | "pixel-art"
  | "avataaars"
  | "big-smile"
  | "bottts"
  | "lorelei"
  | "micah"
  | "miniavs"
  | "notionists"
  | "open-peeps"
  | "personas"
  | "croodles";

export interface AppUser {
  id: number;
  email: string;
  username: string;
  avatarSeed: string;
  avatarStyle: AvatarStyle;
  role: UserRole;
  zip?: string | null;
  state: string;
  tier?: "basic" | "middle" | "premium" | null;
  equippedUnlocks?: string[];
  paused?: boolean;
  trialEndsAt?: string | null;
  vendorSlug?: string | null;
}

// Plain DiceBear URL for the base avatar. Equipped wardrobe items are now
// rendered as PNG overlays via the <Avatar> component (see components/Avatar.tsx).
export function avatarUrl(seed: string, style: AvatarStyle): string {
  const params = new URLSearchParams({
    seed,
    backgroundColor: "fef3c7,fed7aa,fde68a,fdba74",
  });
  return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
}

const SESSION_KEY = "ol_session";
const ONBOARDING_DISMISSED_KEY = "ol_onboarding_dismissed";

interface UserContextType {
  user: AppUser | null;
  isLoading: boolean;
  login: (sessionToken: string, user: AppUser) => void;
  refreshUser: () => Promise<AppUser | null>;
  logout: () => void;
  showOnboarding: boolean;
  loginMode: boolean;
  openOnboarding: () => void;
  openLogin: () => void;
  closeOnboarding: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loginMode, setLoginMode] = useState(false);

  const refreshUser = useCallback(async (): Promise<AppUser | null> => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = response.ok ? await response.json() : null;
      if (data?.user) {
        const currentUser = data.user as AppUser;
        setUser(currentUser);
        return currentUser;
      }
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback((sessionToken: string, loggedInUser: AppUser) => {
    localStorage.setItem(SESSION_KEY, sessionToken);
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setUser(loggedInUser);
    setShowOnboarding(false);
    void refreshUser();
  }, [refreshUser]);

  const logout = useCallback(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  const openOnboarding = useCallback(() => {
    setLoginMode(false);
    setShowOnboarding(true);
  }, []);

  const openLogin = useCallback(() => {
    setLoginMode(true);
    setShowOnboarding(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "1");
    setShowOnboarding(false);
    setLoginMode(false);
  }, []);

  return (
    <UserContext.Provider
      value={{ user, isLoading, login, refreshUser, logout, showOnboarding, loginMode, openOnboarding, openLogin, closeOnboarding }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
