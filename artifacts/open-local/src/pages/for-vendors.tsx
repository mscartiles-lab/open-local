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
                For Markets
              </Link>
              <Link
                href="/submit"
                className="px-5 py-2.5 bg-[#3c4a26] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3a1d] transition-colors no-underline"
              >
                Claim Your Free Storefront →
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
                Free forever for Florida vendors
              </div>

              <h1 className="font-['Playfair_Display'] text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                Your stand is open every day now — not just Saturdays.
              </h1>

              <p className="text-lg text-amber-100/80 mb-4 leading-relaxed">
                Open Local gives you a free digital storefront that shoppers can discover, follow,
                and pre-order from all week long. Your farm, your craft, your schedule — permanently
                online.
              </p>
              <p className="text-base text-amber-300 font-medium mb-10">
                No monthly fees. No tech headaches. Up in 5 minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/submit"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-amber-400 text-[#2b1f0a] rounded-lg font-bold text-base hover:bg-amber-300 transition-all shadow-lg no-underline"
                >
                  Claim Your Free Storefront
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => scrollTo("how-it-works")}
                  className="px-8 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  See how it works ↓
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
                  <div className="text-xs font-bold text-[#1a1a1a]">New Pre-Order</div>
                </div>
                <div className="text-xs text-gray-500">2 jars wildflower honey · Pick up Saturday</div>
                <div className="text-[10px] text-[#8fb339] font-semibold mt-1.5">Tuesday, 11:24 PM</div>
              </div>

              {/* Floating — followers */}
              <div className="absolute -top-4 -right-4 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-48 border border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#8fb339]" />
                  <div className="text-xs font-bold text-[#1a1a1a]">247 followers</div>
                </div>
                <div className="text-xs text-gray-500">get notified when you post</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-amber-700 text-sm font-semibold mb-8">
            The situation every local vendor knows
          </div>
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-6 leading-tight">
            You grow, bake, and craft all week.<br />
            <span className="text-[#3c4a26]">You're only visible for three hours on Saturday.</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            The shopper who loved your honey last weekend? If they can't find you again between markets,
            they buy from a grocery store instead. Open Local closes that gap.
          </p>
        </div>

        {/* Before / After */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 mt-14 grid md:grid-cols-2 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-500 mb-6">
              <X className="w-3.5 h-3.5" /> Without Open Local
            </div>
            <ul className="space-y-4">
              {[
                "Customers forget you between markets",
                "No way to take pre-orders or reservations",
                "Your story is invisible online",
                "New shoppers can't find you without stumbling onto your table",
                "You lose a sale every time someone can't make market day",
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
              <Check className="w-3.5 h-3.5" /> With Open Local
            </div>
            <ul className="space-y-4">
              {[
                "Loyal shoppers follow you and get notified when you post",
                "Accept pre-orders any day of the week",
                "Your craft and story live on a permanent profile",
                "New shoppers discover you on the map — not just at your table",
                "Sell surplus and run drops between markets",
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
              Everything you need. Nothing you don't.
            </h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">
              Built specifically for farmers market vendors, food artisans, and local makers in Florida.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                color: "bg-amber-100 text-amber-700",
                title: "Your own storefront",
                body: "A beautiful profile page at openlocal.com/vendors/your-name. Your photo, your story, your products — always live.",
              },
              {
                icon: ShoppingBag,
                color: "bg-green-100 text-green-700",
                title: "Pre-orders & reservations",
                body: "Let customers reserve products before market day. No more sold-out disappointments — your best items go to the people who planned ahead.",
              },
              {
                icon: MapPin,
                color: "bg-blue-100 text-blue-700",
                title: "Show up on the map",
                body: "Shoppers nearby can filter by distance, product type, and availability. If you're on the map, you get found.",
              },
              {
                icon: Users,
                color: "bg-purple-100 text-purple-700",
                title: "Followers who come back",
                body: "Shoppers follow your page and get notified when you post new inventory, drops, or your weekly schedule. Turn one-time buyers into regulars.",
              },
              {
                icon: TrendingUp,
                color: "bg-orange-100 text-orange-700",
                title: "Surplus & Drops",
                body: "Move end-of-day surplus before you pack up. Post limited drops that sell out fast. Create urgency without a discount.",
              },
              {
                icon: Zap,
                color: "bg-rose-100 text-rose-700",
                title: "Your profile, your markets",
                body: "List every market you attend. Your profile travels with you — it doesn't belong to any one market or organization.",
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
              You're live in 5 minutes.
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              No tech skills required. No card. No approval process.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                time: "2 minutes",
                icon: Store,
                title: "Create your free profile",
                description:
                  "Tell us your name, what you make, and upload a photo or two. That's your storefront — live immediately at openlocal.com/vendors/your-name.",
              },
              {
                step: "2",
                time: "2 minutes",
                icon: Package,
                title: "Add your products",
                description:
                  "List what you grow, bake, or craft. Set which markets you sell at and your typical schedule. Shoppers can now browse and pre-order.",
              },
              {
                step: "3",
                time: "Ongoing",
                icon: TrendingUp,
                title: "Grow your following",
                description:
                  "Share your profile link on Instagram, at your table, and in your farmers market's newsletter. Followers build week over week.",
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
              Vendors across Florida are already selling more.
            </h2>
            <p className="text-gray-500">
              Real stories from local producers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🍯",
                name: "Sandra M.",
                location: "Orlando, FL",
                market: "Lake Eola Farmers Market",
                quote:
                  "I got two pre-orders the first weekend after setting up my profile — from people who found me on the map and never made it to market. That money would have walked right past me.",
              },
              {
                emoji: "🌿",
                name: "Carlos R.",
                location: "Tampa, FL",
                market: "Hillsborough County Markets",
                quote:
                  "My regulars actually found me on Open Local before they found me at the market. Now they follow me and I can tell them when I'm at which market each week. Saves me a ton of Instagram DMs.",
              },
              {
                emoji: "🫙",
                name: "Alicia T.",
                location: "Sarasota, FL",
                market: "Sarasota Saturday Market",
                quote:
                  "I started posting surplus at 11am on market day. Sells out by noon. It's the best thing I did this season — people come specifically to grab end-of-market deals.",
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
              Start free. Upgrade when you're ready.
            </h2>
            <p className="text-gray-500 text-lg">No credit card to get started. Ever.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 p-8">
              <div className="text-xs font-semibold text-[#8fb339] uppercase tracking-wider mb-2">Free forever</div>
              <div className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-1">$0</div>
              <div className="text-sm text-gray-500 mb-7">No card. No trial. Just free.</div>
              <ul className="space-y-3 mb-8">
                {[
                  "Public storefront with your profile",
                  "Up to 10 product listings",
                  "Listed at your markets on the map",
                  "Pre-orders and reservations",
                  "Followers & notifications",
                  "Post surplus drops",
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
                Get Started Free
              </Link>
            </div>

            {/* Pro */}
            <div className="rounded-2xl bg-gradient-to-br from-[#3c4a26] to-[#1c2a10] border-2 border-[#8fb339]/40 p-8 relative overflow-hidden">
              <div className="absolute top-5 right-5 bg-amber-400 text-[#2b1f0a] text-xs font-bold px-2.5 py-1 rounded-full">
                Most popular
              </div>
              <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">Open Local Pro</div>
              <div className="font-['Playfair_Display'] text-4xl font-bold text-white mb-1">$9<span className="text-lg font-normal text-white/60">/mo</span></div>
              <div className="text-sm text-white/50 mb-7">Cancel anytime.</div>
              <ul className="space-y-3 mb-8">
                {[
                  "Everything in Free",
                  "Unlimited product listings",
                  "Analytics dashboard",
                  "Priority placement in search",
                  "Customizable storefront theme & colors",
                  "Custom banner image",
                  "Early access to new features",
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
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-2xl mx-auto px-6 lg:px-8">
          <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-12 text-center">
            Common questions
          </h2>
          <div>
            {[
              {
                q: "Do I need to be at a farmers market to join?",
                a: "Not necessarily — the platform is built around Florida's farmers market ecosystem, but any local producer, artisan, or food maker can create a profile. If you sell at markets, your profile will appear on those market pages automatically.",
              },
              {
                q: "Is it really free? What's the catch?",
                a: "The free tier is genuinely free — no trial period, no credit card, no surprise charges. We offer a paid Pro tier with extra features like unlimited listings, analytics, and storefront customization. We make money when vendors upgrade, not by charging for the basics.",
              },
              {
                q: "Who owns my profile and products?",
                a: "You do, always. Your profile belongs to you — not to any market. If you stop selling at a market or move to a new one, your profile stays with you. You can also delete your account and all data at any time.",
              },
              {
                q: "How do pre-orders and payments work?",
                a: "Customers reserve items through your storefront, and payment is collected at pickup on market day. You handle fulfillment the same way you always have — you just have confirmed orders waiting for you when you arrive.",
              },
              {
                q: "What if I already have an Instagram or website?",
                a: "Open Local works alongside those. Think of it as your local-discovery layer — people in your area searching for local food or craft will find you here, even if they're not following you on Instagram. You can link your socials from your profile too.",
              },
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
            Florida-first · Free forever
          </div>
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            Your next customer is already searching for you.
          </h2>
          <p className="text-xl text-amber-100/70 mb-10 leading-relaxed">
            Give them somewhere to find you. Claim your free storefront in 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-amber-400 text-[#2b1f0a] rounded-lg font-bold text-base hover:bg-amber-300 transition-all shadow-lg no-underline"
            >
              Claim Your Free Storefront
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/vendors"
              className="inline-flex items-center justify-center gap-2 px-10 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors no-underline"
            >
              Browse the marketplace
            </Link>
          </div>

          <p className="text-sm text-amber-100/40 mt-8">No credit card · No approval · Cancel anytime</p>
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
            <Link href="/for-markets" className="hover:text-white/80 transition-colors no-underline">For Markets</Link>
            <Link href="/vendors" className="hover:text-white/80 transition-colors no-underline">Browse Vendors</Link>
            <Link href="/terms" className="hover:text-white/80 transition-colors no-underline">Terms</Link>
            <Link href="/privacy" className="hover:text-white/80 transition-colors no-underline">Privacy</Link>
          </div>
          <div className="text-xs">© {new Date().getFullYear()} Open Local · Florida</div>
        </div>
      </footer>
    </div>
  );
}
