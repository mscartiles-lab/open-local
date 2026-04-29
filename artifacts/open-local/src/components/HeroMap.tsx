import { useListVendors, useListEstablishments } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "wouter";

// Fix Leaflet default marker icon broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Vendor pin — olive green with bag icon
const vendorIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:30px;height:30px;border-radius:50%;
    background:#3c4a26;border:2.5px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f8f7f2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

// Establishment pin — warm terracotta with storefront icon
const establishmentIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:32px;height:32px;border-radius:8px;
    background:#c0622f;border:2.5px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
    display:flex;align-items:center;justify-content:center;
  ">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

// US center — zooms out to show the whole country over time
const MAP_CENTER = { lat: 27.6, lng: -82.5 } as const;

export default function HeroMap() {
  const { data: vendors } = useListVendors();
  const { data: establishments } = useListEstablishments();

  const mappedVendors = (vendors ?? []).filter(
    (v) => v.latitude != null && v.longitude != null,
  );
  const mappedEstablishments = (establishments ?? []).filter(
    (e) => e.latitude != null && e.longitude != null,
  );

  return (
    <section className="relative w-full h-[88vh] min-h-[520px] overflow-hidden">
      {/* Map fills full section */}
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={7}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
        />

        {/* Vendor pins */}
        {mappedVendors.map((v) => (
          <Marker
            key={`vendor-${v.id}`}
            position={[v.latitude!, v.longitude!]}
            icon={vendorIcon}
          >
            <Popup>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#3c4a26] mb-0.5">Vendor</div>
              <div className="text-sm font-medium">{v.name}</div>
              <div className="text-xs text-gray-500">{v.location}</div>
              <a
                href={`/vendors/${v.slug}`}
                className="text-xs text-[#3c4a26] font-semibold mt-1 block hover:underline"
              >
                View vendor →
              </a>
            </Popup>
          </Marker>
        ))}

        {/* Establishment pins */}
        {mappedEstablishments.map((e) => (
          <Marker
            key={`est-${e.id}`}
            position={[e.latitude!, e.longitude!]}
            icon={establishmentIcon}
          >
            <Popup>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#c0622f] mb-0.5">{e.type}</div>
              <div className="text-sm font-medium">{e.name}</div>
              <div className="text-xs text-gray-500">{e.city}, {e.state}</div>
              {e.website && (
                <a
                  href={e.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#c0622f] font-semibold mt-1 block hover:underline"
                >
                  Visit website →
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Gradient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(60,74,38,0.55) 0%, rgba(60,74,38,0.08) 55%, rgba(0,0,0,0) 100%)",
          zIndex: 1,
        }}
      />

      {/* Hero text overlay */}
      <div
        className="absolute top-0 left-0 right-0 flex flex-col items-center text-center px-6 pt-16 pb-10"
        style={{ zIndex: 2 }}
      >
        <p className="text-xs md:text-sm text-white/80 uppercase tracking-[0.25em] font-semibold mb-4">
          Shop Local Wherever You Are
        </p>
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-white leading-tight mb-5 drop-shadow-md">
          The Locals
        </h1>
        <p className="text-base md:text-lg text-white/85 mb-8 max-w-lg font-sans leading-relaxed">
          Discover independent makers, farms, and neighborhood establishments across the map.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/products"
            className="bg-white text-[#3c4a26] px-7 py-3.5 rounded-md font-semibold text-base hover:bg-white/90 transition-colors inline-flex items-center gap-2 shadow-lg"
          >
            Browse Goods
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <Link
            href="/pin-your-business"
            className="bg-[#c0622f]/90 backdrop-blur-sm border border-white/30 text-white px-7 py-3.5 rounded-md font-semibold text-base hover:bg-[#c0622f] transition-colors inline-flex items-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Pin Your Business
          </Link>
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-24 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md flex flex-col gap-1.5"
        style={{ zIndex: 2 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#3c4a26] flex-shrink-0" />
          <span className="text-xs text-gray-700 font-medium">Vendors</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-[4px] bg-[#c0622f] flex-shrink-0" />
          <span className="text-xs text-gray-700 font-medium">Establishments</span>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(var(--background)))",
          zIndex: 2,
        }}
      />
    </section>
  );
}
