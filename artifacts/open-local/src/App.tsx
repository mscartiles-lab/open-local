import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/home";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Submit from "@/pages/submit";
import Dashboard from "@/pages/dashboard";
import Admin from "@/pages/admin";
import Favorites from "@/pages/favorites";
import PinYourBusiness from "@/pages/pin-your-business";
import MasterList from "@/pages/master-list";
import Listings from "@/pages/listings";
import Surplus from "@/pages/surplus";
import Events from "@/pages/events";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/vendors" component={Vendors} />
      <Route path="/vendors/:id" component={VendorDetail} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/submit" component={Submit} />
      <Route path="/dashboard/:slug" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/pin-your-business" component={PinYourBusiness} />
      <Route path="/master-list" component={MasterList} />
      <Route path="/listings" component={Listings} />
      <Route path="/surplus" component={Surplus} />
      <Route path="/events" component={Events} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
