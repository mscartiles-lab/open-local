import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const THEME_KEY = "ol_theme_pref";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === "dark" || val === "light") setThemeState(val);
    });
  }, []);

  const setTheme = useCallback(async (t: ThemeMode) => {
    setThemeState(t);
    await AsyncStorage.setItem(THEME_KEY, t);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = theme === "light" ? "dark" : "light";
    setThemeState(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
