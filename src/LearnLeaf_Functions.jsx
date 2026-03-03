import { saveToStore, getFromStore, getAllFromStore, deleteFromStore, clearStore, clearFirebaseStores, TASKS_STORE, SUBJECTS_STORE, PROJECTS_STORE, queueDelete, getDeleteQueue, removeFromDeleteQueue, queueUserUpdate, getQueuedUserUpdates, removeUserUpdate } from './db.js';
import { auth, firestore } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut, GoogleAuthProvider, signInWithPopup, deleteUser as deleteFirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, Timestamp, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';

const provider = new GoogleAuthProvider();
let userId = null;
let taskCollection = null;
let subjectCollection = null;
let projectCollection = null;

function setUserIdAndCollections(uid) {
  if (uid) {
    userId = uid;
    taskCollection    = collection(firestore, 'users', uid, 'tasks');
    subjectCollection = collection(firestore, 'users', uid, 'subjects');
    projectCollection = collection(firestore, 'users', uid, 'projects');
  } else {
    userId = taskCollection = subjectCollection = projectCollection = null;
  }
}

const initUserFromLocalStorage = async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user?.id) setUserIdAndCollections(user.id);
};
initUserFromLocalStorage();

async function tryFirestoreWrite(fn, label = '') {
  if (!navigator.onLine) return;
  try { await fn(); } catch(e) { console.error(`Firestore write failed (${label}):`, e); }
}

// --- Formatting ---
export function formatDate(input) {
  if (!input) return '';
  let date;
  if (input instanceof Timestamp) date = input.toDate();
  else if (input instanceof Date) date = input;
  else if (input?.toDate) date = input.toDate();
  else if (input?.seconds) date = new Date(input.seconds * 1000);
  else date = new Date(input);
  return date.toLocaleDateString('en-CA');
}

export function formatDateDisplay(input, dateFormat) {
  if (!input) return '';
  let date;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y,m,d] = input.split('-').map(Number);
    date = new Date(y, m-1, d);
  } else {
    date = input instanceof Date ? input : input.toDate ? input.toDate() : new Date(input);
  }
  return dateFormat === 'DD/MM/YYYY' ? date.toLocaleDateString('en-GB') : date.toLocaleDateString('en-US');
}

export function formatTimeDisplay(input, timeFormat) {
  if (!input || typeof input !== 'string') return '';
  const [h, m] = input.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const t = new Date(); t.setHours(h, m);
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h' });
}

export function formatTime(input) {
  if (!input) return '';
  let t;
  if (input instanceof Timestamp) t = input.toDate();
  else if (input instanceof Date) t = input;
  else if (input?.toDate) t = input.toDate();
  else if (input?.seconds) t = new Date(input.seconds * 1000);
  else if (typeof input === 'string') {
    if (/^\d{1,2}:\d{2}/.test(input)) return input.slice(0,5);
    t = new Date(input);
  } else return '';
  return `${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`;
}

function docToLocal(doc, storeName) {
  const data = doc.data();
  if (storeName === 'tasks') return {
    taskId: doc.id, ...data,
    taskDueDate: data.taskDueDate ? formatDate(data.taskDueDate) : '',
    taskDueTime: data.taskDueTime ? formatTime(data.taskDueTime) : '',
    taskStartDate: data.taskStartDate ? formatDate(data.taskStartDate) : '',
    taskProject: data.taskProject?.id || 'None',
    taskSubject: data.taskSubject?.id || 'None',
  };
  if (storeName === 'projects') return {
    projectId: doc.id, ...data,
    projectDueDate: data.projectDueDate ? formatDate(data.projectDueDate) : '',
    projectDueTime: data.projectDueTime ? formatTime(data.projectDueTime) : '',
    projectSubjects: data.projectSubjects ? data.projectSubjects.map(s => s.id || 'None') : [],
  };
  if (storeName === 'subjects') return { subjectId: doc.id, ...data };
  return { id: doc.id, ...data };
}

async function fetchDataWithIndexedDBFallback(col, storeName) {
  try {
    const cached = await getAllFromStore(storeName);
    if (cached?.length > 0) {
      if (navigator.onLine) {
        getDocs(col).then(async snap => {
          const items = snap.docs.map(d => docToLocal(d, storeName));
          await saveToStore(storeName, items);
        }).catch(() => {});
      }
      return cached;
    }
    if (!navigator.onLine) return [];
    const snap = await getDocs(col);
    const items = snap.docs.map(d => docToLocal(d, storeName));
    await saveToStore(storeName, items);
    return items;
  } catch(e) { console.error(`fetchData(${storeName}):`, e); return []; }
}

export async function fetchAllData() {
  return {
    tasks:    await fetchDataWithIndexedDBFallback(taskCollection,    'tasks'),
    projects: await fetchDataWithIndexedDBFallback(projectCollection, 'projects'),
    subjects: await fetchDataWithIndexedDBFallback(subjectCollection, 'subjects'),
  };
}

// --- Auth ---
export function registerUser(email, password, name) {
  return createUserWithEmailAndPassword(auth, email, password).then(async ({ user }) => {
    sendEmailVerification(user).catch(() => {});
    await setDoc(doc(firestore,'users',user.uid), { name, email, timeFormat:'12h', dateFormat:'MM/DD/YYYY', notifications:false, notificationsFrequency:[true,false,false,false], icsURLs:{} });
  }).catch(e => { alert(`Error: ${e.message}`); throw e; });
}

export async function loginUser(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(firestore,'users',user.uid));
  if (!snap.exists()) throw new Error('User not found');
  const data = snap.data();
  const userData = { id:user.uid, name:data.name, email:data.email, timeFormat:data.timeFormat, dateFormat:data.dateFormat, notifications:data.notifications, notificationsFrequency:data.notificationsFrequency, icsURLs:data.icsURLs||{} };
  localStorage.setItem('user', JSON.stringify(userData));
  setUserIdAndCollections(user.uid);
  // Seed IndexedDB in the background so pages load instantly
  // fetchAllData().catch(() => {});
  return userData;
}

export async function loginWithGoogle(updateUser, navigate) {
  const { user } = await signInWithPopup(auth, provider);
  let snap = await getDoc(doc(firestore,'users',user.uid));
  if (!snap.exists()) {
    await setDoc(doc(firestore,'users',user.uid), { name:user.displayName||'', email:user.email, timeFormat:'12h', dateFormat:'MM/DD/YYYY', notifications:false, notificationsFrequency:[true,false,false,false], icsURLs:{} });
    snap = await getDoc(doc(firestore,'users',user.uid));
  }
  const data = snap.data();
  const userData = { id:user.uid, name:data.name||user.displayName||'', email:data.email||user.email, timeFormat:data.timeFormat, dateFormat:data.dateFormat, notifications:data.notifications, notificationsFrequency:data.notificationsFrequency, icsURLs:data.icsURLs||{} };
  localStorage.setItem('user', JSON.stringify(userData));
  setUserIdAndCollections(user.uid);
  // Seed IndexedDB in the background so pages load instantly
  fetchAllData().catch(() => {});
  updateUser(userData);
  navigate('/tasks');
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email).catch(e => { alert(`Error: ${e.message}`); throw e; });
}

export async function logoutUser() {
  await signOut(auth);
  setUserIdAndCollections(null);
  await new Promise((res,rej) => { const r = indexedDB.deleteDatabase('learnleaf-db'); r.onsuccess=res; r.onerror=rej; });
  localStorage.clear(); sessionStorage.clear();
}

export async function updateUserDetails(uid, details) {
  const ref = doc(firestore,'users',uid);
  const current = JSON.parse(localStorage.getItem('user')) || {};
  localStorage.setItem('user', JSON.stringify({...current,...details}));
  if (navigator.onLine) await tryFirestoreWrite(() => updateDoc(ref, details), 'updateUser');
  else await queueUserUpdate(uid, details);
}

export async function deleteUser(uid) {
  if (!navigator.onLine) throw new Error('Must be online to delete account');
  const batch = writeBatch(firestore);
  batch.delete(doc(firestore,'users',uid));
  await batch.commit();
  const u = auth.currentUser;
  if (u?.uid === uid) await deleteFirebaseUser(u);
  localStorage.clear();
}

// --- Tasks ---
export async function addTask(taskDetails) {
  if (!taskCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const taskId = taskDetails.taskLMSDetails?.LMS_UID || `${Date.now()}`;
  const taskRef = doc(taskCollection, taskId);

  const subjectRef = (taskDetails.taskSubject && taskDetails.taskSubject !== 'None')
    ? doc(subjectCollection, typeof taskDetails.taskSubject === 'string' ? taskDetails.taskSubject : taskDetails.taskSubject.subjectId)
    : doc(firestore,'noneSubject','None');
  const projectRef = (taskDetails.taskProject && taskDetails.taskProject !== 'None')
    ? doc(projectCollection, typeof taskDetails.taskProject === 'string' ? taskDetails.taskProject : taskDetails.taskProject.projectId)
    : doc(firestore,'noneProject','None');

  const taskData = {
    taskName: taskDetails.taskName,
    taskDescription: taskDetails.taskDescription || '',
    taskPriority: taskDetails.taskPriority || 'Medium',
    taskStatus: taskDetails.taskStatus || 'Not Started',
    taskSubject: subjectRef,
    taskProject: projectRef,
    taskLMSDetails: taskDetails.taskLMSDetails || {},
  };
  if (taskDetails.dueDateInput) taskData.taskDueDate = Timestamp.fromDate(new Date(`${taskDetails.dueDateInput}T23:59:59`));
  if (taskDetails.dueTimeInput) taskData.taskDueTime = Timestamp.fromDate(new Date(`${taskDetails.dueDateInput}T${taskDetails.dueTimeInput}`));
  if (taskDetails.startDateInput) taskData.taskStartDate = Timestamp.fromDate(new Date(`${taskDetails.startDateInput}T00:00:00`));

  const local = {
    taskId, taskName:taskDetails.taskName, taskDescription:taskDetails.taskDescription||'',
    taskPriority:taskDetails.taskPriority||'Medium', taskStatus:taskDetails.taskStatus||'Not Started',
    taskSubject: typeof taskDetails.taskSubject==='string' ? taskDetails.taskSubject : (taskDetails.taskSubject?.subjectId||'None'),
    taskProject: typeof taskDetails.taskProject==='string' ? taskDetails.taskProject : (taskDetails.taskProject?.projectId||'None'),
    taskDueDate: taskDetails.dueDateInput||'', taskDueTime: taskDetails.dueTimeInput||'',
    taskStartDate: taskDetails.startDateInput||'', taskLMSDetails: taskDetails.taskLMSDetails||{},
  };

  await tryFirestoreWrite(() => setDoc(taskRef, taskData, {merge:true}), 'addTask');
  await saveToStore('tasks', [local]);
  return local;
}

export async function editTask(taskDetails) {
  if (!taskCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const taskRef = doc(taskCollection, taskDetails.taskId);

  const subjectRef = (taskDetails.taskSubject && taskDetails.taskSubject !== 'None')
    ? doc(subjectCollection, typeof taskDetails.taskSubject === 'string' ? taskDetails.taskSubject : (taskDetails.taskSubject?.subjectId||'None'))
    : doc(firestore,'noneSubject','None');
  const projectRef = (taskDetails.taskProject && taskDetails.taskProject !== 'None')
    ? doc(projectCollection, typeof taskDetails.taskProject === 'string' ? taskDetails.taskProject : (taskDetails.taskProject?.projectId||'None'))
    : doc(firestore,'noneProject','None');

  const taskData = {
    taskName: taskDetails.taskName,
    taskDescription: taskDetails.taskDescription||'',
    taskPriority: taskDetails.taskPriority||'Medium',
    taskStatus: taskDetails.taskStatus||'Not Started',
    taskSubject: subjectRef, taskProject: projectRef,
  };
  if (taskDetails.taskDueDate) taskData.taskDueDate = Timestamp.fromDate(new Date(`${taskDetails.taskDueDate}T23:59:59`));
  if (taskDetails.taskDueTime && taskDetails.taskDueDate) taskData.taskDueTime = Timestamp.fromDate(new Date(`${taskDetails.taskDueDate}T${taskDetails.taskDueTime}`));
  if (taskDetails.taskStartDate) taskData.taskStartDate = Timestamp.fromDate(new Date(`${taskDetails.taskStartDate}T00:00:00`));

  const local = {
    ...taskDetails,
    taskSubject: typeof taskDetails.taskSubject==='string' ? taskDetails.taskSubject : (taskDetails.taskSubject?.subjectId||'None'),
    taskProject: typeof taskDetails.taskProject==='string' ? taskDetails.taskProject : (taskDetails.taskProject?.projectId||'None'),
  };

  await tryFirestoreWrite(() => setDoc(taskRef, taskData, {merge:true}), 'editTask');
  await saveToStore('tasks', [local]);
  return local;
}

export async function deleteTask(taskId) {
  if (!taskCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => deleteDoc(doc(taskCollection, taskId)), 'deleteTask');
  if (!navigator.onLine) await queueDelete('tasks', taskId);
  await deleteFromStore('tasks', taskId);
}

export function sortTasks(tasks) {
  return [...tasks].sort((a,b) => {
    const da = a.taskDueDate ? new Date(a.taskDueDate) : new Date('9999-12-31');
    const db = b.taskDueDate ? new Date(b.taskDueDate) : new Date('9999-12-31');
    if (da<db) return -1; if (da>db) return 1;
    const ta = a.taskDueTime||'23:59', tb = b.taskDueTime||'23:59';
    if (ta<tb) return -1; if (ta>tb) return 1;
    return a.taskName.localeCompare(b.taskName);
  });
}

// --- Subjects ---
export async function addSubject(details) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const subjectId = details.subjectLMSDetails?.LMS_UID || `${Date.now()}`;
  const ref = doc(subjectCollection, subjectId);
  const data = { subjectName:details.subjectName, subjectSemester:details.subjectSemester||'', subjectDescription:details.subjectDescription||'', subjectColor:details.subjectColor||'#355147', subjectStatus:details.subjectStatus||'Active', subjectLMSDetails:details.subjectLMSDetails||{} };
  const local = { subjectId, ...data };
  await tryFirestoreWrite(() => setDoc(ref, data, {merge:true}), 'addSubject');
  await saveToStore('subjects', [local]);
  return local;
}

export async function editSubject(details) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const ref = doc(subjectCollection, details.subjectId);
  const data = { subjectName:details.subjectName, subjectSemester:details.subjectSemester||'', subjectDescription:details.subjectDescription||'', subjectColor:details.subjectColor||'#355147', subjectStatus:details.subjectStatus||'Active' };
  await tryFirestoreWrite(() => updateDoc(ref, data), 'editSubject');
  await saveToStore('subjects', [{...details,...data}]);
}

export async function archiveSubject(subjectId) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => updateDoc(doc(subjectCollection,subjectId), {subjectStatus:'Archived'}), 'archiveSubject');
  const all = await getAllFromStore('subjects');
  await saveToStore('subjects', all.map(s => s.subjectId===subjectId ? {...s,subjectStatus:'Archived'} : s));
}

export async function reactivateSubject(subjectId) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => updateDoc(doc(subjectCollection,subjectId), {subjectStatus:'Active'}), 'reactivateSubject');
  const all = await getAllFromStore('subjects');
  await saveToStore('subjects', all.map(s => s.subjectId===subjectId ? {...s,subjectStatus:'Active'} : s));
}

export async function blockSubject(subjectId) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => updateDoc(doc(subjectCollection,subjectId), {subjectStatus:'Blocked'}), 'blockSubject');
  const all = await getAllFromStore('subjects');
  await saveToStore('subjects', all.map(s => s.subjectId===subjectId ? {...s,subjectStatus:'Blocked'} : s));
}

export async function deleteSubject(subjectId) {
  if (!subjectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => deleteDoc(doc(subjectCollection,subjectId)), 'deleteSubject');
  if (!navigator.onLine) await queueDelete('subjects', subjectId);
  await deleteFromStore('subjects', subjectId);
}

export function sortSubjects(subjects) {
  return [...subjects].sort((a,b) => a.subjectName.localeCompare(b.subjectName));
}

// --- Projects ---
export async function addProject({ projectDueDateInput, projectDueTimeInput, projectName, projectDescription, projectSubjects }) {
  if (!projectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const projectId = `${Date.now()}`;
  const ref = doc(projectCollection, projectId);
  const subjectRefs = (projectSubjects||[]).filter(id=>id&&id!=='None').map(id => doc(subjectCollection, id));
  const data = { projectName, projectDescription:projectDescription||'', projectStatus:'Active', projectSubjects:subjectRefs };
  if (projectDueDateInput) data.projectDueDate = Timestamp.fromDate(new Date(`${projectDueDateInput}T23:59:59`));
  if (projectDueTimeInput && projectDueDateInput) data.projectDueTime = Timestamp.fromDate(new Date(`${projectDueDateInput}T${projectDueTimeInput}`));
  const local = { projectId, projectName, projectDescription:projectDescription||'', projectStatus:'Active', projectSubjects:subjectRefs.map(r=>r.id), projectDueDate:projectDueDateInput||'', projectDueTime:projectDueTimeInput||'' };
  await tryFirestoreWrite(() => setDoc(ref, data, {merge:true}), 'addProject');
  await saveToStore('projects', [local]);
  return local;
}

export async function editProject(details) {
  if (!projectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  const ref = doc(projectCollection, details.projectId);
  const subjectRefs = (details.projectSubjects||[]).filter(id=>id&&id!=='None').map(id => doc(subjectCollection, typeof id==='string'?id:(id.subjectId||id)));
  const data = { projectName:details.projectName, projectDescription:details.projectDescription||'', projectSubjects:subjectRefs };
  if (details.projectDueDate) data.projectDueDate = Timestamp.fromDate(new Date(`${details.projectDueDate}T23:59:59`));
  if (details.projectDueTime && details.projectDueDate) data.projectDueTime = Timestamp.fromDate(new Date(`${details.projectDueDate}T${details.projectDueTime}`));
  const local = { ...details, projectSubjects: subjectRefs.map(r=>r.id) };
  await tryFirestoreWrite(() => setDoc(ref, data, {merge:true}), 'editProject');
  await saveToStore('projects', [local]);
}

export async function archiveProject(projectId) {
  if (!projectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => updateDoc(doc(projectCollection,projectId), {projectStatus:'Archived'}), 'archiveProject');
  const all = await getAllFromStore('projects');
  await saveToStore('projects', all.map(p => p.projectId===projectId ? {...p,projectStatus:'Archived'} : p));
}

export async function reactivateProject(projectId) {
  if (!projectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => updateDoc(doc(projectCollection,projectId), {projectStatus:'Active'}), 'reactivateProject');
  const all = await getAllFromStore('projects');
  await saveToStore('projects', all.map(p => p.projectId===projectId ? {...p,projectStatus:'Active'} : p));
}

export async function deleteProject(projectId) {
  if (!projectCollection) { const u = JSON.parse(localStorage.getItem('user')); if(u?.id) setUserIdAndCollections(u.id); }
  await tryFirestoreWrite(() => deleteDoc(doc(projectCollection,projectId)), 'deleteProject');
  if (!navigator.onLine) await queueDelete('projects', projectId);
  await deleteFromStore('projects', projectId);
}

export function sortProjects(projects) {
  return [...projects].sort((a,b) => a.projectName.localeCompare(b.projectName));
}
