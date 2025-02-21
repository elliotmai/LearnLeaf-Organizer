const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();
const axios = require('axios');
const ICAL = require('ical.js');

const { addTask, addSubject, editTask } = require("./LearnLeaf_Functions.cjs");

// Initialize Firebase Admin (Ensures only one instance)
if (!admin.apps.length) {
    admin.initializeApp();
}

if (process.env.FUNCTIONS_EMULATOR) {
    const functionsConfig = require('./.runtimeconfig.json');
    process.env.SENDGRID_KEY = functionsConfig.sendgrid.key;
}

// console.log("Firebase Config SendGrid Key:", functions.config().sendgrid?.key);
sgMail.setApiKey(functions.config().sendgrid.key);


// Query tasks due before or on the end date and where status != 'Completed'
async function queryTasks(userId, endDate) {
    console.log('Querying tasks');
    const userDocRef = admin.firestore().collection('users').doc(userId);
    const tasksRef = userDocRef.collection('tasks');

    let tasks = [];
    const taskQuerySnapshot = await tasksRef
        .where('taskDueDate', '<=', endDate)
        .where('taskStatus', '!=', 'Completed')
        .get();

    console.log(`Returned ${taskQuerySnapshot} for user ${userId}`);

    for (const doc of taskQuerySnapshot.docs) {
        const task = doc.data();

        // Fetch and populate subject and project information if available
        if (task.taskSubject) {
            const subjectDoc = await userDocRef.collection(`users/${userId}/subjects`).doc(task.taskSubject.id).get();
            task.taskSubject = subjectDoc.exists ? subjectDoc.data().subjectName : 'None';
        }
        if (task.taskProject) {
            const projectDoc = await userDocRef.collection(`users/${userId}/projects`).doc(task.taskProject.id).get();
            task.taskProject = projectDoc.exists ? projectDoc.data().projectName : 'None';
        }

        tasks.push(task);
    }

    console.log('userId:', userId, '\nTasks:', tasks);
    return tasks;
}

// Helper function to create a notification document in the 'notifications' collection and return its ID
async function createNotificationDocument(userId, userEmail, tasks, notificationType) {
    const notificationsRef = admin.firestore().collection('notifications');

    // Prepare tasks map for the document
    const tasksMap = tasks.reduce((acc, task, index) => {
        const taskArray = [
            task.taskSubject || 'None',
            task.taskName,
            task.taskDueDate.toDate().toLocaleDateString('en-US', {
                timeZone: 'America/Chicago',
            }),
            task.taskProject || 'None',
        ];
        acc[index + 1] = taskArray;
        return acc;
    }, {});

    const notificationData = {
        userId: userId,
        userEmail: userEmail,
        tasks: tasksMap,
        notificationTime: admin.firestore.Timestamp.now(),
        notificationType: notificationType
    };

    const notificationDoc = await notificationsRef.add(notificationData);
    console.log(`Notification document ${notificationDoc.id} created for ${userEmail}`);
    return notificationDoc.id;
}

// Function to send notification emails by pulling data from the 'notifications' collection
async function sendNotificationEmailFromNotificationDoc(notificationDocId, notificationType) {
    const notificationsRef = admin.firestore().collection('notifications');
    const notificationDoc = await notificationsRef.doc(notificationDocId).get();

    if (!notificationDoc.exists) {
        console.error(`Notification document with ID ${notificationDocId} does not exist.`);
        return;
    }

    const notificationData = notificationDoc.data();
    const { userEmail, tasks } = notificationData;

    let formattedTasks;
    if (Object.keys(tasks).length === 0 && (notificationType === 'Weekly' || notificationType === 'Daily')) {
        formattedTasks = "Nothing due, great job!";
    } else {
        formattedTasks = Object.keys(tasks).map(taskIndex => {
            const task = tasks[taskIndex];
            let taskLines = [];
            taskLines.push(`Task Name: ${task[1]}`);
            if (task[0] && task[0] !== "None") {
                taskLines.push(`Subject: ${task[0]}`);
            }
            if (task[3] && task[3] !== "None") {
                taskLines.push(`Project: ${task[3]}`);
            }
            taskLines.push(`Due Date: ${task[2]}`);
            return taskLines.join('<br>');
        }).join('<br><br>');
    }

    const msg = {
        to: userEmail,
        from: 'learnleaforganizer@gmail.com',
        templateId: 'd-09f88e35060d476ba8ea14133c788db7',
        dynamic_template_data: {
            tasks: formattedTasks,
            subject: `${notificationType} Reminder of Upcoming Tasks`
        }
    };

    sgMail
        .send(msg)
        .then(() => {
            console.log(`Email successfully sent to ${userEmail}`);
        })
        .catch((error) => {
            console.error(`Error sending email to ${userEmail}:`, error);
        });
}

// Function to handle notifications based on priority (Weekly > Daily > Urgent)
exports.sendNotifications = functions.pubsub.schedule('0 8 * * *').timeZone('America/Chicago').onRun(async (context) => {
    console.log('sendNotifications function triggered');
    const usersRef = admin.firestore().collection('users');
    const now = admin.firestore.Timestamp.now();
    const tomorrow = admin.firestore.Timestamp.fromDate(new Date(now.toDate().setDate(now.toDate().getDate() + 1)));
    const nextWeek = admin.firestore.Timestamp.fromDate(new Date(now.toDate().setDate(now.toDate().getDate() + 7)));

    console.log('Querying users with notifications enabled...');
    const usersSnapshot = await usersRef.where('notifications', '==', true).get();

    console.log(`Users found with notifications enabled: ${usersSnapshot.size}`);

    if (usersSnapshot.empty) {
        console.log('No users with notifications enabled.');
        return;
    }

    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        console.log(`User Data: ${JSON.stringify(userData)}`);
        const userEmail = userData.email;
        const notificationsFrequency = userData.notificationsFrequency;

        let tasks = [];
        let notificationType = '';

        if (notificationsFrequency[1] && new Date().getDay() === 1) {
            tasks = await queryTasks(userId, nextWeek);
            notificationType = 'Weekly';
        } else if (notificationsFrequency[2]) {
            tasks = await queryTasks(userId, tomorrow);
            notificationType = 'Daily';
        } else if (notificationsFrequency[3]) {
            tasks = await queryTasks(userId, now);
            notificationType = 'Urgent';
        }

        if (notificationType === 'Urgent' && tasks.length === 0) {
            console.log(`No urgent tasks for ${userEmail}, skipping email.`);
            continue;
        }

        const notificationDocId = await createNotificationDocument(userId, userEmail, tasks, notificationType);
        await sendNotificationEmailFromNotificationDoc(notificationDocId, notificationType);
    }
});

exports.fetchAndProcessCanvasData = functions.pubsub
    .schedule('every 60 minutes')
    .timeZone('America/Chicago')
    .onRun(async (context) => {
        const flaskServer = 'https://learnleaf-organizer.onrender.com/fetch_ical';
        const firestore = admin.firestore();

        const usersSnapshot = await firestore.collection('users').get();

        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();

            if (!userData.icsURLs || !userData.icsURLs.Canvas) {
                // console.log(`No Canvas iCal URLs found for user ${userId}, skipping.`);
                continue;
            }
            // console.log(`Processing Canvas iCal URLs for user ${userId}`);


            for (const [name, url] of Object.entries(userData.icsURLs.Canvas)) {
                try {
                    // console.log(`Fetching iCal for ${name} (User ${userId}) from ${url}`);

                    const response = await axios.get(`${flaskServer}?ical_url=${encodeURIComponent(url)}`);
                    const icalData = response.data;

                    if (!icalData) {
                        console.warn(`No iCal data received for ${name} (User ${userId}).`);
                        continue;
                    }

                    // console.log(`Fetched iCal Data (Snippet) for ${name} (User ${userId}):`, icalData.slice(0, 50));

                    await processICalData(userId, icalData, firestore);

                } catch (error) {
                    console.error(`Error fetching iCal for ${name} (User ${userId}):`, error);
                }
            }
        }
    });

async function processICalData(userId, icalData, firestore) {
    const jcal = ICAL.parse(icalData);
    const component = new ICAL.Component(jcal);
    const vevents = component.getAllSubcomponents('vevent');

    const tasks = [];
    const edits = [];
    const subjects = new Set();

    async function processTask(task, tasks) {
        let existingTask = null;
    
        const taskRef = firestore.doc(`users/${userId}/tasks/${task.taskLMSDetails.LMS_UID}`);
        const taskDoc = await taskRef.get();
    
        if (taskDoc.exists) {
            existingTask = { taskId: taskDoc.id, ...taskDoc.data() };
    
            console.log(`Editing existing task: ${task.taskName} (User ${userId})`);
            const editingTask = {
                ...existingTask,
                taskDueDate: task.dueDateInput,
                taskDueTime: task.dueTimeInput
            };
            await editTask(editingTask, userId);
            edits.push(editingTask);
        } else {
            console.log(`Adding new task: ${task.taskName} (User ${userId})`);
            await addTask(task, userId);
            tasks.push(task);
        }
    }    

    await Promise.all(vevents.map(async (vevent) => {
        const event = new ICAL.Event(vevent);

        if (!event.summary) {
            console.warn("Skipping event without a summary:", event);
            return;
        }

        const summary = event.summary || '';
        const [taskName, subjectName] = summary.split(' [');
        const subjectCleaned = subjectName ? subjectName.replace(']', '') : 'None';

        function formatDescription(description) {
            description = description.replace(/\[[^\[\]]*?\.\w{2,4}\]/g, '');
            description = description.replace(/\(\s*https?:\/\/[^\s()]+?\s*\)/g, '');
            return description;
        }

        const startDate = event.startDate.toJSDate();
        const formattedDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

        const hasTime = !event.startDate.isDate;
        let formattedTime = hasTime
            ? `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
            : "23:59";

        if (formattedTime === "00:00") {
            formattedTime = "23:59";
        }

        const task = {
            taskName: taskName.trim(),
            taskDescription: event.description ? formatDescription(event.description) : "",
            dueDateInput: formattedDate,
            dueTimeInput: formattedTime,
            taskLMSDetails: {
                LMS: "Canvas",
                LMS_UID: event.uid,
            },
            taskPriority: "Medium",
            taskStatus: "Not Started",
            taskSubject: subjectCleaned,
        };

        const subject = {
            subjectName: subjectCleaned,
            subjectLMSDetails: {
                LMS: "Canvas",
                LMS_UID: subjectCleaned,
            },
            subjectStatus: "Active",
            subjectSemester: "",
            subjectColor: "black",
            subjectDescription: ""
        };

        // Ensure `existingSubject` is reinitialized for each subject
        let existingSubject = null;

        const subjectRef = firestore.doc(`users/${userId}/subjects/${subject.subjectLMSDetails.LMS_UID}`);
        const subjectDoc = await subjectRef.get();

        if (subjectDoc.exists) {
            existingSubject = { subjectId: subjectDoc.id, ...subjectDoc.data() };
        }

        if (!existingSubject) {
            await addSubject(subject, userId);
            subjects.add(subjectCleaned);
            await processTask(task, tasks);
        } else if (existingSubject.subjectStatus !== "Blocked") {
            await processTask(task, tasks);
        } else {
        }
    }));

    // Log result only after all tasks and subjects are processed
    console.log("Number of subjects added:", subjects.size, "\nNumber of tasks added:", tasks.length, "\nNumber of edits made:", edits.length);
}

exports.processICalFromPopup = functions.https.onCall(async (data, context) => {
    const { userId, icalUrl } = data;

    if (!userId || !icalUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID and iCal URL are required.');
    }

    const flaskServer = 'https://learnleaf-organizer.onrender.com/fetch_ical';
    const firestore = admin.firestore();

    try {
        // console.log(`Fetching iCal for user ${userId} from ${icalUrl}`);

        // Fetch the iCal data from the Flask backend
        const response = await axios.get(`${flaskServer}?ical_url=${encodeURIComponent(icalUrl)}`);
        const icalData = response.data;

        if (!icalData) {
            throw new functions.https.HttpsError('not-found', 'No iCal data received.');
        }

        // console.log(`Fetched iCal Data for user ${userId}:`, icalData.slice(0, 500));

        await processICalData(userId, icalData, firestore);

        return { success: true, message: "iCal data processed successfully." };

    } catch (error) {
        console.error(`Error processing iCal for user ${userId}:`, error);
        throw new functions.https.HttpsError('internal', `Failed to process iCal: ${error.message}`);
    }
});

exports.keepRenderAlive = functions.pubsub
    .schedule('every 5 minutes')  // Runs every 5 minutes
    .timeZone('America/Chicago')
    .onRun(async (context) => {
        const flaskServer = 'https://learnleaf-organizer.onrender.com/fetch_ical'; // Your Render backend

        try {
            await axios.get(`${flaskServer}?ical_url=dummy`);
            console.log("Pinged Render server to keep it alive.");
        } catch (error) {
            console.error("Error pinging Render server:", error);
        }
    });
