import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { HowItWorks } from "@/pages/how-it-works";
import { Feedback } from "@/pages/feedback";
import { Admin } from "@/pages/admin";
import { Blog } from "@/pages/blog";
import { PrivacyPolicy } from "@/pages/privacy-policy";
import { TermsOfService } from "@/pages/terms-of-service";
import ContactPage from "./pages/contact";
import DisclaimerPage from "./pages/disclaimer";

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || null;

setBaseUrl(apiBaseUrl);

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={Admin} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/blog" component={Blog} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/disclaimer" component={DisclaimerPage} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
