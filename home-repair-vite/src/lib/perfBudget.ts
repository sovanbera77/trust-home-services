// Performance budget — usage: `npx size-limit`
// Install: npm install -D @size-limit/preset-small-app
// Run: npx size-limit

export const budget = {
  // Target limits (gzip)
  main: '250 kB',
  vendor: '650 kB',
  total: '900 kB',
  // Lighthouse targets
  lcp: '2.5s',
  tti: '3.5s',
  cls: 0.1,
};

export function checkPerfBudget() {
  if (typeof window === 'undefined' || !('performance' in window)) return;
  const entries = performance.getEntriesByType('resource');
  let totalSize = 0;
  for (const entry of entries) {
    if (entry.entryType === 'resource') {
      totalSize += (entry as unknown as { transferSize?: number }).transferSize || 0;
    }
  }
  const mainJS = entries.find(e => e.name.includes('index-'));
  const mainSize = mainJS ? (mainJS as unknown as { transferSize?: number }).transferSize || 0 : 0;

  if (mainSize > 250_000) console.warn(`⚠️ Main JS exceeds budget: ${(mainSize / 1024).toFixed(1)} kB`);
  if (totalSize > 900_000) console.warn(`⚠️ Total exceeds budget: ${(totalSize / 1024).toFixed(1)} kB`);
}
