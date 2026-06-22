import { useStore } from '../../store/useStore';
import type { AppStore } from '../../lib/types';

export default function ThemeToggle() {
  const bgOpacity = useStore((s: AppStore) => s.bgOpacity);
  const setBgOpacity = useStore((s: AppStore) => s.setBgOpacity);
  const setBackground = useStore((s: AppStore) => s.setBackground);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Theme</label>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
              setBackground(null);
            }}
            className="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all bg-white/5 border-white/10 hover:bg-white/10"
          >
            🌙 Dark
          </button>
          <button
            onClick={() => {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
              setBgOpacity(0);
            }}
            className="flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all bg-white text-gray-900 border-gray-200 hover:bg-gray-100"
          >
            ☀️ Light
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Background Overlay ({Math.round(bgOpacity * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={bgOpacity}
          onChange={(e) => setBgOpacity(Number(e.target.value))}
          className="w-full mt-2"
        />
      </div>
    </div>
  );
}
