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
    { href: "/submit", label: "List your business", icon: PlusCircle },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-serif font-bold text-xl group-hover:-rotate-6 transition-transform duration-300">
            O
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-xl tracking-tight text-foreground leading-tight">Open Local</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium leading-none hidden sm:block">Shop Local Wherever You Are</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
          <div className="w-px h-4 bg-border mx-2" />
          <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors">
            <Settings className="w-5 h-5" />
          </Link>
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <nav className="flex flex-col gap-4 mt-8">
                {links.map((link) => {
                  const Icon = link.icon;
                  const active = location === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-3 text-lg font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="w-full h-px bg-border my-4" />
                <Link href="/admin" className="flex items-center gap-3 text-lg font-medium text-muted-foreground transition-colors hover:text-primary">
                  <Settings className="w-5 h-5" />
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
