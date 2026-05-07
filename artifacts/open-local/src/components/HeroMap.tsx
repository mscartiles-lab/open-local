import { useListVendors, useListEstablishments } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  CircleMarker,
  useMap,
} from "react-leaflet";
import { Link } from "wouter";
import { useState, useEffect, useCallback } from "react";

// Fix Leaflet marker icons broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const VENDOR_ICON = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#c07218;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -17],
});

const EST_ICON = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:7px;background:#c0622f;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -17],
});

const FLORIDA_CENTER: [number, number] = [27.6, -82.5];
const MILES_TO_METERS = 1609.344;
const QUICK_PICKS = [5, 10, 25, 50] as const;

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
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

function zoomForRadius(miles: number): number {
  // Hyper-local at small radius, regional at large
  if (miles <= 5) return 13;
  if (miles <= 10) return 12;
  if (miles <= 25) return 11;
  return 10;
}

function MapFlyTo({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  // Only fly when the user's position itself changes (e.g., re-locate),
  // not when zoom/radius changes — that would yank the user away from
  // wherever they've panned to.
  useEffect(() => {
    map.flyTo(position, zoom, { duration: 1.2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position[0], position[1]]);
  return null;
}

export default function HeroMap() {
  const { data: vendors } = useListVendors();
  const { data: establishments } = useListEstablishments();

  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(5);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location access denied. Enable it in your browser settings."
            : "Couldn't pinpoint you. Try the locate button again.",
        );
        setLocating(false);
      },
      // High accuracy = use real GPS where available instead of IP/wifi fallback.
      // maximumAge: 0 forces a fresh fix instead of a stale cached one.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => { locate(); }, []);

  const mappedVendors = (vendors ?? []).filter(
    (v) => v.latitude != null && v.longitude != null,
  );
  const mappedEstablishments = (establishments ?? []).filter(
    (e) => e.latitude != null && e.longitude != null,
  );

  const visibleVendors = userPos
    ? mappedVendors.filter(
        (v) => haversineMiles(userPos[0], userPos[1], v.latitude!, v.longitude!) <= radius,
      )
    : mappedVendors;

  const visibleEstablishments = userPos
    ? mappedEstablishments.filter(
        (e) => haversineMiles(userPos[0], userPos[1], e.latitude!, e.longitude!) <= radius,
      )
    : mappedEstablishments;

  const totalVisible = visibleVendors.length + visibleEstablishments.length;

  return (
    <section className="relative w-full" style={{ height: "calc(100vh - 57px)" }}>
      <MapContainer
        center={FLORIDA_CENTER}
        zoom={9}
        scrollWheelZoom
        zoomControl={true}
        minZoom={3}
        maxZoom={18}
        doubleClickZoom
        touchZoom
        attributionControl={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO'
        />

        {userPos && <MapFlyTo position={userPos} zoom={zoomForRadius(radius)} />}

        {userPos && (
          <Circle
            center={userPos}
            radius={radius * MILES_TO_METERS}
            pathOptions={{
              color: "#c07218",
              weight: 1.5,
              fillColor: "#c07218",
              fillOpacity: 0.07,
            }}
          />
        )}

        {userPos && (
          <CircleMarker
            center={userPos}
            radius={8}
            pathOptions={{
              color: "#fff",
              weight: 2.5,
              fillColor: "#c07218",
              fillOpacity: 1,
            }}
          />
        )}

        {visibleVendors.map((v) => (
          <Marker key={`v-${v.id}`} position={[v.latitude!, v.longitude!]} icon={VENDOR_ICON}>
            <Popup>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7a3f08] mb-0.5">Vendor</div>
              <div className="text-sm font-medium leading-snug">{v.name}</div>
              <div className="text-xs text-gray-500 mb-1">{v.location}</div>
              {userPos && (
                <div className="text-xs text-[#7a3f08] font-medium mb-1">
                  {haversineMiles(userPos[0], userPos[1], v.latitude!, v.longitude!).toFixed(1)} mi away
                </div>
              )}
              <a href={`/vendors/${v.slug}`} className="text-xs text-[#c07218] font-semibold hover:underline">
                View vendor →
              </a>
            </Popup>
          </Marker>
        ))}

        {visibleEstablishments.map((e) => (
          <Marker key={`e-${e.id}`} position={[e.latitude!, e.longitude!]} icon={EST_ICON}>
            <Popup>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#c0622f] mb-0.5">{e.type}</div>
              <div className="text-sm font-medium leading-snug">{e.name}</div>
              <div className="text-xs text-gray-500 mb-1">{e.city}, {e.state}</div>
              {userPos && (
                <div className="text-xs text-[#c0622f] font-medium mb-1">
                  {haversineMiles(userPos[0], userPos[1], e.latitude!, e.longitude!).toFixed(1)} mi away
                </div>
              )}
              {e.website && (
                <a href={e.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#c0622f] font-semibold hover:underline">
                  Visit website →
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-md flex items-center gap-2 pointer-events-auto">
          <span className="font-serif font-bold text-[#7a3f08] text-lg leading-none">The Locals</span>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <Link
            href="/products"
            className="bg-white/95 backdrop-blur-sm text-[#7a3f08] px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-white transition-colors"
          >
            Browse Goods
          </Link>
          <Link
            href="/pin-your-business"
            className="bg-[#c07218] text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md hover:bg-[#a85e10] transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Pin Your Business
          </Link>
        </div>
      </div>

      {/* Floating radius + locate controls */}
      <div
        className="absolute bottom-6 left-4 flex flex-col gap-2 pointer-events-auto"
        style={{ zIndex: 10 }}
      >
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-3 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Radius</span>
            <span className="text-sm font-bold text-[#7a3f08]">{radius} mi</span>
          </div>
          <div className="flex gap-1.5">
            {QUICK_PICKS.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  radius === r
                    ? "bg-[#c07218] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#c07218] inline-block mt-0.5 flex-shrink-0" />
            <span className="w-3 h-3 rounded-[3px] bg-[#c0622f] inline-block mt-0.5 flex-shrink-0" />
          </div>
          <span className="text-xs text-gray-700">
            {userPos
              ? `${totalVisible} place${totalVisible !== 1 ? "s" : ""} within ${radius} mi`
              : `${totalVisible} place${totalVisible !== 1 ? "s" : ""} on the map`}
          </span>
        </div>

        {locationError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-md px-3 py-2 max-w-[220px]">
            <p className="text-xs text-amber-700">{locationError}</p>
          </div>
        )}
      </div>

      {/* Locate me button */}
      <button
        onClick={locate}
        disabled={locating}
        title="Use my location"
        className="absolute bottom-6 right-4 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-60 pointer-events-auto"
        style={{ zIndex: 10 }}
      >
        {locating ? (
          <svg className="animate-spin w-5 h-5 text-[#c07218]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c07218" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <path d="M12 8a4 4 0 100 8 4 4 0 000-8z"/>
          </svg>
        )}
      </button>

      {/* Legend */}
      <div
        className="absolute top-16 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md flex flex-col gap-1.5"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#c07218] flex-shrink-0" />
          <span className="text-xs text-gray-700 font-medium">Vendors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-[3px] bg-[#c0622f] flex-shrink-0" />
          <span className="text-xs text-gray-700 font-medium">Establishments</span>
        </div>
      </div>
    </section>
  );
}
