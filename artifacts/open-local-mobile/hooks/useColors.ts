import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

type ColorPalette = typeof colors.light;
type ColorsWithRadius = ColorPalette & { radius: number };

export function useColors(): ColorsWithRadius {
  const { theme } = useTheme();
  const palette: ColorPalette =
    theme === "dark" && "dark" in colors
      ? (colors.dark as ColorPalette)
      : colors.light;
  return { ...palette, radius: colors.radius };
}
