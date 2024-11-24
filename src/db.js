// db.js (Utility for IndexedDB)
import { openDB } from 'idb';

const DB_NAME = 'learnleaf-db';
const DB_VERSION = 1;
export const TASKS_STORE = 'tasks';
export const SUBJECTS_STORE = 'subjects';
export const PROJECTS_STORE = 'projects';

export async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(TASKS_STORE)) {
                db.createObjectStore(TASKS_STORE, { keyPath: 'taskId' });
            }
            if (!db.objectStoreNames.contains(SUBJECTS_STORE)) {
                db.createObjectStore(SUBJECTS_STORE, { keyPath: 'subjectId' });
            }
            if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                db.createObjectStore(PROJECTS_STORE, { keyPath: 'projectId' });
            }
        }
    });
}

// Helper functions to interact with IndexedDB
export async function saveToStore(storeName, data) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of data) {
        await store.put(item);
    }
    await tx.done;
}

export async function getFromStore(storeName, key) {
    const db = await initDB();
    return db.get(storeName, key);
}

export async function getAllFromStore(storeName) {
    const db = await initDB();
    return db.getAll(storeName);
}

export async function deleteFromStore(storeName, key) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.delete(key);
    await tx.done;
}

export async function clearStore(storeName) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;
}