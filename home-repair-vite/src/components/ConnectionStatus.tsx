import { useEffect, useState } from 'react'
import { t } from '../lib/i18n';
import { config } from '../lib/config'
import { syncEngine } from '../lib/sync'
import { RefreshCw } from 'lucide-react'

type Status = 'offline' | 'online' | 'syncing' | 'error'

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('offline')
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refresh = () => {
    setPending(syncEngine.getPendingCount())
  }

  useEffect(() => {
    if (!config.useBackend) { setStatus('offline'); return }
    refresh()
    const unsub = syncEngine.onStatusChange((s) => {
      setStatus(s === 'syncing' ? 'syncing' : s === 'error' ? 'error' : 'online')
      if (s === 'done') refresh()
    })
    syncEngine.sync()
    const interval = setInterval(refresh, 5000)
    return () => { unsub(); clearInterval(interval) }
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    await syncEngine.sync()
    refresh()
    setSyncing(false)
  }

  const colorMap: Record<Status, string> = {
    offline: 'bg-red-500',
    online: 'bg-green-500',
    syncing: 'bg-yellow-400 animate-pulse',
    error: 'bg-orange-500',
  }

  const labelMap: Record<Status, string> = {
    offline: t('connection.offline'),
    online: t('connection.online'),
    syncing: t('connection.syncing'),
    error: 'Sync Error',
  }

  if (!config.useBackend) return null

  return (
    <span className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
      <span className={`w-2 h-2 rounded-full ${colorMap[status]}`} />
      <span className="hidden sm:inline">{labelMap[status]}</span>
      {pending > 0 && (
        <span className="text-yellow-400 font-medium" title={`${pending} pending change${pending > 1 ? 's' : ''}`}>
          ({pending})
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="p-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
        title="Sync now"
      >
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      </button>
    </span>
  )
}
