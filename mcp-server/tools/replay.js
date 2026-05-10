import { snapshot } from '../snapshot.js';
import { renderResponse } from '../format/render.js';

export async function replayRequest(bridge, params) {
    const { id, modifications = null } = params;

    const r = snapshot.resolve(id);
    if (!r.found) throw new Error(
        `id ${id} not found (have ids 0–${r.maxId}); call list_requests first`
    );

    const result = await bridge.request('replay_request', {
        index: r.index,
        modifications
    }, 30000); // longer timeout for network round-trip

    // result = { status, statusText, headers, body, duration }
    const preview = renderResponse(id, result, { body: 'auto' });
    return `Replayed in ${result.duration}ms\n\n${preview}`;
}
