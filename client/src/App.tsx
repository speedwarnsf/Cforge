import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VideoProvider } from "@/hooks/use-video";
import { PasswordGate } from "@/components/PasswordGate";
import InstallPWA from "@/components/InstallPWA";
import OfflineIndicator from "@/components/OfflineIndicator";
import GenerationStatusOverlay from "@/components/GenerationStatusOverlay";
import { Suspense, lazy } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorBoundary from "@/components/ErrorBoundary";

// Code splitting - lazy load pages for better performance
const Home = lazy(() => import("@/pages/home"));
const MultivariantPage = lazy(() => import("@/pages/multivariant"));
const TestAdmin = lazy(() => import("@/pages/TestAdmin"));
const Review = lazy(() => import("@/pages/Review"));
const CorpusDownload = lazy(() => import("@/pages/corpus-download"));
const Gallery = lazy(() => import("@/pages/gallery"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/multivariant" component={MultivariantPage} />
        <Route path="/test-admin" component={TestAdmin} />
        <Route path="/review" component={Review} />
        <Route path="/corpus" component={CorpusDownload} />
        <Route path="/gallery" component={Gallery} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <VideoProvider>
          <TooltipProvider>
            <Toaster />
            <OfflineIndicator />
            <InstallPWA />
            <GenerationStatusOverlay />

            <PasswordGate>
              <div className="concept-forge-app">
                <Router />
              </div>
            </PasswordGate>
          </TooltipProvider>
        </VideoProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
