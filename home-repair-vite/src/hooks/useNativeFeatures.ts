import { useCallback, useEffect, useState } from 'react';
import { takePhoto, getCurrentPosition, shareContent } from '../lib/native';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { Attendance } from '../lib/types';

export function useIsNative() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  return isNative;
}

export function useCamera() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const capture = useCallback(async () => {
    setLoading(true);
    const result = await takePhoto();
    if (result) setPhoto(result);
    setLoading(false);
    return result;
  }, []);

  return { photo, capture, loading, setPhoto };
}

export function useShare() {
  const share = useCallback(async (title: string, text: string, url?: string) => {
    await shareContent(title, text, url);
  }, []);

  return { share };
}

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permitted, setPermitted] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    PushNotifications.requestPermissions().then(result => {
      if (result.receive === 'granted') {
        setPermitted(true);
        PushNotifications.register();
      }
    });
    PushNotifications.addListener('registration', (reg) => {
      setToken(reg.value);
    });
    PushNotifications.addListener('pushNotificationReceived', (n) => {
      setNotification(n);
    });
  }, []);

  return { token, permitted, notification };
}

export function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const locate = useCallback(async () => {
    setLoading(true);
    const pos = await getCurrentPosition();
    if (pos) setPosition(pos);
    setLoading(false);
    return pos;
  }, []);

  const createAttendanceRecord = useCallback(
    (userId: string): Attendance | null => {
      if (!position) return null;
      return {
        id: `att-${Date.now()}`,
        user_id: userId,
        type: 'check-in',
        lat: position.lat,
        lng: position.lng,
        created_at: new Date().toISOString(),
      };
    },
    [position],
  );

  return { position, locate, loading, createAttendanceRecord };
}
