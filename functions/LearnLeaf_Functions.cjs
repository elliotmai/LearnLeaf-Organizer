const admin = require("firebase-admin");

// Initialize Firebase Admin (Ensures only one instance)
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

function getCentralOffsetHours(date = new Date()) {
    // Get the timezone offset for America/Chicago in minutes
    const centralTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        timeZoneName: 'short',
    }).formatToParts(date);

    const tzAbbr = centralTime.find(part => part.type === 'timeZoneName')?.value;

    // CDT (Central Daylight Time) = UTC-5
    // CST (Central Standard Time) = UTC-6
    if (tzAbbr === 'CDT') return 5;
    if (tzAbbr === 'CST') return 6;

    // Fallback
    return 6;
}

/**
 * Adds a new task to Firestore and updates IndexedDB with the task details.
 *
 * @param {Object} taskDetails - The details of the task to be added.
 * @returns {Promise<Object>} - The added task data.
 */
async function addTask(taskDetails, userId) {
    // console.log('Adding task:', taskDetails);
    const taskId = taskDetails.taskLMSDetails?.LMS_UID || `${Date.now()}`;
    const taskCollection = firestore.collection(`users/${userId}/tasks`);

    const taskSubjectRef = taskDetails.taskSubject
        ? (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
            ? firestore.doc(`users/${userId}/subjects/${taskDetails.taskSubject}`)
            : firestore.doc("noneSubject/None"))
        : firestore.doc("noneSubject/None");

    const taskProjectRef = taskDetails.taskProject
        ? (typeof taskDetails.taskProject === 'string' && taskDetails.taskProject !== 'None'
            ? firestore.doc(`users/${userId}/projects/${taskDetails.taskProject}`)
            : firestore.doc("noneProject/None"))
        : firestore.doc("noneProject/None");


    const taskData = {
        taskSubject: taskSubjectRef,
        taskProject: taskProjectRef,
        taskName: taskDetails.taskName,
        taskDescription: taskDetails.taskDescription,
        taskPriority: taskDetails.taskPriority,
        taskStatus: taskDetails.taskStatus,
        taskLMSDetails: taskDetails.taskLMSDetails || [],
    };

    // Convert dueDateInput + dueTimeInput to a proper JS Date
    if (taskDetails.dueDateInput) {
        const [year, month, day] = taskDetails.dueDateInput.split('-').map(Number);
        const [hours, minutes] = taskDetails.dueTimeInput
            ? taskDetails.dueTimeInput.split(':').map(Number)
            : [23, 59];

        const date = new Date(year, month - 1, day, hours, minutes);

        // Adjust the time zone offset to match Central Time (CDT is UTC-5)
        if (hours == 23 && minutes == 59) {
            const offsetInHours = getCentralOffsetHours(); // or 6 if not daylight saving
            console.log("Offset: ", offsetInHours);
            date.setHours(date.getHours() + offsetInHours);
        }

        console.log("🔥 LOCAL DATE (what we made):", date.toString());
        console.log("🔥 UTC ISO (Firestore will store):", date.toISOString());
        taskData.taskDueDate = Timestamp.fromDate(date);
        taskData.taskDueTime = Timestamp.fromDate(date);
    }

    const taskRef = taskCollection.doc(taskId);

    try {
        await taskRef.set(taskData, { merge: true });
    } catch (error) {
        console.error("Error adding task:", error);
    }

}

/**
 * Edits an existing task in Firestore and updates IndexedDB.
 *
 * @param {Object} taskDetails - The details of the task to be updated.
 * @returns {Promise<Object>} - The updated task data.
 */
async function editTask(taskDetails, userId) {
    console.log('Editing task:', [taskDetails.taskDueDate, taskDetails.taskDueTime]);
    const taskId = taskDetails.taskId;
    const taskCollection = firestore.collection(`users/${userId}/tasks`);

    // Resolve the subject reference
    const taskSubjectRef =
        taskDetails.taskSubject instanceof admin.firestore.DocumentReference
            ? taskDetails.taskSubject
            : (typeof taskDetails.taskSubject === 'string' && taskDetails.taskSubject !== 'None'
                ? firestore.doc(`users/${userId}/subjects/${taskDetails.taskSubject}`)
                : firestore.doc("noneSubject/None"));

    const taskProjectRef =
        taskDetails.taskProject instanceof admin.firestore.DocumentReference
            ? taskDetails.taskProject
            : (typeof taskDetails.taskProject === 'string' && taskDetails.taskProject !== 'None'
                ? firestore.doc(`users/${userId}/projects/${taskDetails.taskProject}`)
                : firestore.doc("noneProject/None"));

    const taskData = {
        taskSubject: taskSubjectRef,
        taskProject: taskProjectRef,
        taskName: taskDetails.taskName,
        taskDescription: taskDetails.taskDescription,
        taskPriority: taskDetails.taskPriority,
        taskStatus: taskDetails.taskStatus,
    };

    // Handle due date and time
    if (taskDetails.taskDueDate) {
        const [year, month, day] = taskDetails.taskDueDate.split('-').map(Number);
        const [hours, minutes] = taskDetails.taskDueTime
            ? taskDetails.taskDueTime.split(':').map(Number)
            : [23, 59];

        const date = new Date(year, month - 1, day, hours, minutes);

        // Adjust the time zone offset to match Central Time (CDT is UTC-5)
        if (hours == 23 && minutes == 59) {
            const offsetInHours = getCentralOffsetHours(); // or 6 if not daylight saving
            console.log("Offset: ", offsetInHours);
            date.setHours(date.getHours() + offsetInHours);
        }

        console.log("🔥 LOCAL DATE (what we made):", date.toString());
        console.log("🔥 UTC ISO (Firestore will store):", date.toISOString());
        taskData.taskDueDate = Timestamp.fromDate(date);
        taskData.taskDueTime = Timestamp.fromDate(date);
    }

    const taskRef = taskCollection.doc(taskId);

    try {
        await taskRef.update(taskData);
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

/**
 * Adds a new subject to Firestore and updates IndexedDB.
 *
 * @param {Object} subjectDetails - The details of the subject to add.
 * @returns {Promise<Object>} - The added subject data.
 */
async function addSubject(subjectDetails, userId) {
    const subjectId = subjectDetails.subjectLMSDetails?.LMS_UID || `${Date.now()}`;
    const subjectCollection = firestore.collection(`users/${userId}/subjects`);

    const subjectData = {
        subjectName: subjectDetails.subjectName,
        subjectStatus: subjectDetails.subjectStatus || "Active",
        subjectSemester: subjectDetails.subjectSemester || "",
        subjectColor: subjectDetails.subjectColor || "black",
        subjectLMSDetails: subjectDetails.subjectLMSDetails || [],
    };

    const subjectRef = subjectCollection.doc(subjectId);

    try {
        // Save to Firestore and IndexedDB
        await subjectRef.set(subjectData, { merge: true });
        return { ...subjectData, subjectId };
    } catch (error) {
        console.error("Error adding subject:", error);
    }
}

module.exports = { addTask, addSubject, editTask };