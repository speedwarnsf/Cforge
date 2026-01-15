import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VideoProvider } from "@/hooks/use-video";
import { PasswordGate } from "@/components/PasswordGate";
import InstallPWA from "@/components/InstallPWA";
import OfflineIndicator from "@/components/OfflineIndicator";

import Home from "@/pages/home";
import MultivariantPage from "@/pages/multivariant";
import TestAdmin from "@/pages/TestAdmin";
import Review from "@/pages/Review";
import CorpusDownload from "@/pages/corpus-download";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/multivariant" component={MultivariantPage} />
      <Route path="/test-admin" component={TestAdmin} />
      <Route path="/review" component={Review} />
      <Route path="/corpus" component={CorpusDownload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <VideoProvider>
        <TooltipProvider>
          <Toaster />
          <OfflineIndicator />
          <InstallPWA />

          <PasswordGate>
            <div className="concept-forge-app">
              <Router />
            </div>
          </PasswordGate>
        </TooltipProvider>
      </VideoProvider>
    </QueryClientProvider>
  );
}

export default App;
