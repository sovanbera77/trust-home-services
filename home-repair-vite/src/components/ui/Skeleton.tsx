export function Skeleton({ className = '', rows = 1 }: { className?: string; rows?: number }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-white/10 rounded" style={{ width: `${80 + Math.random() * 20}%` }} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass p-4 space-y-3 animate-pulse" role="status" aria-label="Loading card">
      <div className="h-5 bg-white/10 rounded w-1/3" />
      <div className="h-8 bg-white/10 rounded w-1/4" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
      <span className="sr-only">Loading card...</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse" role="status" aria-label="Loading table">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 bg-white/10 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-white/5 rounded" />
      ))}
      <span className="sr-only">Loading table...</span>
    </div>
  );
}
