import { renderEndpoints } from '../format/render.js';

export async function listEndpoints(bridge, params) {
    const { host, path, method, sort = 'hits', order = 'desc' } = params;

    const data = await bridge.request('list_endpoints', { host, path, method, sort, order });

    return renderEndpoints(data.endpoints);
}
