const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
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
            const subjectDoc = await userDocRef.collection('subjects').doc(task.taskSubject.id).get();
            task.taskSubject = subjectDoc.exists ? subjectDoc.data().subjectName : 'None';
        }
        if (task.taskProject) {
            const projectDoc = await userDocRef.collection('projects').doc(task.taskProject.id).get();
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
