import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Instagram,
  MapPin,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

// ── FAQ accordion ─────────────────────────────────────────────────────────────
function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left py-5 border-b border-[#3c4a26]/10 last:border-0"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold text-[#1a1a1a] text-base leading-snug">{q}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-[#3c4a26] flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#3c4a26] flex-shrink-0 mt-0.5" />
        )}
      </div>
      {open && (
        <p className="mt-3 text-gray-600 text-sm leading-relaxed pr-8">{a}</p>
      )}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ForVendors() {
  const { t } = useTranslation();

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#f9f6f0] font-sans">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="bg-white/95 backdrop-blur border-b border-[#3c4a26]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-[#3c4a26] font-bold text-lg tracking-tight no-underline">
              <span className="text-2xl">🌿</span>
              <span>Open Local</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/for-markets"
                className="hidden sm:block text-sm text-[#3c4a26]/70 font-medium hover:text-[#3c4a26] transition-colors no-underline"
              >
                {t("forVendors.forMarkets")}
              </Link>
              <Link
                href="/submit"
                className="px-5 py-2.5 bg-[#3c4a26] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3a1d] transition-colors no-underline"
              >
                {t("forVendors.ctaStorefront")}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#2b1f0a] via-[#3a2a10] to-[#4a3416] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 rounded-full px-4 py-1.5 text-amber-300 text-sm font-semibold mb-8 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" />
                {t("forVendors.badge")}
              </div>

              <h1 className="font-['Playfair_Display'] text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                {t("forVendors.heroTitle")}
              </h1>

              <p className="text-lg text-amber-100/80 mb-4 leading-relaxed">
                {t("forVendors.heroDescription")}
              </p>
              <p className="text-base text-amber-300 font-medium mb-10">
                {t("forVendors.heroSubtext")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/submit"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-400 text-[#2b1f0a] rounded-lg font-bold text-base hover:bg-amber-300 transition-all shadow-lg no-underline"
                >
                  {t("forVendors.ctaStorefront")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => scrollTo("how-it-works")}
                  className="px-8 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  {t("forVendors.seeHowItWorks")}
                </button>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/vendor-hero.jpg"
                  alt="Vendor at a Florida farmers market"
                  className="w-full h-[420px] object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    if (img.parentElement) {
                      img.parentElement.innerHTML = `
                        <div style="width:100%;height:420px;background:linear-gradient(135deg,#4a3416,#6b4e22);display:flex;align-items:center;justify-content:center;font-size:80px;border-radius:1rem;">
                          🍓
                        </div>`;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2b1f0a]/50 to-transparent rounded-2xl" />
              </div>

              {/* Floating — pre-order notification */}
              <div className="absolute -bottom-5 -left-5 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-56 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-lg">🛒</div>
                  <div className="text-xs font-bold text-[#1a1a1a]">{t("forVendors.newPreOrder")}</div>
                </div>
                <div className="text-xs text-gray-500">{t("forVendors.sampleOrder")}</div>
                <div className="text-[10px] text-[#8fb339] font-semibold mt-1.5">{t("forVendors.sampleTimestamp")}</div>
              </div>

              {/* Floating — followers */}
              <div className="absolute -top-4 -right-4 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-48 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#8fb339]" />
                  <div className="text-xs font-bold text-[#1a1a1a]">{t("forVendors.sampleFollowers")}</div>
                </div>
                <div className="text-xs text-gray-500">{t("forVendors.followersHelp")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-amber-700 text-sm font-semibold mb-8">
            {t("forVendors.situationTitle")}
          </div>
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-6 leading-tight">
            {t("forVendors.problemIntro")}<br />
            <span className="text-[#3c4a26]">{t("forVendors.problemHeadline")}</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t("forVendors.problemDescription")}
          </p>
        </div>

        {/* Before / After */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mt-14 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-500 mb-6">
              <X className="w-3.5 h-3.5" /> {t("forVendors.withoutTitle")}
            </div>
            <ul className="space-y-4">
              {[
                t("forVendors.withoutItem1"),
                t("forVendors.withoutItem2"),
                t("forVendors.withoutItem3"),
                t("forVendors.withoutItem4"),
                t("forVendors.withoutItem5"),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-600">
                  <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-400/10 to-[#3c4a26]/5 border-2 border-amber-400/30 rounded-2xl p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-full text-sm font-semibold text-amber-700 mb-6">
              <Check className="w-3.5 h-3.5" /> {t("forVendors.withTitle")}
            </div>
            <ul className="space-y-4">
              {[
                t("forVendors.withItem1"),
                t("forVendors.withItem2"),
                t("forVendors.withItem3"),
                t("forVendors.withItem4"),
                t("forVendors.withItem5"),
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-[#8fb339] mt-1 flex-shrink-0" />
                  <span className="text-sm leading-relaxed font-medium text-[#1a1a1a]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-4">
              {t("forVendors.featuresTitle")}
            </h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">
              {t("forVendors.featuresSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                color: "bg-amber-100 text-amber-700",
                title: t("forVendors.feature1Title"),
                body: t("forVendors.feature1Body"),
              },
              {
                icon: ShoppingBag,
                color: "bg-green-100 text-green-700",
                title: t("forVendors.feature2Title"),
                body: t("forVendors.feature2Body"),
              },
              {
                icon: MapPin,
                color: "bg-blue-100 text-blue-700",
                title: t("forVendors.feature3Title"),
                body: t("forVendors.feature3Body"),
              },
              {
                icon: Users,
                color: "bg-purple-100 text-purple-700",
                title: t("forVendors.feature4Title"),
                body: t("forVendors.feature4Body"),
              },
              {
                icon: TrendingUp,
                color: "bg-orange-100 text-orange-700",
                title: t("forVendors.feature5Title"),
                body: t("forVendors.feature5Body"),
              },
              {
                icon: Zap,
                color: "bg-rose-100 text-rose-700",
                title: t("forVendors.feature6Title"),
                body: t("forVendors.feature6Body"),
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 p-7 rounded-2xl bg-white border border-[#3c4a26]/8 hover:border-[#8fb339]/40 hover:shadow-md transition-all"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1a1a1a] mb-1.5">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              {t("forVendors.liveIn5")}
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              {t("forVendors.noTechRequired")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                time: t("forVendors.step1Time"),
                icon: Store,
                title: t("forVendors.createProfile"),
                description: t("forVendors.step1Description"),
              },
              {
                step: "2",
                time: t("forVendors.step2Time"),
                icon: Package,
                title: t("forVendors.addProducts"),
                description: t("forVendors.step2Description"),
              },
              {
                step: "3",
                time: t("forVendors.step3Time"),
                icon: TrendingUp,
                title: t("forVendors.growFollowing"),
                description: t("forVendors.step3Description"),
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-[#f9f6f0] rounded-2xl p-8 border border-[#3c4a26]/10">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-amber-400 text-[#2b1f0a] rounded-full flex items-center justify-center font-bold font-['Playfair_Display'] shadow-lg text-lg">
                  {item.step}
                </div>
                <div className="text-xs font-semibold text-[#8fb339] uppercase tracking-wider mb-4 mt-1">{item.time}</div>
                <div className="w-12 h-12 bg-amber-400/15 rounded-xl flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-[#3c4a26]" />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-3">
              {t("forVendors.testimonialTitle")}
            </h2>
            <p className="text-gray-500">
              {t("forVendors.testimonialsSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🍯",
                name: t("forVendors.testimonial1Name"),
                market: t("forVendors.testimonial1Market"),
                quote: t("forVendors.testimonial1Quote"),
              },
              {
                emoji: "🌿",
                name: t("forVendors.testimonial2Name"),
                market: t("forVendors.testimonial2Market"),
                quote: t("forVendors.testimonial2Quote"),
              },
              {
                emoji: "🫙",
                name: t("forVendors.testimonial3Name"),
                market: t("forVendors.testimonial3Market"),
                quote: t("forVendors.testimonial3Quote"),
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-[#3c4a26]/10 flex flex-col gap-5">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 italic">"{item.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">
                    {item.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#1a1a1a]">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.market}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              {t("forVendors.pricingHeadline")}
            </h2>
            <p className="text-gray-500 text-lg">{t("forVendors.noCreditCard")}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 p-8">
              <div className="text-xs font-semibold text-[#8fb339] uppercase tracking-wider mb-2">{t("forVendors.freeTitle")}</div>
              <div className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-1">$0</div>
              <div className="text-sm text-gray-500 mb-7">{t("forVendors.freeTrialSummary")}</div>
              <ul className="space-y-3 mb-8">
                {[
                  t("forVendors.freePlan1"),
                  t("forVendors.freePlan2"),
                  t("forVendors.freePlan3"),
                  t("forVendors.freePlan4"),
                  t("forVendors.freePlan5"),
                  t("forVendors.freePlan6"),
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-[#8fb339] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/submit"
                className="block text-center px-6 py-3 bg-[#3c4a26] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3a1d] transition-colors no-underline"
              >
                {t("forVendors.getStartedFree")}
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl bg-gradient-to-br from-[#3c4a26] to-[#1c2a10] border-2 border-[#8fb339]/40 p-8 relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-amber-400 text-[#2b1f0a] text-xs font-bold px-2.5 py-1 rounded-full">
                {t("forVendors.mostPopular")}
              </div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">{t("forVendors.proTitle")}</div>
              <div className="font-['Playfair_Display'] text-4xl font-bold text-white mb-1">$9<span className="text-lg font-normal text-white/60">/mo</span></div>
              <div className="text-sm text-white/50 mb-7">{t("forVendors.cancelAnytime")}</div>
              <ul className="space-y-3 mb-8">
                {[
                  t("forVendors.proPlan1"),
                  t("forVendors.proPlan2"),
                  t("forVendors.proPlan3"),
                  t("forVendors.proPlan4"),
                  t("forVendors.proPlan5"),
                  t("forVendors.proPlan6"),
                  t("forVendors.proPlan7"),
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-white/90">
                    <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/billing"
                className="block text-center px-6 py-3 bg-amber-400 text-[#2b1f0a] rounded-lg font-bold text-sm hover:bg-amber-300 transition-colors no-underline"
              >
                {t("forVendors.upgradeBtn")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-12 text-center">
            {t("forVendors.faqTitle")}
          </h2>
          <div>
            {[
              { q: t("forVendors.faq1Q"), a: t("forVendors.faq1A") },
              { q: t("forVendors.faq2Q"), a: t("forVendors.faq2A") },
              { q: t("forVendors.faq3Q"), a: t("forVendors.faq3A") },
              { q: t("forVendors.faq4Q"), a: t("forVendors.faq4A") },
              { q: t("forVendors.faq5Q"), a: t("forVendors.faq5A") },
            ].map((item, i) => (
              <FAQ key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#2b1f0a] via-[#3a2a10] to-[#4a3416] text-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 rounded-full px-4 py-1.5 text-amber-300 text-sm font-semibold mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            {t("forVendors.ctaBadge")}
          </div>
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {t("forVendors.ctaFooterTitle")}
          </h2>
          <p className="text-xl text-amber-100/70 mb-10 leading-relaxed">
            {t("forVendors.finalCtaDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-amber-400 text-[#2b1f0a] rounded-lg font-bold text-base hover:bg-amber-300 transition-all shadow-lg no-underline"
            >
              {t("forVendors.ctaFooterBtn")}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/vendors"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors no-underline"
            >
              {t("forVendors.browseMarketplace")}
            </Link>
          </div>

          <p className="text-sm text-amber-100/40 mt-8">{t("forVendors.ctaFooterNote")}</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a1a1a] text-white/50 py-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-white/70 font-semibold">
            <span className="text-xl">🌿</span>
            <span>Open Local</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/for-markets" className="hover:text-white/80 transition-colors no-underline">{t("forVendors.footerForMarkets")}</Link>
            <Link href="/vendors" className="hover:text-white/80 transition-colors no-underline">{t("forVendors.footerBrowseVendors")}</Link>
            <Link href="/terms" className="hover:text-white/80 transition-colors no-underline">{t("forVendors.footerTerms")}</Link>
            <Link href="/privacy" className="hover:text-white/80 transition-colors no-underline">{t("forVendors.footerPrivacy")}</Link>
          </div>
          <div className="text-xs">© {new Date().getFullYear()} Open Local · Florida</div>
        </div>
      </footer>
    </div>
  );
}
