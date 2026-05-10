import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { listRequests } from './tools/list-requests.js';
import { viewRequest, viewResponse } from './tools/view.js';
import { matchRequest } from './tools/match.js';
import { listEndpoints } from './tools/endpoints.js';
import { replayRequest } from './tools/replay.js';

const TOOLS = [
    {
        name: 'list_requests',
        description: 'List captured HTTP requests with field projection and filtering. ' +
            'Default fields: id, method, status, host, path, len. ' +
            'Use id values from results with view_request / view_response / match / replay_request.',
        inputSchema: {
            type: 'object',
            properties: {
                limit:    { type: 'integer', default: 20, description: 'Max rows to return' },
                offset:   { type: 'integer', default: 0 },
                fields:   { type: 'array', items: { type: 'string' }, description: 'Columns: id method status host path len' },
                host:     { type: 'string', description: 'Substring match on hostname' },
                path:     { type: 'string', description: 'Regex match on path+query' },
                method:   { type: 'string', description: 'e.g. "GET" or "POST,PUT"' },
                status:   { type: 'string', description: 'e.g. "200", "4xx", "2xx-3xx"' },
                match:    { type: 'string', description: 'Regex to search within request/response' },
                match_in: { type: 'string', default: 'response.body', description: 'request.body | request.headers | response.body | response.headers' },
                sort:     { type: 'string', default: 'time', description: 'time | status | host | path | len' },
                order:    { type: 'string', default: 'desc', description: 'asc | desc' },
                format:   { type: 'string', default: 'text', description: 'text | json' },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'view_request',
        description: 'View one captured request. Headers and cookies are off by default to save tokens. ' +
            'Auth header values are redacted unless redact=false.',
        inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
                id:              { type: 'integer' },
                include_headers: { type: 'boolean', default: false },
                include_cookies: { type: 'boolean', default: false },
                redact:          { type: 'boolean', default: true, description: 'Mask Authorization, Cookie, X-API-Key values' },
                body:            { type: 'string', default: 'full', description: '"full" | "none" | "head:N" | "tail:N" | "/regex/"' },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'view_response',
        description: 'View one captured response. Headers off by default. ' +
            'Body auto-truncates at 4KB; use body="full" for complete output.',
        inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
                id:              { type: 'integer' },
                include_headers: { type: 'boolean', default: false },
                redact:          { type: 'boolean', default: true },
                body:            { type: 'string', default: 'auto', description: '"auto" | "full" | "none" | "head:N" | "tail:N" | "/regex/"' },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'match',
        description: 'Predicate search: returns matched=true/false + matching lines. ' +
            'Never returns the full body — use view_response for that. ' +
            'Efficient for yes/no verification (e.g. "does response contain X-Internal-Token?").',
        inputSchema: {
            type: 'object',
            required: ['id', 'pattern'],
            properties: {
                id:             { type: 'integer' },
                pattern:        { type: 'string', description: 'Regex pattern' },
                target:         { type: 'string', default: 'response.body', description: 'request.body | request.headers | request.all | response.body | response.headers | response.all' },
                case_sensitive: { type: 'boolean', default: false },
                context:        { type: 'integer', default: 0, description: 'Lines of context around each match' },
                max_hits:       { type: 'integer', default: 10 },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'endpoints',
        description: 'Deduplicated endpoint inventory: METHOD host path ×count. ' +
            'Replaces list_requests → dedupe in head for recon workflows.',
        inputSchema: {
            type: 'object',
            properties: {
                host:   { type: 'string' },
                path:   { type: 'string', description: 'Regex' },
                method: { type: 'string' },
                sort:   { type: 'string', default: 'hits', description: 'hits | host | path | method' },
                order:  { type: 'string', default: 'desc' },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'replay_request',
        description: 'Replay a captured request via the rep+ extension and return the response. ' +
            'Optionally patch headers/body via modifications (raw HTTP diff text).',
        inputSchema: {
            type: 'object',
            required: ['id'],
            properties: {
                id:            { type: 'integer' },
                modifications: { type: 'string', description: 'Header or body overrides in raw HTTP format' },
            },
            additionalProperties: false,
        },
    },
];

export async function startMCPServer(bridge) {
    const server = new Server(
        { name: 'rep-mcp', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args = {} } = request.params;

        try {
            let text;
            switch (name) {
                case 'list_requests':   text = await listRequests(bridge, args); break;
                case 'view_request':    text = await viewRequest(bridge, args); break;
                case 'view_response':   text = await viewResponse(bridge, args); break;
                case 'match':           text = await matchRequest(bridge, args); break;
                case 'endpoints':       text = await listEndpoints(bridge, args); break;
                case 'replay_request':  text = await replayRequest(bridge, args); break;
                default: throw new Error(`Unknown tool: ${name}`);
            }
            return { content: [{ type: 'text', text }] };
        } catch (err) {
            return {
                content: [{ type: 'text', text: `error: ${err.message}` }],
                isError: true,
            };
        }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('[rep-mcp] MCP stdio server ready');
}
