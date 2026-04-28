import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

type ColorPalette = typeof colors.light;
type ColorsWithRadius = ColorPalette & { radius: number };

export function useColors(): ColorsWithRadius {
  const scheme = useColorScheme();
  const palette: ColorPalette =
    scheme === "dark" && "dark" in colors
      ? (colors.dark as ColorPalette)
      : colors.light;
  return { ...palette, radius: colors.radius };
}
