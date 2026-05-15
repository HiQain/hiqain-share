import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { HowItWorks } from "@/pages/how-it-works";
import { Admin } from "@/pages/admin";
import { AdminBlogListPage } from "@/pages/admin-blog-list";
import { AdminBlogNewPage } from "@/pages/admin-blog-new";
import { Blog } from "@/pages/blog";
import { BlogDetailPage } from "@/pages/blog-detail";
import { PrivacyPolicy } from "@/pages/privacy-policy";
import { TermsOfService } from "@/pages/terms-of-service";
import { FilePreviewPage } from "@/pages/file-preview";
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
        <Route path="/admin/blogs" component={AdminBlogListPage} />
        <Route path="/admin/blogs/new" component={AdminBlogNewPage} />
        <Route path="/how-it-works" component={HowItWorks} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:id" component={BlogDetailPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/disclaimer" component={DisclaimerPage} />
        <Route path="/files/:id" component={FilePreviewPage} />
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
