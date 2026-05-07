import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Store, ShoppingBag, PlusCircle, Settings, Menu, Heart, HandHelping, Percent, CalendarDays, LogOut, User, CreditCard, Sparkles, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, avatarUrl } from "@/context/UserContext";
import Avatar from "@/components/Avatar";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, openOnboarding, logout } = useUser();
  const [searchDraft, setSearchDraft] = useState("");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchDraft.trim();
    if (!q) return;
    setLocation(`/search?q=${encodeURIComponent(q)}`);
    setSearchDraft("");
  };

  const links = [
    { href: "/vendors", label: "Vendors", icon: Store },
    { href: "/products", label: "Goods", icon: ShoppingBag },
    { href: "/listings", label: "Listings", icon: HandHelping },
    { href: "/surplus", label: "Sale", icon: Percent },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  const UserArea = () => {
    if (isLoading) return <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />;
    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-0.5 border-2 border-primary/30 hover:border-primary transition-all focus:outline-none">
              <Avatar
                seed={user.avatarSeed}
                style={user.avatarStyle}
                equipped={user.equippedUnlocks}
                size={32}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <div className="px-3 py-2">
              <p className="font-semibold text-sm text-foreground">@{user.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}{user.zip ? ` · ${user.zip}` : ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
              <Link href="/rewards">
                <Sparkles size={14} /> Rewards
              </Link>
            </DropdownMenuItem>
            {user.role === "vendor" && (
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link href="/billing">
                  <CreditCard size={14} /> Billing
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
              <LogOut size={14} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    return (
      <button
        onClick={openOnboarding}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
      >
        <User size={14} /> Join
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto px-4 md:px-8 h-18 flex items-center justify-between gap-4" style={{ height: "4.5rem" }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-serif font-bold text-2xl group-hover:-rotate-6 transition-transform duration-300 shadow-sm">
            O
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-2xl tracking-tight text-foreground leading-tight">Open Local</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold leading-none hidden sm:block">Shop Local Wherever You Are</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-secondary hover:text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <form onSubmit={submitSearch} className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search vendors, goods…"
              aria-label="Search"
              className="h-10 w-56 lg:w-64 pl-9 pr-3 rounded-xl bg-secondary/40 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-all"
            />
          </form>
          <Link
            href="/submit"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-150"
          >
            <PlusCircle className="w-4 h-4" />
            List your business
          </Link>
          <Link href="/admin" className="p-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition-all duration-150">
            <Settings className="w-5 h-5" />
          </Link>
          <UserArea />
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-2">
          <UserArea />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px] p-6">
              {user && (
                <div className="flex items-center gap-3 mb-6 p-3 bg-muted/40 rounded-xl">
                  <Avatar
                    seed={user.avatarSeed}
                    style={user.avatarStyle}
                    equipped={user.equippedUnlocks}
                    size={40}
                    ringClassName="border-2 border-primary/30"
                  />
                  <div>
                    <p className="font-semibold text-sm text-foreground">@{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-serif font-bold text-2xl">
                  O
                </div>
                <span className="font-serif font-bold text-2xl text-foreground">Open Local</span>
              </div>
              <form onSubmit={submitSearch} className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search vendors, goods…"
                  aria-label="Search"
                  className="h-11 w-full pl-9 pr-3 rounded-xl bg-secondary/40 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background"
                />
              </form>
              <nav className="flex flex-col gap-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = location === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
                <Link
                  href="/submit"
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold text-foreground hover:bg-secondary transition-all"
                >
                  <PlusCircle className="w-5 h-5 shrink-0" />
                  List your business
                </Link>
                <div className="w-full h-px bg-border my-2" />
                <Link href="/admin" className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                  <Settings className="w-5 h-5 shrink-0" />
                  Admin
                </Link>
                {user ? (
                  <button
                    onClick={logout}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut className="w-5 h-5 shrink-0" /> Sign out
                  </button>
                ) : (
                  <button
                    onClick={openOnboarding}
                    className="flex items-center gap-4 px-4 py-3.5 rounded-xl text-base font-semibold text-primary hover:bg-secondary transition-all"
                  >
                    <User className="w-5 h-5 shrink-0" /> Join Open Local
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
