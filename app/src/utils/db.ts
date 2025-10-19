// Simple IndexedDB wrapper to store encrypted images by fake CID

const DB_NAME = 'fhe-image-vault';
const STORE = 'objects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putObject(key: string, value: Uint8Array): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(value, key);
  });
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const val = req.result as Uint8Array | undefined;
      resolve(val ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

