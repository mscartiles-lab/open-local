"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { MapPin, LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix default icon paths broken by webpack/vite bundlers
const DefaultIcon = L.icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const FLORIDA_CENTER: [number, number] = [27.8, -81.7];
const DEFAULT_ZOOM = 7;
const PINNED_ZOOM = 15;

interface Props {
  /** Called whenever the pin position changes */
  onChange: (lat: number, lng: number) => void;
  /** Optional: hint address/city to geocode on mount */
  hint?: string;
  initialLat?: number | null;
  initialLng?: number | null;
}

/** Inner component that handles map click events */
function ClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Geocode an address string using Nominatim (no API key needed) */
async function geocode(query: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + " FL USA")}`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch {
    return null;
  }
}

export function LocationPicker({ onChange, hint, initialLat, initialLng }: Props) {
  const { t } = useTranslation();
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat != null && initialLng != null ? [initialLat, initialLng] : null,
  );
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Auto-geocode from hint on mount (if no initial position set)
  useEffect(() => {
    if (position || !hint || hint.trim().length < 2) return;
    setGeocoding(true);
    geocode(hint).then((result) => {
      if (result) {
        setPosition(result);
        onChange(result[0], result[1]);
        mapRef.current?.setView(result, PINNED_ZOOM);
      }
      setGeocoding(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint]);

  const handleMapClick = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange(lat, lng);
  };

  const handleDragEnd = (e: L.DragEndEvent) => {
    const m = e.target as L.Marker;
    const ll = m.getLatLng();
    setPosition([ll.lat, ll.lng]);
    onChange(ll.lat, ll.lng);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(ll);
        onChange(ll[0], ll[1]);
        mapRef.current?.setView(ll, PINNED_ZOOM);
        setLocating(false);
      },
      () => setLocating(false),
    );
  };

  const handleGeocode = async () => {
    if (!hint || hint.trim().length < 2) return;
    setGeocoding(true);
    const result = await geocode(hint);
    if (result) {
      setPosition(result);
      onChange(result[0], result[1]);
      mapRef.current?.setView(result, PINNED_ZOOM);
    }
    setGeocoding(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGeolocate}
          disabled={locating}
          className="gap-1.5 text-xs"
        >
          <LocateFixed className="w-3.5 h-3.5" />
          {locating ? t("locationPicker.locating") : t("locationPicker.useMyLocation")}
        </Button>
        {hint && hint.trim().length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGeocode}
            disabled={geocoding}
            className="gap-1.5 text-xs"
          >
            <Search className="w-3.5 h-3.5" />
            {geocoding ? t("locationPicker.finding") : t("locationPicker.findOnMap")}
          </Button>
        )}
        {position && (
          <span className="text-xs text-muted-foreground ml-auto">
            <MapPin className="w-3 h-3 inline mr-0.5" />
            {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </span>
        )}
      </div>

      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: 280 }}>
        {!position && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center pb-4">
            <p className="text-xs bg-background/90 text-foreground rounded-full px-3 py-1.5 shadow-sm border border-border">
              {t("locationPicker.clickMapHint")}
            </p>
          </div>
        )}
        <MapContainer
          center={position ?? FLORIDA_CENTER}
          zoom={position ? PINNED_ZOOM : DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={handleMapClick} />
          {position && (
            <Marker
              position={position}
              draggable
              eventHandlers={{ dragend: handleDragEnd }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("locationPicker.dragHint")}
      </p>
    </div>
  );
}
