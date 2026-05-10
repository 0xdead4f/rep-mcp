const SENSITIVE = new Set([
    'authorization', 'cookie', 'set-cookie',
    'x-api-key', 'x-auth-token', 'x-access-token', 'x-secret', 'x-csrf-token'
]);

export function redactHeaders(headers, redact = true) {
    if (!redact || !headers) return headers;
    const out = {};
    for (const [k, v] of Object.entries(headers)) {
        out[k] = SENSITIVE.has(k.toLowerCase()) ? '<redacted>' : v;
    }
    return out;
}
