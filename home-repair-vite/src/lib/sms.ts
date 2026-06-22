import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

export async function openSms(phone: string, message: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      // On native, use share plugin or intent
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'SOS Alert', text: message, url: '' });
    } else {
      // Web fallback — open SMS intent
      window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, '_blank');
    }
  } catch (err) {
    logger.error('Failed to send SMS', err);
  }
}

export function createSosMessage(name: string, lat?: number, lng?: number, address?: string): string {
  let msg = `🚨 SOS ALERT from ${name}! I need urgent home repair assistance.`;
  if (lat && lng) msg += ` My location: https://maps.google.com/maps?q=${lat},${lng}`;
  if (address) msg += ` Address: ${address}`;
  msg += ' Please contact me immediately.';
  return msg;
}
