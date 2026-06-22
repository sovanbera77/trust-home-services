import { useStore } from '../../store/useStore';
import { LANGUAGES } from '../../lib/i18n';
import { t } from '../../lib/i18n';

export default function LanguageSwitcher() {
  const lang = useStore((s: { lang?: string }) => s.lang) || 'en';
  const setLang = useStore((s: { setLang?: (l: string) => void }) => s.setLang);

  if (!setLang) return null;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{t('language.title')}</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              lang === l.code
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/5 text-[#94a3b8] border border-white/10 hover:bg-white/10'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
