import { useState } from 'react';
import { SERVICE_CATALOG, type ServiceCategory, type ServiceSub } from '../lib/services';
import { Check } from 'lucide-react';
import { t } from '../lib/i18n';

interface CatalogProps {
  onPick: (category: ServiceCategory, sub: ServiceSub) => void;
  compact?: boolean;
}

export default function Catalog({ onPick, compact = false }: CatalogProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={compact ? '' : 'max-w-5xl mx-auto'}>
      {!compact && (
        <div className="mb-5">
          <h2 className="text-lg font-semibold">{t('catalog.browse')}</h2>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {t('catalog.pickService')}
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {SERVICE_CATALOG.map((cat) => (
          <div key={cat.id} className="card card-hover p-4 flex flex-col">
            <div className="text-3xl mb-2">{cat.icon}</div>
            <h3 className="font-semibold text-sm">{cat.name}</h3>
            <p className="text-xs text-[#94a3b8] mt-1 flex-1 line-clamp-2">{cat.blurb}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-[#94a3b8]">
                from <span className="text-white font-semibold">₹{cat.fromPrice}</span>
              </span>
              <button
                className="text-xs font-semibold text-[#818cf8] hover:text-[#c084fc]"
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                {expanded === cat.id ? t('catalog.hide') : t('catalog.book')}
              </button>
            </div>

            {expanded === cat.id && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in">
                {cat.subs.map((sub) => (
                  <button
                    key={sub.name}
                    onClick={() => onPick(cat, sub)}
                    className="w-full flex items-center justify-between gap-2 text-left text-xs bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Check size={13} className="text-green-400" />
                      {sub.name}
                    </span>
                    <span className="font-semibold whitespace-nowrap">₹{sub.price}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
