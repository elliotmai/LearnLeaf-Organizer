/*
 * LearnLeaf personal API (Netlify Function).
 *
 * A small bearer-token REST API over ONE user's Firestore data, so an assistant
 * (or any script) can read and manage tasks, subjects and projects. It uses the
 * Firebase Admin SDK, so Firestore security rules do not apply — access is
 * limited in code to the one user whose document carries the caller's token hash.
 *
 * Who the caller is: callers send "Authorization: Bearer <token>". The function
 * hashes the token (SHA-256, hex) and finds the user document in `users` whose
 * `apiTokenHash` field matches. That user's id is the only data it will touch.
 * No user id, email or token lives in the environment; only the hash is stored,
 * on your own user document. Remove the field to revoke access. Generate a token
 * and its hash with `node scripts/make-api-token.mjs`.
 *
 * Required environment variable (Netlify → Site configuration → Environment):
 *   FIREBASE_SERVICE_ACCOUNT  service-account key JSON (raw JSON or base64 of it)
 * Timezone: due dates and times are read and written in the caller's own zone,
 * taken from the string field `timezone` (an IANA name such as "America/Chicago")
 * on their user document. The web app records the browser's timezone there each
 * time the person signs in or reopens it, so it matches what they see in the app.
 * If it is missing the API falls back to the optional LEARNLEAF_TZ environment
 * variable, then to UTC. Because it is per user, one deployment can serve people
 * in different zones.
 *
 * Routes (all under /api, all JSON):
 *   GET    /api/summary                      overdue / due-today / due-soon counts + next tasks
 *   GET    /api/tasks?status=&subject=&project=&due_before=&due_after=
 *   POST   /api/tasks                        { taskName, ... }
 *   GET    /api/tasks/:id
 *   PATCH  /api/tasks/:id                    any task fields; only the ones sent are changed
 *   DELETE /api/tasks/:id
 *   GET|POST /api/subjects,  GET|PATCH /api/subjects/:id    (archive with subjectStatus: "Archived")
 *   GET|POST /api/projects,  GET|PATCH /api/projects/:id    (archive with projectStatus: "Archived")
 *
 * Subjects and projects cannot be deleted here on purpose — archive them instead.
 * Data shapes mirror src/LearnLeaf_Functions.jsx (docToLocal): dates are
 * "YYYY-MM-DD", times "HH:mm", and subject/project links are plain ids or "None".
 */
import { createHash, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed'];
const SUBJECT_STATUSES = ['Active', 'Archived', 'Blocked'];
const PROJECT_STATUSES = ['Active', 'Archived'];
const PRIORITIES = ['High', 'Medium', 'Low'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Maps every document, but one malformed record must not take the whole list down:
// it is returned as { <idKey>, _error } so it can be found and fixed.
const mapAll = (docs, fn, idKey) => docs.map(doc => {
  try { return fn(doc); } catch (e) { console.error(`unreadable ${idKey} ${doc.id}:`, e); return { [idKey]: doc.id, _error: `Could not read this record: ${e.message}` }; }
});

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// ---------------------------------------------------------------- setup ----
function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not set');
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  try { return JSON.parse(text); } catch { throw new HttpError(500, 'FIREBASE_SERVICE_ACCOUNT is not valid JSON'); }
}

function getDb() {
  if (!getApps().length) initializeApp({ credential: cert(readServiceAccount()) });
  return getFirestore();
}

const MIN_TOKEN_LENGTH = 32;

export const hashToken = token => createHash('sha256').update(token).digest('hex');

const isValidZone = z => { try { new Intl.DateTimeFormat('en-CA', { timeZone: z }); return true; } catch { return false; } };

// Bearer token -> the one user whose document stores that token's hash.
// Returns { uid, timezone } where timezone is that user's timezone (or undefined).
export async function resolveUser(db, req) {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token.length < MIN_TOKEN_LENGTH) throw new HttpError(401, 'Unauthorized');
  const snap = await db.collection('users').where('apiTokenHash', '==', hashToken(token)).limit(2).get();
  // Zero matches: unknown token. More than one: ambiguous, so refuse rather than guess.
  if (snap.size !== 1) throw new HttpError(401, 'Unauthorized');
  const doc = snap.docs[0];
  const timezone = doc.data().timezone;
  if (timezone !== undefined && (typeof timezone !== 'string' || !isValidZone(timezone))) {
    throw new HttpError(500, 'timezone on your user document is not a valid IANA timezone (e.g. America/Chicago)');
  }
  return { uid: doc.id, timezone };
}

// ---------------------------------------------------------------- dates ----
// The zone for the current request: the user's timezone, else LEARNLEAF_TZ, else UTC.
const tzStore = new AsyncLocalStorage();
const TZ = () => tzStore.getStore() || process.env.LEARNLEAF_TZ || 'UTC';

// Wall-clock parts of an instant in the configured zone.
function partsInTz(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ(), hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  return Object.fromEntries(fmt.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

// "2026-11-14" + "09:30" (wall clock in the configured zone) -> JS Date (UTC instant).
function zonedToDate(dateStr, timeStr = '00:00:00') {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi, s = 0] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const p = partsInTz(new Date(guess));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  // The zone offset at `guess`; a second pass settles DST edges.
  let result = guess - (asIfUtc - guess);
  const p2 = partsInTz(new Date(result));
  const asIfUtc2 = Date.UTC(+p2.year, +p2.month - 1, +p2.day, +p2.hour, +p2.minute, +p2.second);
  result = result - (asIfUtc2 - guess);
  return new Date(result);
}

// Old records may hold dates as Firestore Timestamps, JS Dates, ISO strings or {seconds}.
// Normalise whatever is there; anything unreadable becomes null (shown as empty).
function toJsDate(v) {
  if (!v) return null;
  let d = null;
  if (typeof v.toDate === 'function') d = v.toDate();
  else if (v instanceof Date) d = v;
  else if (typeof v === 'string' || typeof v === 'number') d = new Date(v);
  else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
  return d && !Number.isNaN(d.getTime()) ? d : null;
}
const toDateStr = v => { const d = toJsDate(v); if (!d) return ''; const p = partsInTz(d); return `${p.year}-${p.month}-${p.day}`; };
const toTimeStr = v => { const d = toJsDate(v); if (!d) return ''; const p = partsInTz(d); return `${p.hour}:${p.minute}`; };
// A link may be a DocumentReference or (in old data) a bare id string.
const refId = r => (typeof r === 'string' ? r : r?.id) || 'None';
const todayStr = () => toDateStr(Timestamp.now());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function checkDate(value, field) {
  if (!DATE_RE.test(value) || Number.isNaN(zonedToDate(value).getTime())) throw new HttpError(400, `${field} must be YYYY-MM-DD`);
  return value;
}
function checkTime(value, field) {
  if (!TIME_RE.test(value)) throw new HttpError(400, `${field} must be HH:mm (24-hour)`);
  return value;
}

// ------------------------------------------------------------- mappers -----
function taskToJson(doc) {
  const d = doc.data();
  return {
    taskId: doc.id,
    taskName: d.taskName || '',
    taskDescription: d.taskDescription || '',
    taskPriority: d.taskPriority || 'Medium',
    taskStatus: d.taskStatus || 'Not Started',
    taskSubject: refId(d.taskSubject),
    taskProject: refId(d.taskProject),
    taskDueDate: toDateStr(d.taskDueDate),
    taskDueTime: toTimeStr(d.taskDueTime),
    taskStartDate: toDateStr(d.taskStartDate),
    taskLMSDetails: d.taskLMSDetails || {},
  };
}

function subjectToJson(doc) {
  const d = doc.data();
  return { subjectId: doc.id, ...d };
}

function projectToJson(doc) {
  const d = doc.data();
  return {
    projectId: doc.id,
    projectName: d.projectName || '',
    projectDescription: d.projectDescription || '',
    projectStatus: d.projectStatus || 'Active',
    projectSubjects: (Array.isArray(d.projectSubjects) ? d.projectSubjects : []).map(refId),
    projectDueDate: toDateStr(d.projectDueDate),
    projectDueTime: toTimeStr(d.projectDueTime),
  };
}

// ------------------------------------------------------------ validation ---
const str = (v, field, { max = 2000, required = false } = {}) => {
  if (v === undefined) return undefined;
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`);
  const t = v.trim();
  if (required && !t) throw new HttpError(400, `${field} cannot be empty`);
  if (t.length > max) throw new HttpError(400, `${field} is too long (max ${max})`);
  return t;
};
const oneOf = (v, allowed, field) => {
  if (v === undefined) return undefined;
  if (!allowed.includes(v)) throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}`);
  return v;
};

async function refFor(db, uid, collectionName, id, noneDoc) {
  if (id === undefined) return undefined;
  if (id === null || id === '' || id === 'None') return db.doc(noneDoc);
  if (typeof id !== 'string') throw new HttpError(400, `${collectionName} id must be a string`);
  const ref = db.collection('users').doc(uid).collection(collectionName).doc(id);
  if (!(await ref.get()).exists) throw new HttpError(400, `No ${collectionName.slice(0, -1)} with id "${id}"`);
  return ref;
}

// Builds the Firestore fields for the keys present in `body` only.
async function buildTaskFields(db, uid, body, { creating }) {
  const f = {};
  const name = str(body.taskName, 'taskName', { max: 300, required: creating || body.taskName !== undefined });
  if (creating && name === undefined) throw new HttpError(400, 'taskName is required');
  if (name !== undefined) f.taskName = name;
  const desc = str(body.taskDescription, 'taskDescription', { max: 10000 });
  if (desc !== undefined) f.taskDescription = desc;
  const pr = oneOf(body.taskPriority, PRIORITIES, 'taskPriority');
  if (pr !== undefined) f.taskPriority = pr;
  const st = oneOf(body.taskStatus, TASK_STATUSES, 'taskStatus');
  if (st !== undefined) f.taskStatus = st;
  const subj = await refFor(db, uid, 'subjects', body.taskSubject, 'noneSubject/None');
  if (subj !== undefined) f.taskSubject = subj;
  const proj = await refFor(db, uid, 'projects', body.taskProject, 'noneProject/None');
  if (proj !== undefined) f.taskProject = proj;
  if (body.taskLMSDetails !== undefined) {
    if (typeof body.taskLMSDetails !== 'object' || body.taskLMSDetails === null || Array.isArray(body.taskLMSDetails)) throw new HttpError(400, 'taskLMSDetails must be an object');
    f.taskLMSDetails = body.taskLMSDetails;
  }
  return f;
}

// Date/time fields are applied together because the due time is anchored to the due date.
function applyTaskDates(fields, body, existing) {
  const sets = {};
  const dueDate = body.taskDueDate !== undefined ? body.taskDueDate : undefined;
  const dueTime = body.taskDueTime !== undefined ? body.taskDueTime : undefined;
  const start = body.taskStartDate !== undefined ? body.taskStartDate : undefined;

  if (dueDate !== undefined || dueTime !== undefined) {
    const date = dueDate !== undefined ? dueDate : toDateStr(existing?.taskDueDate);
    const time = dueTime !== undefined ? dueTime : toTimeStr(existing?.taskDueTime);
    if (!date) {
      if (dueTime) throw new HttpError(400, 'taskDueTime needs a taskDueDate');
      sets.taskDueDate = null; sets.taskDueTime = null;
    } else {
      checkDate(date, 'taskDueDate');
      sets.taskDueDate = Timestamp.fromDate(zonedToDate(date, '23:59:59'));
      sets.taskDueTime = time ? Timestamp.fromDate(zonedToDate(date, checkTime(time, 'taskDueTime'))) : null;
    }
  }
  if (start !== undefined) {
    sets.taskStartDate = start ? Timestamp.fromDate(zonedToDate(checkDate(start, 'taskStartDate'), '00:00:00')) : null;
  }
  return { ...fields, ...sets };
}

// null means "clear this field" -> delete it, so the doc looks like one the app wrote.
const withDeletes = (fields, FieldValue) =>
  Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v === null ? FieldValue.delete() : v]));

// ---------------------------------------------------------------- routes ---
async function handle(req, db, uid, segments) {
  const userRef = db.collection('users').doc(uid);
  const col = name => userRef.collection(name);
  const method = req.method;
  const [resource, id] = segments;
  const url = new URL(req.url);
  const body = ['POST', 'PATCH'].includes(method) ? await req.json().catch(() => { throw new HttpError(400, 'Body must be valid JSON'); }) : {};
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Body must be a JSON object');

  if (resource === 'summary' && method === 'GET') {
    const snap = await col('tasks').where('taskStatus', 'in', ['Not Started', 'In Progress']).get();
    const open = mapAll(snap.docs, taskToJson, 'taskId').filter(t => !t._error);
    const today = todayStr();
    const soon = (() => { const d = new Date(zonedToDate(today).getTime() + 7 * 86400000); const p = partsInTz(d); return `${p.year}-${p.month}-${p.day}`; })();
    const byDue = (a, b) => (a.taskDueDate || '9999').localeCompare(b.taskDueDate || '9999') || (a.taskDueTime || '23:59').localeCompare(b.taskDueTime || '23:59');
    const dated = open.filter(t => t.taskDueDate).sort(byDue);
    return json(200, {
      today, timezone: TZ(),
      counts: {
        open: open.length,
        overdue: dated.filter(t => t.taskDueDate < today).length,
        dueToday: dated.filter(t => t.taskDueDate === today).length,
        dueNext7Days: dated.filter(t => t.taskDueDate > today && t.taskDueDate <= soon).length,
        noDueDate: open.length - dated.length,
      },
      overdue: dated.filter(t => t.taskDueDate < today),
      dueToday: dated.filter(t => t.taskDueDate === today),
      upcoming: dated.filter(t => t.taskDueDate > today).slice(0, 15),
    });
  }

  if (resource === 'tasks') {
    if (!id && method === 'GET') {
      const q = url.searchParams;
      let tasks = mapAll((await col('tasks').get()).docs, taskToJson, 'taskId');
      if (q.get('status')) tasks = tasks.filter(t => t.taskStatus === q.get('status'));
      if (q.get('subject')) tasks = tasks.filter(t => t.taskSubject === q.get('subject'));
      if (q.get('project')) tasks = tasks.filter(t => t.taskProject === q.get('project'));
      if (q.get('due_before')) tasks = tasks.filter(t => t.taskDueDate && t.taskDueDate <= q.get('due_before'));
      if (q.get('due_after')) tasks = tasks.filter(t => t.taskDueDate && t.taskDueDate >= q.get('due_after'));
      tasks.sort((a, b) => (a.taskDueDate || '9999').localeCompare(b.taskDueDate || '9999') || (a.taskDueTime || '23:59').localeCompare(b.taskDueTime || '23:59') || (a.taskName || '').localeCompare(b.taskName || ''));
      return json(200, { tasks });
    }
    if (!id && method === 'POST') {
      const fields = applyTaskDates(await buildTaskFields(db, uid, body, { creating: true }), body, null);
      const data = {
        taskDescription: '', taskPriority: 'Medium', taskStatus: 'Not Started',
        taskSubject: db.doc('noneSubject/None'), taskProject: db.doc('noneProject/None'), taskLMSDetails: {},
        ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null)),
      };
      // Same style of id the app generates (a millisecond timestamp); an explicit taskId may be supplied.
      const taskId = typeof body.taskId === 'string' && body.taskId ? body.taskId : `${Date.now()}`;
      const ref = col('tasks').doc(taskId);
      if ((await ref.get()).exists) throw new HttpError(409, `Task ${taskId} already exists`);
      await ref.set(data);
      return json(201, { task: taskToJson(await ref.get()) });
    }
    if (id) {
      const ref = col('tasks').doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpError(404, `No task with id "${id}"`);
      if (method === 'GET') return json(200, { task: taskToJson(snap) });
      if (method === 'PATCH') {
        const fields = applyTaskDates(await buildTaskFields(db, uid, body, { creating: false }), body, snap.data());
        if (!Object.keys(fields).length) throw new HttpError(400, 'No updatable fields in body');
        await ref.set(withDeletes(fields, FieldValue), { merge: true });
        return json(200, { task: taskToJson(await ref.get()) });
      }
      if (method === 'DELETE') { await ref.delete(); return json(200, { deleted: id }); }
    }
  }

  if (resource === 'subjects') {
    if (!id && method === 'GET') return json(200, { subjects: mapAll((await col('subjects').get()).docs, subjectToJson, 'subjectId') });
    if (!id && method === 'POST') {
      const data = {
        subjectName: str(body.subjectName, 'subjectName', { max: 200, required: true }),
        subjectSemester: str(body.subjectSemester, 'subjectSemester', { max: 100 }) ?? '',
        subjectDescription: str(body.subjectDescription, 'subjectDescription', { max: 5000 }) ?? '',
        subjectColor: str(body.subjectColor, 'subjectColor', { max: 20 }) ?? '#355147',
        subjectStatus: oneOf(body.subjectStatus, SUBJECT_STATUSES, 'subjectStatus') ?? 'Active',
        subjectLMSDetails: {},
      };
      if (!data.subjectName) throw new HttpError(400, 'subjectName is required');
      const ref = col('subjects').doc(`${Date.now()}`);
      await ref.set(data);
      return json(201, { subject: subjectToJson(await ref.get()) });
    }
    if (id) {
      const ref = col('subjects').doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpError(404, `No subject with id "${id}"`);
      if (method === 'GET') return json(200, { subject: subjectToJson(snap) });
      if (method === 'PATCH') {
        const f = {};
        const set = (k, v) => { if (v !== undefined) f[k] = v; };
        set('subjectName', str(body.subjectName, 'subjectName', { max: 200, required: true }));
        set('subjectSemester', str(body.subjectSemester, 'subjectSemester', { max: 100 }));
        set('subjectDescription', str(body.subjectDescription, 'subjectDescription', { max: 5000 }));
        set('subjectColor', str(body.subjectColor, 'subjectColor', { max: 20 }));
        set('subjectStatus', oneOf(body.subjectStatus, SUBJECT_STATUSES, 'subjectStatus'));
        if (!Object.keys(f).length) throw new HttpError(400, 'No updatable fields in body');
        await ref.update(f);
        return json(200, { subject: subjectToJson(await ref.get()) });
      }
    }
  }

  if (resource === 'projects') {
    if (!id && method === 'GET') return json(200, { projects: mapAll((await col('projects').get()).docs, projectToJson, 'projectId') });
    const subjectRefs = async list => {
      if (list === undefined) return undefined;
      if (!Array.isArray(list)) throw new HttpError(400, 'projectSubjects must be an array of subject ids');
      return Promise.all(list.filter(s => s && s !== 'None').map(s => refFor(db, uid, 'subjects', s)));
    };
    const dueFields = (b, existing) => {
      const out = {};
      if (b.projectDueDate === undefined && b.projectDueTime === undefined) return out;
      const date = b.projectDueDate !== undefined ? b.projectDueDate : toDateStr(existing?.projectDueDate);
      const time = b.projectDueTime !== undefined ? b.projectDueTime : toTimeStr(existing?.projectDueTime);
      if (!date) { out.projectDueDate = null; out.projectDueTime = null; return out; }
      checkDate(date, 'projectDueDate');
      out.projectDueDate = Timestamp.fromDate(zonedToDate(date, '23:59:59'));
      out.projectDueTime = time ? Timestamp.fromDate(zonedToDate(date, checkTime(time, 'projectDueTime'))) : null;
      return out;
    };
    if (!id && method === 'POST') {
      const name = str(body.projectName, 'projectName', { max: 300, required: true });
      if (!name) throw new HttpError(400, 'projectName is required');
      const data = {
        projectName: name,
        projectDescription: str(body.projectDescription, 'projectDescription', { max: 5000 }) ?? '',
        projectStatus: oneOf(body.projectStatus, PROJECT_STATUSES, 'projectStatus') ?? 'Active',
        projectSubjects: (await subjectRefs(body.projectSubjects)) ?? [],
        ...Object.fromEntries(Object.entries(dueFields(body, null)).filter(([, v]) => v !== null)),
      };
      const ref = col('projects').doc(`${Date.now()}`);
      await ref.set(data);
      return json(201, { project: projectToJson(await ref.get()) });
    }
    if (id) {
      const ref = col('projects').doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpError(404, `No project with id "${id}"`);
      if (method === 'GET') return json(200, { project: projectToJson(snap) });
      if (method === 'PATCH') {
        const f = {};
        const set = (k, v) => { if (v !== undefined) f[k] = v; };
        set('projectName', str(body.projectName, 'projectName', { max: 300, required: true }));
        set('projectDescription', str(body.projectDescription, 'projectDescription', { max: 5000 }));
        set('projectStatus', oneOf(body.projectStatus, PROJECT_STATUSES, 'projectStatus'));
        set('projectSubjects', await subjectRefs(body.projectSubjects));
        Object.assign(f, dueFields(body, snap.data()));
        if (!Object.keys(f).length) throw new HttpError(400, 'No updatable fields in body');
        await ref.set(withDeletes(f, FieldValue), { merge: true });
        return json(200, { project: projectToJson(await ref.get()) });
      }
    }
  }

  throw new HttpError(404, 'Not found');
}

export default async function handler(req) {
  const requestId = randomUUID().slice(0, 8);
  try {
    const db = getDb();
    const { uid, timezone } = await resolveUser(db, req);
    const path = new URL(req.url).pathname.replace(/^\/(\.netlify\/functions\/api|api)\/?/, '');
    const segments = path.split('/').filter(Boolean).map(decodeURIComponent);
    return await tzStore.run(timezone, () => handle(req, db, uid, segments));
  } catch (e) {
    if (e instanceof HttpError) return json(e.status, { error: e.message });
    console.error(`[api ${requestId}]`, e);
    return json(500, { error: 'Internal error', requestId });
  }
}
