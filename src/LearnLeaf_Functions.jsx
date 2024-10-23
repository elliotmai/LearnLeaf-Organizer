// @flow
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, deleteUser as deleteFirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, where, query, orderBy, Timestamp, deleteDoc, deleteField, updateDoc, writeBatch } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { useUser } from '/src/UserState.jsx';
import { sub } from "date-fns";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyA8rr1TEUUZ9b_PqR475mszkoC0aMoHeTE",
    authDomain: "learnleaf-organizer.firebaseapp.com",
    projectId: "learnleaf-organizer",
    storageBucket: "learnleaf-organizer.appspot.com",
    messagingSenderId: "998389863314",
    appId: "1:998389863314:web:3da40aae1598c7904c674b",
    measurementId: "G-8XX0HRFBCX"
};

//var admin = require("firebase-admin");
//var serviceAccount = require("learnleaf-organizer-firebase-adminsdk-yyyj1-b1bfa59177.json");


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore();

/// Global variable to store the current userId and Firestore collections
let userId = null;
let taskCollection = null;
let subjectCollection = null;
let projectCollection = null;

// Function to set and update Firestore collections after userId is set
function setUserIdAndCollections(uid) {
    if (uid) {
        userId = uid;
        taskCollection = collection(db, 'users', userId, 'tasks');
        subjectCollection = collection(db, 'users', userId, 'subjects');
        projectCollection = collection(db, 'users', userId, 'projects');
        console.log(`User is signed in: ${userId}`);
    } else {
        userId = null;
        taskCollection = null;
        subjectCollection = null;
        projectCollection = null;
        console.log("No user is signed in.");
    }
}

// Custom function to check localStorage for user
const checkLocalStorageForUser = () => {
    const storedUserData = localStorage.getItem('user');
    return storedUserData ? JSON.parse(storedUserData) : null;
};

// Initialize userId from localStorage
const initUserFromLocalStorage = () => {
    const user = checkLocalStorageForUser();
    if (user && user.id) {
        setUserIdAndCollections(user.id);
    } else {
        console.log('No user found in localStorage.');
        setUserIdAndCollections(null);
    }
};

// Call this function instead of using Firebase auth listener directly
initUserFromLocalStorage();

// Function to handle user registration
export function registerUser(email, password, name) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            // Signed in 
            const user = userCredential.user;
            // Store the user's name in Firestore

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                email: email,
                password: password,
                timeFormat: '12h', // Initialize time format as 12 Hour
                dateFormat: 'MM/DD/YYYY', // Initialize date format as MM/DD/YYYY
                notifications: false, // Initialize notifications as Disabled
                notificationsFrequency: [true, false, false, false], //Array to store frequency preferences - [None, Weekly, Daily, None], Initialized as None
            });
        })
        .catch((error) => {
            var errorCode = error.code;
            var errorMessage = error.message;
            // Error handling, like displaying a message to the user
            alert("Error code: " + errorCode + "\n" + errorMessage);
            throw error; // Throw the error so it can be caught where the function is called
        });
}

export function resetPassword(email) {
    const auth = getAuth();
    return sendPasswordResetEmail(auth, email)
        .then(() => {
            // Password reset email sent.
            console.log('Password reset email sent.');
        })
        .catch((error) => {
            // Handle errors here
            const errorCode = error.code;
            const errorMessage = error.message;
            alert("Error code: " + errorCode + "\n" + errorMessage);
            // Optionally, throw the error to be caught by the calling code
            throw error;
        });
}

// Function to handle user login
export async function loginUser(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            // Signed in
            const user = userCredential.user;
            userId = user.uid;
            // Fetch user's details from Firestore using the db instance
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                throw new Error('User does not exist');
            }

            const userData = {
                id: user.uid,
                name: userDoc.data().name,
                email: userDoc.data().email,
                userPassword: userDoc.data().password,
                userTimeFormat: userDoc.data().timeFormat,
                dateFormat: userDoc.data().dateFormat,
                notifications: userDoc.data().notifications,
                notificationFrequency: userDoc.data().notificationsFrequency,
            }

            // Set userId and collections
            setUserIdAndCollections(user.uid);

            return userData;
        })
        .catch((error) => {
            // Error handling
            console.error("Login error", error);
            throw error; // Propagate the error
        });
}

export async function updateUserDetails(userId, userDetails) {
    const userDocRef = doc(db, "users", userId);

    try {
        await updateDoc(userDocRef, userDetails);
        console.log("User updated successfully");
    } catch (error) {
        console.error("Error updating user:", error);
    }
}

// logout out of the webpage
export async function logoutUser() {
    const successlogout = "You are logged out successfully!";
    const failedlogout = "Sorry, there was an error logging out:";
    return signOut(auth) // this removes the user's access and clears their login status.
        .then(() => {
            setUserIdAndCollections(null);
            console.log(successlogout);
        })
        .catch((error) => {
            console.error(failedlogout, error);
            throw error;
        });
}

export async function deleteUser(userId) {
    const batch = writeBatch(db);

    // Delete the user document
    const userDocRef = doc(db, "users", userId);
    batch.delete(userDocRef);

    // Commit the batch
    await batch.commit();

    // Delete the Firebase Authentication user
    const user = auth.currentUser;
    if (user && user.uid === userId) {
        await deleteFirebaseUser(user);
    }
}

// document.addEventListener('DOMContentLoaded', function () {
//     fetchTasks(user.id, null, null);
// });

// Helper function to format Firestore Timestamp to "day month, year"
export function formatDate(input) {
    if (!input) {
        return ''; // Return empty string if input is undefined, null, etc.
    }

    let date;
    if (input instanceof Date) {
        // Input is already a JavaScript Date object
        date = input;
    } else if (input.toDate && typeof input.toDate === 'function') {
        // Input is a Firestore Timestamp object
        date = input.toDate();
    } else if (typeof input === 'string' || typeof input === 'number') {
        // Input is a string or a number (timestamp), attempt to parse it
        date = new Date(input);
    } else {
        // Unsupported type, return empty string
        return '';
    }

    // Format the date to 'YYYY-MM-DD'
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // JS months are 0-indexed
    let day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`; // Return the formatted date string
}

export function formatDateDisplay(input) {
    const { user } = useUser();
    const dateFormat = user.dateFormat;

    let date = input instanceof Date ? input : input.toDate ? input.toDate() : new Date(input);
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = (date.getDate() + 1).toString().padStart(2, '0');
    let year = date.getFullYear();

    if (dateFormat === 'DD/MM/YYYY') {
        return `${day}/${month}/${year}`;
    }
    else {
        return `${month}/${day}/${year}`;
    }
}

export function formatTimeDisplay(input) {
    const { user } = useUser();
    const timeFormat = user.timeFormat;

    if (!input || typeof input !== 'string') return 'N/A'; // Handle null, undefined, or non-string input

    // Split the input string by the colon to get hours and minutes
    const [strHours, strMinutes] = input.split(':');

    // Parse the hours and minutes into numbers
    let hours = parseInt(strHours, 10);
    let minutes = parseInt(strMinutes, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Validate the hours and minutes
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) {
        console.error('Invalid time string:', input); // Log the invalid input
        return 'Invalid Time'; // The input was not a valid time string
    }

    if (timeFormat === '12h') {
        // Convert hours from 24-hour to 12-hour format for AM/PM notation
        hours = hours % 12;
        hours = hours || 12; // the hour '0' should be '12'
    }

    // Format hours and minutes with leading zeros
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    // Return the formatted time string depending on the format
    return timeFormat === '12h' ? `${formattedHours}:${formattedMinutes} ${ampm}` : `${formattedHours}:${formattedMinutes}`;
}

// Helper function to format Firestore Timestamp to "HH:MM AM/PM"
export function formatTime(input) {
    if (!input) {
        return ''; // Return empty string if input is undefined, null, etc.
    }

    let time;
    if (input instanceof Date) {
        // Input is already a JavaScript Date object
        time = input;
    } else if (input.toDate && typeof input.toDate === 'function') {
        // Input is a Firestore Timestamp object
        time = input.toDate();
    } else if (typeof input === 'string' || typeof input === 'number') {
        // Input is a string or a number (timestamp), attempt to parse it
        time = new Date(input);
    } else {
        // Unsupported type, return empty string
        return '';
    }

    // Format the time to 'HH:MM'
    let hours = time.getHours().toString().padStart(2, '0');
    let minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`; // Return the formatted time string
}

export async function fetchTasks(subject = null, project = null) {
    if (!db || !userId || !taskCollection) {
        console.error("Firestore or collections are not initialized properly.");
        return;
    }

    try {
        let tasksQuery = query(taskCollection, where('taskStatus', '!=', 'Completed'));

        // Apply filters for taskSubject and taskProject if provided
        if (subject) {
            tasksQuery = query(tasksQuery, where('taskSubject', '==', doc(db, subject)));
        }

        if (project) {
            tasksQuery = query(tasksQuery, where('taskProject', '==', doc(db, project)));
        }

        // Fetch and process tasks
        const tasksSnapshot = await getDocs(tasksQuery);

        const tasks = await Promise.all(tasksSnapshot.docs.map(async (taskDoc) => {
            const taskData = taskDoc.data();
            const taskSubjectRef = taskData.taskSubject;
            const taskProjectRef = taskData.taskProject;

            let subjectData = {};
            let projectData = {};

            if (taskSubjectRef) {
                const subjectDoc = await getDoc(taskSubjectRef);
                if (subjectDoc.exists()) {
                    subjectData = { ...subjectDoc.data(), subjectId: subjectDoc.id };
                }
                else {
                    console.error('Subject document not found:', taskSubjectRef);
                }
            }

            if (taskProjectRef) {
                const projectDoc = await getDoc(taskProjectRef);
                if (projectDoc.exists()) {
                    projectData = { ...projectDoc.data(), projectId: projectDoc.id };
                }
                else {
                    console.error('Project document not found:', taskProjectRef);
                }
            }

            return {
                ...taskData,
                taskDueDate: formatDate(taskData.taskDueDate),
                taskDueTime: formatTime(taskData.taskDueTime),
                taskStartDate: formatDate(taskData.taskStartDate),
                taskSubject: subjectData,
                taskProject: projectData,
                taskId: taskDoc.id
            };
        }));

        return tasks;

    } catch (error) {
        console.error("Error fetching tasks: ", error);
    }
}

export async function fetchAllTasks(subject = null, project = null) {
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }

    if (!userId) {
        console.error("User is not authenticated.");
        return;
    }

    if (!taskCollection) {
        console.error("Task collection is not initialized.");
        return;
    }

    try {
        // Step 1: Start with the basic tasks query
        let tasksQuery = query(
            taskCollection
        );

        // Step 2: Conditionally filter by taskSubject if a subject is provided
        if (subject) {
            tasksQuery = query(
                tasksQuery,
                where('taskSubject', '==', doc(db, subject)) // Convert subject to DocumentReference
            );
        }

        // Step 3: Conditionally filter by taskProject if a project is provided
        if (project) {
            tasksQuery = query(
                tasksQuery,
                where('taskProject', '==', doc(db, project)) // Convert project to DocumentReference
            );
        }

        // Step 4: Fetch the filtered tasks using getDocs
        const tasksSnapshot = await getDocs(tasksQuery);

        // Step 5: Process the fetched tasks
        const tasks = await Promise.all(tasksSnapshot.docs.map(async (taskDoc) => {
            const taskData = taskDoc.data();
            const taskSubjectRef = taskData.taskSubject;
            const taskProjectRef = taskData.taskProject;

            let subjectData = {};
            let projectData = {};

            if (taskSubjectRef) {
                const subjectDoc = await getDoc(taskSubjectRef);
                if (subjectDoc.exists()) {
                    subjectData = { ...subjectDoc.data(), subjectId: subjectDoc.id };
                }
                else {
                    console.error('Subject document not found:', taskSubjectRef);
                }
            }

            if (taskProjectRef) {
                const projectDoc = await getDoc(taskProjectRef);
                if (projectDoc.exists()) {
                    projectData = { ...projectDoc.data(), projectId: projectDoc.id };
                }
                else {
                    console.error('Project document not found:', taskProjectRef);
                }
            }

            return {
                ...taskData,
                taskDueDate: formatDate(taskData.taskDueDate),
                taskDueTime: formatTime(taskData.taskDueTime),
                taskStartDate: formatDate(taskData.taskStartDate),
                taskSubject: subjectData,
                taskProject: projectData,
                taskId: taskDoc.id
            };
        }));

        return tasks;

    } catch (error) {
        console.error("Error fetching tasks: ", error);
    }
}


export async function fetchArchivedTasks() {
    try {
        // Step 1: Start with the basic tasks query
        let tasksQuery = query(
            taskCollection,
            where('taskStatus', '==', 'Completed')
        );

        // Step 2: Conditionally filter by taskSubject if a subject is provided
        if (subject) {
            tasksQuery = query(
                tasksQuery,
                where('taskSubject', '==', doc(db, subject)) // Convert subject to DocumentReference
            );
        }

        // Step 3: Conditionally filter by taskProject if a project is provided
        if (project) {
            tasksQuery = query(
                tasksQuery,
                where('taskProject', '==', doc(db, project)) // Convert project to DocumentReference
            );
        }

        // Step 4: Fetch the filtered tasks
        const tasksSnapshot = await query.get();

        const archivedTasks = await Promise.all(tasksSnapshot.docs.map(async (taskDoc) => {
            const taskData = taskDoc.data();

            // Step 5: Get the project and subject information from references
            const taskProjectRef = taskData.taskProject;
            const taskSubjectRef = taskData.taskSubject;

            let projectData = {};
            let subjectData = {};

            // Step 6: Retrieve the project details if the taskProject reference exists
            if (taskProjectRef) {
                const projectDoc = await taskProjectRef.get();
                if (projectDoc.exists) {
                    const project = projectDoc.data();
                    projectData = {
                        projectName: project.projectName,
                        projectId: projectDoc.id
                    };
                }
            }

            // Step 7: Retrieve the subject details if the taskSubject reference exists
            if (taskSubjectRef) {
                const subjectDoc = await taskSubjectRef.get();
                if (subjectDoc.exists) {
                    const subject = subjectDoc.data();
                    subjectData = {
                        subjectName: subject.subjectName,
                        subjectColor: subject.subjectColor,
                        subjectId: subjectDoc.id
                    };
                }
            }

            // Step 8: Combine task, project, and subject data
            return {
                taskDescription: taskData.taskDescription,
                taskDueDate: formatDate(taskData.taskDueDate),
                taskDueTime: formatTime(taskData.taskDueTime),
                taskName: taskData.taskName,
                taskPriority: taskData.taskPriority,
                taskProject: projectData,
                taskStartDate: formatDate(taskData.taskStartDate),
                taskStatus: taskData.taskStatus,
                taskSubject: subjectData,
                taskId: taskDoc.id
            };
        }));

        return archivedTasks;

    } catch (error) {
        console.error("Error fetching tasks: ", error);
    }
}

// Function to create a new task
export async function addTask(taskDetails) {
    const { taskSubject, taskProject, taskName, taskDescription, taskPriority, taskStatus, startDateInput, dueDateInput, dueTimeInput } = taskDetails;
    const taskId = `${Date.now()}_${userId}`;  // Generate a unique task ID

    let subjectData = {};
    let projectData = {};

    // Create references to the task's subject and project
    const taskSubjectRef = typeof taskSubject === 'string'
        ? (taskSubject === 'None' ? doc(db, 'noneSubject', 'None') : doc(subjectCollection, taskSubject))
        : (taskSubject.subjectId === 'None' ? doc(db, 'noneSubject', 'None') : doc(subjectCollection, taskSubject.subjectId));

    // Handle taskProject as string or object
    const taskProjectRef = typeof taskProject === 'string'
        ? (taskProject === 'None' ? doc(db, 'noneProject', 'None') : doc(projectCollection, taskProject))
        : (taskProject.projectId === 'None' ? doc(db, 'noneProject', 'None') : doc(projectCollection, taskProject.projectId));

    if (taskSubjectRef) {
        const subjectDoc = await getDoc(taskSubjectRef);
        if (subjectDoc.exists()) {
            subjectData = { ...subjectDoc.data(), subjectId: subjectDoc.id };
        }
        else {
            console.error('Subject document not found:', taskSubjectRef);
        }
    }

    if (taskProjectRef) {
        const projectDoc = await getDoc(taskProjectRef);
        if (projectDoc.exists()) {
            projectData = { ...projectDoc.data(), projectId: projectDoc.id };
        }
        else {
            console.error('Project document not found:', taskProjectRef);
        }
    }

    // Initialize task data
    const taskData = {
        taskSubject: taskSubjectRef,  // Store the reference to the subject
        taskProject: taskProjectRef,  // Store the reference to the project
        taskName,
        taskDescription,
        taskPriority,
        taskStatus,
    };

    // Conditionally add dates and times if provided
    if (startDateInput) {
        taskData.taskStartDate = Timestamp.fromDate(new Date(startDateInput + "T00:00:00"));
    }

    if (dueDateInput) {
        taskData.taskDueDate = Timestamp.fromDate(new Date(dueDateInput + "T00:00:00"));
    }

    if (dueTimeInput) {
        const dateTimeString = dueDateInput + "T" + dueTimeInput + ":00";
        taskData.taskDueTime = Timestamp.fromDate(new Date(dateTimeString));
    }

    const addedTask = {
        ...taskData,
        taskDueDate: formatDate(taskData.taskDueDate),
        taskDueTime: formatTime(taskData.taskDueTime),
        taskStartDate: formatDate(taskData.taskStartDate),
        taskSubject: subjectData,
        taskProject: projectData,
        taskId: taskId
    };

    const taskRef = doc(taskCollection, taskId);

    try {
        await setDoc(taskRef, taskData);  // Add the task to Firestore
        console.log("Task added successfully");
    } catch (error) {
        console.error("Error adding task:", error);
    }

    return addedTask;
}

export async function editTask(taskDetails) {
    console.log('editing: ', taskDetails);
    const { taskId, taskSubject, taskProject, taskName, taskDescription, taskPriority, taskStatus, taskStartDate, taskDueDate, taskDueTime } = taskDetails;

    let subjectData = {};
    let projectData = {};

    // Create references to the task's subject and project
    const taskSubjectRef = typeof taskSubject === 'string'
        ? (taskSubject === 'None' ? doc(db, 'noneSubject', 'None') : doc(subjectCollection, taskSubject))
        : (taskSubject.subjectId === 'None' ? doc(db, 'noneSubject', 'None') : doc(subjectCollection, taskSubject.subjectId));


    // Handle taskProject as string or object
    const taskProjectRef = typeof taskProject === 'string'
        ? (taskProject === 'None' ? doc(db, 'noneProject', 'None') : doc(projectCollection, taskProject))
        : (taskProject.projectId === 'None' ? doc(db, 'noneProject', 'None') : doc(projectCollection, taskProject.projectId));

    if (taskSubjectRef) {
        const subjectDoc = await getDoc(taskSubjectRef);
        if (subjectDoc.exists()) {
            subjectData = { ...subjectDoc.data(), subjectId: subjectDoc.id };
        }
        else {
            console.error('Subject document not found:', taskSubjectRef);
        }
    }

    if (taskProjectRef) {
        const projectDoc = await getDoc(taskProjectRef);
        if (projectDoc.exists()) {
            projectData = { ...projectDoc.data(), projectId: projectDoc.id };
        }
        else {
            console.error('Project document not found:', taskProjectRef);
        }
    }

    // Initialize task data
    const taskData = {
        taskSubject: taskSubjectRef,  // Store the reference to the subject
        taskProject: taskProjectRef,  // Store the reference to the project
        taskName,
        taskDescription,
        taskPriority,
        taskStatus,
    };

    // Handle optional fields (start date, due date, time)
    if (taskStartDate) {
        taskData.taskStartDate = Timestamp.fromDate(new Date(taskStartDate + "T00:00:00"));
    } else {
        taskData.taskStartDate = deleteField();  // Remove the field if empty
    }

    if (taskDueDate) {
        taskData.taskDueDate = Timestamp.fromDate(new Date(taskDueDate + "T00:00:00"));
    } else {
        taskData.taskDueDate = deleteField();  // Remove the field if empty
    }

    if (taskDueTime && taskDueDate) {
        const dateTimeString = taskDueDate + "T" + taskDueTime + ":00";
        taskData.taskDueTime = Timestamp.fromDate(new Date(dateTimeString));
    } else {
        taskData.taskDueTime = deleteField();  // Remove if empty
    }

    // Update the task document in Firestore
    const taskRef = doc(taskCollection, taskId);

    const editedTask = {
        ...taskData,
        taskDueDate: formatDate(taskData.taskDueDate),
        taskDueTime: formatTime(taskData.taskDueTime),
        taskStartDate: formatDate(taskData.taskStartDate),
        taskSubject: subjectData,
        taskProject: projectData,
        taskId: taskId
    };
    try {
        await updateDoc(taskRef, taskData);
        console.log("Task updated successfully", editedTask);
        return editedTask;
    } catch (error) {
        console.error("Error updating task:", error);
    }


};

export async function deleteTask(taskId) {
    const taskRef = doc(taskCollection, taskId);

    try {
        await deleteDoc(taskRef); // Delete the document
        console.log("Task deleted successfully");
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

export async function fetchSubjects(subjectId = null) {
    // Ensure the Firestore instance and userId are initialized before running the query
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }

    if (!userId) {
        console.error("User is not authenticated.");
        return;
    }

    if (!subjectCollection) {
        console.error("Subject collection is not initialized.");
        return;
    }

    try {
        // Step 1: Start with the basic subjects query
        let subjectsQuery = query(
            subjectCollection,
            where("subjectStatus", "==", "Active") // Default query for active subjects
        );

        // Step 2: Conditionally filter by subjectId if provided
        if (subjectId) {
            subjectsQuery = query(
                subjectCollection,
                where("__name__", "==", subjectId) // Filter by the specific subject ID
            );
        }

        // Step 3: Fetch the filtered subjects using getDocs
        const querySnapshot = await getDocs(subjectsQuery);

        // Step 4: Process the fetched subjects
        const subjects = await Promise.all(querySnapshot.docs.map(async (subjectDoc) => {
            const subjectData = subjectDoc.data();

            // Step 5: Combine subject data
            return {
                subjectId: subjectDoc.id,
                subjectName: subjectData.subjectName,
                subjectColor: subjectData.subjectColor,
                subjectStatus: subjectData.subjectStatus,
                subjectSemester: subjectData.subjectSemester,
                subjectDescription: subjectData.subjectDescription
            };
        }));

        return subjects;

    } catch (error) {
        console.error("Error fetching subjects: ", error);
    }
}

export async function addSubject({ subjectName, subjectDescription, subjectSemester, subjectColor }) {
    const subjectId = `${Date.now()}_${userId}`;

    const subjectData = {
        subjectName,
        subjectSemester,
        subjectDescription,
        subjectStatus: 'Active', // Assuming new subjects are active by default
        subjectColor,
    };

    // console.log("Attmepting to add: ", subjectData);

    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await setDoc(subjectRef, subjectData);
        console.log("Subject added successfully");
        return subjectId;
    } catch (error) {
        console.error("Error adding subject:", error);
    }
}

export async function editSubject(subjectDetails) {
    const { subjectId, subjectName, subjectSemester, subjectDescription, subjectColor, subjectStatus } = subjectDetails;

    if (!subjectId) {
        throw new Error("subjectId is undefined, cannot update subject");
    }

    // Initialize subjectData with fields that are always present
    const subjectData = {
        subjectName,
        subjectDescription,
        subjectSemester,
        subjectColor,
        subjectStatus,
    };

    // Create a reference to the subject document
    const subjectRef = doc(subjectCollection, subjectId);

    // Use updateDoc to update the task document
    try {
        await updateDoc(subjectRef, subjectData);
        console.log("Subject updated successfully");
    } catch (error) {
        console.error("Error updating subject:", error);
    }
};

export async function archiveSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Update the status field of the subject to 'Archived'
        await updateDoc(subjectRef, {
            subjectStatus: 'Archived'
        });

        console.log("Subject archived successfully");
    } catch (error) {
        console.error("Error archiving subject:", error);
    }
}

export async function fetchArchivedSubjects() {
    // Ensure Firestore instance and userId are initialized
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }

    if (!userId) {
        console.error("User is not authenticated.");
        return;
    }

    if (!subjectCollection) {
        console.error("Subject collection is not initialized.");
        return;
    }

    try {
        // Step 1: Query to fetch only archived subjects
        const archivedSubjectsQuery = query(
            subjectCollection,
            where("subjectStatus", "==", "Archived"),
            orderBy("subjectName", "asc") // Sort by subject name
        );

        // Step 2: Fetch the archived subjects
        const querySnapshot = await getDocs(archivedSubjectsQuery);

        // Step 3: Process the fetched archived subjects
        const archivedSubjects = await Promise.all(querySnapshot.docs.map(async (subjectDoc) => {
            const subjectData = subjectDoc.data();

            // Step 4: Combine subject data
            return {
                subjectId: subjectDoc.id,
                subjectName: subjectData.subjectName,
                subjectColor: subjectData.subjectColor,
                subjectStatus: subjectData.subjectStatus,
                subjectSemester: subjectData.subjectSemester,
                subjectDescription: subjectData.subjectDescription
            };
        }));

        return archivedSubjects;

    } catch (error) {
        console.error("Error fetching archived subjects: ", error);
    }
}

export async function reactivateSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Update the status field of the subject to 'Active'
        await updateDoc(subjectRef, {
            subjectStatus: 'Active'
        });
        console.log("Subject reactivated successfully");
    } catch (error) {
        console.error("Error reactivating subject:", error);
    }
}

// Function to delete a subject
export async function deleteSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await deleteDoc(subjectRef); // Delete the document
        console.log("Subject deleted successfully");
    } catch (error) {
        console.error("Error deleting subject:", error);
    }
}


export async function fetchProjects(projectId = null) {
    if (!db || !userId || !projectCollection) {
        console.error("Firestore or collections are not initialized properly.");
        return;
    }

    try {
        let projectsQuery;

        if (projectId) {
            projectsQuery = query(projectCollection, where("__name__", "==", projectId));
        } else {
            projectsQuery = query(projectCollection, where("projectStatus", "==", "Active"));
        }

        const querySnapshot = await getDocs(projectsQuery);

        const projectsWithDetails = await Promise.all(querySnapshot.docs.map(async (projectDoc) => {
            const projectData = projectDoc.data();

            // Resolve subjects within the project
            const projectSubjects = projectData.projectSubjects || [];
            const subjectsPromises = projectSubjects.map(async (subjectRef) => {
                const subjectDoc = await getDoc(subjectRef);
                if (subjectDoc.exists()) {
                    return { ...subjectDoc.data(), subjectId: subjectDoc.id };
                }
                return null;
            });

            const subjects = await Promise.all(subjectsPromises);

            // Fetch tasks for this project
            const tasksAll = await fetchAllTasks(null, `users/${userId}/projects/${projectDoc.id}`);
            const tasksShow = await fetchTasks(null, `users/${userId}/projects/${projectDoc.id}`);

            // Count statuses and find the next task
            const statusCounts = tasksAll.reduce((acc, task) => {
                acc[task.taskStatus] = (acc[task.taskStatus] || 0) + 1;
                return acc;
            }, {});

            const nextTask = tasksShow.sort((a, b) => new Date(a.taskDueDate) - new Date(b.taskDueDate))[0];

            return {
                ...projectData,
                projectId: projectDoc.id,
                subjects: subjects.filter(s => s !== null),
                nextTaskName: nextTask?.taskName,
                nextTaskDueDate: nextTask?.taskDueDate,
                nextTaskDueTime: nextTask?.taskDueTime,
                statusCounts
            };
        }));

        return projectsWithDetails;

    } catch (error) {
        console.error("Error fetching projects: ", error);
    }
}

export async function addProject({ projectDueDateInput, projectDueTimeInput, projectName, projectDescription, projectSubjects }) {

    // projectSubjects is an array of references, already in the format users/${userId}/subjects/${subjectId} or noneSubjects/None

    const projectId = `${Date.now()}_${userId}`;  // Generate a unique project ID

    const projectData = {
        projectName,
        projectDescription,
        projectSubjects,
        projectStatus: 'Active',
    };

    // Conditionally add dates and times if provided
    if (projectDueDateInput) {
        projectData.projectDueDate = Timestamp.fromDate(new Date(projectDueDateInput + "T00:00:00"));
    }

    if (projectDueTimeInput) {
        const dateTimeString = projectDueDateInput + "T" + projectDueTimeInput + ":00";
        projectData.projectDueTime = Timestamp.fromDate(new Date(dateTimeString));
    }

    // Step 3: Create a reference to the new project document
    const projectRef = doc(projectCollection, projectId);

    try {
        // Step 4: Write the project data to Firestore
        await setDoc(projectRef, projectData);
        console.log("Project added successfully");
        return projectId;
    } catch (error) {
        console.error("Error adding project:", error);
    }
}

export async function editProject(projectDetails) {
    const { projectId, projectName, projectDueDateInput, projectDueTimeInput, projectStatus, projectSubjects } = projectDetails;

    if (!projectId) {
        throw new Error("projectId is undefined, cannot update project");
    }

    // Initialize projectData with fields that are always present
    const projectData = {
        projectName,
        projectStatus,
        projectSubjects,
    };

    // Conditionally add dates and times if provided
    if (projectDueDateInput) {
        projectData.projectDueDate = Timestamp.fromDate(new Date(projectDueDateInput + "T00:00:00"));
    }

    if (projectDueTimeInput) {
        const dateTimeString = projectDueDateInput + "T" + projectDueTimeInput + ":00";
        projectData.projectDueTime = Timestamp.fromDate(new Date(dateTimeString));
    }

    // Create a reference to the project document
    const projectRef = doc(projectCollection, projectId);

    // Use updateDoc to update the project document
    try {
        await updateDoc(projectRef, projectData);
        console.log("Project updated successfully");
    } catch (error) {
        console.error("Error updating project:", error);
    }
};

export async function archiveProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        // Update the status field of the project to 'Archived'
        await updateDoc(projectRef, {
            projectStatus: 'Archived'
        });
        console.log("Project archived successfully");
    } catch (error) {
        console.error("Error archiving project:", error);
    }
}

export async function fetchArchivedProjects(projectId = null) {
    // Ensure Firestore instance and userId are initialized
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }

    if (!userId) {
        console.error("User is not authenticated.");
        return;
    }

    if (!projectCollection) {
        console.error("Project collection is not initialized.");
        return;
    }

    try {
        // Step 1: Start with the basic project query
        let projectsQuery;

        if (projectId) {
            // Query for a specific project by ID
            projectsQuery = query(
                projectCollection,
                where("__name__", "==", projectId)
            );
        } else {
            // Query for all active projects
            projectsQuery = query(
                projectCollection,
                where("projectStatus", "==", "Archived")
            );
        }

        // Step 2: Fetch the projects using getDocs
        const querySnapshot = await getDocs(projectsQuery);

        // Step 3: Process the fetched projects
        const projectsWithDetails = await Promise.all(querySnapshot.docs.map(async (projectDoc) => {
            const projectData = projectDoc.data();

            // Step 4: Retrieve the subjects for each project
            const projectSubjects = projectData.projectSubjects || [];
            const subjectsPromises = projectSubjects.map(async (subjectRef) => {
                const subjectDoc = await getDoc(subjectRef);
                if (subjectDoc.exists()) {
                    const subjectData = subjectDoc.data();
                    return {
                        subjectName: subjectData.subjectName,
                        subjectId: subjectDoc.id,
                    };
                }
                return null;
            });

            const subjects = await Promise.all(subjectsPromises);

            // Step 5: Fetch tasks for the project
            const projectDocId = projectDoc.id;
            const projectPath = `users/${userId}/projects/${projectDocId}`;
            const tasksAll = await fetchAllTasks(null, projectPath); // Fetches all tasks for the project
            const tasksShow = await fetchTasks(null, projectPath); // Fetches active tasks for the project

            // Step 6: Count the statuses
            const statusCounts = tasksAll.reduce((acc, task) => {
                acc[task.taskStatus] = (acc[task.taskStatus] || 0) + 1;
                return acc;
            }, {});

            // Step 7: Find the next upcoming task (closest due date)
            const sortedTasks = tasksShow.sort((a, b) => new Date(a.taskDueDate) - new Date(b.taskDueDate));
            const nextTask = sortedTasks[0]; // Task with the closest due date

            // Step 8: Combine project, tasks, and subjects data
            return {
                ...projectData,
                projectId: projectDoc.id,
                projectDueDate: formatDate(projectData.projectDueDate),
                projectDueTime: formatTime(projectData.projectDueTime),
                nextTaskName: nextTask?.taskName,
                nextTaskDueDate: nextTask?.taskDueDate,
                nextTaskDueTime: nextTask?.taskDueTime,
                statusCounts: {
                    Completed: statusCounts['Completed'] || 0,
                    InProgress: statusCounts['In Progress'] || 0,
                    NotStarted: statusCounts['Not Started'] || 0,
                },
                subjects: subjects.filter(subject => subject !== null), // Only include valid subjects
            };
        }));

        // Step 9: Sort projects by due date, placing those without a due date at the end
        projectsWithDetails.sort((a, b) => {
            // Convert date strings to Date objects for comparison
            const dateA = a.projectDueDate ? new Date(a.projectDueDate) : new Date('9999-12-31');
            const dateB = b.projectDueDate ? new Date(b.projectDueDate) : new Date('9999-12-31');

            // Compare by dueDate first
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;

            // If due dates are the same, compare due times
            const timeA = a.projectDueTime ? a.projectDueTime : '23:59';
            const timeB = b.projectDueTime ? b.projectDueTime : '23:59';

            if (timeA < timeB) return -1;
            if (timeA > timeB) return 1;

            // If both due dates and times are the same, sort by project name
            return a.projectName.localeCompare(b.projectName);
        });

        return projectsWithDetails;

    } catch (error) {
        console.error("Error fetching projects: ", error);
    }
}

export async function reactivateProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        // Update the status field of the subject to 'Active'
        await updateDoc(projectRef, {
            projectStatus: 'Active'
        });
        console.log("project reactivated successfully");
    } catch (error) {
        console.error("Error reactivating project:", error);
    }
}

export async function deleteProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        await deleteDoc(projectRef); // Delete the document
        console.log("Project deleted successfully");
    } catch (error) {
        console.error("Error deleting project:", error);
    }
}
