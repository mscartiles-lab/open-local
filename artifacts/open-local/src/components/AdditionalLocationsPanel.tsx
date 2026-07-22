import { useState } from "react";
import { MapPin, Plus, Trash2, Lock, Loader2, Navigation, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  PREMIUM_INCLUDED_LOCATIONS,
  ADDITIONAL_LOCATION_PRICE_MONTHLY,
} from "@/lib/tiers";

type Pin = { lat: number; lng: number; label?: string | null };

interface Vendor {
  id: number;
  additionalLocations?: Pin[] | null;
}

export default function AdditionalLocationsPanel({
  vendor,
  onUpdated,
}: {
  vendor: Vendor;
  onUpdated: () => void;
}) {
  const { user } = useUser();
  const { toast } = useToast();
  const isPremium = user?.tier === "premium";

  const [pins, setPins] = useState<Pin[]>(vendor.additionalLocations ?? []);
  const [addLat, setAddLat] = useState("");
  const [addLng, setAddLng] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latError, setLatError] = useState("");
  const [lngError, setLngError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const sessionToken =
    typeof window !== "undefined"
      ? window.localStorage.getItem("ol_session")
      : null;

  const extraCount = Math.max(0, pins.length - PREMIUM_INCLUDED_LOCATIONS);
  const extraCostMonthly = extraCount * ADDITIONAL_LOCATION_PRICE_MONTHLY;

  async function savePins(newPins: Pin[]) {
    if (!sessionToken) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ additionalLocations: newPins }),
      });
      if (!r.ok) throw new Error("save failed");
      setPins(newPins);
      onUpdated();
    } catch {
      toast({
        title: "Couldn't save locations",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not available in your browser." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddLat(pos.coords.latitude.toFixed(6));
        setAddLng(pos.coords.longitude.toFixed(6));
        setLatError("");
        setLngError("");
        setLocating(false);
      },
      () => {
        toast({ title: "Couldn't get location", variant: "destructive" });
        setLocating(false);
      },
    );
  }

  function validate() {
    let ok = true;
    const lat = parseFloat(addLat);
    const lng = parseFloat(addLng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setLatError("Must be a number between -90 and 90");
      ok = false;
    } else {
      setLatError("");
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setLngError("Must be a number between -180 and 180");
      ok = false;
    } else {
      setLngError("");
    }
    return ok;
  }

  function addPin() {
    if (!validate()) return;
    const lat = parseFloat(addLat);
    const lng = parseFloat(addLng);
    const newPins = [...pins, { lat, lng, label: addLabel.trim() || null }];
    savePins(newPins).then(() => {
      setAddLat("");
      setAddLng("");
      setAddLabel("");
      setShowForm(false);
    });
  }

  function removePin(idx: number) {
    if (!confirm("Remove this location pin?")) return;
    savePins(pins.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-xl font-bold text-foreground">
            Selling Locations
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            <Crown className="h-2.5 w-2.5" />
            Premium
          </span>
        </div>
        {isPremium && pins.length > 0 && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {pins.length} location{pins.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {!isPremium ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted py-10 text-center px-6">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">Premium feature</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upgrade to Premium to pin{" "}
            <strong>{PREMIUM_INCLUDED_LOCATIONS} selling locations</strong> on
            the map (included), then add more for{" "}
            <strong>${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo each</strong> —
            great for vendors who sell at multiple spots throughout the week.
          </p>
          <a href="/billing">
            <Button size="sm" variant="outline" className="gap-1.5 mt-1">
              <Crown className="h-3.5 w-3.5" />
              Upgrade to Premium
            </Button>
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Included vs extra cost summary */}
          <div className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {PREMIUM_INCLUDED_LOCATIONS} locations included
            </span>{" "}
            with Premium.{" "}
            {extraCount > 0 ? (
              <span>
                You have{" "}
                <span className="font-medium text-foreground">
                  {extraCount} extra location{extraCount !== 1 ? "s" : ""}
                </span>{" "}
                adding{" "}
                <span className="font-medium text-foreground">
                  ${extraCostMonthly}/mo
                </span>{" "}
                to your subscription.
              </span>
            ) : (
              <span>
                Add more at ${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo each.
              </span>
            )}
          </div>

          {pins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No location pins yet. Add your first selling location below.
            </p>
          ) : (
            <div className="space-y-2">
              {pins.map((pin, idx) => {
                const isExtra = idx >= PREMIUM_INCLUDED_LOCATIONS;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3"
                  >
                    <MapPin
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isExtra ? "text-amber-500" : "text-primary",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      {pin.label && (
                        <p className="truncate text-sm font-semibold text-foreground">
                          {pin.label}
                        </p>
                      )}
                      <p className="font-mono text-xs text-muted-foreground">
                        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                      </p>
                    </div>
                    {isExtra && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        +${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={saving}
                      onClick={() => removePin(idx)}
                      title="Remove this pin"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add location form */}
          {showForm ? (
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Add a location
                </p>
                {pins.length >= PREMIUM_INCLUDED_LOCATIONS && (
                  <span className="text-xs text-amber-600 font-medium">
                    +${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo added to your plan
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Latitude
                  </label>
                  <Input
                    placeholder="25.761681"
                    value={addLat}
                    onChange={(e) => {
                      setAddLat(e.target.value);
                      setLatError("");
                    }}
                    type="number"
                    step="any"
                    className={cn(latError && "border-destructive")}
                  />
                  {latError && (
                    <p className="mt-1 text-xs text-destructive">{latError}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Longitude
                  </label>
                  <Input
                    placeholder="-80.191788"
                    value={addLng}
                    onChange={(e) => {
                      setAddLng(e.target.value);
                      setLngError("");
                    }}
                    type="number"
                    step="any"
                    className={cn(lngError && "border-destructive")}
                  />
                  {lngError && (
                    <p className="mt-1 text-xs text-destructive">{lngError}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Label{" "}
                  <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Input
                  placeholder="Saturday Farmers Market, Wynwood"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPin()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={useMyLocation}
                  disabled={locating || saving}
                  className="gap-1.5"
                >
                  {locating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5" />
                  )}
                  Use my location
                </Button>
                <Button
                  size="sm"
                  onClick={addPin}
                  disabled={saving || !addLat || !addLng}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  Add pin
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              + Selling Location
              {pins.length >= PREMIUM_INCLUDED_LOCATIONS && (
                <span className="ml-1 text-amber-600 font-normal">
                  (${ADDITIONAL_LOCATION_PRICE_MONTHLY}/mo)
                </span>
              )}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
