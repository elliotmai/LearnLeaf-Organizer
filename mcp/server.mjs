#!/usr/bin/env node
/*
 * LearnLeaf MCP server over stdio — for Claude CLI (and any MCP client) on
 * your own machine. No install needed: plain Node 18+.
 *
 * It talks to the deployed personal API over HTTPS with your Connected-apps key:
 *   LEARNLEAF_API_TOKEN  an llapp_ key (Account & Preferences → Connected apps)
 *   LEARNLEAF_API_URL    optional; default https://learnleaf.flyingdoublemranch.com/api
 *
 * The repo's .mcp.json registers this for Claude Code; see README → MCP server.
 * Messages are newline-delimited JSON-RPC on stdin/stdout; logs go to stderr.
 */
import { createInterface } from 'node:readline';
import { handlePayload, parseError } from './protocol.mjs';

const BASE = (process.env.LEARNLEAF_API_URL || 'https://learnleaf.flyingdoublemranch.com/api').replace(/\/+$/, '');
const TOKEN = (process.env.LEARNLEAF_API_TOKEN || '').trim();

if (!TOKEN) console.error('[learnleaf-mcp] LEARNLEAF_API_TOKEN is not set; LearnLeaf will refuse requests until it is.');

async function api(method, path, body) {
  const headers = { accept: 'application/json' };
  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${BASE}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', // never follow a redirect with the key attached
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text.slice(0, 500) }; }
  return { status: res.status, data };
}

const send = msg => process.stdout.write(`${JSON.stringify(msg)}\n`);

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', async line => {
  if (!line.trim()) return;
  let payload;
  try { payload = JSON.parse(line); } catch { send(parseError()); return; }
  try {
    const reply = await handlePayload(payload, { api });
    if (reply) send(reply);
  } catch (e) {
    console.error('[learnleaf-mcp]', e);
    if (payload?.id !== undefined) send({ jsonrpc: '2.0', id: payload.id, error: { code: -32603, message: 'Internal error' } });
  }
});
