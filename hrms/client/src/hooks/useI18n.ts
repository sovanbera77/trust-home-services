import { useState, useEffect } from 'react'
import { i18n } from '../lib/i18n'

export function useI18n() {
  const [, setTick] = useState(0)
  useEffect(() => i18n.subscribe(() => setTick(t => t + 1)), [])
  
  return {
    t: (key: string, fallback?: string) => i18n.t(key, fallback),
    setLocale: (locale: string) => i18n.setLocale(locale as any),
    getLocale: () => i18n.getLocale(),
    locales: i18n.getAvailableLocales(),
  }
}
