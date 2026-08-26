import { useState, useCallback } from "react";

export const PROXIMITY_PICKS = [0.5, 1, 2, 5] as const;
export const PROXIMITY_LABELS: Record<number, string> = {
  0.5: "½ mi",
  1: "1 mi",
  2: "2 mi",
  5: "5 mi",
};

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface UserPos {
  latitude: number;
  longitude: number;
}

export function useProximity(defaultRadius = 1) {
  const [userPos, setUserPos] = useState<UserPos | null>(null);
  const [radius, setRadius] = useState(defaultRadius);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enable it in your browser settings."
            : "Couldn't get your location. Try again.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  const clear = useCallback(() => {
    setUserPos(null);
    setLocationError(null);
  }, []);

  return { userPos, radius, setRadius, locating, locationError, locate, clear };
}
