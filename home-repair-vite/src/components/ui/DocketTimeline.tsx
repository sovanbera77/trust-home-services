import type { ActivityLog } from '../../lib/types';
import { t } from '../../lib/i18n';
import { Clock, UserCheck, CheckCircle, XCircle, Edit3, MessageSquare, CreditCard } from 'lucide-react';

const actionConfig: Record<string, { icon: typeof Clock; color: string; label: string; key: string }> = {
  created: { icon: Clock, color: 'text-blue-400', label: 'Created', key: 'timeline.created' },
  assigned: { icon: UserCheck, color: 'text-indigo-400', label: 'Assigned', key: 'timeline.assigned' },
  completed: { icon: CheckCircle, color: 'text-green-400', label: 'Completed', key: 'timeline.completed' },
  rejected: { icon: XCircle, color: 'text-red-400', label: 'Rejected', key: 'timeline.rejected' },
  updated: { icon: Edit3, color: 'text-yellow-400', label: 'Updated', key: 'timeline.updated' },
  chat: { icon: MessageSquare, color: 'text-purple-400', label: 'Chat', key: 'timeline.chat' },
  payment: { icon: CreditCard, color: 'text-emerald-400', label: 'Payment', key: 'timeline.payment' },
};

export default function DocketTimeline({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) {
    return <p className="text-[#94a3b8] text-sm text-center py-4">{t('timeline.noActivity')}</p>;
  }

  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="relative pl-8 space-y-4">
      {sorted.map((log) => {
        const config = actionConfig[log.action] || actionConfig.updated;
        const Icon = config.icon;
        return (
          <div key={log.id} className="relative">
            <div className="absolute -left-8 top-0.5 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
              <Icon size={12} className={config.color} />
            </div>
            <div className="absolute left-[-1.125rem] top-5 bottom-[-1rem] w-px bg-white/10" />
            <div>
              <p className="text-sm">
                <span className="font-medium text-white">{t(config.key)}</span>
                {log.detail && <span className="text-[#94a3b8]"> — {log.detail}</span>}
              </p>
              <p className="text-xs text-[#64748b] mt-0.5">
                {log.actor} · {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
