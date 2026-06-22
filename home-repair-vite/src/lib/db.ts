import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const DB_NAME = 'trust-home';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function initDB(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'username' });
      }
      if (!db.objectStoreNames.contains('dockets')) {
        db.createObjectStore('dockets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('complaints')) {
        db.createObjectStore('complaints', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('attendance')) {
        db.createObjectStore('attendance', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('otpRecords')) {
        db.createObjectStore('otpRecords', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('otpLogs')) {
        db.createObjectStore('otpLogs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('subscriptions')) {
        db.createObjectStore('subscriptions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('subscriptionPlans')) {
        db.createObjectStore('subscriptionPlans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('activityLogs')) {
        db.createObjectStore('activityLogs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('referrals')) {
        db.createObjectStore('referrals', { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await initDB();
  return db.getAll(storeName);
}

export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await initDB();
  return db.get(storeName, key);
}

export async function set<T>(storeName: string, value: T): Promise<void> {
  const db = await initDB();
  await db.put(storeName, value);
}

export async function del(storeName: string, key: string): Promise<void> {
  const db = await initDB();
  await db.delete(storeName, key);
}

export async function clear(storeName: string): Promise<void> {
  const db = await initDB();
  await db.clear(storeName);
}

export async function getSetting(key: string): Promise<unknown> {
  const db = await initDB();
  const record = await db.get('settings', key);
  return record?.value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await initDB();
  await db.put('settings', { key, value });
}
