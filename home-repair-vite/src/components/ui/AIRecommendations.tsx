import { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';
import { getRecommendations, getSmartScheduling } from '../../lib/recommendations';
import { Sparkles, Lightbulb, TrendingUp, ChevronRight } from 'lucide-react';
import { SERVICE_CATALOG } from '../../lib/services';
import type { ServiceCategory, ServiceSub } from '../../lib/services';

interface Props {
  onBookService: (category: ServiceCategory, sub: ServiceSub) => void;
}

export default function AIRecommendations({ onBookService }: Props) {
  const currentUser = useStore(s => s.currentUser);
  const dockets = useStore(s => s.dockets);
  const [expanded, setExpanded] = useState(true);

  const recs = useMemo(() => {
    if (!currentUser) return [];
    return getRecommendations(dockets, currentUser.username);
  }, [dockets, currentUser]);

  const tips = useMemo(() => {
    return getSmartScheduling(dockets);
  }, [dockets]);

  function findService(name: string) {
    for (const cat of SERVICE_CATALOG) {
      const sub = cat.subs.find((s: ServiceSub) => s.name === name);
      if (sub) return { category: cat, sub };
    }
    return null;
  }

  if (recs.length === 0 && tips.length === 0) return null;

  return (
    <div className="glass p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-yellow-400" />
          <h2 className="text-lg font-semibold">{t('ai.title')}</h2>
        </div>
        <ChevronRight size={18} className={`text-[#94a3b8] transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {recs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <TrendingUp size={14} className="text-indigo-400" />
                <p className="text-sm text-[#94a3b8]">{t('ai.recommendedForYou')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recs.map((rec, i) => {
                  const match = findService(rec.name);
                  return (
                    <div
                      key={i}
                      className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                      onClick={() => {
                        if (match) onBookService(match.category, match.sub);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{rec.name}</p>
                          <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">{rec.reason}</p>
                        </div>
                        <span className="text-sm text-emerald-400 font-medium whitespace-nowrap ml-3">₹{rec.price}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(100, rec.score)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#94a3b8]">{rec.score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tips.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <Lightbulb size={14} className="text-yellow-400" />
                <p className="text-sm text-[#94a3b8]">{t('ai.insights')}</p>
              </div>
              <ul className="space-y-1.5">
                {tips.map((tip, i) => (
                  <li key={i} className="text-sm text-[#94a3b8] flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block mt-1.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}