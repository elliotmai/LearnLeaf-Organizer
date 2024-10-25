// @flow
import { saveToStore, getFromStore, getAllFromStore, deleteFromStore } from './db.js';
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
        console.log(`User is signed in: ${userId}`);
    } else {
        userId = null;
        taskCollection = null;
        subjectCollection = null;
        projectCollection = null;
        console.log("No user is signed in.");
    }
}

// Initialize userId from localStorage
const initUserFromLocalStorage = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        setUserIdAndCollections(user.id);
    } else {
        console.log('No user found in localStorage.');
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
    const resolvedProjects = projects.map(project => {
        // Map over projectSubjects and find the subject object in the passed subjects array
        const resolvedSubjects = project.projectSubjects
            .map(subjectId => subjects.find(subject => subject.subjectId === subjectId))
            .filter(subject => subject !== null); // Filter out any nulls if a reference isn't found

        // Assign the resolved subjects to projectSubjects
        project.projectSubjects = resolvedSubjects;

        return project;
    });

    return resolvedProjects;
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
        console.error('Unsupported date type:', input);
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
        console.error('Unsupported time type:', input);
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
            
            const formattedDueDate = data.taskDueDate ? formatDate(data.taskDueDate) : null;
            const formattedDueTime = data.taskDueTime ? formatTime(data.taskDueTime) : null;
            const formattedStartDate = data.taskStartDate ? formatDate(data.taskStartDate) : null;

            return {
                taskId: doc.id,
                ...data,
                taskDueDate: formattedDueDate,
                taskDueTime: formattedDueTime,
                taskStartDate: formattedStartDate,
            };
        });        

        // Fetch all projects
        const projectsSnapshot = await getDocs(projectCollection);
        const projects = projectsSnapshot.docs.map(doc => {
            const data = doc.data();

            return { 
                projectId: doc.id, 
                projectDueDate: data.projectDueDate ? formatDate(data.projectDueDate) : null,
                projectDueTime: data.projectDueTime ? formatDate(data.projectDueTime) : null,
                ...data};
            });

        // Fetch all subjects
        const subjectsSnapshot = await getDocs(subjectCollection);
        const subjects = subjectsSnapshot.docs.map(doc => ({ subjectId: doc.id, ...doc.data() }));

        const resolvedTasks = await resolveTaskReferences(tasks, subjects, projects);
        const resolvedProjects = await resolveProjectReferences(projects, subjects);

        console.log('tasks:', resolvedTasks,'projects:',resolvedProjects, 'subjects:', subjects);

        // Save to IndexedDB
        await saveToStore('tasks', resolvedTasks);
        await saveToStore('projects', resolvedProjects);
        await saveToStore('subjects', subjects);

        console.log('Data saved to IndexedDB');

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
            console.log('Tasks, projects, and subjects saved to Indexedfirestore');
            
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
            console.log('Password reset email sent.');
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
                deleteFromStore('tasks', userId),
                deleteFromStore('projects', userId),
                deleteFromStore('subjects', userId)
            ]);
            console.log("You are logged out successfully!");
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
        console.log("User updated successfully");
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

    console.log("User deleted successfully");
}

// Task functions: addTask, editTask, deleteTask

export async function addTask(taskDetails) {
    const { taskSubject, taskProject, taskName, taskDescription, taskPriority, taskStatus, startDateInput, dueDateInput, dueTimeInput } = taskDetails;
    const taskId = `${Date.now()}_${userId}`;
    
    const taskData = {
        taskSubject: doc(subjectCollection, taskSubject.subjectId),
        taskProject: doc(projectCollection, taskProject.projectId),
        taskName,
        taskDescription,
        taskPriority,
        taskStatus,
        taskStartDate: startDateInput ? Timestamp.fromDate(new Date(startDateInput)) : null,
        taskDueDate: dueDateInput ? Timestamp.fromDate(new Date(dueDateInput)) : null,
        taskDueTime: dueTimeInput ? Timestamp.fromDate(new Date(dueDateInput + "T" + dueTimeInput)) : null
    };

    const taskRef = doc(taskCollection, taskId);

    try {
        await setDoc(taskRef, taskData);
        await saveToStore('tasks', [{ ...taskData, taskId }]);
        console.log("Task added successfully");
    } catch (error) {
        console.error("Error adding task:", error);
    }

    return { ...taskData, taskId };
}

export async function editTask(taskDetails) {
    const { taskId, taskSubject, taskProject, taskName, taskDescription, taskPriority, taskStatus, taskStartDate, taskDueDate, taskDueTime } = taskDetails;

    const taskData = {
        taskSubject: doc(subjectCollection, taskSubject.subjectId),
        taskProject: doc(projectCollection, taskProject.projectId),
        taskName,
        taskDescription,
        taskPriority,
        taskStatus,
        taskStartDate: taskStartDate ? Timestamp.fromDate(new Date(taskStartDate)) : deleteField(),
        taskDueDate: taskDueDate ? Timestamp.fromDate(new Date(taskDueDate)) : deleteField(),
        taskDueTime: taskDueTime ? Timestamp.fromDate(new Date(taskDueDate + "T" + taskDueTime)) : deleteField()
    };

    const taskRef = doc(taskCollection, taskId);

    try {
        await updateDoc(taskRef, taskData);
        await saveToStore('tasks', [{ ...taskData, taskId }]);
        console.log("Task updated successfully");
    } catch (error) {
        console.error("Error updating task:", error);
    }

    return { ...taskData, taskId };
}

export async function deleteTask(taskId) {
    const taskRef = doc(taskCollection, taskId);
    try {
        await deleteDoc(taskRef);
        await deleteFromStore('tasks', taskId);
        console.log("Task deleted successfully");
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// Subject Functions: addSubject, editSubject, deleteSubject, archiveSubject, reactivateSubject

export async function addSubject({ subjectName, subjectDescription, subjectSemester, subjectColor }) {
    const subjectId = `${Date.now()}_${userId}`;
    const subjectData = { subjectName, subjectSemester, subjectDescription, subjectStatus: 'Active', subjectColor };

    try {
        await setDoc(doc(subjectCollection, subjectId), subjectData);
        await saveToStore('subjects', [{ ...subjectData, subjectId }]);
        console.log("Subject added successfully");
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
        console.log("Subject updated successfully");
    } catch (error) {
        console.error("Error updating subject:", error);
    }
}

export async function deleteSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await deleteDoc(subjectRef);
        await deleteFromStore('subjects', subjectId);
        console.log("Subject deleted successfully");
    } catch (error) {
        console.error("Error deleting subject:", error);
    }
}

export async function archiveSubject(subjectId) {
    const subjectRef = doc(subjectCollection, subjectId);

    try {
        await updateDoc(subjectRef, { subjectStatus: 'Archived' });

        const tasksSnapshot = await getDocs(query(taskCollection, where('taskSubject', '==', subjectRef)));

        const batch = writeBatch(firestore);
        tasksSnapshot.forEach(taskDoc => batch.update(doc(taskCollection, taskDoc.id), { taskStatus: 'Completed' }));
        await batch.commit();

        const storedTasks = await getAllFromStore('tasks');
        const updatedTasks = storedTasks.map(task => task.taskSubject.subjectId === subjectId ? { ...task, taskStatus: 'Completed' } : task);
        await saveToStore('tasks', updatedTasks);

        const storedSubjects = await getAllFromStore('subjects');
        const updatedSubjects = storedSubjects.map(subject => subject.subjectId === subjectId ? { ...subject, subjectStatus: 'Archived' } : subject);
        await saveToStore('subjects', updatedSubjects);

        console.log("Subject archived successfully");
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

        console.log("Subject reactivated successfully");
    } catch (error) {
        console.error("Error reactivating subject:", error);
    }
}

// Project Functions: addProject, editProject, deleteProject, archiveProject, reactivateProject

export async function addProject({ projectDueDateInput, projectDueTimeInput, projectName, projectDescription, projectSubjects }) {
    const projectId = `${Date.now()}_${userId}`;
    const projectData = { projectName, projectDescription, projectSubjects, projectStatus: 'Active' };

    if (projectDueDateInput) projectData.projectDueDate = Timestamp.fromDate(new Date(projectDueDateInput));
    if (projectDueTimeInput) projectData.projectDueTime = Timestamp.fromDate(new Date(projectDueDateInput + "T" + projectDueTimeInput));

    try {
        await setDoc(doc(projectCollection, projectId), projectData);
        await saveToStore('projects', [{ ...projectData, projectId }]);
        console.log("Project added successfully");
        return { ...projectData, projectId };
    } catch (error) {
        console.error("Error adding project:", error);
    }
}

export async function editProject(projectDetails) {
    const { projectId, projectName, projectDueDateInput, projectDueTimeInput, projectStatus, projectSubjects } = projectDetails;

    const projectData = { projectName, projectStatus, projectSubjects };

    if (projectDueDateInput) projectData.projectDueDate = Timestamp.fromDate(new Date(projectDueDateInput));
    if (projectDueTimeInput) projectData.projectDueTime = Timestamp.fromDate(new Date(projectDueDateInput + "T" + projectDueTimeInput));

    try {
        await updateDoc(doc(projectCollection, projectId), projectData);
        await saveToStore('projects', [{ ...projectData, projectId }]);
        console.log("Project updated successfully");
    } catch (error) {
        console.error("Error updating project:", error);
    }
}

export async function deleteProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        await deleteDoc(projectRef);
        await deleteFromStore('projects', projectId);
        console.log("Project deleted successfully");
    } catch (error) {
        console.error("Error deleting project:", error);
    }
}

export async function archiveProject(projectId) {
    const projectRef = doc(projectCollection, projectId);

    try {
        await updateDoc(projectRef, { projectStatus: 'Archived' });

        const tasksSnapshot = await getDocs(query(taskCollection, where('taskProject', '==', projectRef)));

        const batch = writeBatch(firestore);
        tasksSnapshot.forEach(taskDoc => batch.update(doc(taskCollection, taskDoc.id), { taskStatus: 'Completed' }));
        await batch.commit();

        const storedTasks = await getAllFromStore('tasks');
        const updatedTasks = storedTasks.map(task => task.taskProject.projectId === projectId ? { ...task, taskStatus: 'Completed' } : task);
        await saveToStore('tasks', updatedTasks);

        const storedProjects = await getAllFromStore('projects');
        const updatedProjects = storedProjects.map(project => project.projectId === projectId ? { ...project, projectStatus: 'Archived' } : project);
        await saveToStore('projects', updatedProjects);

        console.log("Project archived successfully");
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

        console.log("Project reactivated successfully");
    } catch (error) {
        console.error("Error reactivating project:", error);
    }
}
