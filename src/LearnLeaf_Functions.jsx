// @flow
import { saveToStore, getFromStore, getAllFromStore, deleteFromStore, clearStore, TASKS_STORE, SUBJECTS_STORE, PROJECTS_STORE } from './db.js';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser as deleteFirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, where, query, Timestamp, deleteDoc, deleteField, updateDoc, writeBatch } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { useUser } from '/src/UserState.jsx';

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const firestore = getFirestore();

/// Global variable to store the current userId and Firestore collections
let userId = null;
let taskCollection = null;
let subjectCollection = null;
let projectCollection = null;

// Function to set and update Firestore collections after userId is set
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

// Initialize userId from localStorage
const initUserFromLocalStorage = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        setUserIdAndCollections(user.id);
    } else {
        console.error('No user found in localStorage.');
        setUserIdAndCollections(null);
    }
};

// Call this function instead of using Firebase auth listener directly
initUserFromLocalStorage();

// Function to fetch and resolve task references
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

// Function to resolve subject references in projects using the passed-in subjects array
async function resolveProjectReferences(projects, subjects) {
    return projects.map(project => {

        const resolvedSubjects = project.projectSubjects.map(projectSubject => {
            // Find the matching subject in the subjects array
            const subject = subjects.find(sub => sub.subjectId === projectSubject.id);

            // Return the subject object if found, or null if not found
            return subject ? { ...subject } : null;
        }).filter(subject => subject !== null); // Filter out any unresolved references

        return {
            ...project,
            projectSubjects: resolvedSubjects // Add resolved subjects array to the project
        };
    });
}

// Formatting functions for date and time
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

export function formatDateDisplay(input, dateFormat) {

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

export function formatTimeDisplay(input, timeFormat) {

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

export async function fetchAllData() {
    try {
        // Fetch all tasks
        const tasksSnapshot = await getDocs(taskCollection);
        const tasks = tasksSnapshot.docs.map(doc => {
            const data = doc.data();

            const formattedDueDate = data.taskDueDate ? formatDate(data.taskDueDate) : '';
            const formattedDueTime = data.taskDueTime ? formatTime(data.taskDueTime) : '';
            const formattedStartDate = data.taskStartDate ? formatDate(data.taskStartDate) : '';

            return {
                taskId: doc.id,
                ...data,
                taskDueDate: formattedDueDate,
                taskDueTime: formattedDueTime,
                taskStartDate: formattedStartDate,
                taskProject: data.taskProject.id,
                taskSubject: data.taskSubject.id
            };
        });

        // Fetch all projects
        const projectsSnapshot = await getDocs(projectCollection);
        const projects = projectsSnapshot.docs.map(doc => {
            const data = doc.data();
            const projectSubjects = data.projectSubjects ? data.projectSubjects.map(subject => subject.id) : []; // Extracts only the ids

            return {
                projectId: doc.id,
                ...data,
                projectDueDate: data.projectDueDate ? formatDate(data.projectDueDate) : null,
                projectDueTime: data.projectDueTime ? formatTime(data.projectDueTime) : null,
                projectSubjects // Sets projectSubjects to be an array of subject ids
            };
        });

        // Fetch all subjects
        const subjectsSnapshot = await getDocs(subjectCollection);
        const subjects = subjectsSnapshot.docs.map(doc => ({ subjectId: doc.id, ...doc.data() }));

        // Fetch the 'None' project document from the noneProject collection
        const noneProjectDoc = await getDoc(doc(firestore, 'noneProject', 'None'));
        const noneProject = {
            projectId: noneProjectDoc.id,
            ...noneProjectDoc.data()
        };
        projects.push(noneProject); // Add the 'None' project to projects

        // Fetch the 'None' subject document from the noneSubject collection
        const noneSubjectDoc = await getDoc(doc(firestore, 'noneSubject', 'None'));
        const noneSubject = {
            subjectId: noneSubjectDoc.id,
            ...noneSubjectDoc.data()
        };
        subjects.push(noneSubject); // Add the 'None' subject to subjects

        // const resolvedProjects = await resolveProjectReferences(projects, subjects);

        // const resolvedTasks = await resolveTaskReferences(tasks, subjects, resolvedProjects);

        // Save to IndexedDB
        await saveToStore('subjects', subjects);
        await saveToStore('projects', projects);
        await saveToStore('tasks', tasks);

        return { tasks, projects, subjects };
    } catch (error) {
        console.error("Error fetching data from Firestore:", error);
        throw error;
    }
}

// Function to handle user registration
export function registerUser(email, password, name) {
    return createUserWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            await setDoc(doc(firestore, "users", user.uid), {
                name: name,
                email: email,
                timeFormat: '12h',
                dateFormat: 'MM/DD/YYYY',
                notifications: false,
                notificationsFrequency: [true, false, false, false],
            });
        })
        .catch((error) => {
            alert("Error code: " + error.code + "\n" + error.message);
            throw error;
        });
}

export async function loginUser(email, password) {
    setUserIdAndCollections(null);
    await Promise.all([
        localStorage.clear(),
        clearStore(TASKS_STORE),
        clearStore(SUBJECTS_STORE),
        clearStore(PROJECTS_STORE)

    ]);

    return signInWithEmailAndPassword(auth, email, password)
        .then(async (userCredential) => {
            const user = userCredential.user;
            const userId = user.uid;

            // Fetch user document from Firestore
            const userDoc = await getDoc(doc(firestore, "users", userId));
            if (!userDoc.exists()) {
                throw new Error('User does not exist');
            }

            // Prepare and save user data to localStorage
            const userData = {
                id: userId,
                name: userDoc.data().name,
                email: userDoc.data().email,
                userTimeFormat: userDoc.data().timeFormat,
                dateFormat: userDoc.data().dateFormat,
                notifications: userDoc.data().notifications,
                notificationFrequency: userDoc.data().notificationFrequency,
            };
            localStorage.setItem('user', JSON.stringify(userData)); // Store user in localStorage

            // Initialize collections in Indexedfirestore
            setUserIdAndCollections(userId);

            // Fetch and store additional data (tasks, projects, subjects) in Indexedfirestore
            const data = await fetchAllData();

            return { ...userData, ...data }; // Return combined user and data
        })
        .catch((error) => {
            console.error("Login error", error);
            throw error;
        });
}

export function resetPassword(email) {
    const auth = getAuth();
    return sendPasswordResetEmail(auth, email)
        .then(() => {
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            alert("Error code: " + errorCode + "\n" + errorMessage);
            throw error;
        });
}


export async function logoutUser() {
    return signOut(auth)
        .then(async () => {
            setUserIdAndCollections(null);
            await Promise.all([
                localStorage.clear(),
                clearStore(TASKS_STORE),
                clearStore(SUBJECTS_STORE),
                clearStore(PROJECTS_STORE)

            ]);
        })
        .catch((error) => {
            console.error("Sorry, there was an error logging out:", error);
            throw error;
        });
}

export async function updateUserDetails(userId, userDetails) {
    const userDocRef = doc(firestore, "users", userId);

    try {
        await updateDoc(userDocRef, userDetails);
        localStorage.setItem('user', JSON.stringify({ userId, userDetails }));
        fetchAllData();
    } catch (error) {
        console.error("Error updating user:", error);
    }
}

export async function deleteUser(userId) {
    const batch = writeBatch(firestore);

    // Delete the user document
    const userDocRef = doc(firestore, "users", userId);
    batch.delete(userDocRef);

    // Commit the batch
    await batch.commit();

    // Delete the Firebase Authentication user
    const user = auth.currentUser;
    if (user && user.uid === userId) {
        await deleteFirebaseUser(user);
    }

    // Clear the local storage and Indexedfirestore after successful user deletion
    localStorage.clear();
    await Promise.all([
        deleteFromStore('tasks', userId),
        deleteFromStore('projects', userId),
        deleteFromStore('subjects', userId)
    ]);

}

// Task functions: addTask, editTask, deleteTask

export async function addTask(taskDetails) {

    const taskId = `${Date.now()}`;

    console.log(taskDetails);

    const taskSubjectRef = taskDetails.taskSubject
        ? (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
            ? doc(subjectCollection, taskDetails.taskSubject)
            : taskDetails.taskSubject?.subjectId
                ? doc(subjectCollection, taskDetails.taskSubject.subjectId)
                : doc(firestore, "noneSubject", "None"))
        : doc(firestore, "noneSubject", "None");

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

    // Helper function to create a date object with exact local time components
    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds); // month - 1 due to JS Date 0-indexed months
    }

    // Set start and due dates exactly as provided
    if (taskDetails.startDateInput) {
        const startDate = createLocalDate(taskDetails.startDateInput, 0, 0, 0, 0); // 00:00:00 local time
        taskData.taskStartDate = Timestamp.fromDate(startDate);
    }

    if (taskDetails.dueDateInput) {
        const dueDate = createLocalDate(taskDetails.dueDateInput, 23, 59, 59, 999); // 23:59:59 local time
        taskData.taskDueDate = Timestamp.fromDate(dueDate);
    }

    // If both dueDateInput and dueTimeInput are provided, set due time
    if (taskDetails.dueDateInput && taskDetails.dueTimeInput) {
        const [hours, minutes] = taskDetails.dueTimeInput.split(':').map(Number);
        const dueDateTime = createLocalDate(taskDetails.dueDateInput, hours, minutes, 0, 0); // Set to specified due time in local time
        taskData.taskDueTime = Timestamp.fromDate(dueDateTime);
    }

    const taskRef = doc(taskCollection, taskId);

    // Update local IndexedDB task data with full subject and project details
    const localTaskData = {
        ...taskData,
        taskId: taskId,
        taskDueDate: taskDetails?.dueDateInput || '',
        taskDueTime: taskDetails?.dueTimeInput || '',
        taskStartDate: taskDetails?.startDateInput || '',
        taskSubject: taskData.taskSubject.id,
        taskProject: taskData.taskProject.id
    };

    try {

        console.log(taskData);
        await setDoc(taskRef, taskData);

        // Save updated task data to IndexedDB
        await saveToStore('tasks', [localTaskData]);
    } catch (error) {
        console.error("Error adding task:", error);
    }

    return localTaskData;
}

export async function editTask(taskDetails) {
    const taskId = taskDetails.taskId;

    console.log(taskDetails);

    // Determine if taskSubject and taskProject are objects or strings, then create Firestore references
    const taskSubjectRef = taskDetails.taskSubject
        ? (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
            ? doc(subjectCollection, taskDetails.taskSubject)
            : taskDetails.taskSubject?.subjectId
                ? doc(subjectCollection, taskDetails.taskSubject.subjectId)
                : doc(firestore, "noneSubject", "None"))
        : doc(firestore, "noneSubject", "None");

    const taskProjectRef = taskDetails.taskProject
        ? (typeof taskDetails.taskProject === 'string' && taskDetails.taskProject !== 'None'
            ? doc(projectCollection, taskDetails.taskProject)
            : taskDetails.taskProject?.projectId
                ? doc(projectCollection, taskDetails.taskProject.projectId)
                : doc(firestore, "noneProject", "None"))
        : doc(firestore, "noneProject", "None");

    // Prepare the Firestore update data
    const taskData = {
        taskSubject: taskSubjectRef,
        taskProject: taskProjectRef,
        taskName: taskDetails.taskName,
        taskDescription: taskDetails.taskDescription,
        taskPriority: taskDetails.taskPriority,
        taskStatus: taskDetails.taskStatus,
    };

    // Helper function to create a date object with exact local time components
    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds, milliseconds); // month - 1 due to JS Date 0-indexed months
    }

    // Set start and due dates exactly as provided
    if (taskDetails.taskStartDate) {
        const startDate = createLocalDate(taskDetails.taskStartDate, 0, 0, 0, 100); // 00:00:00 local time
        taskData.taskStartDate = Timestamp.fromDate(startDate);
    }
    else {
        taskData.taskStartDate = null;
    }

    if (taskDetails.taskDueDate) {
        const dueDate = createLocalDate(taskDetails.taskDueDate, 23, 59, 59, 900); // 23:59:59 local time
        taskData.taskDueDate = Timestamp.fromDate(dueDate);
    }
    else {
        taskData.taskDueDate = null;
    }

    // If both dueDateInput and dueTimeInput are provided, set due time
    if (taskDetails.taskDueDate && taskDetails.taskDueTime) {
        const [hours, minutes] = taskDetails.taskDueTime.split(':').map(Number);
        const dueDateTime = createLocalDate(taskDetails.taskDueDate, hours, minutes, 0, 0); // Set to specified due time in local time
        taskData.taskDueTime = Timestamp.fromDate(dueDateTime);
    }
    else {
        taskData.taskDueTime = null;
    }

    const taskRef = doc(taskCollection, taskId);

    try {

        console.log(taskData);
        // Update Firestore
        await updateDoc(taskRef, taskData);

        // Update local IndexedDB task data with full subject and project details
        const localTaskData = {
            ...taskData,
            taskId,
            taskDueDate: taskDetails.taskDueDate,
            taskDueTime: taskDetails.taskDueTime,
            taskStartDate: taskDetails.taskStartDate,
            taskSubject: taskData.taskSubject.id,
            taskProject: taskData.taskProject.id
        };

        // Save updated task data to IndexedDB
        await saveToStore('tasks', [localTaskData]);
        return localTaskData;
    } catch (error) {
        console.error("Error updating task:", error);
    }


}

export async function deleteTask(taskId) {
    const taskRef = doc(taskCollection, taskId);
    try {
        await deleteDoc(taskRef);
        await deleteFromStore('tasks', taskId);
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

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
};

// Subject Functions: addSubject, editSubject, deleteSubject, archiveSubject, reactivateSubject

export async function addSubject({ subjectName, subjectDescription, subjectSemester, subjectColor }) {
    const subjectId = `${Date.now()}`;
    const subjectData = { subjectName, subjectSemester, subjectDescription, subjectStatus: 'Active', subjectColor };

    try {
        await setDoc(doc(subjectCollection, subjectId), subjectData);
        await saveToStore('subjects', [{ ...subjectData, subjectId }]);
        return { ...subjectData, subjectId };
    } catch (error) {
        console.error("Error adding subject:", error);
    }
}

export async function editSubject(subjectDetails) {
    const { subjectId, subjectName, subjectSemester, subjectDescription, subjectColor, subjectStatus } = subjectDetails;

    const subjectData = { subjectName, subjectSemester, subjectDescription, subjectColor, subjectStatus };

    try {
        await updateDoc(doc(subjectCollection, subjectId), subjectData);
        await saveToStore('subjects', [{ ...subjectData, subjectId }]);
    } catch (error) {
        console.error("Error updating subject:", error);
    }
}

export async function deleteSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        // Delete the subject from Firebase and IndexedDB
        await deleteDoc(subjectRef);
        await deleteFromStore('subjects', subjectId);

        // Fetch all tasks and update those with the deleted subject
        // Fetch all tasks
        const allTasks = (await getAllFromStore('tasks')).filter(task => task.taskSubject === subjectId);

        // Update each task that references this subject
        for (const task of allTasks) {
            // Change taskSubject to 'None'
            task.taskSubject = 'None';
            await editTask(task); // Call editTask with updated task
        }

        // Fetch all projects and update those containing the deleted subject
        const allProjects = await getAllFromStore('projects');

        const updatedProjects = [];
        for (const project of allProjects) {
            if (project.projectSubjects.includes(subjectId)) {
                const updatedProject = { ...project };

                // If project has more than one subject, remove the specific subjectId
                if (project.projectSubjects.length > 1) {
                    updatedProject.projectSubjects = project.projectSubjects.filter(subj => subj !== subjectId);
                } else {
                    updatedProject.projectSubjects = ['None']; // Set to 'None' if it was the only subject
                }

                await editProject(updatedProject); // Call editProject to update in Firebase and IndexedDB
            }
        }

    } catch (error) {
        console.error("Error deleting subject or updating tasks and projects:", error);
    }
}

export async function archiveSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await updateDoc(subjectRef, { subjectStatus: 'Archived' });

        const storedSubjects = await getAllFromStore('subjects');
        const updatedSubjects = storedSubjects.map(subject => subject.subjectId === subjectId ? { ...subject, subjectStatus: 'Archived' } : subject);
        await saveToStore('subjects', updatedSubjects);

    } catch (error) {
        console.error("Error archiving subject:", error);
    }
}

export async function reactivateSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await updateDoc(subjectRef, { subjectStatus: 'Active' });

        const storedSubjects = await getAllFromStore('subjects');
        const updatedSubjects = storedSubjects.map(subject => subject.subjectId === subjectId ? { ...subject, subjectStatus: 'Active' } : subject);
        await saveToStore('subjects', updatedSubjects);

    } catch (error) {
        console.error("Error reactivating subject:", error);
    }
}

export function sortSubjects(subjects) {
    return subjects.sort((a, b) => {
        return a.subjectName.localeCompare(b.subjectName);
    });
};

// Project Functions: addProject, editProject, deleteProject, archiveProject, reactivateProject

export async function addProject({ projectDueDateInput, projectDueTimeInput, projectName, projectDescription, projectSubjects }) {

    const projectId = `${Date.now()}`;
    const projectData = {
        projectName,
        projectDescription,
        projectStatus: 'Active'
    };

    const subjectRefs = projectSubjects.map((subjId) => doc(subjectCollection, subjId));

    projectData.projectSubjects = subjectRefs;

    if (projectDueDateInput) {
        projectData.projectDueDate = Timestamp.fromDate(new Date(`${projectDueDateInput}T23:59:59.999`));
    }
    if (projectDueTimeInput) {
        projectData.projectDueTime = Timestamp.fromDate(new Date(`${projectDueDateInput}T${projectDueTimeInput}`));
    }

    // Create localProjectData with only subject IDs
    const localProjectData = {
        ...projectData,
        projectId: projectId,
        projectSubjects: projectSubjects, // Just the IDs for local storage
        projectDueDate: formatDate(projectData.projectDueDate),
        projectDueTime: formatTime(projectData.projectDueTime)
    };

    try {
        // Save projectData to Firebase with references
        await setDoc(doc(projectCollection, projectId), projectData);
        // Save localProjectData to IndexedDB with only IDs (passed as array)
        await saveToStore('projects', [localProjectData]);
        return localProjectData;
    } catch (error) {
        console.error("Error adding project:", error);
    }
}

export async function editProject(projectDetails) {
    console.log(projectDetails);


    // Convert subject IDs to Firebase Document References
    const subjectRefs = projectDetails.projectSubjects.map(subject => {
        const subjectId = typeof subject === 'string' ? subject : subject?.subjectId;
        return doc(subjectCollection, subjectId);
    }).filter(ref => ref);

    const subjectIds = subjectRefs.map(subject => subject.id);

    // Prepare data for Firebase with subject references
    const projectData = {
        projectName: projectDetails.projectName,
        projectStatus: projectDetails.projectStatus,
        projectDescription: projectDetails.projectDescription,
        projectSubjects: subjectRefs
    };

    // Prepare data for IndexedDB with only subject IDs
    const localProjectData = {
        projectId: projectDetails.projectId,
        projectName: projectDetails.projectName,
        projectStatus: projectDetails.projectStatus,
        projectDescription: projectDetails.projectDescription,
        projectSubjects: subjectIds,
        projectDueDate: projectDetails.projectDueDate || '',
        projectDueTime: projectDetails.projectDueTime || ''
    };

    // Conditionally add or remove due date and time from Firebase data
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

    try {
        // Save project data with references to Firebase, deleting fields if necessary
        await updateDoc(doc(projectCollection, projectDetails.projectId), projectData);

        // Save project data with IDs only to IndexedDB
        await saveToStore('projects', [localProjectData]);
        console.log("Project updated successfully");
        return localProjectData;
    } catch (error) {
        console.error("Error updating project:", error);
    }
}


export async function deleteProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        // Fetch all tasks
        const allTasks = (await getAllFromStore('tasks')).filter(task => task.taskProject === projectId);

        // Update each task that references this project
        for (const task of allTasks) {
            // Change taskProject to 'None'
            task.taskProject = 'None';
            await editTask(task); // Call editTask with updated task
        }

        // Delete the project from Firestore and IndexedDB
        await deleteDoc(projectRef);
        await deleteFromStore('projects', projectId);
    } catch (error) {
        console.error("Error deleting project:", error);
    }
}

export async function archiveProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        await updateDoc(projectRef, { projectStatus: 'Archived' });

        const storedProjects = await getAllFromStore('projects');
        const updatedProjects = storedProjects.map(project => project.projectId === projectId ? { ...project, projectStatus: 'Archived' } : project);
        await saveToStore('projects', updatedProjects);

    } catch (error) {
        console.error("Error archiving project:", error);
    }
}

export async function reactivateProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        await updateDoc(projectRef, { projectStatus: 'Active' });

        const storedProjects = await getAllFromStore('projects');
        const updatedProjects = storedProjects.map(project => project.projectId === projectId ? { ...project, projectStatus: 'Active' } : project);
        await saveToStore('projects', updatedProjects);

    } catch (error) {
        console.error("Error reactivating project:", error);
    }
}

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