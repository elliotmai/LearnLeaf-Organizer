/*
 * LearnLeaf MCP server over Streamable HTTP, served at /mcp on the site.
 *
 * For MCP clients that connect to a URL instead of running a local process:
 *   claude mcp add --transport http learnleaf https://learnleaf.flyingdoublemranch.com/mcp \
 *     --header "Authorization: Bearer llapp_..."
 *
 * Stateless: every POST carries one JSON-RPC message (or a batch) and gets the
 * reply as plain JSON; no sessions, no SSE stream. The caller's Authorization
 * header is passed unchanged to the personal API handler (api.mjs), in-process,
 * so it accepts exactly what /api accepts and nothing more.
 */
import apiHandler from './api.mjs';
import { handlePayload, parseError } from '../../mcp/protocol.mjs';

const reply = (status, body, headers = {}) => new Response(body === null ? null : JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
});

export function apiFor(authorization, handler = apiHandler) {
  return async (method, path, body) => {
    const res = await handler(new Request(`https://learnleaf.internal/api/${path}`, {
      method,
      headers: { authorization, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }));
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}

export async function handleMcp(req, { api } = {}) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    // No server-initiated stream and no sessions to end.
    return reply(405, { error: 'Use POST for MCP requests' }, { allow: 'POST' });
  }
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' }, { allow: 'POST' });

  const authorization = req.headers.get('authorization') || '';
  if (!authorization) return reply(401, { error: 'Send Authorization: Bearer <llapp_ key from Connected apps>' });

  let payload;
  try { payload = await req.json(); } catch { return reply(400, parseError()); }
  try {
    const out = await handlePayload(payload, { api: api || apiFor(authorization) });
    return out ? reply(200, out) : reply(202, null);
  } catch (e) {
    console.error('[mcp]', e);
    return reply(500, { jsonrpc: '2.0', id: payload?.id ?? null, error: { code: -32603, message: 'Internal error' } });
  }
}

export default req => handleMcp(req);
