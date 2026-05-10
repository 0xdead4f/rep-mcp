// WebSocket bridge — extension connects here; tool handlers call bridge.request()
// Extension can also push messages to the server (e.g. claude-chat) via
// inbound handlers registered with bridge.onExtensionMessage().
import { WebSocketServer } from 'ws';

let extensionWs = null;
let counter = 0;
const pending = new Map(); // id → { resolve, reject, timer }
const inboundHandlers = new Map(); // type → async (params, send, id) => void

export async function startBridge(port) {
    const wss = new WebSocketServer({ port });

    wss.on('connection', (ws) => {
        console.error(`[rep-mcp] Extension connected`);
        extensionWs = ws;

        ws.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }

            // Server-initiated request → extension reply
            const entry = pending.get(msg.id);
            if (entry) {
                clearTimeout(entry.timer);
                pending.delete(msg.id);
                if (msg.error) entry.reject(new Error(msg.error));
                else entry.resolve(msg.data);
                return;
            }

            // Extension-initiated message
            if (msg.type && inboundHandlers.has(msg.type)) {
                const handler = inboundHandlers.get(msg.type);
                const send = (payload) => {
                    if (extensionWs && extensionWs.readyState === 1) {
                        extensionWs.send(JSON.stringify({ id: msg.id, ...payload }));
                    }
                };
                Promise.resolve(handler(msg.params || {}, send, msg.id)).catch((err) => {
                    send({ type: `${msg.type}-error`, error: err.message || String(err) });
                });
            }
        });

        ws.on('close', () => {
            console.error('[rep-mcp] Extension disconnected');
            extensionWs = null;
            for (const [, { reject, timer }] of pending) {
                clearTimeout(timer);
                reject(new Error('Extension disconnected'));
            }
            pending.clear();
        });

        ws.on('error', (err) => console.error('[rep-mcp] WS error:', err.message));
    });

    await new Promise((resolve) => wss.once('listening', resolve));
    console.error(`[rep-mcp] Bridge listening on ws://localhost:${port}`);

    return {
        get connected() {
            return extensionWs !== null && extensionWs.readyState === 1 /* OPEN */;
        },

        request(type, params = {}, timeoutMs = 15000) {
            return new Promise((resolve, reject) => {
                if (!extensionWs || extensionWs.readyState !== 1) {
                    return reject(new Error(
                        'rep+ extension not connected. Open Chrome DevTools → rep+ tab and enable MCP Server.'
                    ));
                }

                const id = `r${++counter}`;
                const timer = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error(`Request "${type}" timed out after ${timeoutMs}ms`));
                }, timeoutMs);

                pending.set(id, { resolve, reject, timer });
                extensionWs.send(JSON.stringify({ id, type, params }));
            });
        },

        onExtensionMessage(type, handler) {
            inboundHandlers.set(type, handler);
        }
    };
}
