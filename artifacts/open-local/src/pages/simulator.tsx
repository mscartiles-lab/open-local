import { useState, useRef, useCallback } from "react";
import { Monitor, Smartphone, Tablet, RotateCcw, ExternalLink, Moon, Sun, ChevronDown } from "lucide-react";

type DevicePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  frameColor: string;
  hasIsland: boolean;
  borderRadius: number;
};

const DEVICES: DevicePreset[] = [
  { id: "se", label: "iPhone SE", width: 375, height: 667, frameColor: "#1a1a1a", hasIsland: false, borderRadius: 40 },
  { id: "14", label: "iPhone 14", width: 390, height: 844, frameColor: "#1a1a1a", hasIsland: false, borderRadius: 47 },
  { id: "14pro", label: "iPhone 14 Pro", width: 393, height: 852, frameColor: "#2a2520", hasIsland: true, borderRadius: 47 },
  { id: "14max", label: "iPhone 14 Pro Max", width: 430, height: 932, frameColor: "#1a1a1a", hasIsland: true, borderRadius: 55 },
  { id: "pixel", label: "Pixel 7", width: 412, height: 892, frameColor: "#222", hasIsland: false, borderRadius: 36 },
];

type Screen = {
  id: string;
  label: string;
  icon: string;
  path: string;
};

// Use the Expo dev domain so the Metro bundler serves all assets from its own origin.
// Falls back to proxy path if the domain isn't injected (e.g. in production builds).
const EXPO_BASE = __EXPO_DEV_DOMAIN__
  ? `https://${__EXPO_DEV_DOMAIN__}`
  : "/mobile";

const SCREENS: Screen[] = [
  { id: "home", label: "The Locals", icon: "🗺", path: `${EXPO_BASE}/` },
  { id: "browse", label: "Browse", icon: "🛍", path: `${EXPO_BASE}/browse` },
  { id: "events", label: "Events", icon: "📅", path: `${EXPO_BASE}/events` },
  { id: "sale", label: "Final Sale", icon: "💸", path: `${EXPO_BASE}/sale` },
  { id: "favorites", label: "Saved", icon: "❤️", path: `${EXPO_BASE}/favorites` },
  { id: "more", label: "More", icon: "⋯", path: `${EXPO_BASE}/more` },
];

const SCALE_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "65%", value: 0.65 },
  { label: "80%", value: 0.8 },
  { label: "100%", value: 1 },
];

const FRAME_PADDING = 14; // px around the screen inside the frame

export default function SimulatorPage() {
  const [device, setDevice] = useState<DevicePreset>(DEVICES[1]); // iPhone 14
  const [scale, setScale] = useState(0.65);
  const [activeScreen, setActiveScreen] = useState<Screen>(SCREENS[0]);
  const [darkMode, setDarkMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); // force re-mount on reload

  const reload = useCallback(() => setKey((k) => k + 1), []);

  const navigateTo = (screen: Screen) => {
    setActiveScreen(screen);
    // Try to navigate the iframe if it's on same origin; fallback: remount
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.location.href = screen.path;
      }
    } catch {
      setKey((k) => k + 1);
    }
  };

  const frameW = device.width + FRAME_PADDING * 2;
  const frameH = device.height + FRAME_PADDING * 2 + 40 + 28; // top bezel + bottom bezel

  const scaledW = frameW * scale;
  const scaledH = frameH * scale;

  const iframeFilter = darkMode
    ? "invert(1) hue-rotate(180deg)"
    : "none";

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0 bg-neutral-900">
        <div className="flex items-center gap-3">
          <Smartphone size={18} className="text-[#8a9a5b]" />
          <span className="font-semibold text-sm tracking-tight">Mobile Preview</span>
          <span className="text-white/30 text-xs">— Open Local</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/mobile/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-white/5"
          >
            <ExternalLink size={13} />
            Open in tab
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — controls */}
        <aside className="w-60 shrink-0 border-r border-white/10 bg-neutral-900 flex flex-col overflow-y-auto">
          {/* Device */}
          <section className="p-4 border-b border-white/10">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Device</p>
            <div className="flex flex-col gap-1">
              {DEVICES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDevice(d)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    device.id === d.id
                      ? "bg-[#3c4a26] text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Monitor size={13} className="shrink-0 opacity-60" />
                  <span>{d.label}</span>
                  <span className="ml-auto text-[10px] text-white/30">
                    {d.width}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Scale */}
          <section className="p-4 border-b border-white/10">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Scale</p>
            <div className="flex gap-1 flex-wrap">
              {SCALE_OPTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setScale(s.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    scale === s.value
                      ? "bg-[#3c4a26] text-white"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          {/* Screens */}
          <section className="p-4 border-b border-white/10">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Screen</p>
            <div className="flex flex-col gap-1">
              {SCREENS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => navigateTo(s)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    activeScreen.id === s.id
                      ? "bg-[#3c4a26] text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-base w-5 text-center">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Theme */}
          <section className="p-4 border-b border-white/10">
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Theme preview</p>
            <p className="text-[11px] text-white/30 mb-3 leading-relaxed">
              Toggle dark mode inside the app using the More → Settings screen. The button below approximates it via a CSS filter.
            </p>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full transition-colors ${
                darkMode
                  ? "bg-indigo-900/50 text-indigo-200 border border-indigo-500/30"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {darkMode ? <Moon size={14} /> : <Sun size={14} />}
              {darkMode ? "Dark mode (approx)" : "Light mode"}
            </button>
          </section>

          {/* Reload */}
          <section className="p-4">
            <button
              onClick={reload}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <RotateCcw size={13} />
              Reload app
            </button>
          </section>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 flex items-center justify-center overflow-auto bg-neutral-950 p-8">
          <div
            style={{ width: scaledW, height: scaledH }}
            className="relative shrink-0"
          >
            {/* Phone shell */}
            <div
              style={{
                width: frameW,
                height: frameH,
                borderRadius: device.borderRadius + 6,
                backgroundColor: device.frameColor,
                transformOrigin: "top left",
                transform: `scale(${scale})`,
                boxShadow: "0 40px 120px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.08)",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {/* Side buttons */}
              <div
                style={{
                  position: "absolute",
                  left: -3,
                  top: 90,
                  width: 3,
                  height: 32,
                  backgroundColor: "#333",
                  borderRadius: "2px 0 0 2px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: -3,
                  top: 134,
                  width: 3,
                  height: 64,
                  backgroundColor: "#333",
                  borderRadius: "2px 0 0 2px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: -3,
                  top: 210,
                  width: 3,
                  height: 64,
                  backgroundColor: "#333",
                  borderRadius: "2px 0 0 2px",
                }}
              />
              {/* Power button */}
              <div
                style={{
                  position: "absolute",
                  right: -3,
                  top: 140,
                  width: 3,
                  height: 80,
                  backgroundColor: "#333",
                  borderRadius: "0 2px 2px 0",
                }}
              />

              {/* Screen area */}
              <div
                style={{
                  position: "absolute",
                  top: FRAME_PADDING + 40,
                  left: FRAME_PADDING,
                  width: device.width,
                  height: device.height,
                  borderRadius: device.borderRadius - 6,
                  overflow: "hidden",
                  backgroundColor: "#000",
                }}
              >
                {/* Dynamic island or notch */}
                {device.hasIsland ? (
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 120,
                      height: 35,
                      backgroundColor: "#000",
                      borderRadius: 20,
                      zIndex: 10,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 150,
                      height: 28,
                      backgroundColor: device.frameColor,
                      borderRadius: "0 0 18px 18px",
                      zIndex: 10,
                    }}
                  />
                )}

                {/* The app */}
                <iframe
                  key={key}
                  ref={iframeRef}
                  src={activeScreen.path}
                  style={{
                    width: device.width,
                    height: device.height,
                    border: "none",
                    display: "block",
                    filter: iframeFilter,
                  }}
                  title="Mobile app preview"
                  allow="geolocation"
                />
              </div>

              {/* Top bezel — home bar area */}
              <div
                style={{
                  position: "absolute",
                  bottom: 10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 120,
                  height: 4,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </main>

        {/* Right panel — info */}
        <aside className="w-56 shrink-0 border-l border-white/10 bg-neutral-900 flex flex-col p-4 gap-5">
          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Device info</p>
            <div className="space-y-1.5 text-xs text-white/60">
              <div className="flex justify-between">
                <span>Model</span>
                <span className="text-white">{device.label}</span>
              </div>
              <div className="flex justify-between">
                <span>Resolution</span>
                <span className="text-white">{device.width} × {device.height}</span>
              </div>
              <div className="flex justify-between">
                <span>Scale</span>
                <span className="text-white">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Island</span>
                <span className="text-white">{device.hasIsland ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Current screen</p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm">
              <span className="text-lg">{activeScreen.icon}</span>
              <span className="text-white">{activeScreen.label}</span>
            </div>
            <p className="text-[10px] text-white/25 mt-1.5 font-mono">{activeScreen.path}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2">Tips</p>
            <ul className="space-y-2 text-[11px] text-white/40 leading-relaxed">
              <li>• Click inside the phone to interact with the live app</li>
              <li>• Toggle dark mode in More → Settings inside the app</li>
              <li>• Use "Open in tab" to see full browser view</li>
              <li>• Resize scale for different viewport previews</li>
            </ul>
          </div>

          <div className="mt-auto">
            <div className="rounded-lg border border-white/10 p-3 text-[11px] text-white/30 space-y-1">
              <div className="flex items-center gap-1.5">
                <Tablet size={11} className="opacity-60" />
                <span className="text-white/50 font-medium">Live preview</span>
              </div>
              <p>This is the real app running in web mode — fully interactive.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
