export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 mb-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 animate-pulse border border-gray-100 dark:border-gray-700">
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-8 w-16 bg-gray-100 dark:bg-gray-700/50 rounded mb-2" />
          <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700/50 rounded" />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
          <div className="h-10 bg-gray-100 dark:bg-gray-700/50 rounded-lg" />
        </div>
      ))}
      <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  )
}
