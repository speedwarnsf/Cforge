import React from 'react';

/** Animated pulse skeleton block */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-700/50 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Skeleton for a concept card in the gallery */
export function ConceptCardSkeleton() {
  return (
    <div className="bg-gray-950 border border-gray-800 p-5 space-y-4" role="status" aria-label="Loading concept">
      {/* Header row: number + badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      {/* Headline */}
      <Skeleton className="h-7 w-4/5" />
      {/* Tagline */}
      <Skeleton className="h-4 w-3/5" />
      {/* Body copy lines */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      {/* Visual direction */}
      <div className="border-l-2 border-gray-800 pl-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      {/* Score bars */}
      <div className="space-y-1.5 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-1.5 flex-1" />
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-800/40">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
        <div className="ml-auto flex gap-1">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

/** Grid of skeleton cards for gallery loading state */
export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="status" aria-label="Loading gallery">
      {Array.from({ length: count }).map((_, i) => (
        <ConceptCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for the ideation section brief form */
export function BriefFormSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading form">
      {/* Mode toggle */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-12 w-44" />
        <Skeleton className="h-12 w-44" />
      </div>
      {/* Two column grid */}
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          {/* Brief card */}
          <div className="border border-gray-700 bg-gray-800/30 p-6 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          {/* Button */}
          <Skeleton className="h-14 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for session history entries */
export function HistoryEntrySkeleton() {
  return (
    <div className="bg-white/10 p-4 space-y-3" role="status" aria-label="Loading history entry">
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-24" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/** Results loading skeleton - matches concept card layout */
export function ResultsLoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-12 mb-20 space-y-8" role="status" aria-label="Loading results">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      {/* Cards */}
      {Array.from({ length: count }).map((_, i) => (
        <ConceptCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full-page loading with brand-appropriate skeleton */
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-6 text-white">
        {/* Logo placeholder */}
        <Skeleton className="h-16 w-48" />
        {/* Pulsing bar */}
        <div className="w-48 h-1 bg-gray-800 overflow-hidden">
          <div className="h-full w-1/3 bg-blue-500/60 animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm text-slate-500 font-mono" aria-live="polite">Loading ConceptForge...</p>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

export default Skeleton;
