import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/UserContext";
import OnboardingModal from "@/components/OnboardingModal";

import Home from "@/pages/home";
import Vendors from "@/pages/vendors";
import VendorDetail from "@/pages/vendor-detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Submit from "@/pages/submit";
import Dashboard from "@/pages/dashboard";
import BusinessDashboard from "@/pages/business-dashboard";
import Admin from "@/pages/admin";
import RequireAdmin from "@/components/RequireAdmin";
import Favorites from "@/pages/favorites";
import PinYourBusiness from "@/pages/pin-your-business";
import Billing from "@/pages/billing";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import MasterList from "@/pages/master-list";
import Listings from "@/pages/listings";
import Drops from "@/pages/drops";
import Surplus from "@/pages/surplus";
import Wholesale from "@/pages/wholesale";
import Markets from "@/pages/markets";
import MarketRegister from "@/pages/market-register";
import MarketDetail from "@/pages/market-detail";
import Events from "@/pages/events";
import SearchInsights from "@/pages/search-insights";
import SearchPage from "@/pages/search";
import Rewards from "@/pages/rewards";
import SupportPage from "@/pages/support";
import Messages from "@/pages/messages";
import OrdersPage from "@/pages/orders";
import Simulator from "@/pages/simulator";
import NotFound from "@/pages/not-found";
import InvitePage from "@/pages/invite";
import ForMarkets from "@/pages/for-markets";
import ForVendors from "@/pages/for-vendors";

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
      <Route path="/business-dashboard/:id" component={BusinessDashboard} />
      <Route path="/admin" component={() => <RequireAdmin><Admin /></RequireAdmin>} />
      <Route path="/pin-your-business" component={PinYourBusiness} />
      <Route path="/billing" component={Billing} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/master-list" component={MasterList} />
      <Route path="/listings" component={Listings} />
      <Route path="/drops" component={Drops} />
      <Route path="/surplus" component={Surplus} />
      <Route path="/wholesale" component={Wholesale} />
      <Route path="/markets/register" component={MarketRegister} />
      <Route path="/markets/:slug" component={MarketDetail} />
      <Route path="/markets" component={Markets} />
      <Route path="/events" component={Events} />
      <Route path="/search-insights" component={SearchInsights} />
      <Route path="/search" component={SearchPage} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/support" component={SupportPage} />
      <Route path="/messages" component={Messages} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/simulator" component={Simulator} />
      <Route path="/invite" component={InvitePage} />
      <Route path="/for-markets" component={ForMarkets} />
      <Route path="/for-vendors" component={ForVendors} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <OnboardingModal />
          <Toaster />
        </UserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
