import { useState, useRef, useCallback, useEffect } from "react";
import { Copy, Check, ExternalLink, ChevronDown, Smartphone, RotateCcw } from "lucide-react";
import { useListVendors } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

type DevicePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  frameColor: string;
  hasIsland: boolean;
  borderRadius: number;
  bezelTop: number;
  bezelBottom: number;
};

const DEVICES: DevicePreset[] = [
  { id: "se", label: "iPhone SE", width: 375, height: 667, frameColor: "#1c1c1e", hasIsland: false, borderRadius: 38, bezelTop: 36, bezelBottom: 28 },
  { id: "14", label: "iPhone 14", width: 390, height: 844, frameColor: "#1c1c1e", hasIsland: false, borderRadius: 50, bezelTop: 46, bezelBottom: 34 },
  { id: "14pro", label: "iPhone 14 Pro", width: 393, height: 852, frameColor: "#231f20", hasIsland: true, borderRadius: 50, bezelTop: 46, bezelBottom: 34 },
  { id: "pixel", label: "Pixel 7", width: 412, height: 892, frameColor: "#1a1a1a", hasIsland: false, borderRadius: 38, bezelTop: 40, bezelBottom: 30 },
];

const FRAME_SIDE = 12;

export default function SimulatorPage() {
  const [device, setDevice] = useState<DevicePreset>(DEVICES[1]);
  const [scale, setScale] = useState(0.62);
  const [copied, setCopied] = useState(false);
  const [vendorId, setVendorId] = useState<number | null>(null);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const { t } = useTranslation();

  const { data: vendors } = useListVendors();

  // Auto-pick first vendor if none selected
  useEffect(() => {
    if (!vendorId && vendors?.length) {
      setVendorId(vendors[0].id);
    }
  }, [vendors, vendorId]);

  const selectedVendor = vendors?.find((v) => v.id === vendorId);
  const previewUrl = vendorId ? `/vendors/${vendorId}` : "/vendors";

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/vendors/${vendorId ?? ""}`
      : `/vendors/${vendorId ?? ""}`;

  const reload = useCallback(() => setKey((k) => k + 1), []);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [publicUrl]);

  const frameW = device.width + FRAME_SIDE * 2;
  const frameH = device.height + device.bezelTop + device.bezelBottom;
  const scaledW = frameW * scale;
  const scaledH = frameH * scale;


  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0e0e10", color: "#fff" }}>
      {/* Top bar */}
      <header
        style={{
          background: "#18181b",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Smartphone size={17} color="#8ca45a" />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>
            {t("simulator.title")}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>— Open Local</span>
        </div>

        {/* Vendor picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDeviceOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "#fff",
                fontSize: 13,
                cursor: "pointer",
                minWidth: 140,
              }}
            >
              <Smartphone size={13} color="rgba(255,255,255,0.5)" />
              <span style={{ flex: 1, textAlign: "left" }}>{device.label}</span>
              <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
            </button>
            {deviceOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  background: "#27272a",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  overflow: "hidden",
                  zIndex: 50,
                  minWidth: 160,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                {DEVICES.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => { setDevice(d); setDeviceOpen(false); }}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "9px 14px",
                      fontSize: 13,
                      color: d.id === device.id ? "#8ca45a" : "rgba(255,255,255,0.8)",
                      background: d.id === device.id ? "rgba(140,164,90,0.1)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scale */}
          <div style={{ display: "flex", gap: 4 }}>
            {[0.5, 0.62, 0.75, 1].map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: scale === s ? "#3c4a26" : "rgba(255,255,255,0.05)",
                  color: scale === s ? "#fff" : "rgba(255,255,255,0.5)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>

          <button
            onClick={reload}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer",
            }}
          >
            <RotateCcw size={13} />
            {t("simulator.reload")}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel — vendor selector */}
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            background: "#18181b",
            borderRight: "1px solid rgba(255,255,255,0.07)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 14px 8px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
              {t("simulator.storefront")}
            </p>
            {vendors?.map((v) => (
              <button
                key={v.id}
                onClick={() => { setVendorId(v.id); setKey((k) => k + 1); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  background: vendorId === v.id ? "rgba(140,164,90,0.15)" : "transparent",
                  marginBottom: 2,
                }}
              >
                <img
                  src={v.imageUrl}
                  alt={v.name}
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: vendorId === v.id ? "#8ca45a" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.name}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>{v.category}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main canvas */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            padding: "32px 24px",
            gap: 24,
          }}
        >
          {/* Storefront link bar */}
          {selectedVendor && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "10px 16px",
                maxWidth: Math.max(scaledW, 340),
                width: "100%",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {t("simulator.share")}
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {publicUrl}
                </p>
              </div>
              <button
                onClick={copyLink}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: copied ? "#3c4a26" : "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, padding: "7px 14px",
                  color: copied ? "#8ca45a" : "rgba(255,255,255,0.7)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? t("common.copied") : t("common.copy")}
              </button>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "7px 12px",
                  color: "rgba(255,255,255,0.6)", fontSize: 13, cursor: "pointer",
                  textDecoration: "none", flexShrink: 0,
                }}
              >
                <ExternalLink size={13} />
                {t("common.open")}
              </a>
            </div>
          )}

          {/* Phone frame */}
          <div style={{ width: scaledW, height: scaledH, position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: frameW,
                height: frameH,
                borderRadius: device.borderRadius + 8,
                backgroundColor: device.frameColor,
                transformOrigin: "top left",
                transform: `scale(${scale})`,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px rgba(0,0,0,0.7), 0 0 0 8px rgba(255,255,255,0.03)",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {/* Left buttons */}
              {[90, 136, 192].map((top, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute", left: -4, top,
                    width: 4, height: i === 0 ? 28 : 58,
                    background: "linear-gradient(to right, #111, #2a2a2a)",
                    borderRadius: "3px 0 0 3px",
                  }}
                />
              ))}
              {/* Right button */}
              <div
                style={{
                  position: "absolute", right: -4, top: 150,
                  width: 4, height: 72,
                  background: "linear-gradient(to left, #111, #2a2a2a)",
                  borderRadius: "0 3px 3px 0",
                }}
              />

              {/* Screen cutout */}
              <div
                style={{
                  position: "absolute",
                  top: device.bezelTop,
                  left: FRAME_SIDE,
                  width: device.width,
                  height: device.height,
                  borderRadius: device.borderRadius - 4,
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                {/* Dynamic island */}
                {device.hasIsland ? (
                  <div
                    style={{
                      position: "absolute", top: 12, left: "50%",
                      transform: "translateX(-50%)",
                      width: 118, height: 34,
                      background: "#000",
                      borderRadius: 20,
                      zIndex: 10,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute", top: 0, left: "50%",
                      transform: "translateX(-50%)",
                      width: 140, height: 26,
                      background: device.frameColor,
                      borderRadius: "0 0 16px 16px",
                      zIndex: 10,
                    }}
                  />
                )}

                {/* Status bar dots (camera/sensor area) */}
                <div
                  style={{
                    position: "absolute",
                    top: device.hasIsland ? 0 : 0,
                    right: 20,
                    zIndex: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    height: device.hasIsland ? 0 : 26,
                    opacity: 0,
                  }}
                />

                {/* Live iframe */}
                <iframe
                  key={key}
                  ref={iframeRef}
                  src={previewUrl}
                  style={{
                    width: device.width,
                    height: device.height,
                    border: "none",
                    display: "block",
                  }}
                  title="Storefront preview"
                  allow="geolocation"
                />
              </div>

              {/* Home indicator */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 134,
                  height: 5,
                  background: "rgba(255,255,255,0.3)",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>

          {/* Caption */}
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
            {t("simulator.caption", { width: device.width, height: device.height })}
          </p>
        </main>
      </div>
    </div>
  );
}
