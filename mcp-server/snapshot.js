// Stable ID → extension array index mapping.
// Refreshed on every list_requests call; used by view/match/replay to resolve IDs.
const idToIndex = new Map();
let nextId = 0;

export const snapshot = {
    refresh(requests) {
        idToIndex.clear();
        nextId = 0;
        for (const req of requests) {
            idToIndex.set(nextId++, req._index);
        }
    },

    resolve(id) {
        const n = typeof id === 'string' ? parseInt(id, 10) : id;
        if (!Number.isFinite(n) || !idToIndex.has(n)) {
            return { found: false, maxId: nextId - 1 };
        }
        return { found: true, index: idToIndex.get(n) };
    },

    get size() { return idToIndex.size; }
};
