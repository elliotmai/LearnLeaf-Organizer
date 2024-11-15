// CanvasParse.jsx
import ICAL from 'ical.js';
import { addTask, addSubject, editTask } from '/src/LearnLeaf_Functions';
import { getFromStore } from '/src/db';

export default function CanvasParse({ icalUrl }) {
    return new Promise((resolve, reject) => {
        // Determine base URL based on environment
        const baseURL = window.location.hostname === 'localhost'
            ? 'http://localhost:8080/proxy'
            : 'https://learnleaf-organizer.netlify.app/.netlify/functions/proxy';

        // Replace the base URL in the iCal URL to use the correct proxy
        const proxiedUrl = `${baseURL}/${icalUrl.replace(/^https?:\/\/[^\/]+\//, '')}`;

        fetch(proxiedUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(async (icalData) => {
                if (!icalData) {
                    throw new Error("No iCal data received.");
                }

                const jcal = ICAL.parse(icalData);
                const component = new ICAL.Component(jcal);
                const vevents = component.getAllSubcomponents('vevent');

                const tasks = [];
                const subjects = new Set();

                // Fetch the deleted subjects list
                const deletedSubjectsEntry = await getFromStore('subjects', 'deletedSubjects');
                const deletedSubjects = deletedSubjectsEntry ? deletedSubjectsEntry.deletedSubjects : [];

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

                    // Skip adding the subject if it's in the deleted subjects array
                    if (deletedSubjects.includes(subjectCleaned)) {
                        return;
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
                        taskDescription: event.description ? event.description.replace(/http[^\s]+/, "") : "",
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

                    // Check if the subject is already in IndexedDB
                    const existingSubject = await getFromStore('subjects', subject.subjectLMSDetails.LMS_UID);
                    if (!existingSubject && !subjects.has(subjectCleaned)) {
                        await addSubject(subject);
                        subjects.add(subjectCleaned);
                    }

                    // Check if the task is already in IndexedDB
                    const existingTask = await getFromStore('tasks', task.taskLMSDetails.LMS_UID);
                    if (!existingTask) {
                        await addTask(task);
                        tasks.push(task);
                    } else {
                        const existingDueDate = new Date(existingTask.taskDueDate);
                        if (existingDueDate.getTime() !== task.dueDateInput) {
                            await editTask({
                                ...existingTask,
                                taskDueDate: task.dueDateInput,
                                taskDueTime: task.dueTimeInput
                            });
                        }
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
    });
}
