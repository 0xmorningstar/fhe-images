// Simple IndexedDB wrapper to store encrypted images by fake CID and metadata

const DB_NAME = 'fhe-image-vault';
const STORE = 'objects';
export const DEFAULT_MIME = 'application/octet-stream';

export type StoredCipher = {
  cipher: Uint8Array;
  mime: string;
};

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

export async function putObject(key: string, value: StoredCipher): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(
      {
        cipher: value.cipher,
        mime: value.mime ?? DEFAULT_MIME,
      },
      key,
    );
  });
}

export async function getObject(key: string): Promise<StoredCipher | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => {
      const val = req.result as unknown;
      if (!val) {
        resolve(null);
        return;
      }
      if (val instanceof Uint8Array) {
        resolve({ cipher: val, mime: DEFAULT_MIME });
        return;
      }
      if (typeof val === 'object') {
        const maybe = val as { cipher?: Uint8Array | ArrayBufferLike; mime?: string };
        let cipher: Uint8Array | null = null;
        if (maybe.cipher instanceof Uint8Array) {
          cipher = maybe.cipher;
        } else if (maybe.cipher instanceof ArrayBuffer) {
          cipher = new Uint8Array(maybe.cipher);
        }
        if (cipher) {
          resolve({ cipher, mime: typeof maybe.mime === 'string' ? maybe.mime : DEFAULT_MIME });
          return;
        }
      }
      resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}
