import { useEffect, useState } from 'react';
import { realtime, type RealtimeEvent } from '../lib/realtime';

export function useRealtime() {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  useEffect(() => {
    realtime.init();
    const unsub = realtime.subscribe((event) => {
      setLastEvent(event);
    });
    return () => { unsub(); };
  }, []);

  return lastEvent;
}

export function useRealtimeEvent<T extends RealtimeEvent['type']>(
  type: T,
  handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
) {
  useEffect(() => {
    realtime.init();
    const unsub = realtime.subscribe((event) => {
      if (event.type === type) {
        handler(event as Extract<RealtimeEvent, { type: T }>);
      }
    });
    return () => { unsub(); };
  }, [type, handler]);
}
