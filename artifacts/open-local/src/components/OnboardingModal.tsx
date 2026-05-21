import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Store, ShoppingBag, CheckCircle2, ArrowRight, RefreshCw, ChevronLeft, LocateFixed, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useUser, type UserRole, type AvatarStyle, avatarUrl } from "@/context/UserContext";

const AVATAR_STYLES: { style: AvatarStyle; label: string }[] = [
  { style: "thumbs", label: "Thumbs" },
  { style: "adventurer", label: "Explorer" },
  { style: "fun-emoji", label: "Emoji" },
  { style: "pixel-art", label: "Pixel" },
  { style: "avataaars", label: "Avataaar" },
  { style: "big-smile", label: "Smile" },
  { style: "bottts", label: "Bot" },
  { style: "lorelei", label: "Lorelei" },
  { style: "micah", label: "Micah" },
  { style: "miniavs", label: "Mini" },
  { style: "notionists", label: "Notion" },
  { style: "open-peeps", label: "Peeps" },
  { style: "personas", label: "Persona" },
  { style: "croodles", label: "Doodle" },
];

type Step = "role" | "profile" | "avatar" | "email" | "verify" | "welcome";

interface FormState {
  role: UserRole | null;
  username: string;
  zip: string;
  avatarStyle: AvatarStyle;
  email: string;
  verificationId: number | null;
  devCode: string | null;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function OnboardingModal() {
  const { showOnboarding, closeOnboarding, login } = useUser();
  const [step, setStep] = useState<Step>("role");
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<FormState>({
    role: null,
    username: "",
    zip: "",
    avatarStyle: "thumbs",
    email: "",
    verificationId: null,
    devCode: null,
  });
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = useCallback((next: Step, direction = 1) => {
    setDir(direction);
    setError(null);
    setStep(next);
  }, []);

  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}`);
        const data = await r.json() as { available: boolean };
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
  }, []);

  const handleUsernameChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
    setForm((f) => ({ ...f, username: clean }));
    checkUsername(clean);
  };

  const detectLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await r.json() as { postcode?: string; city?: string; locality?: string };
          const zip = data.postcode || "";
          if (zip) {
            setForm((f) => ({ ...f, zip }));
            setLocationError(null);
          } else {
            setLocationError("Couldn't determine your zip code. Please type it in.");
          }
        } catch {
          setLocationError("Couldn't look up your location. Please type it in.");
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === 1) {
          setLocationError("Location access denied. Please type your zip code.");
        } else {
          setLocationError("Couldn't get your location. Please type your zip code.");
        }
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const handleContinueToAvatar = () => {
    if (form.username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (usernameStatus === "taken") { setError("That username is already taken."); return; }
    if (usernameStatus === "checking") { setError("Still checking username…"); return; }
    go("avatar");
  };

  const handleContinueToEmail = () => {
    go("email");
  };

  const handleSendCode = async () => {
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          role: form.role,
          zip: form.zip || undefined,
          state: "FL",
          avatarSeed: form.username,
          avatarStyle: form.avatarStyle,
        }),
      });
      const data = await r.json() as { verificationId?: number; devCode?: string | null; error?: string };
      if (!r.ok) {
        setError((data as { error: string }).error || "Something went wrong.");
        return;
      }
      setForm((f) => ({
        ...f,
        verificationId: data.verificationId!,
        devCode: data.devCode ?? null,
      }));
      go("verify");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: form.verificationId, code: otp }),
      });
      const data = await r.json() as { user?: Record<string, unknown>; sessionToken?: string; error?: string };
      if (!r.ok) {
        setError(data.error || "Verification failed.");
        return;
      }
      login(data.sessionToken!, data.user as never);
      go("welcome");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!form.verificationId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/signup/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId: form.verificationId }),
      });
      const data = await r.json() as { devCode?: string | null; error?: string };
      if (!r.ok) { setError(data.error || "Couldn't resend."); return; }
      setOtp("");
      setForm((f) => ({ ...f, devCode: data.devCode ?? null }));
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const avatarSeed = form.username || "openlocal";

  useEffect(() => {
    if (!showOnboarding) {
      setStep("role");
      setOtp("");
      setError(null);
      setLocationError(null);
      setLocationLoading(false);
      setForm({ role: null, username: "", zip: "", avatarStyle: "thumbs", email: "", verificationId: null, devCode: null });
    }
  }, [showOnboarding]);

  const STEP_ORDER: Step[] = ["role", "profile", "avatar", "email", "verify", "welcome"];
  const stepIndex = STEP_ORDER.indexOf(step);
  const progress = step === "welcome" ? 100 : (stepIndex / (STEP_ORDER.length - 1)) * 100;

  const canGoBack = step !== "role" && step !== "welcome";
  const backStep: Record<Step, Step> = {
    role: "role",
    profile: "role",
    avatar: "profile",
    email: "avatar",
    verify: "email",
    welcome: "welcome",
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={(open) => { if (!open) closeOnboarding(); }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-0 shadow-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Join Open Local</DialogTitle>

        <div className="h-1 bg-muted/40 w-full">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        <div className="relative overflow-hidden" style={{ minHeight: 460 }}>
          {canGoBack && (
            <button
              onClick={() => go(backStep[step], -1)}
              className="absolute top-4 left-4 z-10 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <AnimatePresence initial={false} custom={dir} mode="wait">
            {step === "role" && (
              <StepWrapper key="role" custom={dir}>
                <div className="px-8 pt-10 pb-8">
                  <div className="text-center mb-8">
                    <span className="inline-block font-serif text-4xl mb-3">🌿</span>
                    <h2 className="font-serif font-bold text-2xl text-foreground mb-1">Welcome to Open Local</h2>
                    <p className="text-muted-foreground text-sm">Local sourcing and experiences.</p>
                  </div>
                  <p className="text-center font-semibold text-sm text-foreground/70 mb-4 uppercase tracking-wide">I am a…</p>
                  <div className="grid grid-cols-2 gap-4">
                    <RoleCard
                      icon={<ShoppingBag size={32} />}
                      label="Shopper"
                      desc="Discover local vendors & goods"
                      selected={form.role === "shopper"}
                      onClick={() => {
                        setForm((f) => ({ ...f, role: "shopper" }));
                        go("profile");
                      }}
                    />
                    <RoleCard
                      icon={<Store size={32} />}
                      label="Vendor"
                      desc="Sell my handmade & local products"
                      selected={form.role === "vendor"}
                      onClick={() => {
                        setForm((f) => ({ ...f, role: "vendor" }));
                        go("profile");
                      }}
                    />
                  </div>
                </div>
              </StepWrapper>
            )}

            {step === "profile" && (
              <StepWrapper key="profile" custom={dir}>
                <div className="px-8 pt-10 pb-8">
                  <h2 className="font-serif font-bold text-xl text-foreground mb-1">Create your profile</h2>
                  <p className="text-muted-foreground text-sm mb-6">Choose a username the community will know you by.</p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Username</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                        <Input
                          id="username"
                          value={form.username}
                          onChange={(e) => handleUsernameChange(e.target.value)}
                          placeholder="your_name"
                          className="pl-7"
                          maxLength={24}
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                          {usernameStatus === "checking" && <span className="text-muted-foreground">…</span>}
                          {usernameStatus === "available" && <span className="text-emerald-600 font-medium">✓ available</span>}
                          {usernameStatus === "taken" && <span className="text-red-500 font-medium">✗ taken</span>}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Letters, numbers, underscores. 3–24 characters.</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="zip" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Zip code <span className="font-normal normal-case">(optional)</span>
                        </Label>
                        <button
                          type="button"
                          onClick={detectLocation}
                          disabled={locationLoading}
                          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                        >
                          {locationLoading
                            ? <><Loader2 size={11} className="animate-spin" /> Detecting…</>
                            : <><LocateFixed size={11} /> Use my location</>
                          }
                        </button>
                      </div>
                      <Input
                        id="zip"
                        value={form.zip}
                        onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                        placeholder="e.g. 33101, 32801, 33602…"
                        maxLength={10}
                        inputMode="numeric"
                      />
                      {locationError && (
                        <p className="text-xs text-amber-600 mt-1">{locationError}</p>
                      )}
                    </div>
                  </div>
                  {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                  <Button
                    className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleContinueToAvatar}
                    disabled={form.username.length < 3 || usernameStatus === "taken" || usernameStatus === "checking"}
                  >
                    Continue <ArrowRight size={16} className="ml-1" />
                  </Button>
                </div>
              </StepWrapper>
            )}

            {step === "avatar" && (
              <StepWrapper key="avatar" custom={dir}>
                <div className="px-8 pt-10 pb-8">
                  <h2 className="font-serif font-bold text-xl text-foreground mb-1">Choose your avatar</h2>
                  <p className="text-muted-foreground text-sm mb-6">Pick the look that fits you best, @{form.username}.</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
                    {AVATAR_STYLES.map(({ style, label }) => (
                      <button
                        key={style}
                        onClick={() => setForm((f) => ({ ...f, avatarStyle: style }))}
                        className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition-all ${
                          form.avatarStyle === style
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-muted/40"
                        }`}
                      >
                        <img
                          src={avatarUrl(avatarSeed, style)}
                          alt={label}
                          loading="lazy"
                          className="w-14 h-14 rounded-full bg-amber-50"
                        />
                        <span className={`text-[11px] font-semibold ${form.avatarStyle === style ? "text-primary" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleContinueToEmail}
                  >
                    Continue <ArrowRight size={16} className="ml-1" />
                  </Button>
                </div>
              </StepWrapper>
            )}

            {step === "email" && (
              <StepWrapper key="email" custom={dir}>
                <div className="px-8 pt-10 pb-8">
                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={avatarUrl(avatarSeed, form.avatarStyle)}
                      alt="Your avatar"
                      className="w-14 h-14 rounded-full bg-amber-50 border-2 border-primary/30 shrink-0"
                    />
                    <div>
                      <p className="font-semibold text-foreground">@{form.username}</p>
                      <p className="text-sm text-muted-foreground capitalize">{form.role}{form.zip ? ` · ${form.zip}` : ""}</p>
                    </div>
                  </div>
                  <h2 className="font-serif font-bold text-xl text-foreground mb-1">Verify your email</h2>
                  <p className="text-muted-foreground text-sm mb-6">We'll send a 6-digit code to confirm it's you.</p>
                  <div>
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="mt-1.5"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") handleSendCode(); }}
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
                  <Button
                    className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleSendCode}
                    disabled={loading || !form.email}
                  >
                    {loading ? "Sending…" : "Send code"} <ArrowRight size={16} className="ml-1" />
                  </Button>
                </div>
              </StepWrapper>
            )}

            {step === "verify" && (
              <StepWrapper key="verify" custom={dir}>
                <div className="px-8 pt-10 pb-8">
                  <h2 className="font-serif font-bold text-xl text-foreground mb-1">Enter your code</h2>
                  <p className="text-muted-foreground text-sm mb-2">
                    We sent a 6-digit code to <strong className="text-foreground">{form.email}</strong>.
                  </p>
                  {form.devCode && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                      Dev mode — your code is <strong className="font-mono tracking-widest">{form.devCode}</strong>
                    </div>
                  )}
                  <div className="flex justify-center my-6">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      autoFocus
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
                  <Button
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleVerify}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? "Verifying…" : "Confirm"} <ArrowRight size={16} className="ml-1" />
                  </Button>
                  <button
                    onClick={handleResend}
                    disabled={loading}
                    className="flex items-center gap-1 mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} /> Resend code
                  </button>
                </div>
              </StepWrapper>
            )}

            {step === "welcome" && (
              <StepWrapper key="welcome" custom={dir}>
                <div className="px-8 pt-10 pb-8 text-center">
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 14 }}
                    className="flex justify-center mb-5"
                  >
                    <div className="relative">
                      <img
                        src={avatarUrl(avatarSeed, form.avatarStyle)}
                        alt="Your avatar"
                        className="w-24 h-24 rounded-full bg-amber-50 border-4 border-primary/30"
                      />
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                        <CheckCircle2 size={18} className="text-white" />
                      </span>
                    </div>
                  </motion.div>
                  <h2 className="font-serif font-bold text-2xl text-foreground mb-1">
                    You're in, @{form.username}!
                  </h2>
                  <p className="text-muted-foreground text-sm mb-2">
                    Welcome to Open Local{form.zip ? ` (${form.zip})` : ""}.<br />
                    <span className="capitalize">{form.role === "shopper" ? "Start discovering local vendors near you." : "Ready to list your products?"}</span>
                  </p>
                  <Button
                    className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                    onClick={closeOnboarding}
                  >
                    Start exploring
                  </Button>
                </div>
              </StepWrapper>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepWrapper({ children, custom }: { children: React.ReactNode; custom: number }) {
  return (
    <motion.div
      custom={custom}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="absolute inset-0 overflow-y-auto"
    >
      {children}
    </motion.div>
  );
}

function RoleCard({
  icon,
  label,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-center gap-3 p-5 rounded-2xl border-2 transition-all ${
        selected
          ? "border-primary bg-primary/8 shadow-md"
          : "border-border hover:border-primary/50 hover:bg-muted/40"
      }`}
    >
      <span className={selected ? "text-primary" : "text-muted-foreground"}>{icon}</span>
      <div>
        <p className={`font-bold text-base ${selected ? "text-primary" : "text-foreground"}`}>{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  );
}
