import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 mt-auto">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded flex items-center justify-center font-serif font-bold text-sm">
                O
              </div>
              <span className="font-serif font-bold text-lg text-foreground">Open Local</span>
            </div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Shop Local Wherever You Are</p>
            <p className="text-muted-foreground max-w-sm">
              The public square for Florida's small-batch economy. Discover local vendors,
              makers, farms, and artisans. Real people, real goods.
            </p>
            <p className="text-xs text-muted-foreground mt-4">openlocalapp.com</p>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-foreground">Directory</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/vendors" className="hover:text-primary transition-colors">All Vendors</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">All Goods</Link></li>
              <li><Link href="/favorites" className="hover:text-primary transition-colors">Favorites</Link></li>
              <li><Link href="/submit" className="hover:text-primary transition-colors">List your business</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-4 text-foreground">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/admin" className="hover:text-primary transition-colors">Vendor Workspace</Link></li>
              <li><a href="mailto:support@openlocalapp.com" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Open Local. Florida's local marketplace.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
