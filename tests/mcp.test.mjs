// Tests for the MCP server: the JSON-RPC layer, the tools' mapping onto the
// personal API, the hosted /mcp endpoint, and the stdio server end to end.
// Run with: npm test   (node --test tests/*.test.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { handleMessage, handlePayload } from '../mcp/protocol.mjs';
import { TOOLS, listTools } from '../mcp/tools.mjs';
import { handleMcp, apiFor } from '../netlify/functions/mcp.mjs';

// Records every API call and answers with `answer(method, path, body)`.
function fakeApi(answer = () => ({ status: 200, data: { ok: true } })) {
  const calls = [];
  const api = async (method, path, body) => { calls.push({ method, path, body }); return answer(method, path, body); };
  return { api, calls };
}
const call = (name, args, api) => handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, { api });

test('initialize echoes a supported protocol version and falls back to the newest', async () => {
  const { api } = fakeApi();
  const a = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } }, { api });
  assert.equal(a.result.protocolVersion, '2025-03-26');
  assert.equal(a.result.serverInfo.name, 'learnleaf');
  assert.ok(a.result.capabilities.tools);
  const b = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } }, { api });
  assert.equal(b.result.protocolVersion, '2025-06-18');
});

test('notifications get no reply; unknown methods and bad messages get JSON-RPC errors', async () => {
  const { api } = fakeApi();
  assert.equal(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, { api }), null);
  assert.equal((await handleMessage({ jsonrpc: '2.0', id: 3, method: 'nope' }, { api })).error.code, -32601);
  assert.equal((await handleMessage({ id: 4, method: 'ping' }, { api })).error.code, -32600);
  assert.equal((await call('no_such_tool', {}, api)).error.code, -32602);
  assert.equal(await handlePayload([{ jsonrpc: '2.0', method: 'notifications/initialized' }], { api }), null);
});

test('tools/list exposes schemas and annotations but not the implementation', async () => {
  const { api } = fakeApi();
  const { result } = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { api });
  assert.equal(result.tools.length, TOOLS.length);
  for (const t of result.tools) {
    assert.equal(t.run, undefined);
    assert.equal(t.inputSchema.type, 'object');
    assert.equal(typeof t.annotations.readOnlyHint, 'boolean');
  }
  assert.equal(listTools().find(t => t.name === 'delete_task').annotations.destructiveHint, true);
  assert.equal(listTools().find(t => t.name === 'list_tasks').annotations.readOnlyHint, true);
});

test('tools map onto the personal API routes, sending only the fields given', async () => {
  const { api, calls } = fakeApi();
  await call('get_summary', {}, api);
  await call('list_tasks', { status: 'In Progress', due_before: '2026-12-01', subject: '' }, api);
  await call('create_task', { taskName: 'Essay', taskDueDate: '2026-12-01', bogus: 1 }, api);
  await call('update_task', { taskId: 'a/b', taskStatus: 'Completed' }, api);
  await call('delete_task', { taskId: '42' }, api);
  await call('update_project', { projectId: 'p1', projectSubjects: ['s1'] }, api);
  assert.deepEqual(calls, [
    { method: 'GET', path: 'summary', body: undefined },
    { method: 'GET', path: 'tasks?status=In+Progress&due_before=2026-12-01', body: undefined },
    { method: 'POST', path: 'tasks', body: { taskName: 'Essay', taskDueDate: '2026-12-01' } },
    { method: 'PATCH', path: 'tasks/a%2Fb', body: { taskStatus: 'Completed' } },
    { method: 'DELETE', path: 'tasks/42', body: undefined },
    { method: 'PATCH', path: 'projects/p1', body: { projectSubjects: ['s1'] } },
  ]);
});

test('results carry the API data; API errors and missing ids become isError results', async () => {
  const { api } = fakeApi((m, p) => (p === 'tasks/x' ? { status: 404, data: { error: 'No task with id "x"' } } : { status: 200, data: { tasks: [] } }));
  const good = await call('list_tasks', {}, api);
  assert.deepEqual(good.result.structuredContent, { tasks: [] });
  assert.equal(good.result.isError, undefined);
  const missing = await call('get_task', { taskId: 'x' }, api);
  assert.equal(missing.result.isError, true);
  assert.match(missing.result.content[0].text, /404.*No task/);
  const noId = await call('get_task', {}, api);
  assert.match(noId.result.content[0].text, /taskId is required/);
  const unauth = await call('get_summary', {}, async () => ({ status: 401, data: { error: 'Unauthorized' } }));
  assert.match(unauth.result.content[0].text, /LEARNLEAF_API_TOKEN/);
});

test('hosted /mcp: needs POST and an Authorization header, replies with JSON', async () => {
  const post = (body, headers = { authorization: 'Bearer llapp_x' }) =>
    new Request('https://x/mcp', { method: 'POST', headers, body: JSON.stringify(body) });
  assert.equal((await handleMcp(new Request('https://x/mcp'))).status, 405);
  assert.equal((await handleMcp(post({ jsonrpc: '2.0', id: 1, method: 'ping' }, {}))).status, 401);
  const { api } = fakeApi();
  const res = await handleMcp(post({ jsonrpc: '2.0', id: 1, method: 'ping' }), { api });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { jsonrpc: '2.0', id: 1, result: {} });
  assert.equal((await handleMcp(post({ jsonrpc: '2.0', method: 'notifications/initialized' }), { api })).status, 202);
  const bad = await handleMcp(new Request('https://x/mcp', { method: 'POST', headers: { authorization: 'Bearer y' }, body: '{' }), { api });
  assert.equal((await bad.json()).error.code, -32700);
});

test('hosted /mcp passes the caller\'s Authorization straight to the API handler', async () => {
  const seen = [];
  const handler = async req => {
    seen.push({ method: req.method, path: new URL(req.url).pathname, auth: req.headers.get('authorization'), body: req.body ? await req.json() : undefined });
    return new Response(JSON.stringify({ task: { taskId: '1' } }), { status: 201 });
  };
  const res = await apiFor('Bearer llapp_abc', handler)('POST', 'tasks', { taskName: 'T' });
  assert.deepEqual(res, { status: 201, data: { task: { taskId: '1' } } });
  assert.deepEqual(seen, [{ method: 'POST', path: '/api/tasks', auth: 'Bearer llapp_abc', body: { taskName: 'T' } }]);
});

test('stdio server: speaks newline-delimited JSON-RPC and sends the bearer key', async () => {
  const hits = [];
  const http = createServer((req, res) => {
    hits.push({ url: req.url, auth: req.headers.authorization });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ counts: { open: 2 } }));
  });
  await new Promise(r => http.listen(0, '127.0.0.1', r));
  const { port } = http.address();
  const child = spawn(process.execPath, ['mcp/server.mjs'], {
    env: { ...process.env, LEARNLEAF_API_TOKEN: 'llapp_test', LEARNLEAF_API_URL: `http://127.0.0.1:${port}/api/`, NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1' },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const replies = [];
  let buf = '';
  const got = n => new Promise(resolve => {
    const check = () => { if (replies.length >= n) resolve(); };
    child.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { replies.push(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); } check(); });
    check();
  });
  try {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_summary', arguments: {} } })}\n`);
    await got(2);
    assert.equal(replies[0].result.serverInfo.name, 'learnleaf');
    assert.deepEqual(replies[1].result.structuredContent, { counts: { open: 2 } });
    assert.deepEqual(hits, [{ url: '/api/summary', auth: 'Bearer llapp_test' }]);
  } finally {
    child.kill();
    http.close();
  }
});
