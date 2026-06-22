import { useState, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';

export default function BackgroundTab() {
  const background = useStore((s) => s.background);
  const bgOpacity = useStore((s) => s.bgOpacity);
  const setBackground = useStore((s) => s.setBackground);
  const setBgOpacity = useStore((s) => s.setBgOpacity);

  const [bgType, setBgType] = useState<'photo' | 'video' | 'color'>(background?.type || 'photo');
  const [bgColor, setBgColor] = useState('#0f172a');
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [bgOpacityInput, setBgOpacityInput] = useState(bgOpacity !== undefined ? bgOpacity * 100 : 100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      alert('Videos too large for browser storage, use a URL instead');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setBackground({ src: ev.target?.result as string, type: 'photo' });
    };
    reader.readAsDataURL(file);
  };

  const applyUrl = () => {
    if (!bgUrlInput.trim()) return;
    setBackground({ src: bgUrlInput.trim(), type: bgType });
  };

  const removeBackground = () => {
    setBackground(null);
  };

  const applySampleVideo = () => {
    setBgType('video');
    setBackground({ src: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video' });
  };

  const applySamplePhoto = () => {
    setBgType('photo');
    setBackground({ src: 'https://picsum.photos/1920/1080', type: 'photo' });
  };

  const handleOpacityChange = (val: number) => {
    setBgOpacityInput(val);
    setBgOpacity(val / 100);
  };

  return (
    <div className="glass p-4 space-y-5">
      <h2 className="text-lg font-semibold text-white">{t('background.manager')}</h2>

      <div className="flex gap-2">
        {(['photo', 'video', 'color'] as const).map(typeItem => (
          <button
            key={typeItem}
            onClick={() => { setBgType(typeItem); if (typeItem !== 'color') setBackground({ src: background?.src || '', type: typeItem }); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              bgType === typeItem ? 'bg-indigo-600 text-white' : 'bg-white/5 text-[#94a3b8] border border-white/10'
            }`}
          >
            {typeItem === 'color' ? t('background.solidColor') : typeItem === 'photo' ? t('background.photo') : t('background.video')}
          </button>
        ))}
      </div>

      <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden bg-black/40 border border-white/10">
        {background ? (
          background.type === 'video' ? (
            <video key={background.src} src={background.src} autoPlay loop muted className="w-full h-full object-cover" />
          ) : background.type === 'photo' ? (
            <img src={background.src} alt="Background preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: background.src }} />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#94a3b8] text-sm">{t('background.noBackground')}</div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: `rgba(15,23,42,${bgOpacityInput / 100})` }} />
      </div>

      <div>
        <label className="text-sm text-white mb-2 block">{t('background.opacity').replace('{value}', String(Math.round(bgOpacityInput)))}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={bgOpacityInput}
          onChange={e => handleOpacityChange(parseFloat(e.target.value))}
          className="w-full max-w-md"
        />
      </div>

      {bgType === 'color' && (
        <div>
          <label className="text-sm text-white mb-2 block">{t('background.colorPicker')}</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {['#0f172a', '#1e293b', '#334155', '#1e1b4b', '#0c4a6e', '#064e3b', '#3b0764', '#78350f', '#881337', '#000000'].map(c => (
              <button
                key={c}
                onClick={() => { setBgColor(c); setBackground({ src: c, type: 'color' }); }}
                className={`w-8 h-8 rounded-full border-2 ${bgColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="#hex"
              value={bgColor}
              onChange={e => setBgColor(e.target.value)}
              className="max-w-[120px] font-mono uppercase"
            />
            <button onClick={() => setBackground({ src: bgColor, type: 'color' })} className="btn btn-primary text-xs">{t('background.applyColor')}</button>
          </div>
        </div>
      )}

      {bgType !== 'color' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-white mb-2 block">{t('background.uploadImage')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="max-w-sm"
            />
            <p className="text-[#94a3b8] text-xs mt-1">{t('background.imageHint')}</p>
          </div>

          <div>
            <label className="text-sm text-white mb-2 block">{t('background.imageUrl')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/image.jpg"
                value={bgUrlInput}
                onChange={e => setBgUrlInput(e.target.value)}
                className="max-w-md"
              />
              <button onClick={applyUrl} className="btn btn-primary text-xs">{t('background.applyUrl')}</button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={applySamplePhoto} className="btn btn-secondary text-xs">{t('background.samplePhoto')}</button>
            <button onClick={applySampleVideo} className="btn btn-secondary text-xs">{t('background.sampleVideo')}</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/10">
        <button onClick={removeBackground} className="btn bg-red-500/20 text-red-400 border border-red-500/30 text-sm">{t('background.remove')}</button>
      </div>
    </div>
  );
}
