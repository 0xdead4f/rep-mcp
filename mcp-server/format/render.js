import { redactHeaders } from './redact.js';

const SENSITIVE_HEADERS = new Set([
    'authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'x-access-token'
]);
const AUTO_BODY_LIMIT = 4096;

// ── list_requests ──────────────────────────────────────────────────────────────

export function renderRequestList(rows, fields, total, offset) {
    if (rows.length === 0) return `(no requests${total > 0 ? ` — ${total} total, none matched filters` : ''})`;

    const COL = { id: 4, method: 7, status: 6, host: 28, path: 42, len: 7 };

    const hdr = fields.map(f => (f.toUpperCase()).padEnd(COL[f] ?? 10)).join('  ');
    const div = fields.map(f => '-'.repeat(COL[f] ?? 10)).join('  ');
    const rowLines = rows.map(r =>
        fields.map(f => {
            const w = COL[f] ?? 10;
            const v = String(r[f] ?? '');
            return v.length > w ? v.slice(0, w - 1) + '…' : v.padEnd(w);
        }).join('  ')
    );

    const footer = `showing ${rows.length} of ${total} (offset ${offset})`;
    return [hdr, div, ...rowLines, '', footer].join('\n');
}

// ── view_request ───────────────────────────────────────────────────────────────

export function renderRequest(id, req, opts = {}) {
    const { includeHeaders = false, includeCookies = false, redact = true, body = 'full' } = opts;
    const lines = [`[${id}] ${req.method} ${req.url}`];

    if (includeHeaders && req.headers) {
        lines.push('');
        const h = redact ? redactHeaders(req.headers) : req.headers;
        for (const [k, v] of Object.entries(h)) {
            if (!includeCookies && k.toLowerCase() === 'cookie') continue;
            lines.push(`${k}: ${v}`);
        }
    } else if (includeCookies && req.headers?.Cookie) {
        lines.push('');
        lines.push(`Cookie: ${redact ? '<redacted>' : req.headers.Cookie}`);
    }

    lines.push('');
    lines.push(req.body ? sliceBody(req.body, body) : '(no body)');
    return lines.join('\n');
}

// ── view_response ──────────────────────────────────────────────────────────────

export function renderResponse(id, res, opts = {}) {
    const { includeHeaders = false, redact = true, body = 'auto' } = opts;
    const size = res.body ? formatBytes(res.body.length) : '0 B';
    const ct = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || 'unknown').split(';')[0];
    const lines = [`[${id}] ${res.status} ${res.statusText}  (${size}, ${ct})`];

    if (includeHeaders && res.headers) {
        lines.push('');
        const h = redact ? redactHeaders(res.headers) : res.headers;
        for (const [k, v] of Object.entries(h)) lines.push(`${k}: ${v}`);
    }

    lines.push('');
    const mode = body === 'auto'
        ? ((res.body?.length ?? 0) > AUTO_BODY_LIMIT ? 'head:20' : 'full')
        : body;

    if (res.body) {
        lines.push(sliceBody(res.body, mode));
        if (mode === 'head:20' && res.body.length > AUTO_BODY_LIMIT) {
            lines.push(`\n[truncated — ${formatBytes(res.body.length)} total; use body="full" for more]`);
        }
    } else {
        lines.push('(no body)');
    }

    return lines.join('\n');
}

// ── match ──────────────────────────────────────────────────────────────────────

export function renderMatch(id, pattern, target, matched, hits) {
    if (!matched) return `matched: false\ntarget: ${target}`;
    const hitLines = hits.map(h => `[L${h.line}]  ${h.text}`).join('\n');
    return `matched: true\ntarget: ${target}\nhits: ${hits.length}\n${hitLines}`;
}

// ── endpoints ─────────────────────────────────────────────────────────────────

export function renderEndpoints(entries) {
    if (entries.length === 0) return '(no endpoints)';
    const mw = Math.max(...entries.map(e => e.method.length), 6);
    const hw = Math.max(...entries.map(e => e.host.length), 4);
    return entries.map(e =>
        `${e.method.padEnd(mw)}  ${e.host.padEnd(hw)}  ${e.path}  ×${e.count}`
    ).join('\n');
}

// ── helpers ───────────────────────────────────────────────────────────────────

export function sliceBody(body, mode) {
    if (!mode || mode === 'full') return body;
    if (mode === 'none') return '(body omitted)';

    const lines = body.split('\n');

    const m = mode.match(/^(head|tail):(\d+)$/);
    if (m) {
        const n = parseInt(m[2], 10);
        return (m[1] === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n');
    }

    const rx = mode.match(/^\/(.+)\/([gi]*)$/);
    if (rx) {
        const re = new RegExp(rx[1], rx[2] || 'i');
        const matched = lines
            .map((l, i) => re.test(l) ? `[L${i + 1}]  ${l}` : null)
            .filter(Boolean);
        return matched.length ? matched.join('\n') : '(no lines matched)';
    }

    return body;
}

function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
}
