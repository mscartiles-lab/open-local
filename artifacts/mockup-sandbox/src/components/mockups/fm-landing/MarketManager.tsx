import React from 'react';
import { Check, X, Link2, Send, Rocket, Store, Bell, MapPin, MessageCircle, Star, Package } from 'lucide-react';

export default function MarketManager() {
  return (
    <div className="min-h-screen bg-[#f9f6f0]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#3c4a26]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 text-[#3c4a26] font-semibold text-lg">
              <span className="text-2xl">🌿</span>
              <span>Open Local</span>
            </div>
            <button className="px-6 py-2.5 bg-[#3c4a26] text-white rounded-lg font-medium hover:bg-[#2d3a1d] transition-colors">
              Get Your Market's Link →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1c2a10] to-[#2d3a1d] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="font-['Playfair_Display'] text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Give Every Vendor a Stall That's Open Every Day.
              </h1>
              <p className="text-lg sm:text-xl text-gray-300 mb-8 leading-relaxed">
                Open Local gives your vendors a free digital storefront — so local shoppers can find them, follow them, and buy from them between markets.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="px-8 py-4 bg-[#8fb339] text-white rounded-lg font-semibold hover:bg-[#7a9a2f] transition-colors shadow-lg">
                  Get Your Market's Invite Link
                </button>
                <button className="px-8 py-4 border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  See How It Works ↓
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="/__mockup/images/market-hero.jpg" 
                  alt="Vibrant farmers market aerial view"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c2a10]/40 to-transparent"></div>
              </div>
              
              {/* Floating vendor cards */}
              <div className="hidden lg:block absolute -bottom-6 -left-6 bg-white text-[#1a1a1a] p-4 rounded-xl shadow-xl max-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-2xl">
                    🍯
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Sunrise Honey</div>
                    <div className="text-xs text-gray-500">Online now</div>
                  </div>
                </div>
              </div>
              
              <div className="hidden lg:block absolute -top-4 -right-4 bg-white text-[#1a1a1a] p-4 rounded-xl shadow-xl max-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-2xl">
                    🍞
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Bay Bread Bakers</div>
                    <div className="text-xs text-gray-500">24/7 storefront</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Before */}
            <div className="bg-white/50 border border-gray-200 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-600 mb-6">
                <X className="w-4 h-4" />
                Before Open Local
              </div>
              <ul className="space-y-4">
                {[
                  'Vendors only reachable on market day',
                  'Shoppers forget which stalls carry what',
                  'No way to notify followers of fresh batches',
                  'Vendors lose sales between markets'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <X className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="bg-gradient-to-br from-[#8fb339]/10 to-[#3c4a26]/5 border-2 border-[#8fb339]/30 rounded-2xl p-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#8fb339]/20 rounded-full text-sm font-medium text-[#3c4a26] mb-6">
                <Check className="w-4 h-4" />
                With Open Local
              </div>
              <ul className="space-y-4">
                {[
                  'Digital storefront open 24/7',
                  'Shoppers browse, favorite, and follow vendors',
                  'Vendors post fresh batches and surplus drops',
                  'Sales happen between markets too'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[#1a1a1a]">
                    <Check className="w-5 h-5 text-[#8fb339] mt-0.5 flex-shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to get your vendors online
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Link2,
                step: '1',
                title: "Get your market's unique invite link",
                description: 'You receive a QR code or URL customized for your market'
              },
              {
                icon: Send,
                step: '2',
                title: 'Share it with your vendors',
                description: 'Post it on your vendor Facebook group, print it at market, add to vendor packets'
              },
              {
                icon: Rocket,
                step: '3',
                title: 'Your vendors launch their digital presence',
                description: 'Takes 5 minutes, completely free for them'
              }
            ].map((item, i) => (
              <div key={i} className="relative bg-[#f9f6f0] rounded-2xl p-8 border-2 border-[#3c4a26]/10 hover:border-[#8fb339]/50 transition-colors">
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-[#3c4a26] text-white rounded-full flex items-center justify-center font-bold text-xl font-['Playfair_Display'] shadow-lg">
                  {item.step}
                </div>
                <div className="w-14 h-14 bg-[#8fb339]/20 rounded-xl flex items-center justify-center mb-6 mt-2">
                  <item.icon className="w-7 h-7 text-[#3c4a26]" />
                </div>
                <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Vendors Get */}
      <section className="py-20 bg-[#f9f6f0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a1a1a] mb-4">
              What Vendors Get
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything they need to thrive between market days
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Store,
                title: 'Free storefront',
                description: 'Profile page with their story, photos, and product catalog'
              },
              {
                icon: Bell,
                title: 'Fresh batch alerts',
                description: 'Post "just pulled 40 loaves of sourdough" and notify followers'
              },
              {
                icon: MapPin,
                title: 'Market schedule',
                description: "Tell shoppers which markets they'll be at and when"
              },
              {
                icon: MessageCircle,
                title: 'Direct messages',
                description: 'Customers can reach out before market day'
              },
              {
                icon: Star,
                title: 'Reviews',
                description: 'Build reputation that travels with them'
              },
              {
                icon: Package,
                title: 'Pre-orders',
                description: 'Let regulars reserve items before they sell out'
              }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-[#8fb339]/50 transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-[#8fb339] to-[#3c4a26] rounded-lg flex items-center justify-center mb-4 text-white">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-[#3c4a26] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { number: '1,200+', label: 'Florida vendors' },
              { number: '48', label: 'farmers markets represented' },
              { number: 'Free forever', label: 'for vendors' },
              { number: '5 minutes', label: 'setup time' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl sm:text-4xl font-bold font-['Playfair_Display'] text-[#8fb339] mb-2">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#f9f6f0] rounded-2xl p-8 sm:p-12 border-2 border-[#3c4a26]/10 relative">
            <div className="absolute -top-6 left-8 w-12 h-12 bg-[#8fb339] rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>
            
            <blockquote className="text-xl sm:text-2xl font-['Playfair_Display'] text-[#1a1a1a] leading-relaxed mb-6 mt-4">
              "We started sharing the Open Local QR code at vendor check-in. Within two weeks, 30 of our vendors had live storefronts. Our shoppers love it."
            </blockquote>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#8fb339] to-[#3c4a26] rounded-full flex items-center justify-center text-white font-bold text-xl">
                SM
              </div>
              <div>
                <div className="font-semibold text-[#1a1a1a]">Sarah M.</div>
                <div className="text-gray-600">Market Manager, Pinellas Growers Market</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-[#2d3a1d] to-[#1c2a10] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img 
            src="/__mockup/images/vendor-stall.jpg" 
            alt="Vendor at market stall"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="font-['Playfair_Display'] text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to give your vendors a digital home?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            It's free for vendors, takes 5 minutes to set up, and you can share the link however works best for your market.
          </p>
          
          <button className="px-10 py-5 bg-[#8fb339] text-white rounded-lg font-bold text-lg hover:bg-[#7a9a2f] transition-all shadow-2xl hover:shadow-3xl hover:scale-105 transform">
            Get Your Market's Invite Link
          </button>
          
          <p className="mt-6 text-sm text-gray-400">
            No account needed · Free for vendors · Works for any market
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#1c2a10] text-gray-400 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          © 2025 Open Local · Florida's marketplace for local producers
        </div>
      </footer>
    </div>
  );
}
