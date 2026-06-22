import type { BackgroundData, OpenWAConfig, OtpRecord } from '../../lib/types';
import { settingsRepo } from '../../lib/repos/settingsRepo';

type SetState = any;

export const createConfigSlice = (set: SetState) => ({
  background: null as BackgroundData | null,
  bgOpacity: 0.4,
  lang: 'en',
  openwa: { baseUrl: '', apiKey: '', sessionId: '', enabled: false } as OpenWAConfig,
  otpRecords: [] as OtpRecord[],

  setBackground: async (bg: BackgroundData | null) => {
    await settingsRepo.setBackground(bg);
    set({ background: bg });
  },

  setBgOpacity: async (opacity: number) => {
    await settingsRepo.setBgOpacity(opacity);
    set({ bgOpacity: opacity });
  },

  setLang: async (lang: string) => {
    await settingsRepo.setLang(lang);
    set({ lang });
  },

  saveBg: async (src: string, type: 'photo' | 'video' | 'color') => {
    const bg: BackgroundData = { src, type };
    await settingsRepo.setBackground(bg);
    set({ background: bg });
  },
});
