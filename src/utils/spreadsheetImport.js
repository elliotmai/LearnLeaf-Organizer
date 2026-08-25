/**
 * Spreadsheet import helpers.
 *
 * Turns pasted spreadsheet content (Excel / Google Sheets copy out as TSV) or a
 * CSV/TSV file into validated task drafts. Everything here is pure — the dialog
 * in components/tasks/TaskImportDialog.jsx owns the UI and the writes.
 */
import { parse, isValid } from 'date-fns';

/** Column order used when the pasted data has no recognisable header row. */
export const IMPORT_COLUMNS = [
  { key: 'taskName',        label: 'Task Name',   required: true, width: 175,
    aliases: ['task name', 'task', 'name', 'title', 'assignment', 'assignment name', 'to do'] },
  { key: 'taskDescription', label: 'Description', width: 165,
    aliases: ['description', 'desc', 'details', 'notes', 'note'] },
  { key: 'subjectName',     label: 'Subject',     width: 125,
    aliases: ['subject', 'subject name', 'class', 'course', 'course name'] },
  { key: 'projectName',     label: 'Project',     width: 125,
    aliases: ['project', 'project name'] },
  { key: 'taskStatus',      label: 'Status',      width: 125,
    aliases: ['status', 'progress', 'state'] },
  { key: 'taskPriority',    label: 'Priority',    width: 105,
    aliases: ['priority', 'importance'] },
  { key: 'startDate',       label: 'Start Date',  width: 118,
    aliases: ['start date', 'start', 'begin date', 'date started', 'assigned', 'assigned date'] },
  { key: 'dueDate',         label: 'Due Date',    width: 118,
    aliases: ['due date', 'due', 'deadline', 'date due'] },
  { key: 'dueTime',         label: 'Due Time',    width: 105,
    aliases: ['due time', 'time', 'time due'] },
];

export const STATUS_OPTIONS = ['Not Started', 'In Progress', 'Completed'];
export const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

const STATUS_ALIASES = {
  'not started': 'Not Started', 'notstarted': 'Not Started', 'not-started': 'Not Started',
  'to do': 'Not Started', 'todo': 'Not Started', 'new': 'Not Started', 'pending': 'Not Started',
  'open': 'Not Started', 'upcoming': 'Not Started',
  'in progress': 'In Progress', 'inprogress': 'In Progress', 'in-progress': 'In Progress',
  'started': 'In Progress', 'doing': 'In Progress', 'wip': 'In Progress', 'ongoing': 'In Progress',
  'completed': 'Completed', 'complete': 'Completed', 'done': 'Completed',
  'finished': 'Completed', 'closed': 'Completed', 'submitted': 'Completed',
};

const PRIORITY_ALIASES = {
  'high': 'High', 'h': 'High', 'urgent': 'High', 'important': 'High', '1': 'High',
  'medium': 'Medium', 'med': 'Medium', 'm': 'Medium', 'normal': 'Medium', '2': 'Medium',
  'low': 'Low', 'l': 'Low', '3': 'Low',
};

/**
 * Formats tried, in order, before falling back to the browser's parser. Split
 * by year width: date-fns happily reads "26" as year 26 under a `yyyy` token,
 * so two-digit years need their own pass.
 */
const FULL_YEAR_FORMATS = [
  'yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yyyy',
  'dd/MM/yyyy', 'dd-MM-yyyy', 'yyyy/MM/dd', 'MM.dd.yyyy', 'dd.MM.yyyy',
  'MMMM d, yyyy', 'MMM d, yyyy', 'd MMMM yyyy', 'd MMM yyyy', 'dd-MMM-yyyy',
];

const SHORT_YEAR_FORMATS = [
  'MM/dd/yy', 'M/d/yy', 'dd/MM/yy', 'MM.dd.yy', 'MMM d, yy', 'dd-MMM-yy',
];

const ALIAS_LOOKUP = (() => {
  const map = {};
  for (const col of IMPORT_COLUMNS) {
    map[normalizeHeader(col.label)] = col.key;
    map[normalizeHeader(col.key)] = col.key;
    for (const alias of col.aliases) map[normalizeHeader(alias)] = col.key;
  }
  return map;
})();

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Local-time YYYY-MM-DD, matching formatDate() in LearnLeaf_Functions. */
function toISODate(date) {
  return date.toLocaleDateString('en-CA');
}

/**
 * Split delimited text into a grid. Handles quoted fields (embedded delimiters
 * and newlines included) and picks the delimiter from the first line — a paste
 * out of Excel or Google Sheets is tab-separated, an exported file is usually
 * comma-separated.
 */
export function parseDelimited(text) {
  const src = String(text || '').replace(/\r\n?/g, '\n');
  if (!src.trim()) return [];

  const firstLine = src.split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t'
    : (firstLine.includes(';') && !firstLine.includes(',')) ? ';'
      : ',';

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field); field = '';
    } else if (ch === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  return rows
    .map(r => r.map(cell => cell.trim()))
    .filter(r => r.some(cell => cell !== ''));
}

/**
 * Map a candidate header row onto column keys. Returns null when the row does
 * not look like a header, so the caller falls back to positional columns.
 */
export function detectHeader(row) {
  if (!row) return null;
  const keys = row.map(cell => ALIAS_LOOKUP[normalizeHeader(cell)] || null);
  const matched = keys.filter(Boolean).length;
  if (matched >= 2 || (matched === 1 && row.length === 1)) return keys;
  return null;
}

const EMPTY_DRAFT = IMPORT_COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: '' }), {});

/** Grid → one draft object per data row, keyed by column key. */
export function rowsToDrafts(rows) {
  if (!rows.length) return [];
  const header = detectHeader(rows[0]);
  const keys = header || IMPORT_COLUMNS.map(c => c.key);
  const dataRows = header ? rows.slice(1) : rows;

  return dataRows.map(row => {
    const draft = { ...EMPTY_DRAFT };
    keys.forEach((key, i) => {
      if (key) draft[key] = (row[i] ?? '').trim();
    });
    return draft;
  });
}

/** Free text → YYYY-MM-DD. Returns '' when blank, null when unparseable. */
export function normalizeDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = parse(raw, 'yyyy-MM-dd', new Date());
    return isValid(d) ? raw : null;
  }
  const hasFullYear = /\d{4}/.test(raw);
  for (const format of (hasFullYear ? FULL_YEAR_FORMATS : SHORT_YEAR_FORMATS)) {
    const d = parse(raw, format, new Date());
    if (isValid(d)) return toISODate(d);
  }
  // Last resort for shapes date-fns missed; require a 4-digit year so stray
  // text ("Chapter 3") can't be coerced into a date.
  if (hasFullYear) {
    const d = new Date(raw);
    if (isValid(d) && !isNaN(d.getTime())) return toISODate(d);
  }
  return null;
}

/** Free text → 24h HH:mm. Returns '' when blank, null when unparseable. */
export function normalizeTime(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$/i);
  if (ampm) {
    let hours = parseInt(ampm[1], 10);
    const minutes = ampm[2] || '00';
    if (hours < 1 || hours > 12 || Number(minutes) > 59) return null;
    const isPM = ampm[3].toLowerCase() === 'p';
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const h24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24) {
    const hours = Number(h24[1]);
    const minutes = Number(h24[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return null;
}

/** Free text → one of STATUS_OPTIONS. Blank defaults to 'Not Started'. */
export function normalizeStatus(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Not Started';
  return STATUS_ALIASES[raw.toLowerCase()] || null;
}

/** Free text → one of PRIORITY_OPTIONS. Blank defaults to 'Medium'. */
export function normalizePriority(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Medium';
  return PRIORITY_ALIASES[raw.toLowerCase()] || null;
}

/**
 * Validate and normalise one draft.
 * Returns { errors, values } where errors is keyed by column key and values
 * holds the cleaned fields ready to hand to addTask().
 */
export function validateDraft(draft) {
  const errors = {};
  const values = {};

  values.taskName = String(draft.taskName || '').trim();
  if (!values.taskName) errors.taskName = 'Task name is required';

  values.taskDescription = String(draft.taskDescription || '').trim();
  values.subjectName = String(draft.subjectName || '').trim();
  values.projectName = String(draft.projectName || '').trim();

  const status = normalizeStatus(draft.taskStatus);
  if (status === null) errors.taskStatus = `Unrecognised status — use ${STATUS_OPTIONS.join(', ')}`;
  values.taskStatus = status || 'Not Started';

  const priority = normalizePriority(draft.taskPriority);
  if (priority === null) errors.taskPriority = `Unrecognised priority — use ${PRIORITY_OPTIONS.join(', ')}`;
  values.taskPriority = priority || 'Medium';

  const startDate = normalizeDate(draft.startDate);
  if (startDate === null) errors.startDate = 'Unrecognised date — try MM/DD/YYYY';
  values.startDate = startDate || '';

  const dueDate = normalizeDate(draft.dueDate);
  if (dueDate === null) errors.dueDate = 'Unrecognised date — try MM/DD/YYYY';
  values.dueDate = dueDate || '';

  const dueTime = normalizeTime(draft.dueTime);
  if (dueTime === null) errors.dueTime = 'Unrecognised time — try 2:30 PM or 14:30';
  values.dueTime = dueTime || '';

  // Mirrors TaskForm: a due time without a due date has nothing to anchor to.
  if (values.dueTime && !values.dueDate && !errors.dueDate) {
    errors.dueDate = 'Due date is required when a due time is set';
  }

  if (values.startDate && values.dueDate && values.startDate > values.dueDate) {
    errors.startDate = 'Start date is after the due date';
  }

  return { errors, values };
}

/** True when the row is entirely blank (users leave trailing rows behind). */
export function isBlankDraft(draft) {
  return IMPORT_COLUMNS.every(c => !String(draft[c.key] || '').trim());
}

export function blankDraft() {
  return { ...EMPTY_DRAFT };
}
