import { Link, useLocation } from "wouter";
import { Store, ShoppingBag, PlusCircle, Settings, Menu, Heart, HandHelping, Percent, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const [location] = useLocation();

  const links = [
    { href: "/vendors", label: "Vendors", icon: Store },
    { href: "/products", label: "Goods", icon: ShoppingBag },
    { href: "/listings", label: "Listings", icon: HandHelping },
    { href: "/surplus", label: "Sale", icon: Percent },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

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
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[360px] p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-serif font-bold text-2xl">
                  O
                </div>
                <span className="font-serif font-bold text-2xl text-foreground">Open Local</span>
              </div>
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
              </nav>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  );
}
