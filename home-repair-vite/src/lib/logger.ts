export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => {
    console.groupCollapsed(`ℹ️ ${msg}`);
    if (data) console.log(data);
    console.groupEnd();
  },
  warn: (msg: string, data?: Record<string, unknown>) => {
    console.groupCollapsed(`⚠️ ${msg}`);
    if (data) console.log(data);
    console.groupEnd();
  },
  error: (msg: string, err?: unknown, data?: Record<string, unknown>) => {
    console.group(`❌ ${msg}`);
    if (err) console.error(err);
    if (data) console.log(data);
    console.groupEnd();
  },
  api: (method: string, url: string, status: number, data?: unknown) => {
    const color = status >= 400 ? 'red' : status >= 300 ? 'yellow' : 'green';
    console.log(`%c${method} ${url} → ${status}`, `color:${color}`, data ?? '');
  },
};

export function initGlobalErrorHandler() {
  window.onerror = (_msg, _source, _line, _col, error) => {
    logger.error('Uncaught error', error);
  };
  window.onunhandledrejection = (event) => {
    logger.error('Unhandled promise rejection', event.reason);
  };
}
