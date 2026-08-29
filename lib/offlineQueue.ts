"use client";

const DB_NAME = "cpgrams_offline";
const DB_VERSION = 1;
const STORE_NAME = "grievance_queue";

export interface QueuedGrievance {
  id?: number;
  tempId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: "pending" | "syncing" | "failed";
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueGrievance(
  payload: Record<string, unknown>
): Promise<string> {
  const database = await openDB();
  const tempId = `OFFLINE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const item: QueuedGrievance = {
    tempId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: "pending",
  };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve(tempId);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedGrievances(): Promise<QueuedGrievance[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedGrievance[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedGrievance(id: number): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function syncQueuedGrievances(
  onProgress?: (tempId: string, success: boolean) => void
): Promise<{ synced: number; failed: number }> {
  const items = await getQueuedGrievances();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const res = await fetch("/api/submit-grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item.payload, offlineTempId: item.tempId }),
      });
      if (res.ok && item.id !== undefined) {
        await removeQueuedGrievance(item.id);
        synced++;
        onProgress?.(item.tempId, true);
      } else {
        failed++;
        onProgress?.(item.tempId, false);
      }
    } catch {
      failed++;
      onProgress?.(item.tempId, false);
    }
  }
  return { synced, failed };
}

export async function getQueueCount(): Promise<number> {
  try {
    const items = await getQueuedGrievances();
    return items.length;
  } catch {
    return 0;
  }
}
