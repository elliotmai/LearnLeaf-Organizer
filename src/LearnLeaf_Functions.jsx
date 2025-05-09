// @flow

//------------------------------------
// Import Libraries
//------------------------------------

// Import required modules and functions
import {
    saveToStore,
    getFromStore,
    getAllFromStore,
    deleteFromStore,
    clearStore,
    clearFirebaseStores,
    TASKS_STORE,
    SUBJECTS_STORE,
    PROJECTS_STORE,
    queueDelete,
    getDeleteQueue,
    removeFromDeleteQueue,
    queueUserUpdate,
    getQueuedUserUpdates,
    removeUserUpdate,
} from './db.js';

import {
    auth,
    firestore
} from './firebase.js';


import {
    initializeApp
} from "firebase/app";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    deleteUser as deleteFirebaseUser
} from "firebase/auth";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    collection,
    where,
    query,
    Timestamp,
    deleteDoc,
    deleteField,
    updateDoc,
    writeBatch,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    onSnapshot,
    clearIndexedDbPersistence,
    terminate
} from "firebase/firestore";

import {
    getAnalytics
} from "firebase/analytics";

import {
    useUser
} from '/src/UserState.jsx';

// Global variables to store user data and Firestore collections
const provider = new GoogleAuthProvider();
let userId = null;
let taskCollection = null;
let subjectCollection = null;
let projectCollection = null;





/**
 * Sets the current user ID and initializes Firestore collections.
 * If the user ID is not provided, clears the collections and logs an error.
 *
 * @param {string | null} uid - The user ID to set. Use null to reset.
 */
function setUserIdAndCollections(uid) {
    if (uid) {
        userId = uid;
        taskCollection = collection(firestore, 'users', userId, 'tasks');
        subjectCollection = collection(firestore, 'users', userId, 'subjects');
        projectCollection = collection(firestore, 'users', userId, 'projects');
    } else {
        userId = null;
        taskCollection = null;
        subjectCollection = null;
        projectCollection = null;
        console.error("No user is signed in.");
    }
}

/**
 * Initializes the user from the browser's local storage.
 * Attempts to retrieve and set the user ID. Logs an error if no user is found.
 */
const initUserFromLocalStorage = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        setUserIdAndCollections(user.id);

        // Fetch data immediately from IndexedDB
        await fetchDataWithIndexedDBFallback(taskCollection, "tasks");
        await fetchDataWithIndexedDBFallback(subjectCollection, "subjects");
        await fetchDataWithIndexedDBFallback(projectCollection, "projects");

    } else {
        console.error('No user found in localStorage.');
        setUserIdAndCollections(null);
    }
};


// Call the initialization function to set the user ID on page load
initUserFromLocalStorage();

//------------------------------------
// Utility Functions
//------------------------------------

/**
 * Resolves task references by linking them to their corresponding subject and project.
 *
 * @param {Array} tasks - List of task objects to resolve.
 * @param {Array} subjects - List of available subjects.
 * @param {Array} projects - List of available projects.
 * @returns {Promise<Array>} - List of tasks with resolved references.
 */
async function resolveTaskReferences(tasks, subjects, projects) {
    return tasks.map(task => {
        const resolvedSubject = subjects.find(sub => sub.subjectId === task.taskSubject.id);
        const resolvedProject = projects.find(proj => proj.projectId === task.taskProject.id);
        return {
            ...task,
            taskSubject: resolvedSubject,
            taskProject: resolvedProject
        };
    });
}

/**
 * Resolves subject references within project objects.
 * Links project subjects to their respective subject objects.
 *
 * @param {Array} projects - List of project objects to resolve.
 * @param {Array} subjects - List of available subjects.
 * @returns {Promise<Array>} - List of projects with resolved subject references.
 */
async function resolveProjectReferences(projects, subjects) {
    return projects.map(project => {
        // Map project subjects to their resolved subject objects
        const resolvedSubjects = project.projectSubjects.map(projectSubject => {
            // Find the matching subject in the subjects array
            const subject = subjects.find(sub => sub.subjectId === projectSubject.id);

            // Return the subject object if found, or null if not found
            return subject ? { ...subject } : null;
        }).filter(subject => subject !== null); // Filter out unresolved references

        // Return the project with the resolved subjects
        return {
            ...project,
            projectSubjects: resolvedSubjects
        };
    });
}

// Formatting functions for date and time

/**
 * Formats a Firestore Timestamp or a Date object into the "YYYY-MM-DD" format.
 *
 * @param {any} input - The input date to format. Can be a Date object, Firestore Timestamp, or string/number.
 * @returns {string} - The formatted date or an empty string if the input is invalid.
 */
export function formatDate(input) {
    if (!input) return "";

    let date;
    if (input instanceof Timestamp) {
        date = input.toDate();
    } else if (input instanceof Date) {
        date = input;
    } else if (typeof input === 'object' && input.toDate && typeof input.toDate === 'function') {
        date = input.toDate();
    } else if (typeof input === 'object' && 'seconds' in input && 'nanoseconds' in input) {
        date = new Date(input.seconds * 1000);
    } else if (typeof input === 'string' || typeof input === 'number') {
        date = new Date(input);
    } else {
        return ''; // Return an empty string if input is unrecognizable
    }

    // Format the date in ISO format (YYYY-MM-DD)
    return date.toLocaleDateString('en-CA');
}

/**
 * Formats a date for display based on the provided format.
 *
 * @param {any} input - The input date. Can be a Date object, Firestore Timestamp, or string/number.
 * @param {string} dateFormat - The desired format ('DD/MM/YYYY' or default 'MM/DD/YYYY').
 * @returns {string} - The formatted date as a string.
 */
export function formatDateDisplay(input, dateFormat) {
    let date;
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
        // Parse the date string as a local date (ignores time zone)
        const [year, month, day] = input.split('-').map(Number);
        date = new Date(year, month - 1, day); // Month is 0-indexed
    } else {
        date = input instanceof Date ? input : input.toDate ? input.toDate() : new Date(input);
    }

    if (dateFormat === 'DD/MM/YYYY') {
        return date.toLocaleDateString('en-GB'); // British format
    } else {
        return date.toLocaleDateString('en-US'); // Default US format
    }
}

/**
 * Formats a time string (e.g., "14:30") into a display-friendly format.
 *
 * @param {string} input - Time string in "HH:MM" format.
 * @param {string} timeFormat - Desired format ('12h' for 12-hour, otherwise 24-hour).
 * @returns {string} - The formatted time or a placeholder for invalid input.
 */
export function formatTimeDisplay(input, timeFormat) {
    if (!input || typeof input !== 'string') return 'N/A'; // Return 'N/A' for invalid input

    const [strHours, strMinutes] = input.split(':');
    const hours = parseInt(strHours, 10);
    const minutes = parseInt(strMinutes, 10);

    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
        console.error('Invalid time string:', input);
        return 'Invalid Time';
    }

    // Create a temporary Date object for formatting
    const tempDate = new Date();
    tempDate.setHours(hours, minutes);

    // Format time using locale settings
    return tempDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h'
    });
}

/**
 * Formats a time value into "HH:MM" format using a 24-hour clock.
 *
 * @param {any} input - The input time, which can be a Date object, Firestore Timestamp, or string/number.
 * @returns {string} - The formatted time or an empty string if invalid.
 */
export function formatTime(input) {
    if (!input) return "";

    let time;
    if (input instanceof Timestamp) {
        time = input.toDate();
    } else if (input instanceof Date) {
        time = input;
    } else if (typeof input === 'object' && input.toDate && typeof input.toDate === 'function') {
        time = input.toDate();
    } else if (typeof input === 'object' && 'seconds' in input && 'nanoseconds' in input) {
        time = new Date(input.seconds * 1000); // Convert Firestore timestamp {seconds, nanoseconds} to Date
    } else if (typeof input === 'string') {
        // If the input is already in HH:MM format, return it as-is
        if (/^\d{1,2}:\d{2}(\s?[APap][Mm])?$/.test(input.trim())) {
            return input;
        }
        time = new Date(input); // Convert if it's a string date
    } else if (typeof input === 'number') {
        time = new Date(input); // Convert timestamp number to Date
    } else {
        return ''; // Return empty string for unrecognized inputs
    }

    // Format time to "HH:MM" in 24-hour format
    return time.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

//------------------------------------
// Data Fetching
//------------------------------------

function syncFirestoreToIndexedDB(collectionRef, storeName) {
    onSnapshot(collectionRef, async (snapshot) => {
        console.log(`Syncing Firestore -> IndexedDB (${storeName})`);
        const updatedData = [];
        const existingIds = new Set(); // Track IDs from Firestore

        snapshot.docs.forEach((doc) => {
            // Apply formatting function before saving
            let formattedData = formatFirestoreData(doc, storeName);
            updatedData.push(formattedData);
            existingIds.add(doc.id);
        });

        // Step 1: Save formatted data to IndexedDB
        await saveToStore(storeName, updatedData);

        // Step 2: Get all existing IndexedDB entries
        const allLocalData = await getAllFromStore(storeName);

        // Step 3: Remove any local documents that no longer exist in Firestore
        for (const item of allLocalData) {
            const key = item.subjectId || item.taskId || item.projectId || item.id; // Ensure correct key

            if (key === "None") {
                continue; // Skip deletion for subjects/projects with ID "None"
            }

            if (!existingIds.has(key)) {
                await deleteFromStore(storeName, key);
            }
        }
    }, (error) => {
        console.error(`Error syncing Firestore (${storeName}) with IndexedDB:`, error);
    });
}

if (userId) {
    syncFirestoreToIndexedDB(taskCollection, "tasks");
    syncFirestoreToIndexedDB(subjectCollection, "subjects");
    syncFirestoreToIndexedDB(projectCollection, "projects");
}

/**
 * Fetches all tasks, projects, and subjects from Firestore, processes the data, and saves it to IndexedDB.
 *
 * @returns {Promise<Object>} - Returns an object containing tasks, projects, and subjects.
 * @throws Will throw an error if fetching data fails.
 */
export async function fetchAllData() {
    try {
        console.log("Attempting to load data from IndexedDB...");

        // Use IndexedDB first before fetching from Firestore
        const cachedTasks = await fetchDataWithIndexedDBFallback(taskCollection, "tasks", "");
        const cachedProjects = await fetchDataWithIndexedDBFallback(projectCollection, "projects", doc(firestore, 'noneProject', 'None'));
        const cachedSubjects = await fetchDataWithIndexedDBFallback(subjectCollection, "subjects", doc(firestore, 'noneSubject', 'None'));

        if (cachedTasks && cachedProjects && cachedSubjects) {
            console.log("Data found in IndexedDB.");
            return { tasks: cachedTasks, projects: cachedProjects, subjects: cachedSubjects };
        }
        console.log("Data not found in IndexedDB. Fetching from Firestore...");

        // Fetch Firestore data
        const noneProjectDoc = await getDoc(doc(firestore, 'noneProject', 'None'));
        const noneSubjectDoc = await getDoc(doc(firestore, 'noneSubject', 'None'));

        let noneProject = { projectId: 'None', projectName: 'None' };
        let noneSubject = { subjectId: 'None', subjectName: 'None' };

        if (noneProjectDoc.exists()) {
            noneProject = {
                projectId: noneProjectDoc.id,
                ...noneProjectDoc.data()
            };
        } else {
            console.warn("'noneProject/None' not found in Firestore. Using default object.");
        }

        if (noneSubjectDoc.exists()) {
            noneSubject = {
                subjectId: noneSubjectDoc.id,
                ...noneSubjectDoc.data()
            };
        } else {
            console.warn("'noneSubject/None' not found in Firestore. Using default object.");
        }

        // Fetch and format data
        const tasks = await fetchDataWithIndexedDBFallback(taskCollection, "tasks");
        const projects = await fetchDataWithIndexedDBFallback(projectCollection, "projects", doc(firestore, 'noneProject', 'None'));
        const subjects = await fetchDataWithIndexedDBFallback(subjectCollection, "subjects", doc(firestore, 'noneSubject', 'None'));

        // Ensure "None" objects exist in IndexedDB
        if (!projects.some(proj => proj.projectId === 'None')) {
            projects.push(noneProject);
            await saveDataToIndexedDB("projects", projects);
            console.log('Added "None" project to IndexedDB.');
        }

        if (!subjects.some(sub => sub.subjectId === 'None')) {
            subjects.push(noneSubject);
            await saveDataToIndexedDB("subjects", subjects);
            console.log('Added "None" subject to IndexedDB.');
        }

        return { tasks, projects, subjects };
    } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        throw error;
    }
}

//------------------------------------
// Offline Access
//------------------------------------

export async function syncIndexedDBToFirestore(collectionRef, storeName) {
    const localItems = await getAllFromStore(storeName);

    for (const item of localItems) {
        const docId = item.taskId || item.subjectId || item.projectId;
        const docRef = doc(collectionRef, docId);

        try {
            const remoteSnap = await getDoc(docRef);

            // Compare Firestore updateTime to local lastUpdated
            const firestoreUpdated = remoteSnap.exists() && remoteSnap.updateTime
                ? remoteSnap.updateTime.toMillis()
                : 0;

            const localUpdated = item.lastUpdated || 0;

            if (!remoteSnap.exists() || localUpdated > firestoreUpdated) {
                console.log(`[Sync] Pushing updated ${storeName} → Firestore:`, docId);

                const data = { ...item };
                delete data.taskId;
                delete data.subjectId;
                delete data.projectId;
                delete data.lastUpdated;

                // Reconstruct Firestore references for tasks
                if (storeName === 'tasks') {
                    data.taskSubject = data.taskSubject && data.taskSubject !== 'None'
                        ? doc(subjectCollection, data.taskSubject)
                        : doc(firestore, 'noneSubject', 'None');

                    data.taskProject = data.taskProject && data.taskProject !== 'None'
                        ? doc(projectCollection, data.taskProject)
                        : doc(firestore, 'noneProject', 'None');
                }

                // Reconstruct references for projects
                if (storeName === 'projects') {
                    data.projectSubjects = (data.projectSubjects || []).map(id =>
                        id && id !== 'None'
                            ? doc(subjectCollection, id)
                            : doc(firestore, 'noneSubject', 'None')
                    );
                }

                await setDoc(docRef, data, { merge: true });
            }

        } catch (error) {
            console.error(`[Sync] Failed to sync ${storeName} item (${docId}):`, error);
        }
    }
}

// // When the user comes back online, sync local IndexedDB to Firestore
// window.addEventListener("online", () => {
//     if (userId) {
//         syncIndexedDBToFirestore(taskCollection, "tasks");
//         syncIndexedDBToFirestore(subjectCollection, "subjects");
//         syncIndexedDBToFirestore(projectCollection, "projects");
//     }
// });

export async function processDeleteQueue(userId) {
    const queue = await getDeleteQueue();

    for (const item of queue) {
        const { store, itemId, id } = item;
        try {
            const collectionRef = collection(firestore, 'users', userId, store);
            const docRef = doc(collectionRef, itemId);
            await deleteDoc(docRef);
            console.log(`[Sync] Deleted from Firestore: ${store}/${itemId}`);
            await removeFromDeleteQueue(id);
        } catch (err) {
            console.error(`[Sync] Failed to delete ${store}/${itemId}:`, err);
        }
    }
}

export async function processUserUpdateQueue() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user?.id) return;

    const updates = await getQueuedUserUpdates();
    for (const entry of updates) {
        try {
            const userRef = doc(firestore, "users", entry.id);
            await updateDoc(userRef, entry.updates);
            await removeUserUpdate(entry.id);
            console.log(`[Sync] User update synced for ${entry.id}`);
        } catch (err) {
            console.error(`[Sync] Failed to sync user update: ${entry.id}`, err);
        }
    }
}

async function fetchDataWithIndexedDBFallback(collectionRef, storeName, noneDocRef = null) {
    let localData = await getAllFromStore(storeName);

    if (localData.length > 0) {
        console.log(`Using IndexedDB cache for ${storeName}`);

        // Ensure "None" entry exists in IndexedDB cache
        if (noneDocRef && !localData.some(item => item.id === 'None')) {
            console.log(`Adding missing "None" entry to IndexedDB cache for ${storeName}`);
            const noneDoc = await getDoc(noneDocRef);

            let noneData = { id: 'None', name: 'None' };
            if (noneDoc.exists()) {
                noneData = { id: noneDoc.id, ...noneDoc.data() };
            }

            localData.push(noneData);
            await saveToStore(storeName, localData);
        }

        return localData;
    } else {
        console.log(`Fetching from Firestore since IndexedDB is empty (${storeName})`);

        return new Promise((resolve, reject) => {
            onSnapshot(collectionRef, async (snapshot) => {
                try {
                    let fetchedData = snapshot.docs.map(doc => formatFirestoreData(doc, storeName));

                    // Only add "None" if applicable (not for tasks)
                    if (noneDocRef) {
                        const noneDoc = await getDoc(noneDocRef);
                        let noneData = { id: 'None', name: 'None' };

                        if (noneDoc.exists()) {
                            noneData = { id: noneDoc.id, ...noneDoc.data() };
                        }

                        if (!fetchedData.some(item => item.id === 'None')) {
                            console.log(`Adding missing "None" entry to Firestore data for ${storeName}`);
                            fetchedData.push(noneData);
                        }
                    }

                    await saveToStore(storeName, fetchedData);
                    resolve(fetchedData);
                } catch (error) {
                    console.error(`Error formatting ${storeName} data:`, error);
                    reject(error);
                }
            }, (error) => {
                console.error(`Error fetching ${storeName} from Firestore:`, error);
                reject(error);
            });
        });
    }
}

function formatFirestoreData(doc, storeName) {
    const data = doc.data();

    if (storeName === "tasks") {
        return {
            taskId: doc.id,
            ...data,
            taskDueDate: data.taskDueDate ? formatDate(data.taskDueDate) : '',
            taskDueTime: data.taskDueTime ? formatTime(data.taskDueTime) : '',
            taskStartDate: data.taskStartDate ? formatDate(data.taskStartDate) : '',
            taskProject: data.taskProject.id ? data.taskProject.id : "None",
            taskSubject: data.taskSubject.id ? data.taskSubject.id : "None"
        };
    }

    if (storeName === "projects") {
        return {
            projectId: doc.id,
            ...data,
            projectDueDate: data.projectDueDate ? formatDate(data.projectDueDate) : '',
            projectDueTime: data.projectDueTime ? formatTime(data.projectDueTime) : '',
            projectSubjects: data.projectSubjects ? data.projectSubjects.map(subject => subject.id ? subject.id : "None") : []
        };
    }

    if (storeName === "subjects") {
        return {
            subjectId: doc.id,
            ...data
        };
    }

    return { id: doc.id, ...data }; // Default case (failsafe)
}

//------------------------------------
// User Management
//------------------------------------

// Function to handle user registration

/**
 * Registers a new user with the provided email, password, and name.
 * Also creates a Firestore document for the user with default settings.
 *
 * @param {string} email - User's email address.
 * @param {string} password - User's password.
 * @param {string} name - User's full name.
 * @returns {Promise<void>} - Resolves when registration and user document creation are complete.
 */
export function registerUser(email, password, name) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;

            // Send verification email
            sendEmailVerification(user)
                .then(() => {
                    alert('Verification email sent. Please check your inbox.');
                })
                .catch((error) => {
                    console.error('Error sending verification email:', error);
                    alert('Failed to send verification email. Please try again.');
                });

            // Save user information and default settings to Firestore
            await setDoc(doc(firestore, "users", user.uid), {
                name: name,
                email: email,
                timeFormat: '12h',
                dateFormat: 'MM/DD/YYYY',
                notifications: false,
                notificationsFrequency: [true, false, false, false], // Default notification settings,
                icsURLs: {}
            });
        })
        .catch((error) => {
            alert(`Error code: ${error.code}\n${error.message}`);
            throw error;
        });
}



/**
 * Sends a password reset email to the user.
 *
 * @param {string} email - The user's email address.
 * @returns {Promise<void>} - Resolves when the email is sent.
 */
export function resetPassword(email) {
    return sendPasswordResetEmail(auth, email)
        .then(() => {
            // No additional actions needed for successful reset
        })
        .catch((error) => {
            alert(`Error code: ${error.code}\n${error.message}`);
            throw error;
        });
}

/**
 * Logs out the currently signed-in user.
 * Clears localStorage and IndexedDB stores to reset the application state.
 *
 * @returns {Promise<void>} - Resolves when logout is complete.
 */
export async function logoutUser() {
    try {
        await signOut(auth); // Ensure Firebase logs out first
        setUserIdAndCollections(null); // Reset Firestore references

        console.log("User signed out. Clearing IndexedDB, Firestore cache, and localStorage...");

        // Step 2: Delete IndexedDB database
        await deleteIndexedDBDatabase();

        // Step 3: Clear all local storage and session storage
        localStorage.clear();
        sessionStorage.clear();

        console.log('All Clear!');

    } catch (error) {
        console.error("Error logging out:", error);
        throw error;
    }
}

/**
 * Deletes the entire IndexedDB database to prevent conflicts.
 */
async function deleteIndexedDBDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase("learnleaf-db");
        request.onsuccess = () => {
            console.log("IndexedDB deleted successfully.");
            resolve();
        };
        request.onerror = (error) => {
            console.error("Error deleting IndexedDB:", error);
            reject(error);
        };
    });
}

/**
 * Updates user details in Firestore and localStorage.
 *
 * @param {string} userId - The ID of the user to update.
 * @param {Object} userDetails - The details to update (e.g., name, preferences).
 * @returns {Promise<void>} - Resolves when the update is complete.
 */
export async function updateUserDetails(userId, userDetails) {
    const userDocRef = doc(firestore, "users", userId);

    try {
        // Update localStorage immediately
        const current = JSON.parse(localStorage.getItem('user')) || {};
        const merged = { ...current, ...userDetails };
        localStorage.setItem('user', JSON.stringify(merged));

        // Try Firestore update, or queue it
        if (navigator.onLine) {
            await tryFirestoreWrite(
                async () => await updateDoc(userDocRef, userDetails),
                'updateUserDetails'
            );
        } else {
            console.warn("Offline: queuing user update");
            await queueUserUpdate(userId, userDetails);
        }

        // Optionally fetch fresh data
        await fetchAllData();

    } catch (error) {
        console.error("Error updating user details:", error);
        throw error;
    }
}

/**
 * Deletes a user from Firestore and Firebase Authentication.
 * Clears all local data related to the user after deletion.
 *
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<void>} - Resolves when the deletion is complete.
 */
export async function deleteUser(userId) {
    const batch = writeBatch(firestore);

    if (!navigator.onLine) {
        alert("You must be online to delete your account.");
        throw new Error("Offline user deletion not supported.");
    }

    try {
        // Add user document deletion to the batch
        const userDocRef = doc(firestore, "users", userId);
        batch.delete(userDocRef);

        // Commit the batch deletion
        await batch.commit();

        // Delete the user from Firebase Authentication
        const user = auth.currentUser;
        if (user && user.uid === userId) {
            await deleteFirebaseUser(user);
        }

        // Clear local storage and IndexedDB stores
        localStorage.clear();
        await Promise.all([
            deleteFromStore('tasks', userId),
            deleteFromStore('projects', userId),
            deleteFromStore('subjects', userId)
        ]);
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
}

//------------------------------------
// CRUD Operations
//------------------------------------

async function tryFirestoreWrite(fn, label = '') {
    if (!navigator.onLine) {
        console.warn(`Offline: skipping Firestore operation (${label})`);
        return;
    }

    try {
        await fn();
    } catch (err) {
        console.error(`Firestore operation failed (${label}):`, err);
    }
}

/** Task functions: 
 * addTask, 
 * editTask, 
 * deleteTask, 
 * sortTasks 
 */

/**
 * Adds a new task to Firestore and updates IndexedDB with the task details.
 *
 * @param {Object} taskDetails - The details of the task to be added.
 * @returns {Promise<Object>} - The added task data.
 */
export async function addTask(taskDetails) {
    const taskId = taskDetails.taskLMSDetails?.LMS_UID || `${Date.now()}`;

    // Resolve the subject reference
    const taskSubjectRef = taskDetails.taskSubject
        ? (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
            ? doc(subjectCollection, taskDetails.taskSubject)
            : taskDetails.taskSubject?.subjectId
                ? doc(subjectCollection, taskDetails.taskSubject.subjectId)
                : doc(firestore, "noneSubject", "None"))
        : doc(firestore, "noneSubject", "None");

    // Resolve the project reference
    const taskProjectRef = taskDetails.taskProject
        ? (typeof taskDetails.taskProject === 'string' && taskDetails.taskProject !== 'None'
            ? doc(projectCollection, taskDetails.taskProject)
            : taskDetails.taskProject?.projectId
                ? doc(projectCollection, taskDetails.taskProject.projectId)
                : doc(firestore, "noneProject", "None"))
        : doc(firestore, "noneProject", "None");

    const taskData = {
        taskSubject: taskSubjectRef,
        taskProject: taskProjectRef,
        taskName: taskDetails.taskName,
        taskDescription: taskDetails.taskDescription,
        taskPriority: taskDetails.taskPriority,
        taskStatus: taskDetails.taskStatus,
        taskLMSDetails: taskDetails.taskLMSDetails || [],
    };

    // Helper function to create a local date object
    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
    }

    // Set task start date
    if (taskDetails.startDateInput) {
        const startDate = createLocalDate(taskDetails.startDateInput, 0, 0, 0, 0);
        taskData.taskStartDate = Timestamp.fromDate(startDate);
    }

    // Set task due date
    if (taskDetails.dueDateInput) {
        const dueDate = createLocalDate(taskDetails.dueDateInput, 23, 59, 59, 999);
        taskData.taskDueDate = Timestamp.fromDate(dueDate);
    }

    // Set task due time
    if (taskDetails.dueDateInput && taskDetails.dueTimeInput) {
        const [hours, minutes] = taskDetails.dueTimeInput.split(':').map(Number);
        const dueDateTime = createLocalDate(taskDetails.dueDateInput, hours, minutes, 0, 0);
        taskData.taskDueTime = Timestamp.fromDate(dueDateTime);
    }

    const taskRef = doc(taskCollection, taskId);

    // Prepare local IndexedDB data
    const localTaskData = {
        ...taskData,
        taskId,
        taskDueDate: taskDetails?.dueDateInput || '',
        taskDueTime: taskDetails?.dueTimeInput || '',
        taskStartDate: taskDetails?.startDateInput || '',
        taskSubject: taskData.taskSubject.id,
        taskProject: taskData.taskProject.id,
    };

    const now = Date.now();
    localTaskData.lastUpdated = now;

    try {
        await tryFirestoreWrite(() => setDoc(taskRef, taskData, { merge: true }), 'addTask');
        // await setDoc(taskRef, taskData, { merge: true });
        await saveToStore('tasks', [localTaskData]); // Update IndexedDB
    } catch (error) {
        console.error("Error adding task:", error);
    }

    return localTaskData;
}

/**
 * Edits an existing task in Firestore and updates IndexedDB.
 *
 * @param {Object} taskDetails - The details of the task to be updated.
 * @returns {Promise<Object>} - The updated task data.
 */
export async function editTask(taskDetails) {
    const taskId = taskDetails.taskId;

    // Resolve the subject reference
    const taskSubjectRef = taskDetails.taskSubject
        ? (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
            ? doc(subjectCollection, taskDetails.taskSubject)
            : taskDetails.taskSubject?.subjectId
                ? doc(subjectCollection, taskDetails.taskSubject.subjectId)
                : doc(firestore, "noneSubject", "None"))
        : doc(firestore, "noneSubject", "None");

    // Resolve the project reference
    const taskProjectRef = taskDetails.taskProject
        ? (typeof taskDetails.taskProject === 'string' && taskDetails.taskProject !== 'None'
            ? doc(projectCollection, taskDetails.taskProject)
            : taskDetails.taskProject?.projectId
                ? doc(projectCollection, taskDetails.taskProject.projectId)
                : doc(firestore, "noneProject", "None"))
        : doc(firestore, "noneProject", "None");

    const taskData = {
        taskSubject: taskSubjectRef,
        taskProject: taskProjectRef,
        taskName: taskDetails.taskName,
        taskDescription: taskDetails.taskDescription,
        taskPriority: taskDetails.taskPriority,
        taskStatus: taskDetails.taskStatus,
    };

    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds);
    }

    // Set start date
    if (taskDetails.taskStartDate) {
        const startDate = createLocalDate(taskDetails.taskStartDate, 0, 0, 0, 100);
        taskData.taskStartDate = Timestamp.fromDate(startDate);
    }

    // Set due date
    if (taskDetails.taskDueDate) {
        const dueDate = createLocalDate(taskDetails.taskDueDate, 23, 59, 59, 900);
        taskData.taskDueDate = Timestamp.fromDate(dueDate);
    }

    // Set due time
    if (taskDetails.taskDueDate && taskDetails.taskDueTime) {
        const [hours, minutes] = taskDetails.taskDueTime.split(':').map(Number);
        const dueDateTime = createLocalDate(taskDetails.taskDueDate, hours, minutes, 0, 0);
        taskData.taskDueTime = Timestamp.fromDate(dueDateTime);
    }

    const taskRef = doc(taskCollection, taskId);

    try {
        await tryFirestoreWrite(() => updateDoc(taskRef, taskData), 'editTask');
        // await updateDoc(taskRef, taskData);

        // Prepare local IndexedDB data
        const localTaskData = {
            ...taskData,
            taskId,
            taskDueDate: taskDetails.taskDueDate,
            taskDueTime: taskDetails.taskDueTime,
            taskStartDate: taskDetails.taskStartDate,
            taskSubject: taskData.taskSubject.id,
            taskProject: taskData.taskProject.id,
        };

        const now = Date.now();
        localTaskData.lastUpdated = now;

        await saveToStore('tasks', [localTaskData]); // Update IndexedDB
        return localTaskData;
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

/**
 * Deletes a task from Firestore and IndexedDB.
 *
 * @param {string} taskId - The ID of the task to delete.
 */
export async function deleteTask(taskId) {
    const taskRef = doc(taskCollection, taskId);

    await tryFirestoreWrite(
        async () => await deleteDoc(taskRef),
        'deleteTask'
    );

    if (!navigator.onLine) {
        await queueDelete('tasks', taskId);
    }

    await deleteFromStore('tasks', taskId);
}

export async function archiveTask(taskId) {
    const taskRef = doc(taskCollection, taskId); // Reference to the task in Firestore

    try {
        // Update the task status in Firestore
        await tryFirestoreWrite(() => updateDoc(taskRef, { taskStatus: 'Completed' }), 'archiveTask');
        // await updateDoc(taskRef, { taskStatus: 'Completed' });

        // Update the task status in IndexedDB
        const storedTasks = await getAllFromStore('tasks'); // Get all tasks from IndexedDB
        const updatedTasks = storedTasks.map(task =>
            task.taskId === taskId ? { ...task, taskStatus: 'Completed' } : task
        );
        await saveToStore('tasks', updatedTasks); // Save the updated tasks back to IndexedDB

        console.log("Task archived successfully.");
    } catch (error) {
        console.error("Error archiving task:", error);
    }
}

/**
 * Sorts tasks based on due date, time, and name.
 *
 * @param {Array} tasks - The array of task objects to sort.
 * @returns {Array} - The sorted array of tasks.
 */
export function sortTasks(tasks) {
    return tasks.sort((a, b) => {
        const dateA = a.taskDueDate ? new Date(a.taskDueDate) : new Date('9999-12-31');
        const dateB = b.taskDueDate ? new Date(b.taskDueDate) : new Date('9999-12-31');

        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        const timeA = a.taskDueTime || '23:59';
        const timeB = b.taskDueTime || '23:59';

        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;

        return a.taskName.localeCompare(b.taskName);
    });
}

/**
 * Subject Functions: 
 * addSubject, 
 * editSubject, 
 * deleteSubject, 
 * archiveSubject, 
 * blockSubject, 
 * reactivateSubject, 
 * sortSubjects
 */

/**
 * Adds a new subject to Firestore and updates IndexedDB.
 *
 * @param {Object} subjectDetails - The details of the subject to add.
 * @returns {Promise<Object>} - The added subject data.
 */
export async function addSubject(subjectDetails) {
    const subjectId = subjectDetails.subjectLMSDetails?.LMS_UID || `${Date.now()}`;

    const subjectData = {
        subjectName: subjectDetails.subjectName,
        subjectStatus: subjectDetails.subjectStatus || "Active",
        subjectSemester: subjectDetails.subjectSemester || "",
        subjectColor: subjectDetails.subjectColor || "black",
        subjectLMSDetails: subjectDetails.subjectLMSDetails || [],
    };

    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Save to Firestore and IndexedDB
        await tryFirestoreWrite(() => setDoc(subjectRef, subjectData, { merge: true }), 'addSubject');
        // await setDoc(subjectRef, subjectData, { merge: true });
        const now = Date.now();
        await saveToStore('subjects', [{ ...subjectData, subjectId, lastUpdated: now }]);
        return { ...subjectData, subjectId };
    } catch (error) {
        console.error("Error adding subject:", error);
    }
}

/**
 * Edits an existing subject in Firestore and updates IndexedDB.
 *
 * @param {Object} subjectDetails - The details of the subject to edit.
 */
export async function editSubject(subjectDetails) {
    const subjectId = subjectDetails.subjectId;

    const subjectData = {
        subjectName: subjectDetails.subjectName,
        subjectSemester: subjectDetails.subjectSemester,
        subjectDescription: subjectDetails.subjectDescription || "",
        subjectColor: subjectDetails.subjectColor,
        subjectStatus: subjectDetails.subjectStatus,
    };

    try {
        // Update Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(doc(subjectCollection, subjectId), subjectData), 'editSubject');
        // await updateDoc(doc(subjectCollection, subjectId), subjectData);
        const now = Date.now();
        await saveToStore('subjects', [{ ...subjectData, subjectId, lastUpdated: now }]);
    } catch (error) {
        console.error("Error updating subject:", error);
    }
}

/**
 * Deletes a subject and updates tasks and projects that reference it.
 *
 * @param {string} subjectId - The ID of the subject to delete.
 */
export async function deleteSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Delete the subject from Firestore and IndexedDB
        await tryFirestoreWrite(
            async () => await deleteDoc(subjectRef),
            'deleteSubject'
        );

        if (!navigator.onLine) {
            await queueDelete('subjects', subjectId);
        }

        await deleteFromStore('subjects', subjectId);

        // Update tasks that referenced the deleted subject
        const allTasks = (await getAllFromStore('tasks')).filter(task => task.taskSubject === subjectId);
        for (const task of allTasks) {
            task.taskSubject = 'None'; // Change subject to 'None'
            await editTask(task); // Update the task
        }

        // Update projects that referenced the deleted subject
        const allProjects = await getAllFromStore('projects');
        for (const project of allProjects) {
            if (project.projectSubjects.includes(subjectId)) {
                const updatedProject = { ...project };

                // Remove the subject ID or set to 'None' if it was the only one
                updatedProject.projectSubjects = project.projectSubjects.length > 1
                    ? project.projectSubjects.filter(subj => subj !== subjectId)
                    : ['None'];

                await editProject(updatedProject); // Update the project
            }
        }
    } catch (error) {
        console.error("Error deleting subject or updating tasks and projects:", error);
    }
}

/**
 * Archives a subject by updating its status to 'Archived'.
 *
 * @param {string} subjectId - The ID of the subject to archive.
 */
export async function archiveSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Update Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(subjectRef, { subjectStatus: 'Archived' }), 'archiveSubject');
        // await updateDoc(subjectRef, { subjectStatus: 'Archived' });

        const storedSubjects = await getAllFromStore('subjects');
        const now = Date.now();
        const updatedSubjects = storedSubjects.map(subject =>
            subject.subjectId === subjectId ? { ...subject, subjectStatus: 'Archived', lastUpdated: now } : subject
        );
        await saveToStore('subjects', updatedSubjects);
    } catch (error) {
        console.error("Error archiving subject:", error);
    }
}

/**
 * Blocks a subject by updating its status to 'Blocked'.
 *
 * @param {string} subjectId - The ID of the subject to block.
 */
export async function blockSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Update Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(subjectRef, { subjectStatus: 'Blocked' }), 'blockSubject');
        // await updateDoc(subjectRef, { subjectStatus: 'Blocked' });

        const storedSubjects = await getAllFromStore('subjects');
        const now = Date.now();
        const updatedSubjects = storedSubjects.map(subject =>
            subject.subjectId === subjectId
                ? { ...subject, subjectStatus: 'Blocked', lastUpdated: now }
                : subject
        );
        await saveToStore('subjects', updatedSubjects);
    } catch (error) {
        console.error("Error blocking subject:", error);
    }
}

/**
 * Reactivates a subject by updating its status to 'Active'.
 *
 * @param {string} subjectId - The ID of the subject to reactivate.
 */
export async function reactivateSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Update Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(subjectRef, { subjectStatus: 'Active' }), 'reactivateSubject');
        // await updateDoc(subjectRef, { subjectStatus: 'Active' });

        const storedSubjects = await getAllFromStore('subjects');
        const now = Date.now();
        const updatedSubjects = storedSubjects.map(subject =>
            subject.subjectId === subjectId
                ? { ...subject, subjectStatus: 'Active', lastUpdated: now }
                : subject
        );
        await saveToStore('subjects', updatedSubjects);

    } catch (error) {
        console.error("Error reactivating subject:", error);
    }
}

/**
 * Sorts subjects alphabetically by their name.
 *
 * @param {Array} subjects - The array of subject objects to sort.
 * @returns {Array} - The sorted array of subjects.
 */
export function sortSubjects(subjects) {
    return subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

/** Project Functions: 
 * addProject, 
 * editProject, 
 * deleteProject, 
 * archiveProject, 
 * reactivateProject, 
 * sortProjects
 */

/**
 * Adds a new project to Firestore and updates IndexedDB.
 *
 * @param {Object} projectDetails - The details of the project to add.
 * @returns {Promise<Object>} - The added project data.
 */
export async function addProject({ projectDueDateInput, projectDueTimeInput, projectName, projectDescription, projectSubjects }) {
    const projectId = `${Date.now()}`;
    const projectRef = doc(projectCollection, projectId);

    const projectData = {
        projectName,
        projectDescription,
        projectStatus: 'Active',
    };

    // Convert subject IDs to Firestore references
    const subjectRefs = projectSubjects.map(subjId => doc(subjectCollection, subjId));
    projectData.projectSubjects = subjectRefs;

    // Add optional due dates
    if (projectDueDateInput) {
        projectData.projectDueDate = Timestamp.fromDate(new Date(`${projectDueDateInput}T23:59:59.999`));
    }
    if (projectDueTimeInput) {
        projectData.projectDueTime = Timestamp.fromDate(new Date(`${projectDueDateInput}T${projectDueTimeInput}`));
    }

    const now = Date.now();
    const localProjectData = {
        projectId,
        projectName,
        projectDescription,
        projectStatus: 'Active',
        projectSubjects: subjectRefs.map(ref => ref.id),
        projectDueDate: projectDueDateInput || '',
        projectDueTime: projectDueTimeInput || '',
        lastUpdated: now
    };

    try {
        await tryFirestoreWrite(() => setDoc(projectRef, projectData, { merge: true }), 'addProject');
        //   await setDoc(projectRef, projectData, { merge: true });
        await saveToStore('projects', [localProjectData]);
        return localProjectData;
    } catch (error) {
        console.error("Error adding project:", error);
    }
}


export async function deleteAllProjects() {
    try {
        const allProjects = await getAllFromStore('projects');

        for (const project of allProjects) {
            const projectId = project.projectId;
            const projectRef = doc(projectCollection, projectId);

            await tryFirestoreWrite(
                async () => await deleteDoc(projectRef),
                `deleteAllProjects:${projectId}`
            );

            if (!navigator.onLine) {
                await queueDelete('projects', projectId);
            }

            await deleteFromStore('projects', projectId);

            // Update tasks associated with this project
            const allTasks = (await getAllFromStore('tasks')).filter(task => task.taskProject === projectId);
            for (const task of allTasks) {
                task.taskProject = 'None';
                await editTask(task);
            }
        }

        console.log("All projects deleted successfully.");
    } catch (error) {
        console.error("Error deleting all projects:", error);
    }
}

export async function archiveProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    const updateData = { projectStatus: 'Archived' };

    try {
        // Update Firestore
        await tryFirestoreWrite(() => updateDoc(projectRef, updateData), 'archiveProject');
        // await updateDoc(projectRef, updateData);

        // Update IndexedDB with lastUpdated
        const now = Date.now();
        const storedProjects = await getAllFromStore('projects');
        const updatedProjects = storedProjects.map(project =>
            project.projectId === projectId
                ? { ...project, ...updateData, lastUpdated: now }
                : project
        );

        await saveToStore('projects', updatedProjects);
    } catch (error) {
        console.error("Error archiving project:", error);
    }
}

/**
 * Edits an existing project in Firestore and updates IndexedDB.
 *
 * @param {Object} projectDetails - The details of the project to edit.
 * @returns {Promise<Object>} - The updated project data.
 */
export async function editProject(projectDetails) {
    // Convert subject IDs to Firestore references
    const subjectRefs = projectDetails.projectSubjects.map(subject => {
        const subjectId = typeof subject === 'string' ? subject : subject?.subjectId;
        return doc(subjectCollection, subjectId);
    }).filter(ref => ref);

    // Prepare data for Firestore
    const projectData = {
        projectName: projectDetails.projectName,
        projectStatus: projectDetails.projectStatus,
        projectDescription: projectDetails.projectDescription,
        projectSubjects: subjectRefs,
    };

    // Prepare data for IndexedDB
    const localProjectData = {
        projectId: projectDetails.projectId,
        projectName: projectDetails.projectName,
        projectStatus: projectDetails.projectStatus,
        projectDescription: projectDetails.projectDescription,
        projectSubjects: subjectRefs.map(ref => ref.id),
        projectDueDate: projectDetails.projectDueDate || '',
        projectDueTime: projectDetails.projectDueTime || '',
    };

    // Handle optional due date and time
    if (projectDetails.projectDueDate) {
        projectData.projectDueDate = Timestamp.fromDate(new Date(`${projectDetails.projectDueDate}T23:59:59.999`));
        localProjectData.projectDueDate = projectDetails.projectDueDate;
    } else {
        projectData.projectDueDate = deleteField();
    }

    if (projectDetails.projectDueTime) {
        projectData.projectDueTime = Timestamp.fromDate(new Date(`${projectDetails.projectDueDate}T${projectDetails.projectDueTime}`));
        localProjectData.projectDueTime = projectDetails.projectDueTime;
    } else {
        projectData.projectDueTime = deleteField();
    }

    const now = Date.now();
    localProjectData.lastUpdated = now;

    try {
        // Update project in Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(doc(projectCollection, projectDetails.projectId), projectData), 'editProject');
        // await updateDoc(doc(projectCollection, projectDetails.projectId), projectData);
        await saveToStore('projects', [localProjectData]);
        return localProjectData;
    } catch (error) {
        console.error("Error updating project:", error);
    }
}

/**
 * Deletes a project and updates tasks that reference it.
 *
 * @param {string} projectId - The ID of the project to delete.
 */
export async function deleteProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    await tryFirestoreWrite(
        async () => await deleteDoc(projectRef),
        'deleteProject'
    );

    if (!navigator.onLine) {
        await queueDelete('projects', projectId);
    }

    await deleteFromStore('projects', projectId);

    try {
        // Update tasks that referenced the deleted project
        const allTasks = (await getAllFromStore('tasks')).filter(task => task.taskProject === projectId);
        for (const task of allTasks) {
            task.taskProject = 'None'; // Change project to 'None'
            await editTask(task); // Update the task
        }

    } catch (error) {
        console.error("Error deleting project:", error);
    }
}

/**
 * Reactivates a project by updating its status to 'Active'.
 *
 * @param {string} projectId - The ID of the project to reactivate.
 */
export async function reactivateProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        // Update project status in Firestore and IndexedDB
        await tryFirestoreWrite(() => updateDoc(projectRef, { projectStatus: 'Active' }), 'reactivateProject');
        // await updateDoc(projectRef, { projectStatus: 'Active' });

        const storedProjects = await getAllFromStore('projects');
        const now = Date.now();
        const updatedProjects = storedProjects.map(project =>
            project.projectId === projectId
                ? { ...project, projectStatus: 'Active', lastUpdated: now }
                : project
        );
        await saveToStore('projects', updatedProjects);

    } catch (error) {
        console.error("Error reactivating project:", error);
    }
}

/**
 * Sorts projects based on due dates, times, and names.
 *
 * @param {Array} projects - The array of project objects to sort.
 * @returns {Array} - The sorted array of projects.
 */
export function sortProjects(projects) {
    return projects.sort((a, b) => {
        // Sort by nextTaskDueDate
        const dateComparison = (a.nextTaskDueDate || '9999-12-31').localeCompare(b.nextTaskDueDate || '9999-12-31');
        if (dateComparison !== 0) return dateComparison;

        // Sort by nextTaskDueTime
        const timeComparison = (a.nextTaskDueTime || '23:59').localeCompare(b.nextTaskDueTime || '23:59');
        if (timeComparison !== 0) return timeComparison;

        // Sort by projectDueDate
        const projectDateComparison = (a.projectDueDate || '9999-12-31').localeCompare(b.projectDueDate || '9999-12-31');
        if (projectDateComparison !== 0) return projectDateComparison;

        // Sort by projectDueTime
        const projectTimeComparison = (a.projectDueTime || '23:59').localeCompare(b.projectDueTime || '23:59');
        if (projectTimeComparison !== 0) return projectTimeComparison;

        // Sort by projectName
        return a.projectName.localeCompare(b.projectName);
    });
}

export async function loginWithGoogle(updateUser, navigate) {


    signInWithPopup(auth, provider)
        .then(async (result) => {

            setUserIdAndCollections(null);
            await Promise.all([
                localStorage.clear(),
                clearStore(TASKS_STORE),
                clearStore(SUBJECTS_STORE),
                clearStore(PROJECTS_STORE)

            ]);
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;


            // Fetch user document from Firestore
            const userDoc = await getDoc(doc(firestore, "users", user.uid));
            if (!userDoc.exists()) {

                await setDoc(doc(firestore, "users", user.uid), {
                    name: user.displayName,
                    email: user.email,
                    authMethod: "google", // Use authMethod to distinguish
                    timeFormat: '12h',
                    dateFormat: 'MM/DD/YYYY',
                    notifications: false,
                    notificationsFrequency: [true, false, false, false],
                    icsURLs: {}

                });

                const userData = {
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    userTimeFormat: '12h',
                    dateFormat: 'MM/DD/YYYY',
                    notifications: false,
                    notificationFrequency: [true, false, false, false],
                    icsURLs: {}
                };
                localStorage.setItem('user', JSON.stringify(userData)); // Store user in localStorage

                // Initialize collections in Indexedfirestore
                setUserIdAndCollections(user.uid);

                await fetchAllData();
                updateUser({ id: userData.id, name: userData.name, email: userData.email, password: "dummypassword", notifications: userData.notifications, notificationFrequency: userData.notificationFrequency }); // Update global user state
                navigate('/tasks'); // Navigate to tasks page upon successful login
            }
            else {
                const userData = {
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    userTimeFormat: '12h',
                    dateFormat: 'MM/DD/YYYY',
                    notifications: false,
                    notificationFrequency: [true, false, false, false],
                    icsURLs: {}
                };
                localStorage.setItem('user', JSON.stringify(userData)); // Store user in localStorage

                // Initialize collections in Indexedfirestore
                setUserIdAndCollections(user.uid);


                await fetchAllData();
                updateUser({ id: userData.id, name: userData.name, email: userData.email, password: "dummypassword", notifications: userData.notifcations, notificationFrequency: userData.notificationFrequency }); // Update global user state
                navigate('/tasks'); // Navigate to tasks page upon successful login
            }
        }).catch((error) => {
            console.log(error);
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            // The email of the user's account used.
            const email = error.customData.email;
            // The AuthCredential type that was used.
            const credential = GoogleAuthProvider.credentialFromError(error);
            // ...
        });

}

/**
 * Logs in a user using their email and password.
 * Fetches and prepares user data from Firestore and stores it locally.
 *
 * @param {string} email - User's email address.
 * @param {string} password - User's password.
 * @returns {Promise<Object>} - Resolves with user and additional fetched data.
 */
export async function loginUser(email, password) {

    return signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            const userId = user.uid;

            // Fetch user document from Firestore
            const userDoc = await getDoc(doc(firestore, "users", userId));
            if (!userDoc.exists()) {
                throw new Error('User does not exist');
            }

            // Prepare user data and store in localStorage
            const userData = {
                id: userId,
                name: userDoc.data().name,
                email: userDoc.data().email,
                timeFormat: userDoc.data().timeFormat,
                dateFormat: userDoc.data().dateFormat,
                notifications: userDoc.data().notifications,
                notificationsFrequency: userDoc.data().notificationsFrequency,
                icsURLs: userDoc.data().icsURLs || {}
            };
            localStorage.setItem('user', JSON.stringify(userData));

            // Initialize Firestore collections and fetch additional data
            setUserIdAndCollections(userId);
            const data = await fetchAllData();

            // Return user data combined with fetched data
            return { ...userData, ...data };
        })
        .catch((error) => {
            console.error("Login error:", error);
            throw error;
        });
}