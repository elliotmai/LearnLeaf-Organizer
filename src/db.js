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

export async function clearFirebaseStores() {
    const firebaseDatabases = ["firebase-heartbeat-database", "firebase-installations-database", "firebaseLocalStorageDb"];

    for (const dbName of firebaseDatabases) {
        try {
            const db = await openDB(dbName);
            const tx = db.transaction(db.objectStoreNames, 'readwrite');
            for (const storeName of db.objectStoreNames) {
                await tx.objectStore(storeName).clear();
                console.log(`Cleared store: ${storeName} in database: ${dbName}`);
            }
            await tx.done;
            db.close();
        } catch (error) {
            console.error(`Error clearing stores in database ${dbName}:`, error);
        }
    }
}

// Helper functions to interact with IndexedDB
export async function saveToStore(storeName, data) {
    const db = await initDB();
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);

    for (const item of data) {
        let newItem = { ...item }; // Clone the object to modify safely

        // Ensure correct key is set for IndexedDB
        if (storeName === TASKS_STORE && !newItem.taskId) {
            newItem.taskId = newItem.id || `${Date.now()}`;
        }
        if (storeName === SUBJECTS_STORE && !newItem.subjectId) {
            newItem.subjectId = newItem.id || `${Date.now()}`;
        }
        if (storeName === PROJECTS_STORE && !newItem.projectId) {
            newItem.projectId = newItem.id || `${Date.now()}`;
        }

        // 🔥 Fix: Remove any unserializable fields
        newItem = JSON.parse(JSON.stringify(newItem)); // Converts to serializable data

        if (
            (storeName === TASKS_STORE && !newItem.taskId) ||
            (storeName === SUBJECTS_STORE && !newItem.subjectId) ||
            (storeName === PROJECTS_STORE && !newItem.projectId)
        ) {
            console.error(`Error: Missing key in ${storeName} entry:`, newItem);
            continue; // Skip this entry instead of crashing
        }

        try {
            await store.put(newItem);
        } catch (error) {
            console.error(`Failed to save ${storeName} entry in IndexedDB:`, error, newItem);
        }
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
    if (!key) {
        console.error(`Error: Attempted to delete from ${storeName} with an invalid key:`, key);
        return; // Prevent IndexedDB error
    }

    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    try {
        await store.delete(key);
        console.log(`Deleted ${key} from ${storeName}`);
    } catch (error) {
        console.error(`Failed to delete ${key} from ${storeName}:`, error);
    }

    await tx.done;
}


export async function clearStore(storeName) {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    await store.clear();
    await tx.done;
}