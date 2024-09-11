const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

// Initialize Firebase Admin
admin.initializeApp();

// Set SendGrid API key from environment variable
sgMail.setApiKey(functions.config().sendgrid.key);  // Make sure the API key is stored as an environment variable in Firebase

// Query tasks due before or on the end date and where status != 'Completed'
async function queryTasks(userId, endDate) {
    const tasksRef = admin.firestore().collection('tasks');
    
    let tasks = [];
    await tasksRef
        .where('userId', '==', userId)
        .where('dueDate', '<=', endDate)
        .where('status', '!=', 'Completed')  // Filter out completed tasks
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const task = doc.data();
                if (task.dueDate) {
                    tasks.push(task);
                }
            });
        }).catch(error => {
            console.error('Error querying tasks:', error);
        });

    return tasks;
}

// Helper function to create a notification document in the 'notifications' collection and return its ID
async function createNotificationDocument(userId, userEmail, tasks, notificationType) {
    const notificationsRef = admin.firestore().collection('notifications');
    
    // Prepare tasks map for the document
    const tasksMap = tasks.reduce((acc, task, index) => {
        const taskArray = [
            task.subject,
            task.assignment,
            task.dueDate.toDate().toLocaleDateString('en-US', {
                timeZone: 'America/Chicago',
            }),
        ];
        acc[index + 1] = taskArray;  // Store each task as an array in the map
        return acc;
    }, {});

    // Create the notification document
    const notificationData = {
        userId: userId,
        userEmail: userEmail,
        tasks: tasksMap,  // Store the tasks map
        notificationTime: admin.firestore.Timestamp.now(),
        notificationType: notificationType  // Include the notificationType field
    };

    // Add the document to the 'notifications' collection and return the document ID
    const notificationDoc = await notificationsRef.add(notificationData);
    console.log(`Notification document created for user: ${userEmail}`);
    return notificationDoc.id;  // Return the document ID
}

// Function to send notification emails by pulling data from the 'notifications' collection
async function sendNotificationEmailFromNotificationDoc(notificationDocId, tasks, notificationType) {
    const notificationsRef = admin.firestore().collection('notifications');
    const notificationDoc = await notificationsRef.doc(notificationDocId).get();
    
    if (!notificationDoc.exists) {
        console.error(`Notification document with ID ${notificationDocId} does not exist.`);
        return;
    }

    const notificationData = notificationDoc.data();
    const { userEmail } = notificationData;

    let formattedTasks;
    // Check if there are tasks; if not, show "Nothing due, great job!"
    if (tasks.length === 0 && (notificationType === 'Weekly' || notificationType === 'Daily')) {
        formattedTasks = "Nothing due, great job!";
    } else {
        // Prepare tasks in HTML format
        formattedTasks = Object.keys(tasks).map(taskIndex => {
            const task = tasks[taskIndex];  // Retrieve the task array [subject, assignment, dueDate]
            return `Subject: ${task[0]}<br>Assignment: ${task[1]}<br>Due Date: ${task[2]}`;
        }).join('<br><br>');  // Double <br> between tasks
    }

    // Create the SendGrid email payload
    const msg = {
        to: userEmail,
        from: 'learnleaforganizer@gmail.com',  // Ensure this email is verified in your SendGrid account
        templateId: 'd-09f88e35060d476ba8ea14133c788db7',  // Your SendGrid dynamic template ID
        dynamic_template_data: {
            tasks: formattedTasks,  // Pass dynamic task data with <br> tags
            subject: `${notificationType} Reminder of Upcoming Tasks`
        }
    };

    // Send the email using SendGrid API
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

    console.log(`Found ${usersSnapshot.size} users with notifications enabled.`);
    
    usersSnapshot.forEach(async userDoc => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userEmail = userData.email;
        const notificationsFrequency = userData.notificationsFrequency;
        const timeFormat = userData.timeFormat || '12h'; // Default to 12-hour if not provided

        // Check notification preferences
        let tasks = [];
        let notificationType = '';

        if (notificationsFrequency[1] && new Date().getDay() === 1) {
            // Weekly notification (every Monday)
            tasks = await queryTasks(userId, nextWeek);
            notificationType = 'Weekly';
        } else if (notificationsFrequency[2]) {
            // Daily notification
            tasks = await queryTasks(userId, tomorrow);
            notificationType = 'Daily';
        } else if (notificationsFrequency[3]) {
            // Urgent notification
            tasks = await queryTasks(userId, now);
            notificationType = 'Urgent';
        }

        if (notificationType === 'Urgent' && tasks.length === 0) {
            // Skip sending email for Urgent if no tasks
            console.log(`No urgent tasks for ${userEmail}, skipping email.`);
            return;
        }

        // For Weekly and Daily, send "Nothing due, great job!" if no tasks found
        if ((notificationType === 'Weekly' || notificationType === 'Daily') && tasks.length === 0) {
            console.log(`No tasks for ${notificationType} email for ${userEmail}, sending "Nothing due, great job!"`);
        }

        // Create a notification document and get its ID
        const notificationDocId = await createNotificationDocument(userId, userEmail, tasks, notificationType);

        // Send the email using the notification document
        await sendNotificationEmailFromNotificationDoc(notificationDocId, tasks, notificationType);
    });
});

// Keep-alive function to reduce cold starts
exports.keepWarm = functions.pubsub.schedule('every 5 minutes').timeZone('America/Chicago').onRun(async (context) => {
    console.log('KeepWarm function triggered to keep the function instance warm.');
    return null;
});