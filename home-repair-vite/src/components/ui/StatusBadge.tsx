import type { Docket } from '../../lib/types';
import { t } from '../../lib/i18n';

const styles: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  assigned: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/10 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function StatusBadge({ status }: { status: Docket['status'] | string }) {
  return (
    <span
      className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${styles[status] || ''}`}
    >
      {t('status.' + status)}
    </span>
  );
}
