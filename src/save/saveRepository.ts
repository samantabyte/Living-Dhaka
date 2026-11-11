import type { CareerSave } from '../types';

const DB_NAME = 'living-dhaka';
const STORE = 'career';
const KEY = 'primary';

export const defaultCareer = (): CareerSave => ({
  version: 1, balance: 2500, lifetimeEarnings: 0, xp: 0, reputation: 50, completedRides: 0,
  fuel: 100, health: 100, engineLevel: 0, brakeLevel: 0, vehicleClass: 'city', paidRideIds: [], ledger: [],
  settings: { language: 'en', quality: 'medium', reducedShake: false, masterVolume: 0.7 },
});

function valid(value: unknown): value is CareerSave {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<CareerSave>;
  return data.version === 1 && typeof data.balance === 'number' && Array.isArray(data.ledger) && Array.isArray(data.paidRideIds);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCareer(): Promise<CareerSave | null> {
  try {
    const db = await openDb();
    const result = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return valid(result) ? result : null;
  } catch {
    const fallback = localStorage.getItem(DB_NAME);
    if (!fallback) return null;
    const parsed: unknown = JSON.parse(fallback);
    return valid(parsed) ? parsed : null;
  }
}

export async function saveCareer(save: CareerSave): Promise<void> {
  localStorage.setItem(DB_NAME, JSON.stringify(save));
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(save, KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.warn('IndexedDB save failed; localStorage backup retained.', error);
  }
}

export async function clearCareer() {
  localStorage.removeItem(DB_NAME);
  const db = await openDb();
  db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY);
  db.close();
}
