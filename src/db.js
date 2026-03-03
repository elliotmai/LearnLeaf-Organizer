import { openDB } from 'idb';

const DB_NAME = 'learnleaf-db';
const DB_VERSION = 1;
export const TASKS_STORE    = 'tasks';
export const SUBJECTS_STORE = 'subjects';
export const PROJECTS_STORE = 'projects';
export const DELETED_STORE  = 'deletedItems';
export const USER_STORE     = 'userUpdates';

// Check if IndexedDB is actually available (blocked in some private/deployed contexts)
let _dbAvailable = null;
async function isDBAvailable() {
  if (_dbAvailable !== null) return _dbAvailable;
  try {
    await new Promise((resolve, reject) => {
      const test = indexedDB.open('__test__');
      test.onsuccess = () => { test.result.close(); indexedDB.deleteDatabase('__test__'); resolve(); };
      test.onerror = reject;
      test.onblocked = reject;
    });
    _dbAvailable = true;
  } catch {
    _dbAvailable = false;
    console.warn('IndexedDB unavailable — running in memory-only mode');
  }
  return _dbAvailable;
}

// In-memory fallback store when IndexedDB is blocked
const memoryStore = {
  tasks: [], subjects: [], projects: [], deletedItems: [], userUpdates: []
};

let _db = null;
export async function initDB() {
  if (_db) return _db;
  if (!(await isDBAvailable())) return null;
  try {
    _db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(TASKS_STORE))    db.createObjectStore(TASKS_STORE,    { keyPath: 'taskId' });
        if (!db.objectStoreNames.contains(SUBJECTS_STORE)) db.createObjectStore(SUBJECTS_STORE, { keyPath: 'subjectId' });
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) db.createObjectStore(PROJECTS_STORE, { keyPath: 'projectId' });
        if (!db.objectStoreNames.contains(DELETED_STORE))  db.createObjectStore(DELETED_STORE,  { keyPath: 'id' });
        if (!db.objectStoreNames.contains(USER_STORE))     db.createObjectStore(USER_STORE,     { keyPath: 'id' });
      },
      blocked() { console.warn('IndexedDB blocked by another tab'); },
      blocking() { _db?.close(); _db = null; },
      terminated() { _db = null; },
    });
    return _db;
  } catch (e) {
    console.error('IndexedDB open failed:', e);
    _dbAvailable = false;
    return null;
  }
}

export async function saveToStore(storeName, data) {
  const db = await initDB();
  if (!db) {
    // Fallback: upsert into memory
    const key = storeName === TASKS_STORE ? 'taskId' : storeName === SUBJECTS_STORE ? 'subjectId' : storeName === PROJECTS_STORE ? 'projectId' : 'id';
    const store = memoryStore[storeName] || (memoryStore[storeName] = []);
    for (const item of data) {
      const idx = store.findIndex(x => x[key] === item[key]);
      if (idx >= 0) store[idx] = item; else store.push(item);
    }
    return;
  }
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  for (let item of data) {
    let newItem = JSON.parse(JSON.stringify({ ...item }));
    if (storeName === TASKS_STORE    && !newItem.taskId)    newItem.taskId    = newItem.id || `${Date.now()}`;
    if (storeName === SUBJECTS_STORE && !newItem.subjectId) newItem.subjectId = newItem.id || `${Date.now()}`;
    if (storeName === PROJECTS_STORE && !newItem.projectId) newItem.projectId = newItem.id || `${Date.now()}`;
    try { await store.put(newItem); } catch(e) { console.error(`Failed to save to ${storeName}:`, e); }
  }
  await tx.done;
}

export async function getFromStore(storeName, key) {
  const db = await initDB();
  if (!db) return (memoryStore[storeName] || []).find(x => Object.values(x).includes(key)) || null;
  return db.get(storeName, key);
}

export async function getAllFromStore(storeName) {
  const db = await initDB();
  if (!db) return [...(memoryStore[storeName] || [])];
  return db.getAll(storeName);
}

export async function deleteFromStore(storeName, key) {
  if (!key) return;
  const db = await initDB();
  if (!db) {
    const store = memoryStore[storeName] || [];
    const idx = store.findIndex(x => Object.values(x).includes(key));
    if (idx >= 0) store.splice(idx, 1);
    return;
  }
  const tx = db.transaction(storeName, 'readwrite');
  try { await tx.objectStore(storeName).delete(key); } catch(e) { console.error(`Failed to delete from ${storeName}:`, e); }
  await tx.done;
}

export async function clearStore(storeName) {
  const db = await initDB();
  if (!db) { memoryStore[storeName] = []; return; }
  const tx = db.transaction(storeName, 'readwrite');
  await tx.objectStore(storeName).clear();
  await tx.done;
}

export async function clearFirebaseStores() {
  const names = ["firebase-heartbeat-database","firebase-installations-database","firebaseLocalStorageDb"];
  for (const dbName of names) {
    try {
      const db = await openDB(dbName);
      const tx = db.transaction(db.objectStoreNames, 'readwrite');
      for (const s of db.objectStoreNames) await tx.objectStore(s).clear();
      await tx.done; db.close();
    } catch {}
  }
}

export async function queueDelete(storeName, id) {
  const db = await initDB();
  if (!db) return;
  const tx = db.transaction(DELETED_STORE, 'readwrite');
  await tx.objectStore(DELETED_STORE).put({ id: `${storeName}:${id}`, store: storeName, itemId: id, deletedAt: Date.now() });
  await tx.done;
}
export async function getDeleteQueue()          { const db = await initDB(); if (!db) return []; return db.getAll(DELETED_STORE); }
export async function removeFromDeleteQueue(id) { const db = await initDB(); if (!db) return; const tx = db.transaction(DELETED_STORE,'readwrite'); await tx.objectStore(DELETED_STORE).delete(id); await tx.done; }
export async function queueUserUpdate(userId, updates) { const db = await initDB(); if (!db) return; const tx = db.transaction(USER_STORE,'readwrite'); await tx.objectStore(USER_STORE).put({id:userId,updates,queuedAt:Date.now()}); await tx.done; }
export async function getQueuedUserUpdates()    { const db = await initDB(); if (!db) return []; return db.getAll(USER_STORE); }
export async function removeUserUpdate(userId)  { const db = await initDB(); if (!db) return; const tx = db.transaction(USER_STORE,'readwrite'); await tx.objectStore(USER_STORE).delete(userId); await tx.done; }
