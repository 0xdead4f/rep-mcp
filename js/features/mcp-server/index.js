// MCP Server feature — toggle + status indicator wired to the WS client
import { initWsClient, stopWsClient, getWsPort } from './ws-client.js';

const STORAGE_KEY = 'rep_mcp_enabled';
const PORT_KEY    = 'rep_mcp_port';
const DEFAULT_PORT = 54321;

export function setupMCPServer() {
    const toggle   = document.getElementById('mcp-server-toggle');
    const indicator = document.getElementById('mcp-status-dot');
    const statusTxt = document.getElementById('mcp-status-text');
    const portInput = document.getElementById('mcp-port-input');
    const snippet   = document.getElementById('mcp-config-snippet');
    const copyBtn   = document.getElementById('mcp-copy-config');
    const setupNote = document.getElementById('mcp-setup-note');

    if (!toggle) return; // panel.html not updated yet

    const savedPort = parseInt(localStorage.getItem(PORT_KEY) || DEFAULT_PORT, 10);
    if (portInput) portInput.value = savedPort;

    updateSnippet(snippet, savedPort);

    const savedEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
    toggle.checked = savedEnabled;
    if (savedEnabled) startClient(savedPort);

    toggle.addEventListener('change', () => {
        const on = toggle.checked;
        localStorage.setItem(STORAGE_KEY, on);
        if (on) {
            const port = parseInt(portInput?.value || DEFAULT_PORT, 10);
            localStorage.setItem(PORT_KEY, port);
            updateSnippet(snippet, port);
            startClient(port);
        } else {
            stopWsClient();
            setStatus('off', indicator, statusTxt, setupNote);
        }
    });

    if (portInput) {
        portInput.addEventListener('change', () => {
            const port = parseInt(portInput.value || DEFAULT_PORT, 10);
            localStorage.setItem(PORT_KEY, port);
            updateSnippet(snippet, port);
            if (toggle.checked) {
                stopWsClient();
                startClient(port);
            }
        });
    }

    if (copyBtn && snippet) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(snippet.textContent).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
            });
        });
    }

    function startClient(port) {
        setStatus('connecting', indicator, statusTxt, setupNote);
        initWsClient(port, (status) => setStatus(status, indicator, statusTxt, setupNote));
    }
}

function setStatus(status, dot, text, note) {
    if (!dot || !text) return;
    const map = {
        off:          { color: 'var(--text-muted, #666)',    label: 'Off' },
        connecting:   { color: 'var(--warning-color, #f90)', label: 'Connecting…' },
        connected:    { color: 'var(--success-color, #4c4)', label: 'Connected' },
        disconnected: { color: 'var(--error-color, #c44)',   label: 'Disconnected — run: npx rep-mcp' },
    };
    const s = map[status] || map.off;
    dot.style.background = s.color;
    text.textContent = s.label;
    if (note) note.style.display = status === 'disconnected' ? 'block' : 'none';
}

function updateSnippet(el, port) {
    if (!el) return;
    const portLine = port !== DEFAULT_PORT ? `,\n      "env": {"REP_MCP_PORT": "${port}"}` : '';
    el.textContent = `{"mcpServers":{"rep":{"command":"npx","args":["rep-mcp"]${portLine}}}}`;
}
