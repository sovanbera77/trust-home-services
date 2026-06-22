interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default'
  children: React.ReactNode
  size?: 'sm' | 'md'
}

const variants = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function Badge({ variant = 'default', children, size = 'md' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}>
      {children}
    </span>
  )
}
