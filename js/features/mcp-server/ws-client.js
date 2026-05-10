// WebSocket client — connects to the rep-mcp bridge server.
// Handles every message type the bridge can send, pulls data from state.
import { state } from '../../core/state.js';
import { parseRequest, executeRequest } from '../../network/capture.js';

const DEFAULT_PORT = 54321;
let ws = null;
let reconnectTimer = null;
let enabled = false;
let onStatusChange = () => {};

// Outbound chat streams initiated by the extension.
// id → { onChunk, onDone, onError }
const chatStreams = new Map();
let chatCounter = 0;

export function initWsClient(port = DEFAULT_PORT, statusCallback) {
    onStatusChange = statusCallback || onStatusChange;
    enabled = true;
    connect(port);
}

export function stopWsClient() {
    enabled = false;
    clearTimeout(reconnectTimer);
    if (ws) { ws.close(); ws = null; }
    onStatusChange('disconnected');
}

export function getWsPort() {
    return parseInt(localStorage.getItem('rep_mcp_port') || DEFAULT_PORT, 10);
}

// ── connection management ──────────────────────────────────────────────────────

function connect(port) {
    if (!enabled) return;
    try {
        ws = new WebSocket(`ws://localhost:${port}`);
    } catch (e) {
        scheduleReconnect(port);
        return;
    }

    ws.onopen = () => {
        onStatusChange('connected');
        console.log('[rep-mcp] Connected to bridge');
    };

    ws.onmessage = async (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        await handleMessage(msg, ws);
    };

    ws.onclose = () => {
        onStatusChange('disconnected');
        ws = null;
        scheduleReconnect(port);
    };

    ws.onerror = () => {
        // onclose fires after onerror, reconnect happens there
    };
}

function scheduleReconnect(port, delayMs = 3000) {
    if (!enabled) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connect(port), delayMs);
}

function reply(socket, id, data, error = null) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(error ? { id, error } : { id, data }));
}

// ── message handlers ───────────────────────────────────────────────────────────

async function handleMessage(msg, socket) {
    const { id, type, params = {} } = msg;

    // Stream replies for extension-initiated chat
    if (type === 'claude-chat-delta' || type === 'claude-chat-done' || type === 'claude-chat-error') {
        const handler = chatStreams.get(id);
        if (!handler) return;
        if (type === 'claude-chat-delta') handler.onChunk(msg.text || '');
        else if (type === 'claude-chat-done') { chatStreams.delete(id); handler.onDone(); }
        else { chatStreams.delete(id); handler.onError(msg.error || 'Claude Code error'); }
        return;
    }

    try {
        let data;
        switch (type) {
            case 'list_requests':  data = handleListRequests(params);  break;
            case 'list_endpoints': data = handleListEndpoints(params); break;
            case 'get_request':    data = handleGetRequest(params);    break;
            case 'get_response':   data = handleGetResponse(params);   break;
            case 'replay_request': data = await handleReplay(params);  break;
            default:
                reply(socket, id, null, `Unknown message type: ${type}`);
                return;
        }
        reply(socket, id, data);
    } catch (err) {
        reply(socket, id, null, err.message);
    }
}

// ── extension-initiated streaming chat ────────────────────────────────────────

export function isWsConnected() {
    return ws !== null && ws.readyState === WebSocket.OPEN;
}

/**
 * Stream a chat turn through the local `claude` CLI via the rep-mcp bridge.
 *
 * @param {Array<{role:string,content:string}>} messages - System + prior turns + new user message
 * @param {string} systemPrompt - Pulled out of the messages array, passed as customSystemPrompt
 * @param {Function} onChunk - Called with the cumulative text after each delta
 * @returns {Promise<string>} - Final assistant text on success
 */
export function streamClaudeChat(messages, systemPrompt, onChunk) {
    return new Promise((resolve, reject) => {
        if (!isWsConnected()) {
            reject(new Error(
                'Claude Code bridge not connected. Enable MCP Server in Settings and run: npx rep-mcp'
            ));
            return;
        }

        const id = `chat${++chatCounter}-${Date.now()}`;
        let fullText = '';

        chatStreams.set(id, {
            onChunk: (delta) => {
                fullText += delta;
                try { onChunk(fullText); } catch (e) { console.error('[claude-chat] onChunk threw:', e); }
            },
            onDone: () => resolve(fullText),
            onError: (err) => reject(new Error(err))
        });

        try {
            ws.send(JSON.stringify({
                id,
                type: 'claude-chat',
                params: { messages, systemPrompt }
            }));
        } catch (e) {
            chatStreams.delete(id);
            reject(e);
        }
    });
}

// ── list_requests ──────────────────────────────────────────────────────────────

function handleListRequests(params) {
    const { host, path, method, status, match, match_in = 'response.body', sort = 'time', order = 'desc' } = params;

    let results = state.requests.map((r, i) => ({ r, i }));

    // Filters
    if (host) results = results.filter(({ r }) => getHost(r).includes(host));
    if (path) {
        const re = safeRegex(path);
        results = results.filter(({ r }) => re.test(getPath(r)));
    }
    if (method) {
        const methods = method.split(',').map(m => m.trim().toUpperCase());
        results = results.filter(({ r }) => methods.includes(r.request?.method?.toUpperCase()));
    }
    if (status) {
        results = results.filter(({ r }) => matchStatus(r.responseStatus, status));
    }
    if (match) {
        const re = safeRegex(match, 'i');
        results = results.filter(({ r }) => {
            const corpus = getMatchTarget(r, match_in);
            return re.test(corpus);
        });
    }

    // Sort
    results.sort(makeSorter(sort, order));

    return {
        total: results.length,
        requests: results.map(({ r, i }) => ({
            _index: i,
            method: r.request?.method || '',
            url: r.request?.url || '',
            host: getHost(r),
            path: getPath(r),
            status: r.responseStatus || '',
            statusText: r.responseStatusText || '',
            responseLength: r.responseBody?.length ?? 0,
            contentType: getContentType(r),
            capturedAt: r.capturedAt || 0,
        }))
    };
}

// ── list_endpoints ─────────────────────────────────────────────────────────────

function handleListEndpoints(params) {
    const { host, path, method, sort = 'hits', order = 'desc' } = params;

    const map = new Map(); // key → { method, host, path, count }
    for (const r of state.requests) {
        const m = r.request?.method || '';
        const h = getHost(r);
        const p = getPath(r).split('?')[0]; // strip query for dedup
        if (host && !h.includes(host)) continue;
        if (method && m.toUpperCase() !== method.toUpperCase()) continue;
        if (path) { const re = safeRegex(path); if (!re.test(p)) continue; }

        const key = `${m}|${h}|${p}`;
        if (map.has(key)) map.get(key).count++;
        else map.set(key, { method: m, host: h, path: p, count: 1 });
    }

    let entries = [...map.values()];
    entries.sort((a, b) => {
        const va = sort === 'hits' ? a.count : a[sort] ?? '';
        const vb = sort === 'hits' ? b.count : b[sort] ?? '';
        if (va < vb) return order === 'asc' ? -1 : 1;
        if (va > vb) return order === 'asc' ? 1 : -1;
        return 0;
    });

    return { endpoints: entries };
}

// ── get_request ────────────────────────────────────────────────────────────────

function handleGetRequest(params) {
    const entry = getEntryOrThrow(params.index);
    const req = entry.request || {};
    const headersObj = arrayToObj(req.headers);
    return {
        method: req.method || '',
        url: req.url || '',
        headers: headersObj,
        body: req.postData?.text || null,
    };
}

// ── get_response ───────────────────────────────────────────────────────────────

function handleGetResponse(params) {
    const entry = getEntryOrThrow(params.index);
    const headersObj = arrayToObj(entry.responseHeaders || entry.response?.headers || []);
    return {
        status: entry.responseStatus || entry.response?.status || 0,
        statusText: entry.responseStatusText || entry.response?.statusText || '',
        headers: headersObj,
        body: entry.responseBody || '',
    };
}

// ── replay_request ─────────────────────────────────────────────────────────────

async function handleReplay(params) {
    const { index, modifications } = params;
    const entry = getEntryOrThrow(index);

    // Reconstruct raw HTTP text from HAR entry
    const raw = buildRawHttp(entry, modifications);

    // Determine HTTPS from original URL
    const useHttps = (entry.request?.url || '').startsWith('https');

    const { url, options } = parseRequest(raw, useHttps);
    const t0 = performance.now();
    const result = await executeRequest(url, options);
    const duration = Math.round(performance.now() - t0);

    const headersObj = {};
    if (Array.isArray(result.headers)) {
        result.headers.forEach(h => { if (h?.name) headersObj[h.name] = h.value ?? ''; });
    } else if (result.headers) {
        for (const [k, v] of result.headers.entries?.() || Object.entries(result.headers)) {
            headersObj[k] = v;
        }
    }

    return {
        status: result.status,
        statusText: result.statusText,
        headers: headersObj,
        body: result.body ?? '',
        duration,
    };
}

// ── helpers ────────────────────────────────────────────────────────────────────

function getEntryOrThrow(index) {
    const entry = state.requests[index];
    if (!entry) throw new Error(`Request at index ${index} not found`);
    return entry;
}

function getHost(r) {
    try { return new URL(r.request?.url || '').hostname; } catch { return ''; }
}

function getPath(r) {
    try {
        const u = new URL(r.request?.url || '');
        return u.pathname + u.search;
    } catch { return ''; }
}

function getContentType(r) {
    const hdrs = r.responseHeaders || r.response?.headers || [];
    const h = hdrs.find(h => h.name?.toLowerCase() === 'content-type');
    return (h?.value || '').split(';')[0];
}

function getMatchTarget(r, target) {
    if (target === 'response.body') return r.responseBody || '';
    if (target === 'request.body') return r.request?.postData?.text || '';
    if (target === 'response.headers') return headersArrToText(r.responseHeaders);
    if (target === 'request.headers') return headersArrToText(r.request?.headers);
    return (r.responseBody || '') + headersArrToText(r.responseHeaders);
}

function headersArrToText(arr) {
    if (!arr) return '';
    return arr.map(h => `${h.name}: ${h.value}`).join('\n');
}

function arrayToObj(arr) {
    if (!arr) return {};
    const obj = {};
    for (const h of arr) { if (h?.name) obj[h.name] = h.value ?? ''; }
    return obj;
}

function safeRegex(pattern, flags = 'i') {
    try { return new RegExp(pattern, flags); }
    catch { return new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags); }
}

function matchStatus(code, filter) {
    const s = String(code || '');
    return filter.split(',').some(part => {
        part = part.trim();
        if (/^\d+$/.test(part)) return s === part;
        if (/^\dxx$/i.test(part)) return s.startsWith(part[0]);
        const range = part.match(/^(\d)xx-(\d)xx$/i);
        if (range) {
            const n = parseInt(s[0], 10);
            return n >= parseInt(range[1], 10) && n <= parseInt(range[2], 10);
        }
        return false;
    });
}

function makeSorter(sort, order) {
    const dir = order === 'asc' ? 1 : -1;
    return (a, b) => {
        let va, vb;
        switch (sort) {
            case 'status': va = a.r.responseStatus; vb = b.r.responseStatus; break;
            case 'host':   va = getHost(a.r); vb = getHost(b.r); break;
            case 'path':   va = getPath(a.r); vb = getPath(b.r); break;
            case 'len':    va = a.r.responseBody?.length ?? 0; vb = b.r.responseBody?.length ?? 0; break;
            default:       va = a.r.capturedAt ?? 0; vb = b.r.capturedAt ?? 0;
        }
        if (va < vb) return -dir;
        if (va > vb) return dir;
        return 0;
    };
}

function buildRawHttp(entry, modifications) {
    const req = entry.request || {};
    const urlObj = (() => { try { return new URL(req.url || ''); } catch { return null; } })();
    const path = urlObj ? urlObj.pathname + urlObj.search : '/';

    let raw = `${req.method || 'GET'} ${path} HTTP/1.1\n`;

    // Headers — skip HTTP/2 pseudo-headers; synthesize Host from :authority or URL
    const headers = arrayToObj(req.headers);
    const hasHost = Object.keys(headers).some(k => k.toLowerCase() === 'host');
    if (!hasHost) {
        const authority = headers[':authority'] || (urlObj ? urlObj.host : '');
        if (authority) raw += `Host: ${authority}\n`;
    }
    for (const [k, v] of Object.entries(headers)) {
        if (k.startsWith(':')) continue;
        raw += `${k}: ${v}\n`;
    }

    raw += '\n';
    if (req.postData?.text) raw += req.postData.text;

    // Apply modifications if any (simple line-by-line merge)
    if (modifications) {
        raw = applyModifications(raw, modifications);
    }

    return raw;
}

function applyModifications(raw, mods) {
    // Parse the modifications as additional headers/body to overlay
    // Format: "Header: value\n\nbody text" (same as raw HTTP patch)
    const lines = raw.split('\n');
    const modLines = mods.split('\n');
    const bodyBreak = modLines.indexOf('');

    const extraHeaders = bodyBreak === -1 ? modLines : modLines.slice(0, bodyBreak);
    const newBody = bodyBreak === -1 ? null : modLines.slice(bodyBreak + 1).join('\n');

    // Find where request headers end in original raw
    const rawBreak = lines.findIndex((l, i) => i > 0 && l.trim() === '');
    const requestLine = lines[0];
    const existingHeaders = lines.slice(1, rawBreak);
    const existingBody = lines.slice(rawBreak + 1).join('\n');

    // Merge headers
    const headerMap = {};
    for (const h of existingHeaders) {
        const idx = h.indexOf(':');
        if (idx > 0) headerMap[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    }
    for (const h of extraHeaders) {
        const idx = h.indexOf(':');
        if (idx > 0) headerMap[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    }

    let result = requestLine + '\n';
    for (const [k, v] of Object.entries(headerMap)) result += `${k}: ${v}\n`;
    result += '\n';
    result += newBody !== null ? newBody : existingBody;
    return result;
}
