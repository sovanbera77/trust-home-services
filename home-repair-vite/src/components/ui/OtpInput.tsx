import { useRef, useEffect } from 'react';

interface OtpInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
}

export default function OtpInput({ length, value, onChange }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, length);
  }, [length]);

  function setDigit(i: number, d: string) {
    const arr = value.split('');
    while (arr.length < length) arr.push('');
    arr[i] = d;
    onChange(arr.join('').slice(0, length));
  }

  function handleKey(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value.replace(/\D/g, '').slice(-1);
    if (!d) return;
    setDigit(i, d);
    if (i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (value[i]) {
        setDigit(i, '');
      } else if (i > 0) {
        setDigit(i - 1, '');
        refs.current[i - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const next = Math.min(pasted.length, length - 1);
    refs.current[next]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleKey(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          className={`w-11 h-12 text-center text-lg font-bold rounded-xl border-2 transition-all ${
            value[i] ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-white/10 bg-[#0f172a]/60 text-[#94a3b8]'
          } focus:border-indigo-500 focus:outline-none`}
        />
      ))}
    </div>
  );
}
