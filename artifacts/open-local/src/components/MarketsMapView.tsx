import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "wouter";
import type { Market } from "@workspace/api-client-react";
import { Store } from "lucide-react";

// Fix Leaflet marker icons broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MARKET_ICON = L.divIcon({
  className: "",
  html: `<div style="width:30px;height:30px;border-radius:50%;background:#166534;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3h18l-2 9H5L3 3z"/><path d="M16 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M6 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/><path d="M5 12 3 3H1"/>
    </svg>
  </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

const FLORIDA_CENTER: [number, number] = [27.6, -82.5];

interface Props {
  markets: Market[];
}

export default function MarketsMapView({ markets }: Props) {
  const mappedMarkets = markets.filter(
    (m) => m.latitude != null && m.longitude != null,
  );
  const unmappedMarkets = markets.filter(
    (m) => m.latitude == null || m.longitude == null,
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
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {mappedMarkets.map((m) => (
            <Marker
              key={m.id}
              position={[m.latitude!, m.longitude!]}
              icon={MARKET_ICON}
            >
              <Popup minWidth={180}>
                <div className="space-y-1 py-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-green-700 leading-none">
                    Farmers Market
                  </p>
                  <p className="text-sm font-semibold leading-snug text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.city}, {m.region}</p>
                  {(m.day || m.time) && (
                    <p className="text-xs text-gray-600">
                      {[m.day, m.time].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {m.slug ? (
                    <Link
                      href={`/markets/${m.slug}`}
                      className="text-xs text-green-700 font-semibold hover:underline block pt-0.5"
                    >
                      View Market →
                    </Link>
                  ) : (
                    m.websiteUrl && (
                      <a
                        href={m.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 font-semibold hover:underline block pt-0.5"
                      >
                        Visit website →
                      </a>
                    )
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Count badge */}
      <p className="text-sm text-muted-foreground -mt-2">
        {mappedMarkets.length} market{mappedMarkets.length !== 1 ? "s" : ""} on map
        {unmappedMarkets.length > 0 && ` · ${unmappedMarkets.length} without location`}
      </p>

      {/* Markets without location */}
      {unmappedMarkets.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-muted-foreground" />
            Markets without a listed location
          </p>
          <ul className="divide-y divide-border/50">
            {unmappedMarkets.map((m) => (
              <li key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.city}, {m.region}
                    {(m.day || m.time) && ` · ${[m.day, m.time].filter(Boolean).join(" · ")}`}
                  </p>
                </div>
                {m.slug && (
                  <Link
                    href={`/markets/${m.slug}`}
                    className="text-xs text-green-700 font-semibold hover:underline shrink-0"
                  >
                    View →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
