import { snapshot } from '../snapshot.js';
import { renderRequest, renderResponse } from '../format/render.js';

function resolveOrThrow(id) {
    const r = snapshot.resolve(id);
    if (!r.found) throw new Error(
        `id ${id} not found in current snapshot (have ids 0–${r.maxId}); call list_requests to refresh`
    );
    return r.index;
}

export async function viewRequest(bridge, params) {
    const {
        id,
        include_headers = false,
        include_cookies = false,
        redact = true,
        body = 'full',
    } = params;

    const index = resolveOrThrow(id);
    const data = await bridge.request('get_request', { index });

    return renderRequest(id, data, { includeHeaders: include_headers, includeCookies: include_cookies, redact, body });
}

export async function viewResponse(bridge, params) {
    const {
        id,
        include_headers = false,
        redact = true,
        body = 'auto',
    } = params;

    const index = resolveOrThrow(id);
    const data = await bridge.request('get_response', { index });

    return renderResponse(id, data, { includeHeaders: include_headers, redact, body });
}
