import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VideoProvider } from "@/hooks/use-video";
import InstallPWA from "@/components/InstallPWA";
import OfflineIndicator from "@/components/OfflineIndicator";
import GenerationStatusOverlay from "@/components/GenerationStatusOverlay";
import { Suspense, lazy } from "react";
import { PageLoadingSkeleton } from "@/components/SkeletonLoaders";
import ErrorBoundary from "@/components/ErrorBoundary";

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
            <div className="concept-forge-app" role="application" aria-label="ConceptForge">
              <div style={{color: 'white', fontSize: '48px', padding: '100px'}}>
                Providers work! Testing router next...
              </div>
            </div>
          </TooltipProvider>
        </VideoProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
