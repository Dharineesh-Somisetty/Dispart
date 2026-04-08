"use client";

interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${className}`}>
      <div className="aspect-video skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 skeleton rounded w-1/4" />
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <div className={`h-4 skeleton rounded ${className}`} />;
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}
