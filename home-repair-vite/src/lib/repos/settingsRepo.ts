import { getSetting, setSetting } from '../db';
import type { BackgroundData, OpenWAConfig } from '../types';

export const settingsRepo = {
  getBackground: () => getSetting('background') as Promise<BackgroundData | null | undefined>,
  setBackground: (bg: BackgroundData | null) => setSetting('background', bg),
  getBgOpacity: () => (getSetting('bgOpacity') as Promise<number>) ?? 0.4,
  setBgOpacity: (opacity: number) => setSetting('bgOpacity', opacity),
  getLang: () => (getSetting('lang') as Promise<string>) ?? 'en',
  setLang: (lang: string) => setSetting('lang', lang),
  getOpenWA: async (): Promise<OpenWAConfig> => ({
    baseUrl: ((await getSetting('openwa_base_url')) as string) ?? '',
    apiKey: ((await getSetting('openwa_api_key')) as string) ?? '',
    sessionId: ((await getSetting('openwa_session_id')) as string) ?? '',
    enabled: ((await getSetting('openwa_enabled')) as boolean) ?? false,
  }),
  setOpenWA: async (cfg: OpenWAConfig) => {
    await setSetting('openwa_base_url', cfg.baseUrl);
    await setSetting('openwa_api_key', cfg.apiKey);
    await setSetting('openwa_session_id', cfg.sessionId);
    await setSetting('openwa_enabled', cfg.enabled);
  },
};
