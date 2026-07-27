import React from 'react';
import { Check, X, Link2, Send, Rocket, Store, Bell, MapPin, MessageCircle, Star, Package, TrendingUp, Shield, Award, Users, ArrowRight, Zap } from 'lucide-react';

export default function MarketManager() {
  return (
    <div className="min-h-screen bg-[#f9f6f0] font-sans">

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="bg-white/95 backdrop-blur border-b border-[#3c4a26]/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 text-[#3c4a26] font-bold text-lg tracking-tight">
              <span className="text-2xl">🌿</span>
              <span>Open Local</span>
            </div>
            <button className="px-5 py-2.5 bg-[#3c4a26] text-white rounded-lg font-semibold text-sm hover:bg-[#2d3a1d] transition-colors">
              Get Your Market's Link →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#1c2a10] via-[#243316] to-[#2d3a1d] text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 bg-[#8fb339]/20 border border-[#8fb339]/40 rounded-full px-4 py-1.5 text-[#a8d044] text-sm font-semibold mb-8 tracking-wide">
                <Award className="w-3.5 h-3.5" />
                For Farmers Market Managers
              </div>

              <h1 className="font-['Playfair_Display'] text-5xl lg:text-6xl font-bold leading-[1.1] mb-6">
                The Market That Looks Out for Its Vendors Wins.
              </h1>

              <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                Open Local gives every vendor in your market a free digital storefront — so they earn more between markets, stay loyal to yours, and bring new shoppers through your gates.
              </p>
              <p className="text-base text-[#8fb339] font-medium mb-10">
                Zero cost to you. Zero admin work. One shared link.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#8fb339] text-white rounded-lg font-bold text-base hover:bg-[#7a9a2f] transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] transform">
                  Get Your Market's Invite Link
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button className="px-8 py-4 border border-white/25 text-white/90 rounded-lg font-medium hover:bg-white/10 transition-colors">
                  See how it works ↓
                </button>
              </div>
            </div>

            {/* Hero image + floating cards */}
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src="/__mockup/images/market-hero.jpg"
                  alt="Vibrant farmers market aerial view"
                  className="w-full h-[420px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c2a10]/50 to-transparent rounded-2xl" />
              </div>

              {/* Floating card — vendor storefront */}
              <div className="absolute -bottom-5 -left-5 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-52 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-xl">🍯</div>
                  <div>
                    <div className="font-bold text-sm leading-tight">Sunrise Honey</div>
                    <div className="text-xs text-[#8fb339] font-medium">● Online now</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">14 followers · 3 new orders this week</div>
              </div>

              {/* Floating card — market stat */}
              <div className="absolute -top-4 -right-4 bg-white text-[#1a1a1a] p-4 rounded-2xl shadow-2xl w-48 border border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pinellas Market</div>
                <div className="text-2xl font-['Playfair_Display'] font-bold text-[#3c4a26]">34 vendors</div>
                <div className="text-xs text-gray-500 mt-1">live on Open Local</div>
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
              What Your Market Gains
            </h2>
            <p className="text-xl text-gray-500 max-w-xl mx-auto">
              This isn't just a tool for your vendors. It's a competitive edge for your market.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="flex gap-5 p-8 rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 hover:border-[#8fb339]/40 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-[#3c4a26] rounded-xl flex items-center justify-center text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Higher vendor retention</h3>
                <p className="text-gray-600 leading-relaxed">Vendors who earn more money — even between markets — are far more likely to renew their stall season after season. Open Local puts money in their pocket, and that loyalty flows back to you.</p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex gap-5 p-8 rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 hover:border-[#8fb339]/40 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-[#3c4a26] rounded-xl flex items-center justify-center text-white">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">More foot traffic on market days</h3>
                <p className="text-gray-600 leading-relaxed">When shoppers discover a vendor online, they come to the market to meet them. Open Local turns digital browsing into in-person visits — bringing new faces through your gates every week.</p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex gap-5 p-8 rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 hover:border-[#8fb339]/40 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-[#3c4a26] rounded-xl flex items-center justify-center text-white">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Stand out from competing markets</h3>
                <p className="text-gray-600 leading-relaxed">When vendors are choosing which markets to commit to, the one that actively supports their growth wins. Offering Open Local is a concrete perk that sets your market apart — and gives vendors a reason to stay.</p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="flex gap-5 p-8 rounded-2xl bg-[#f9f6f0] border border-[#3c4a26]/10 hover:border-[#8fb339]/40 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 bg-[#3c4a26] rounded-xl flex items-center justify-center text-white">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">Zero effort on your end</h3>
                <p className="text-gray-600 leading-relaxed">You share one link or QR code. That's it. Vendors sign themselves up, build their own profiles, and manage their own storefronts. You get all the upside with none of the administrative overhead.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Hard Truth ─────────────────────────────────────── */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              Your vendors are invisible 5 days a week.
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A market that runs Saturday morning is still competing for shopper loyalty every day of the week — and right now, your vendors have no presence for any of it.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/70 border border-gray-200 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-semibold text-gray-500 mb-6">
                <X className="w-3.5 h-3.5" /> Without Open Local
              </div>
              <ul className="space-y-4">
                {[
                  'Vendors only exist on market day',
                  'A shopper forgets a vendor → they never come back',
                  'Vendors who struggle financially drop out mid-season',
                  'Competing markets with more perks poach your best vendors',
                  'No way to showcase your market online between events',
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
                <Check className="w-3.5 h-3.5" /> With Open Local
              </div>
              <ul className="space-y-4">
                {[
                  'Every vendor is findable and shoppable every day',
                  'Shoppers follow their favorite vendors and come back',
                  'Vendors earn more → they stay in your market longer',
                  'You offer something competing markets don\'t',
                  'Your market shows up on Open Local — free promotion',
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
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              Your part takes 60 seconds.
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              After that, vendors do the rest themselves. No tech setup, no ongoing work for you.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Link2,
                step: '1',
                time: 'Day 1, 60 seconds',
                title: "Get your market's invite link",
                description: "We generate a unique QR code and URL for your market. Vendors who sign up through it are automatically linked to your market's page on Open Local.",
              },
              {
                icon: Send,
                step: '2',
                time: 'Day 1, however you like',
                title: 'Share it once',
                description: 'Post it in your vendor Facebook group, print it on your check-in sheet, or drop it in your vendor newsletter. Done. No follow-up required.',
              },
              {
                icon: Rocket,
                step: '3',
                time: 'Within days',
                title: 'Watch your vendors launch',
                description: 'Each vendor creates their profile in about 5 minutes — for free. You get a market page showing all participating vendors, live for shoppers to browse.',
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
              The perk you're handing them
            </div>
            <h2 className="font-['Playfair_Display'] text-4xl font-bold text-[#1a1a1a] mb-4">
              What every vendor gets — free.
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              You don't pay a cent. They don't pay a cent. And they get a full digital business presence they couldn't build on their own.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Store, title: 'Permanent storefront', description: 'Their own page with photos, story, product catalog, and market schedule — searchable on Google.' },
              { icon: Bell, title: 'Fresh batch alerts', description: '"Just pulled 40 sourdough loaves" — followers are notified instantly, driving pre-market anticipation.' },
              { icon: MapPin, title: 'Market listings', description: 'Shoppers see exactly which markets each vendor attends and when — and get directions.' },
              { icon: MessageCircle, title: 'Direct messaging', description: 'Customers reach out before market day to reserve items or ask questions. No more missed sales.' },
              { icon: Star, title: 'Reviews & reputation', description: 'Verified reviews travel with each vendor. Great vendors earn loyalty that transcends any single market.' },
              { icon: Package, title: 'Pre-orders', description: 'Regulars reserve items before they sell out. Vendors sell more, shoppers get guaranteed access.' },
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
              { number: '1,200+', label: 'Active Florida vendors' },
              { number: '48', label: 'Markets on platform' },
              { number: '100%', label: 'Free for vendors & markets' },
              { number: '< 5 min', label: 'Vendor setup time' },
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
              "I printed the QR code on our vendor check-in sheet for two Saturdays. By the end of the month, 34 of our 40 vendors had live profiles. Three vendors told me they'd had their best revenue month ever — and two of them specifically said they were staying with us next season because of it."
            </blockquote>
            <p className="text-[#8fb339] font-semibold text-sm mb-6">The part that got me? I spent maybe 20 minutes on this total.</p>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#8fb339] to-[#3c4a26] rounded-full flex items-center justify-center text-white font-bold">SM</div>
              <div>
                <div className="font-bold text-[#1a1a1a] text-sm">Sarah M.</div>
                <div className="text-gray-500 text-sm">Market Manager · Pinellas Growers Market</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-[#1c2a10] to-[#2d3a1d] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]">
          <img src="/__mockup/images/vendor-stall.jpg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-['Playfair_Display'] text-4xl lg:text-5xl font-bold mb-5 leading-tight">
            Your vendors work hard on market day. Give them something that works for them every day.
          </h2>
          <p className="text-lg text-gray-300 mb-10 leading-relaxed">
            It costs you nothing. Takes 60 seconds to set up. And the markets that offer this are already seeing stronger vendor retention and more foot traffic.
          </p>

          <button className="inline-flex items-center gap-3 px-10 py-5 bg-[#8fb339] text-white rounded-xl font-bold text-lg hover:bg-[#7a9a2f] transition-all shadow-2xl hover:scale-[1.02] transform mb-6">
            Get Your Market's Invite Link
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#8fb339]" /> Free for you</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#8fb339]" /> Free for vendors</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#8fb339]" /> No account required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#8fb339]" /> Works for any market size</span>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-8 bg-[#1c2a10] text-gray-500 text-center text-sm">
        © 2025 Open Local · Florida's marketplace for local producers
      </footer>
    </div>
  );
}
