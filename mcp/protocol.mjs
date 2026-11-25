/*
 * The MCP (Model Context Protocol) JSON-RPC layer, shared by both transports:
 * mcp/server.mjs (stdio, for Claude CLI on your machine) and
 * netlify/functions/mcp.mjs (Streamable HTTP at /mcp on the site).
 * Hand-written on purpose: it is small, and it keeps the server dependency-free
 * so `node mcp/server.mjs` works without an install.
 */
import { listTools, callTool } from './tools.mjs';

export const SERVER_INFO = { name: 'learnleaf', title: 'LearnLeaf', version: '1.0.0' };
const VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS = `LearnLeaf is a student task manager: subjects (classes), projects, and tasks.
Start with get_summary for what is due. Dates are YYYY-MM-DD and times HH:mm in the user's own timezone (shown in get_summary).
Tasks link to a subject and a project by id; look ids up with list_subjects / list_projects, and use "None" for no link.
Finish a task with update_task taskStatus "Completed" rather than deleting it. Subjects and projects are archived, never deleted.`;

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/**
 * Handles one JSON-RPC message. Returns the response object, or null for a
 * notification (which gets no reply). `api` is passed through to the tools.
 */
export async function handleMessage(msg, { api }) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return fail(msg?.id, -32600, 'Invalid Request');
  }
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined;
  if (isNotification) return null; // notifications/initialized, notifications/cancelled, …

  switch (method) {
    case 'initialize': {
      const asked = params.protocolVersion;
      return ok(id, {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    }
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: listTools() });
    case 'tools/call': {
      const result = await callTool(params.name, params.arguments, api);
      return result ? ok(id, result) : fail(id, -32602, `Unknown tool: ${params.name}`);
    }
    case 'resources/list':
      return ok(id, { resources: [] });
    case 'prompts/list':
      return ok(id, { prompts: [] });
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

/** A message or a batch (array) of them -> the reply, or null when nothing needs one. */
export async function handlePayload(payload, ctx) {
  if (Array.isArray(payload)) {
    const replies = (await Promise.all(payload.map(m => handleMessage(m, ctx)))).filter(Boolean);
    return replies.length ? replies : null;
  }
  return handleMessage(payload, ctx);
}

export const parseError = () => fail(null, -32700, 'Parse error');
