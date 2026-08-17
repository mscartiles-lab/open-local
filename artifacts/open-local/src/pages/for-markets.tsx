import { Check, X, Link2, Send, Rocket, Store, Bell, MapPin, MessageCircle, Star, Package, TrendingUp, Award, Users, ArrowRight, Zap } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export default function ForMarkets() {
  const { t } = useTranslation();

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-[#f9f6f0] font-sans">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="bg-white/95 backdrop-blur border-b border-[#3c4a26]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-[#3c4a26] font-bold text-lg tracking-tight no-underline">
              <span className="text-2xl">🌿</span>
              <span>Open Local</span>
            </Link>
            <Link
              href="/invite"
              className="px-5 py-2.5 bg-[#3c4a26] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3a1d] transition-colors no-underline"
            >
              {t("forMarkets.ctaInvite")} →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1c2a10] via-[#243316] to-[#2d3a1d] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#8fb339]/20 border border-[#8fb339]/40 rounded-full px-4 py-1.5 text-[#a8d044] text-sm font-semibold mb-8 tracking-wide">
                <Award className="w-3.5 h-3.5" />
                {t("forMarkets.badge")}
              </div>

              <h1 className="font-['Playfair_Display'] text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                {t("forMarkets.heroTitle")}
              </h1>

              <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                {t("forMarkets.heroDescription")}
              </p>
              <p className="text-base text-[#8fb339] font-medium mb-10">
                {t("forMarkets.heroSubtext")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/invite"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#8fb339] text-white rounded-lg font-bold text-base hover:bg-[#7a9a2f] transition-all shadow-lg no-underline"
                >
                  {t("forMarkets.ctaInvite")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/markets/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors no-underline"
                >
                  {t("forMarkets.ctaList")}
                </Link>
              </div>
            </div>

            {/* Hero image + floating cards */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/market-hero.jpg"
                  alt={t("forMarkets.heroImageAlt")}
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c2a10]/50 to-transparent rounded-2xl" />
              </div>

              {/* Floating card — vendor storefront */}
              <div className="hidden lg:block absolute -bottom-5 -left-5 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-52 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-xl">🍯</div>
                  <div>
                    <div className="font-bold text-sm leading-tight">{t("forMarkets.sampleVendorName")}</div>
                    <div className="text-xs text-[#8fb339] font-medium">{t("forMarkets.sampleOnlineStatus")}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">{t("forMarkets.sampleVendorStats")}</div>
              </div>

              {/* Floating card — vendor permanence */}
              <div className="hidden lg:block absolute -top-4 -right-4 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-52 border border-gray-100">
                <div className="text-xs font-semibold text-[#8fb339] uppercase tracking-wider mb-1">{t("forMarkets.vendorPermanenceLabel")}</div>
                <div className="text-sm font-bold text-[#1a1a1a] leading-snug">{t("forMarkets.vendorPermanenceDescription")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What Your Market Gains ─────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-4">
              {t("forMarkets.gainsTitle")}
            </h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">
              {t("forMarkets.gainsSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: TrendingUp,
                title: t("forMarkets.gains1Title"),
                body: t("forMarkets.gains1Body"),
              },
              {
                icon: Users,
                title: t("forMarkets.gains2Title"),
                body: t("forMarkets.gains2Body"),
              },
              {
                icon: Award,
                title: t("forMarkets.gains3Title"),
                body: t("forMarkets.gains3Body"),
              },
              {
                icon: Zap,
                title: t("forMarkets.gains4Title"),
                body: t("forMarkets.gains4Body"),
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-5 p-8 rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 hover:border-[#8fb339]/40 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-[#3c4a26] rounded-xl flex items-center justify-center text-white">
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Hard Truth ─────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              {t("forMarkets.problemHeadline")}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t("forMarkets.problemDescription")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/70 border border-gray-200 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-500 mb-6">
                <X className="w-3.5 h-3.5" /> {t("forMarkets.withoutOpenLocal")}
              </div>
              <ul className="space-y-4">
                {[
                  t("forMarkets.withoutItem1"),
                  t("forMarkets.withoutItem2"),
                  t("forMarkets.withoutItem3"),
                  t("forMarkets.withoutItem4"),
                  t("forMarkets.withoutItem5"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-600">
                    <X className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />
                    <span className="text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-[#8fb339]/10 to-[#3c4a26]/5 border-2 border-[#8fb339]/30 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#8fb339]/20 rounded-full text-sm font-semibold text-[#3c4a26] mb-6">
                <Check className="w-3.5 h-3.5" /> {t("forMarkets.withOpenLocal")}
              </div>
              <ul className="space-y-4">
                {[
                  t("forMarkets.withItem1"),
                  t("forMarkets.withItem2"),
                  t("forMarkets.withItem3"),
                  t("forMarkets.withItem4"),
                  t("forMarkets.withItem5"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#8fb339] mt-1 flex-shrink-0" />
                    <span className="text-sm leading-relaxed font-medium text-[#1a1a1a]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              {t("forMarkets.howTitle")}
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              {t("forMarkets.setupHelp")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Link2,
                step: "1",
                time: t("forMarkets.setup1Time"),
                title: t("forMarkets.setup1Title"),
                description: t("forMarkets.setup1Description"),
              },
              {
                icon: Send,
                step: "2",
                time: t("forMarkets.setup2Time"),
                title: t("forMarkets.setup2Title"),
                description: t("forMarkets.setup2Description"),
              },
              {
                icon: Rocket,
                step: "3",
                time: t("forMarkets.setup3Time"),
                title: t("forMarkets.setup3Title"),
                description: t("forMarkets.setup3Description"),
              },
            ].map((item, i) => (
              <div key={i} className="relative bg-[#f9f6f0] rounded-2xl p-8 border border-[#3c4a26]/10">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-[#3c4a26] text-white rounded-full flex items-center justify-center font-bold font-['Playfair_Display'] shadow-lg text-lg">
                  {item.step}
                </div>
                <div className="text-xs font-semibold text-[#8fb339] uppercase tracking-wider mb-4 mt-1">{item.time}</div>
                <div className="w-12 h-12 bg-[#8fb339]/15 rounded-xl flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-[#3c4a26]" />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Vendors Get ───────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#3c4a26]/10 rounded-full px-4 py-1.5 text-[#3c4a26] text-sm font-semibold mb-5">
              {t("forMarkets.perkHeadline")}
            </div>
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              {t("forMarkets.getTitle")}
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              {t("forMarkets.perkDescription")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Store, title: t("forMarkets.benefit1Title"), description: t("forMarkets.benefit1Description") },
              { icon: Bell, title: t("forMarkets.benefit2Title"), description: t("forMarkets.benefit2Description") },
              { icon: MapPin, title: t("forMarkets.benefit3Title"), description: t("forMarkets.benefit3Description") },
              { icon: MessageCircle, title: t("forMarkets.benefit4Title"), description: t("forMarkets.benefit4Description") },
              { icon: Star, title: t("forMarkets.benefit5Title"), description: t("forMarkets.benefit5Description") },
              { icon: Package, title: t("forMarkets.benefit6Title"), description: t("forMarkets.benefit6Description") },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md hover:border-[#8fb339]/40 transition-all">
                <div className="w-11 h-11 bg-gradient-to-br from-[#8fb339] to-[#3c4a26] rounded-lg flex items-center justify-center mb-4 text-white">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section className="py-14 bg-[#3c4a26] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { number: "1,200+", label: t("forMarkets.stat1Label") },
              { number: "48", label: t("forMarkets.stat2Label") },
              { number: "100%", label: t("forMarkets.stat3Label") },
              { number: "< 5 min", label: t("forMarkets.stat4Label") },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] text-[#8fb339] mb-1">{s.number}</div>
                <div className="text-sm text-gray-300 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="bg-[#f9f6f0] rounded-3xl p-10 border border-[#3c4a26]/10 relative">
            <div className="absolute -top-5 left-10 w-10 h-10 bg-[#8fb339] rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            <blockquote className="font-['Playfair_Display'] text-xl text-[#1a1a1a] leading-relaxed mb-3 mt-4">
              "{t("forMarkets.testimonialBlockquote")}"
            </blockquote>
            <p className="text-[#8fb339] font-semibold text-sm mb-6">{t("forMarkets.testimonialQuote")}</p>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#8fb339] to-[#3c4a26] rounded-full flex items-center justify-center text-white font-bold">SM</div>
              <div>
                <div className="font-bold text-[#1a1a1a] text-sm">{t("forMarkets.testimonialName")}</div>
                <div className="text-gray-500 text-sm">{t("forMarkets.testimonialRole")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#1c2a10] to-[#2d3a1d] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <img src="/vendor-stall.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold mb-5 leading-tight">
            {t("forMarkets.finalCtaHeadline")}
          </h2>
          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            {t("forMarkets.finalCtaDescription")}
          </p>

          <Link
            href="/invite"
            className="inline-flex items-center gap-3 px-10 py-5 bg-[#8fb339] text-white rounded-xl font-bold text-lg hover:bg-[#7a9a2f] transition-all shadow-2xl no-underline mb-6"
          >
            {t("forMarkets.ctaInvite")}
            <ArrowRight className="w-5 h-5" />
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400 mt-6">
            {[t("forMarkets.ctaLabel1"), t("forMarkets.ctaLabel2"), t("forMarkets.ctaLabel3"), t("forMarkets.ctaLabel4")].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#8fb339]" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-8 bg-[#1c2a10] text-gray-500 text-center text-sm">
        {t("forMarkets.footerCopy")}
      </footer>
    </div>
  );
}
