import { useState } from "react";
import { Leaf, Mail, User, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function submitRequest(email: string, name: string) {
  const res = await fetch(`${BASE}/api/invite/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name: name.trim() || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data as { status: string; message: string; emailSent?: boolean };
}

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await submitRequest(email.trim(), name.trim());
      setSuccess(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invite.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f9f6f0] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <a href="/" className="inline-flex items-center gap-2 text-[#3c4a26] font-bold text-lg no-underline">
          <Leaf className="w-5 h-5" />
          Open Local
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {success ? (
            /* ─── Success state ─── */
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-[#3c4a26]/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-[#3c4a26]" />
              </div>
              <h1 className="text-3xl font-bold text-[#1a1a1a] mb-3">{t("invite.successTitle")}</h1>
              <p className="text-[#555] text-lg leading-relaxed mb-8">{success}</p>
              <p className="text-sm text-[#888]">
                {t("invite.exploreDescription")}
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 mt-6 text-[#3c4a26] font-semibold hover:underline"
              >
                {t("invite.browseProducers")} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ) : (
            /* ─── Form state ─── */
            <>
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 bg-[#3c4a26] text-white text-xs font-bold tracking-widest px-3 py-1.5 rounded-full mb-6 uppercase">
                  <Leaf className="w-3 h-3" /> {t("invite.invitationBadge")}
                </div>
                <h1 className="text-4xl font-bold text-[#1a1a1a] leading-tight mb-4">
                  {t("invite.title")}
                </h1>
                <p className="text-[#555] text-lg leading-relaxed">
                  {t("invite.description")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-[#333]">
                    {t("invite.yourName")} <span className="text-[#999] font-normal">{t("invite.optional")}</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("invite.namePlaceholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-12 border-[#d4cfc6] bg-white focus:border-[#3c4a26] focus:ring-[#3c4a26]/20"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#333]">
                    {t("invite.emailAddress")} <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("invite.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-9 h-12 border-[#d4cfc6] bg-white focus:border-[#3c4a26] focus:ring-[#3c4a26]/20"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-12 bg-[#3c4a26] hover:bg-[#2e3a1e] text-white font-semibold text-base rounded-lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t("invite.sending")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t("invite.sendInvitation")} <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>

                <p className="text-xs text-center text-[#999] leading-relaxed">
                  {t("invite.spamNotice")}
                </p>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-5 text-center">
        <p className="text-xs text-[#aaa]">
          © Open Local · Local Sourcing and Experiences
        </p>
      </footer>
    </div>
  );
}
