import { snapshot } from '../snapshot.js';
import { renderRequestList } from '../format/render.js';

export async function listRequests(bridge, params) {
    const {
        limit = 20, offset = 0,
        fields = ['id', 'method', 'status', 'host', 'path', 'len'],
        host, path, method, status,
        match, match_in = 'response.body',
        sort = 'time', order = 'desc',
        format = 'text',
    } = params;

    const data = await bridge.request('list_requests', {
        host, path, method, status, match, match_in, sort, order
    });

    // Refresh snapshot so view/match/replay can resolve IDs
    snapshot.refresh(data.requests);

    const page = data.requests.slice(offset, offset + limit);

    const rows = page.map((req, i) => ({
        id: offset + i,
        method: req.method,
        status: String(req.status ?? ''),
        host: req.host,
        path: req.path,
        len: formatLen(req.responseLength),
    }));

    if (format === 'json') return JSON.stringify(rows, null, 2);

    const validFields = fields.filter(f => ['id', 'method', 'status', 'host', 'path', 'len'].includes(f));
    return renderRequestList(rows, validFields, data.total, offset);
}

function formatLen(n) {
    if (!n) return '-';
    if (n < 1024) return `${n}B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)}K`;
    return `${(n / 1048576).toFixed(1)}M`;
}
