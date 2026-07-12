import { ContextBundle, ContextField } from "../types";

const DB_NAME = "ContxtAI_DB";
const DB_VERSION = 2;
const STORE_BUNDLES = "bundles";
const STORE_SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null; // Reset on error
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BUNDLES)) {
        db.createObjectStore(STORE_BUNDLES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: "key" });
      }
    };
  });
  
  return dbPromise;
}

/**
 * Loads a bundle by ID from the local IndexedDB.
 * Throws an error if the bundle does not exist.
 *
 * @param id - The UUID of the bundle to load.
 * @returns A promise resolving to the ContextBundle.
 */
export async function loadBundle(id: string): Promise<ContextBundle> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BUNDLES, "readonly");
    const store = transaction.objectStore(STORE_BUNDLES);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as ContextBundle);
      } else {
        reject(new Error(`Bundle with id ${id} not found`));
      }
    };
  });
}

/**
 * Saves or overwrites a bundle in IndexedDB.
 *
 * @param bundle - The ContextBundle to save.
 */
export async function saveBundle(bundle: ContextBundle): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BUNDLES, "readwrite");
    const store = transaction.objectStore(STORE_BUNDLES);
    const request = store.put(bundle);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Retrieves all saved bundles from the database.
 * Used to populate the profile switcher UI.
 */
export async function getAllBundles(): Promise<ContextBundle[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BUNDLES, "readonly");
    const store = transaction.objectStore(STORE_BUNDLES);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as ContextBundle[]);
  });
}

/**
 * Permanently deletes a bundle by ID.
 */
export async function deleteBundle(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BUNDLES, "readwrite");
    const store = transaction.objectStore(STORE_BUNDLES);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Creates a new bundle, filling in default values (UUID, timestamps) 
 * for any missing fields in the partial object.
 */
export async function createBundle(partial: Partial<ContextBundle>): Promise<ContextBundle> {
  const bundle: ContextBundle = {
    id: partial.id || crypto.randomUUID(),
    version: partial.version || "1.0",
    name: partial.name || "New Bundle",
    description: partial.description || "",
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: partial.updatedAt || new Date().toISOString(),
    identity: partial.identity || {},
    fields: partial.fields || [],
  };
  await saveBundle(bundle);
  return bundle;
}

/**
 * Helper to update a single field inside a bundle.
 */
export async function updateField(
  bundleId: string,
  fieldId: string,
  update: Partial<ContextField>
): Promise<ContextBundle> {
  const bundle = await loadBundle(bundleId);
  const fieldIndex = bundle.fields.findIndex(f => f.id === fieldId);
  
  if (fieldIndex === -1) {
    throw new Error(`Field ${fieldId} not found in bundle ${bundleId}`);
  }

  bundle.fields[fieldIndex] = { ...bundle.fields[fieldIndex], ...update };
  bundle.updatedAt = new Date().toISOString();
  await saveBundle(bundle);
  return bundle;
}

/**
 * Retrieves the ID of the currently active bundle from the settings store.
 */
export async function getActiveBundleId(): Promise<string | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readonly");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get("activeBundleId");

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : null);
    };
  });
}

/**
 * Sets the globally active bundle ID in the settings store.
 */
export async function setActiveBundleId(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SETTINGS, "readwrite");
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key: "activeBundleId", value: id });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
