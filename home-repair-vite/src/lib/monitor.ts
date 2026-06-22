import { logger } from './logger';

type MetricName = 'CLS' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

const metrics: Partial<Record<MetricName, number>> = {};

export function reportWebVital(name: MetricName, value: number) {
  metrics[name] = value;
  logger.info(`Web Vital: ${name}`, { value: `${value.toFixed(2)}ms` });
}

export function getWebVitals() {
  return { ...metrics };
}

export function initWebVitals() {
  if ('performance' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            reportWebVital('LCP', entry.startTime);
          }
          if (entry.entryType === 'first-contentful-paint') {
            reportWebVital('FCP', entry.startTime);
          }
          if (entry.entryType === 'layout-shift') {
            const cls = (entry as unknown as { value: number }).value || 0;
            reportWebVital('CLS', cls);
          }
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
      observer.observe({ type: 'first-contentful-paint', buffered: true });
      observer.observe({ type: 'layout-shift', buffered: true });
    } catch {
      console.warn('[monitor] PerformanceObserver not supported, skipping web vitals');
    }
  }
}
