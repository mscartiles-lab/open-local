import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "wouter";
import { Store } from "lucide-react";

// Fix Leaflet marker icons broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const VENDOR_ICON = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#c07218;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const FLORIDA_CENTER: [number, number] = [27.6, -82.5];

type VendorPin = {
  id: number;
  name: string;
  slug: string;
  category: string;
  tagline: string | null;
  location: string;
  region: string;
  imageUrl: string;
  latitude?: number | null;
  longitude?: number | null;
};

interface Props {
  vendors: VendorPin[];
}

export default function VendorsMapView({ vendors }: Props) {
  const mappedVendors = vendors.filter(
    (v) => v.latitude != null && v.longitude != null,
  );
  const unmappedVendors = vendors.filter(
    (v) => v.latitude == null || v.longitude == null,
  );

  return (
    <div className="space-y-6">
      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 520 }}>
        <MapContainer
          center={FLORIDA_CENTER}
          zoom={8}
          scrollWheelZoom
          zoomControl
          minZoom={4}
          maxZoom={18}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; CARTO"
          />

          {mappedVendors.map((v) => (
            <Marker
              key={v.id}
              position={[v.latitude!, v.longitude!]}
              icon={VENDOR_ICON}
            >
              <Popup minWidth={190}>
                <div className="space-y-1 py-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#7a3f08] leading-none">
                    {v.category}
                  </p>
                  <p className="text-sm font-semibold leading-snug text-gray-900">{v.name}</p>
                  {v.tagline && (
                    <p className="text-xs text-gray-500 line-clamp-2">{v.tagline}</p>
                  )}
                  <p className="text-xs text-gray-500">{v.location}, {v.region}</p>
                  <Link
                    href={`/vendors/${v.id}`}
                    className="text-xs text-[#c07218] font-semibold hover:underline block pt-0.5"
                  >
                    View vendor →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Count badge */}
      <p className="text-sm text-muted-foreground -mt-2">
        {mappedVendors.length} vendor{mappedVendors.length !== 1 ? "s" : ""} on map
        {unmappedVendors.length > 0 && ` · ${unmappedVendors.length} without a pinned location`}
      </p>

      {/* Vendors without a pin */}
      {unmappedVendors.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            Vendors without a pinned location
          </p>
          <ul className="divide-y divide-border/50">
            {unmappedVendors.map((v) => (
              <li key={v.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.category} · {v.location}, {v.region}
                  </p>
                </div>
                <Link
                  href={`/vendors/${v.id}`}
                  className="text-xs text-[#c07218] font-semibold hover:underline shrink-0"
                >
                  View →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
