import ICAL from 'ical.js';
import { addTask, addSubject, editTask } from '/src/LearnLeaf_Functions';
import { getFromStore } from '/src/db';

export default function CanvasParse({ icalUrl }) {
    return new Promise((resolve, reject) => {
        try {
            const flaskServer = window.location.hostname === 'localhost'
                ? 'http://127.0.0.1:5000/fetch_ical'
                : 'https://learnleaf-organizer.onrender.com/fetch_ical';

            const proxiedUrl = `${flaskServer}?ical_url=${encodeURIComponent(icalUrl)}`;

            console.log("Fetching from:", proxiedUrl);

            fetch(proxiedUrl)
                .then(response => response.text())
                .then(async (icalData) => {
                    if (!icalData) {
                        throw new Error("No iCal data received.");
                    }

                    console.log("Fetched iCal Data (Snippet):", icalData.slice(0, 500));

                    const jcal = ICAL.parse(icalData);
                    const component = new ICAL.Component(jcal);
                    const vevents = component.getAllSubcomponents('vevent');

                    const tasks = [];
                    const subjects = new Set();

                    async function processTask(task, tasks) {
                        const existingTask = await getFromStore('tasks', task.taskLMSDetails.LMS_UID);

                        if (!existingTask) {
                            await addTask(task);
                            tasks.push(task);
                        } else {
                            const existingDueDate = new Date(existingTask.taskDueDate);
                            if (existingDueDate.getTime() !== new Date(task.dueDateInput).getTime()) {
                                await editTask({
                                    ...existingTask,
                                    taskDueDate: task.dueDateInput,
                                    taskDueTime: task.dueTimeInput
                                });
                            }
                        }
                    }

                    // Process each event using Promise.all for async handling
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
                            // Step 1: Remove content within square brackets [] only if it contains a file name
                            description = description.replace(/\[[^\[\]]*?\.\w{2,4}\]/g, '');

                            // Step 2: Remove parentheses only if they contain a URL (http or https)
                            description = description.replace(/\(\s*https?:\/\/[^\s()]+?\s*\)/g, '');

                            return description;
                        }

                        // Extract date and time in the desired formats
                        const startDate = event.startDate.toJSDate();
                        const formattedDate = startDate.toISOString().split('T')[0]; // yyyy-mm-dd
                        let formattedTime = startDate.toTimeString().slice(0, 5); // hh:mm in 24-hour format

                        if (formattedTime === '00:00') {
                            formattedTime = '23:59';
                        }

                        const task = {
                            taskName: taskName.trim(),
                            taskDescription: event.description ? formatDescription(event.description) : "",
                            dueDateInput: formattedDate, // Set formatted date
                            dueTimeInput: formattedTime, // Set formatted time
                            taskLMSDetails: {
                                LMS: "Canvas",
                                LMS_UID: event.uid,
                            },
                            taskPriority: "Medium",
                            taskStatus: "Not Started",
                            taskSubject: subjectCleaned,
                            taskProject: "None"
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

                        // Fetch the subject from the store
                        const existingSubject = await getFromStore('subjects', subject.subjectLMSDetails.LMS_UID);

                        // If the subject does not exist, add it and process the task
                        if (!existingSubject) {
                            console.log(`Adding new subject: ${subjectCleaned}`);
                            await addSubject(subject);
                            subjects.add(subjectCleaned);
                            await processTask(task, tasks);
                        }
                        // If the subject exists and is not blocked, process the task
                        else if (existingSubject.subjectStatus !== "Blocked") {
                            console.log(`Processing task for existing subject: ${subjectCleaned}`);
                            await processTask(task, tasks);
                        }
                        // If the subject exists and is blocked, skip the task
                        else {
                            console.log(`Skipping task for blocked subject: ${subjectCleaned}`);
                        }
                    }));
                    
                    // Log result only after all tasks and subjects are processed
                    console.log("Number of subjects added:", subjects.size, "\nNumber of tasks added:", tasks.length);
                    resolve(); // Resolve the promise after successful completion
                })
                .catch((error) => {
                    console.error("Error fetching or parsing iCal data:", error);
                    reject(error); // Reject the promise if an error occurs
                });
        } catch (error) {
            console.error("Error initializing CanvasParse:", error);
            reject(error);
        }
    });
}
