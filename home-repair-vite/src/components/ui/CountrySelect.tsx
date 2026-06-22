import { useState, useEffect, useRef } from 'react';

const COUNTRY_DATA: [string, number][] = [
  ['Afghanistan',93],['Albania',355],['Algeria',213],['Argentina',54],['Armenia',374],['Australia',61],
  ['Austria',43],['Bangladesh',880],['Belgium',32],['Brazil',55],['Canada',1],['China',86],
  ['Colombia',57],['Denmark',45],['Egypt',20],['Ethiopia',251],['Finland',358],['France',33],
  ['Germany',49],['Ghana',233],['Greece',30],['Hong Kong',852],['India',91],['Indonesia',62],
  ['Iran',98],['Iraq',964],['Ireland',353],['Israel',972],['Italy',39],['Japan',81],
  ['Jordan',962],['Kenya',254],['Kuwait',965],['Malaysia',60],['Maldives',960],['Mexico',52],
  ['Morocco',212],['Myanmar',95],['Nepal',977],['Netherlands',31],['New Zealand',64],['Nigeria',234],
  ['Norway',47],['Oman',968],['Pakistan',92],['Philippines',63],['Poland',48],['Portugal',351],
  ['Qatar',974],['Romania',40],['Russia',7],['Saudi Arabia',966],['Singapore',65],['South Africa',27],
  ['South Korea',82],['Spain',34],['Sri Lanka',94],['Sweden',46],['Switzerland',41],['Taiwan',886],
  ['Tanzania',255],['Thailand',66],['Turkey',90],['Uganda',256],['Ukraine',380],['UAE',971],
  ['UK',44],['USA',1],['Vietnam',84],['Yemen',967],
];

const countries = COUNTRY_DATA.map(([name, code]) => ({
  value: String(code),
  label: `+${code}`,
  search: `${name} +${code}`.toLowerCase(),
}));

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function CountrySelect({ value, onChange }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = countries.find(c => c.value === value);
  const filtered = countries.filter(c => c.search.includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="w-full flex items-center gap-1.5 bg-[#0f172a]/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selected?.label || '+91'}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
          <div className="sticky top-0 bg-[#1e293b] p-1.5 border-b border-white/10">
            <input
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-xs !py-1.5"
            />
          </div>
          {filtered.map(c => (
            <button
              key={c.value}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 transition-colors ${c.value === value ? 'bg-indigo-600/30 text-indigo-300' : 'text-[#94a3b8]'}`}
              onClick={() => { onChange(c.value); setIsOpen(false); setSearch(''); }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
