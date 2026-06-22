import type { SiteConfig, SubscriptionPlan, BackgroundData } from './types';

const RAW_URL = 'https://raw.githubusercontent.com/sovanbera77/trust-home-services/main/site-config.json';
const API_URL = 'https://api.github.com/repos/sovanbera77/trust-home-services/contents/site-config.json';

const DEFAULT_CONFIG: SiteConfig = {
  plans: [],
  background: null,
  bgOpacity: 0.4,
};

async function tryFetchLocal(): Promise<SiteConfig | null> {
  try {
    const res = await fetch('/site-config.json');
    if (!res.ok) return null;
    return await res.json() as SiteConfig;
  } catch {
    console.warn('[siteConfig] Failed to fetch local config');
    return null;
  }
}

export async function fetchPublishedConfig(): Promise<SiteConfig> {
  // Try remote published config first
  try {
    const res = await fetch(RAW_URL, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json() as SiteConfig;
      if (data.plans?.length) return data;
    }
  } catch {
    console.warn('[siteConfig] Failed to fetch remote published config, falling back to local');
  }
  // Try local bundled config
  const local = await tryFetchLocal();
  if (local?.plans?.length) return local;
  return DEFAULT_CONFIG;
}

export async function publishConfig(
    token: string,
    plans: SubscriptionPlan[],
    background: BackgroundData | null,
    bgOpacity: number,
  ): Promise<void> {
    const config: SiteConfig = { plans, background, bgOpacity };
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(config, null, 2))));

    // Get current file SHA (for update, not first create)
    let sha: string | undefined;
    try {
      const existing = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch {
      console.warn('[siteConfig] File does not exist yet, creating new');
    }

  const body: Record<string, unknown> = {
    message: 'publish: update site config',
    content,
    branch: 'main',
  };
  if (sha) body.sha = sha;

  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Publish failed: ${err}`);
  }
}
