#!/usr/bin/env node
import { startBridge } from './bridge.js';
import { startMCPServer } from './server.js';
import { registerClaudeChat } from './claude-chat.js';

const WS_PORT = parseInt(process.env.REP_MCP_PORT || '54321', 10);

const bridge = await startBridge(WS_PORT);
registerClaudeChat(bridge);
await startMCPServer(bridge);
