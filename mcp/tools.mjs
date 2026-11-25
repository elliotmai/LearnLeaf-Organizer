/*
 * LearnLeaf MCP tools: what an assistant can do with your LearnLeaf data.
 *
 * Every tool is a thin wrapper over the personal REST API in
 * netlify/functions/api.mjs, so the API stays the one place that checks
 * fields, owns the data rules and decides who the caller is. `api` is
 * injected: the local stdio server (mcp/server.mjs) sends it over HTTPS, the
 * hosted endpoint (netlify/functions/mcp.mjs) calls the API handler in-process.
 *
 *   api(method, path, body?) -> { status, data }
 */

const TASK_STATUS = ['Not Started', 'In Progress', 'Completed'];
const PRIORITY = ['High', 'Medium', 'Low'];
const SUBJECT_STATUS = ['Active', 'Archived', 'Blocked'];
const PROJECT_STATUS = ['Active', 'Archived'];

const s = (description, extra = {}) => ({ type: 'string', description, ...extra });
const DATE = d => s(`${d} as YYYY-MM-DD in your timezone; "" clears it.`);
const TIME = d => s(`${d} as HH:mm (24-hour); "" clears it. Needs a due date.`);
const ID = what => s(`The ${what} id (from a list_* tool).`);

const taskFields = {
  taskName: s('Task title.'),
  taskDescription: s('Notes / details.'),
  taskPriority: s('Priority.', { enum: PRIORITY }),
  taskStatus: s('Status.', { enum: TASK_STATUS }),
  taskSubject: s('Subject id, or "None" for no subject.'),
  taskProject: s('Project id, or "None" for no project.'),
  taskDueDate: DATE('Due date'),
  taskDueTime: TIME('Due time'),
  taskStartDate: DATE('Start date'),
};
const subjectFields = {
  subjectName: s('Subject (class) name.'),
  subjectSemester: s('Semester, e.g. "Fall 2026".'),
  subjectDescription: s('Description.'),
  subjectColor: s('Hex colour, e.g. "#355147".'),
  subjectStatus: s('Status. Use "Archived" to archive (subjects cannot be deleted).', { enum: SUBJECT_STATUS }),
};
const projectFields = {
  projectName: s('Project name.'),
  projectDescription: s('Description.'),
  projectStatus: s('Status. Use "Archived" to archive (projects cannot be deleted).', { enum: PROJECT_STATUS }),
  projectSubjects: { type: 'array', items: { type: 'string' }, description: 'Subject ids this project belongs to.' },
  projectDueDate: DATE('Due date'),
  projectDueTime: TIME('Due time'),
};

const obj = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const READ = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const EDIT = { ...WRITE, idempotentHint: true };

const pick = (args, keys) => Object.fromEntries(keys.filter(k => args[k] !== undefined).map(k => [k, args[k]]));
const path = (...parts) => parts.map(encodeURIComponent).join('/');
const query = params => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''));
  return q.size ? `?${q}` : '';
};

export const TOOLS = [
  {
    name: 'get_summary',
    title: 'Summary',
    description: "Today's overview: counts of open, overdue, due-today and due-this-week tasks, plus the overdue, due-today and next upcoming tasks. Start here for \"what's on my plate?\".",
    inputSchema: obj({}),
    annotations: READ,
    run: (api) => api('GET', 'summary'),
  },
  {
    name: 'list_tasks',
    title: 'List tasks',
    description: 'All tasks, sorted by due date, optionally filtered. Dates are inclusive. Includes completed tasks unless you filter by status.',
    inputSchema: obj({
      status: s('Only tasks with this status.', { enum: TASK_STATUS }),
      subject: s('Only tasks in this subject id.'),
      project: s('Only tasks in this project id.'),
      due_before: s('Only tasks due on or before this YYYY-MM-DD.'),
      due_after: s('Only tasks due on or after this YYYY-MM-DD.'),
    }),
    annotations: READ,
    run: (api, a) => api('GET', `tasks${query(pick(a, ['status', 'subject', 'project', 'due_before', 'due_after']))}`),
  },
  {
    name: 'get_task',
    title: 'Get task',
    description: 'One task by id.',
    inputSchema: obj({ taskId: ID('task') }, ['taskId']),
    annotations: READ,
    run: (api, a) => api('GET', `tasks/${path(a.taskId)}`),
  },
  {
    name: 'create_task',
    title: 'Create task',
    description: 'Add a task. Only taskName is required; it defaults to Medium priority, Not Started, no subject or project.',
    inputSchema: obj(taskFields, ['taskName']),
    annotations: WRITE,
    run: (api, a) => api('POST', 'tasks', pick(a, Object.keys(taskFields))),
  },
  {
    name: 'update_task',
    title: 'Update task',
    description: 'Change a task. Only the fields you pass are changed. Set taskStatus to "Completed" to finish it.',
    inputSchema: obj({ taskId: ID('task'), ...taskFields }, ['taskId']),
    annotations: EDIT,
    run: (api, a) => api('PATCH', `tasks/${path(a.taskId)}`, pick(a, Object.keys(taskFields))),
  },
  {
    name: 'delete_task',
    title: 'Delete task',
    description: 'Permanently delete a task. Cannot be undone; to just finish it, use update_task with taskStatus "Completed".',
    inputSchema: obj({ taskId: ID('task') }, ['taskId']),
    annotations: { ...WRITE, destructiveHint: true, idempotentHint: true },
    run: (api, a) => api('DELETE', `tasks/${path(a.taskId)}`),
  },
  {
    name: 'list_subjects',
    title: 'List subjects',
    description: 'All subjects (classes), including archived ones. Use their ids for taskSubject and projectSubjects.',
    inputSchema: obj({}),
    annotations: READ,
    run: (api) => api('GET', 'subjects'),
  },
  {
    name: 'create_subject',
    title: 'Create subject',
    description: 'Add a subject (class).',
    inputSchema: obj(subjectFields, ['subjectName']),
    annotations: WRITE,
    run: (api, a) => api('POST', 'subjects', pick(a, Object.keys(subjectFields))),
  },
  {
    name: 'update_subject',
    title: 'Update subject',
    description: 'Change a subject; only the fields you pass are changed. Archive with subjectStatus "Archived".',
    inputSchema: obj({ subjectId: ID('subject'), ...subjectFields }, ['subjectId']),
    annotations: EDIT,
    run: (api, a) => api('PATCH', `subjects/${path(a.subjectId)}`, pick(a, Object.keys(subjectFields))),
  },
  {
    name: 'list_projects',
    title: 'List projects',
    description: 'All projects, including archived ones.',
    inputSchema: obj({}),
    annotations: READ,
    run: (api) => api('GET', 'projects'),
  },
  {
    name: 'create_project',
    title: 'Create project',
    description: 'Add a project.',
    inputSchema: obj(projectFields, ['projectName']),
    annotations: WRITE,
    run: (api, a) => api('POST', 'projects', pick(a, Object.keys(projectFields))),
  },
  {
    name: 'update_project',
    title: 'Update project',
    description: 'Change a project; only the fields you pass are changed. Archive with projectStatus "Archived".',
    inputSchema: obj({ projectId: ID('project'), ...projectFields }, ['projectId']),
    annotations: EDIT,
    run: (api, a) => api('PATCH', `projects/${path(a.projectId)}`, pick(a, Object.keys(projectFields))),
  },
];

const byName = new Map(TOOLS.map(t => [t.name, t]));

export const listTools = () => TOOLS.map(({ run, ...t }) => t);

/** Runs a tool. Returns an MCP CallToolResult (null for an unknown tool); API errors come back as isError results, not throws. */
export async function callTool(name, args, api) {
  const tool = byName.get(name);
  if (!tool) return null;
  const a = args && typeof args === 'object' ? args : {};
  for (const key of tool.inputSchema.required) {
    if (a[key] === undefined || a[key] === '') return errorResult(`${key} is required`);
  }
  let res;
  try {
    res = await tool.run(api, a);
  } catch (e) {
    return errorResult(`Could not reach LearnLeaf: ${e.message}`);
  }
  if (res.status === 401) {
    return errorResult('LearnLeaf refused the API key (401). Set LEARNLEAF_API_TOKEN to an llapp_ key from Account & Preferences → Connected apps.');
  }
  if (res.status >= 400) return errorResult(`LearnLeaf said ${res.status}: ${res.data?.error || JSON.stringify(res.data)}`);
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }], structuredContent: res.data };
}

const errorResult = text => ({ isError: true, content: [{ type: 'text', text }] });
