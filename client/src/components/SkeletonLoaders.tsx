import React from 'react';

/** Animated pulse skeleton block */
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-700/50 rounded ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Skeleton for a concept card in the gallery */
export function ConceptCardSkeleton() {
  return (
    <div
      className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-4 space-y-3"
      role="status"
      aria-label="Loading concept"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-1.5 pt-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-12" />
        ))}
      </div>
      <Skeleton className="h-2.5 w-32" />
    </div>
  );
}

/** Grid of skeleton cards for gallery loading state */
export function GalleryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      role="status"
      aria-label="Loading gallery"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ConceptCardSkeleton key={i} />
      ))}
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

/** Full-page loading spinner with branding */
export function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center" role="status">
      <div className="flex flex-col items-center gap-4 text-white">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-gray-600 rounded-full" />
          <div className="absolute inset-0 border-2 border-t-blue-400 rounded-full animate-spin" />
        </div>
        <p className="text-sm text-slate-400" aria-live="polite">Loading ConceptForge...</p>
      </div>
    </div>
  );
}

export default Skeleton;
