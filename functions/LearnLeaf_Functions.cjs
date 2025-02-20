const admin = require("firebase-admin");

// Initialize Firebase Admin (Ensures only one instance)
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();
const Timestamp = admin.firestore.Timestamp;


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

    // Helper function to create a local date object
    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        let date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));

        // Only adjust if the time is exactly 23:59 (UTC conversion issue)
        if (hours === 23 && minutes === 59) {
            date.setUTCHours(date.getUTCHours() + 6); // Convert to UTC-6 manually
        }

        return date;
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

    function createLocalDate(dateString, hours, minutes, seconds, milliseconds) {
        const [year, month, day] = dateString.split('-').map(Number);
        let date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds));

        // Only adjust if the time is exactly 23:59 (UTC conversion issue)
        if (hours === 23 && minutes === 59) {
            date.setUTCHours(date.getUTCHours() + 6); // Convert to UTC-6 manually
        }

        return date;
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