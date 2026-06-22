import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { generateFollowUps } from '../lib/reminders';

const CHECK_INTERVAL = 3600000;

export function useReminders() {
  const dockets = useStore(s => s.dockets);
  const subscriptions = useStore(s => s.subscriptions);
  const currentUser = useStore(s => s.currentUser);
  const addNotification = useStore(s => s.addNotification);
  const sentRef = useRef(new Set<string>());

  useEffect(() => {
    if (!currentUser) return;
    sentRef.current.clear();
  }, [currentUser, currentUser?.username]);

  useEffect(() => {
    if (!currentUser) return;

    function check() {
      const newReminders = generateFollowUps(dockets, subscriptions);
      if (!currentUser) return;
      for (const r of newReminders) {
        const key = `${currentUser.username}:${r.tag}`;
        if (!sentRef.current.has(key)) {
          sentRef.current.add(key);
          addNotification({ ...r, userId: currentUser.username });
        }
      }
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, [currentUser, dockets, subscriptions, addNotification]);
}