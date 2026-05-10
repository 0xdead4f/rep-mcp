import { snapshot } from '../snapshot.js';
import { renderMatch, sliceBody } from '../format/render.js';

const VALID_TARGETS = new Set([
    'request.body', 'request.headers', 'request.all',
    'response.body', 'response.headers', 'response.all'
]);

export async function matchRequest(bridge, params) {
    const {
        id,
        pattern,
        target = 'response.body',
        case_sensitive = false,
        context = 0,
        max_hits = 10,
    } = params;

    if (!VALID_TARGETS.has(target)) {
        throw new Error(`Invalid target "${target}". Valid: ${[...VALID_TARGETS].join(', ')}`);
    }

    const r = snapshot.resolve(id);
    if (!r.found) throw new Error(
        `id ${id} not found (have ids 0–${r.maxId}); call list_requests first`
    );

    const flags = case_sensitive ? '' : 'i';
    let re;
    try { re = new RegExp(pattern, flags); }
    catch (e) { throw new Error(`Invalid regex "${pattern}": ${e.message}`); }

    // Fetch the relevant data from the extension
    const needsRequest = target.startsWith('request.');
    const needsResponse = target.startsWith('response.');
    const [reqData, resData] = await Promise.all([
        needsRequest || target === 'request.all'
            ? bridge.request('get_request', { index: r.index })
            : Promise.resolve(null),
        needsResponse || target === 'response.all'
            ? bridge.request('get_response', { index: r.index })
            : Promise.resolve(null),
    ]);

    const corpus = buildCorpus(target, reqData, resData);
    const lines = corpus.split('\n');
    const hits = [];

    for (let i = 0; i < lines.length && hits.length < max_hits; i++) {
        if (re.test(lines[i])) {
            const ctx = context > 0
                ? lines.slice(Math.max(0, i - context), i + context + 1)
                    .map((l, j) => (j === context ? `[L${i + 1}]  ${l}` : `       ${l}`))
                    .join('\n')
                : null;
            hits.push({ line: i + 1, text: ctx || lines[i] });
        }
    }

    return renderMatch(id, pattern, target, hits.length > 0, hits);
}

function buildCorpus(target, req, res) {
    if (target === 'response.body') return res?.body || '';
    if (target === 'request.body') return req?.body || '';
    if (target === 'response.headers') return headersToText(res?.headers);
    if (target === 'request.headers') return headersToText(req?.headers);
    if (target === 'response.all') return headersToText(res?.headers) + '\n\n' + (res?.body || '');
    if (target === 'request.all') return headersToText(req?.headers) + '\n\n' + (req?.body || '');
    return '';
}

function headersToText(headers) {
    if (!headers) return '';
    return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
}
