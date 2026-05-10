<p align="center">
  <!-- Chrome Supported -->
  <img src="https://img.shields.io/badge/Chrome-Supported-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Supported">

  <!-- AppSec Tool -->
  <img src="https://img.shields.io/badge/AppSec-Tool-blueviolet" alt="AppSec Tool">

  <!-- Bug Bounty Friendly -->
  <img src="https://img.shields.io/badge/Bug%20Bounty-Friendly-orange" alt="Bug Bounty Friendly">

  <!-- Stars -->
  <a href="https://github.com/bscript/rep/stargazers">
    <img src="https://img.shields.io/github/stars/bscript/rep?style=social" alt="GitHub Stars">
  </a>

   <!-- Discord -->
  <a href="https://discord.gg/D25vDTXFUP">
        <img src="https://img.shields.io/discord/1442955541293961429.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2" alt="Discord">
  </a>

  <!-- Sponsor -->
  <a href="https://github.com/sponsors/bscript">
    <img src="https://img.shields.io/badge/Sponsor-%F0%9F%92%96-ea4aaa?style=flat-square" alt="Sponsor">
  </a>
</p>

# rep+ (with MCP)

> 🍴 **This is a fork of [bscript/rep](https://github.com/bscript/rep) that adds MCP (Model Context Protocol) integration.**
> Every captured request is exposed to Claude Code (and any other MCP-compatible client) as a tool, and the in-panel AI chat can be routed through your local `claude` CLI — no API key needed.
> See **[🔥 MCP Integration](#-mcp-integration--end-to-end-install)** below.

rep+ is a lightweight Chrome DevTools extension inspired by Burp Suite's Repeater, now supercharged with AI. I often need to poke at a few requests without spinning up the full Burp stack, so I built this extension to keep my workflow fast, focused, and intelligent with integrated LLM support.

<img width="1713" height="986" alt="Screenshot 2025-12-26 at 15 35 43" src="https://github.com/user-attachments/assets/31015b99-b1d0-4a8e-8f4d-0db3e43af59b" />

[![Watch Demo](https://img.shields.io/badge/Demo-Video-red?style=for-the-badge&logo=youtube)](https://video.twimg.com/amplify_video/1992382891196571648/pl/zE5-oOXgVua1ZBQn.m3u8?tag=14)

## 🚀 Install rep+ Chrome Extension  
[![rep+](https://img.shields.io/badge/rep%2B%20Chrome%20Extension-Install%20Now-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/rep+/dhildnnjbegaggknfkagdpnballiepfm)


## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [🔥 MCP Integration — End-to-End Install](#-mcp-integration--end-to-end-install)
- [Permissions & Privacy](#permissions--privacy)
- [Limitations](#-limitations)
- [Star History](#star-history)
- [Found a Bug or Issue?](#found-a-bug-or-issue)
- [❤️ Support the Project](#️-support-the-project)

## Features

### Capture & Replay
- No proxy setup; works directly in Chrome (no CA certs needed).
- Capture every HTTP request and replay with modified method, headers, or body.
- Multi-tab capture (optional permission) with visual indicators 🌍 and deduplication.
- Clear workspace quickly; export/import requests as JSON for sharing or later reuse.

### Organization & Filtering
- Hierarchical grouping by page and domain (first-party prioritized).
- Third-party detection and collapsible groups; domain badges for quick context.
- Starring for requests, pages, and domains (auto-star for new matches).
- Timeline view (flat, chronological) to see what loaded before a request.
- Filters: method, domain, color tags, text search, regex mode.

### Views & Editing
- Pretty / Raw / Hex views; layout toggle (horizontal/vertical).
- Converters: Base64, URL encode/decode, JWT decode, Hex/UTF-8.
- History, undo/redo, and syntax highlighting for requests/responses.
- Context menu helpers on the request editor:
  - Convert selected text (Base64, URL encode/decode, JWT decode).
  - **Copy as** full HTTP request in multiple languages: `curl`, PowerShell (`Invoke-WebRequest`), Python (`requests`), and JavaScript `fetch`.
- Screenshot editor for request/response pairs: full-content capture, side‑by‑side or stacked layout, zoom, highlight and black-box redaction, resizable/movable annotations, keyboard delete, and undo/redo for all edits.

### Bulk & Automation
- Bulk replay with 4 attack modes: Sniper, Battering Ram, Pitchfork, Cluster Bomb.
- Mark positions with `§`, configure payloads, pause/resume long runs.
- Response diff view to spot changes between baseline and attempts.

### Extractors & Search
- Unified Extractor: secrets, endpoints, and parameters from captured JS.
- **Secret Scanner**: entropy + patterns with confidence scores; pagination and domain filter.
  - Powered by [Kingfisher](https://github.com/mongodb/kingfisher) rules for comprehensive secret detection
  - Supports AWS, GitHub, Google, Slack, Stripe, Twilio, Azure, and many more service providers
  - Rules stored locally in `rules/` directory for offline use
  - **Note**: Secret scanning only analyzes JavaScript files from the **current inspected tab**.
  - **Export**: Export all secrets to CSV for analysis and reporting
- **Endpoint Extractor**: full URLs, relative paths, GraphQL; method detection; one-click copy (rebuilds base URL).
  - **Export**: Export all endpoints to CSV with method, endpoint path, confidence, and source file
- **Parameter Extractor**: passive JavaScript parameter discovery with intelligent grouping and risk assessment.
  - **Parameter Types**: Extracts query, body, header, and path parameters from JavaScript files
  - **Grouped by Endpoint**: Parameters are organized by endpoint with expandable/collapsible groups
  - **Risk Classification**: Automatically identifies high-risk parameters (auth, admin, debug flags, IDOR, feature flags)
  - **Confidence Scoring**: Stricter confidence model than endpoints to reduce false positives
  - **Smart Filtering**: Suppresses common false positives (webpack, React, jQuery, DOM events, telemetry)
  - **Copy as cURL**: One-click copy generates curl commands with all parameters properly formatted
  - **Location Badges**: Visual indicators for parameter location (query/body/header/path)
  - **Domain Filtering**: Filter parameters by source domain with accurate counts
  - **Column Sorting**: Sort by parameter name, location, endpoint, method, risk level, or confidence
  - **Export Options**:
    - **CSV Export**: Export all parameters with location, endpoint, method, risk level, and confidence
    - **Postman Collection Export**: Generate ready-to-import Postman collection JSON with all endpoints and parameters
      - Automatically groups parameters by endpoint
      - Includes query, body, and header parameters
      - Uses Postman variable syntax (`{{paramName}}`) for easy testing
      - Perfect for security testers who want to quickly import discovered APIs into Postman
- **Response Search**: regex support, match preview, pagination, domain filter.

### AI Assistance

#### Rep+ AI Assistance (Interactive LLM Chat)
- **Interactive Chat Interface**: Real-time conversation with AI about your HTTP requests and responses
  - Streaming responses with live markdown rendering
  - Syntax highlighting for code blocks (supports multiple languages)
  - Copy-to-clipboard for code blocks with visual feedback
  - Token usage counter with color-coded warnings
- **Per-Request Chat History**: Each request maintains its own conversation history
  - Automatically saves chat when switching between requests
  - Restores previous conversations when returning to a request
  - Clear chat button resets only the current request's conversation
- **Cross-Reference Previous Requests**: Reference investigations from other requests
  - "Reference previous requests" UI with collapsible/expandable list
  - Select which previous requests to include in context
  - AI receives summaries of previous investigations for referenced requests
  - Perfect for multi-step testing scenarios (e.g., login → authenticated request)
- **Request Modification**: AI can modify requests directly in the editor
  - "Apply modifications" button appears when AI suggests changes
  - Smart detection: only shows when modifications are actually suggested
  - Preserves request structure (headers, formatting, HTTP version)
  - Animated application with visual feedback
  - Supports header updates, body modifications, and new header additions
- **Response History Tracking**: Tracks multiple responses from resends
  - Maintains chronological history of all responses (original + resends)
  - AI has context on all responses when analyzing changes
  - Conditional inclusion: only includes full history when relevant (token optimization)
- **Smart Context Management**: Intelligent token optimization
  - Response truncation for large responses (~1,500 tokens max)
  - Chat history compression (summarizes older messages)
  - Conditional response inclusion (only when asked about)
  - Limits response history to last 2-3 responses
  - Keeps last 15 messages in conversation history
- **Multi-Provider Support**: Works with Claude, Gemini, local Ollama models, and the **Claude Code CLI**
  - Automatic model detection for Anthropic and Gemini APIs
  - Manual URL/model configuration for local models
  - Streaming support for all providers
  - **Claude Code (local CLI)** — route the chat through your locally-installed `claude` CLI via the rep-mcp bridge. No API key in the panel; auth comes from `claude`. Extended thinking is enabled (`maxThinkingTokens: 32000`) and `Bash` is available as a tool
- **Use Cases**:
  - Security testing and penetration testing guidance
  - Request/response explanation and debugging
  - Automated request modification for testing
  - Bug bounty report generation
  - Vulnerability identification and attack vector suggestions
  - Multi-step attack chain planning with cross-request context

#### Other AI Features
- **Explain Request** (Claude/Gemini) with streaming responses.
- **Suggest Attack Vectors**: request + response analysis; auto-send if no response; payload suggestions; reflections/errors/multi-step chains; fallback to request-only with warning.
- **Context menu "Explain with AI"** for selected text.
- **Attack Surface Analysis** per domain: categorization (Auth/Payments/Admin/etc.), color-coded icons, toggle between list and attack-surface view.
- **Export AI outputs** as Markdown or PDF to save RPD/TPM.

### Productivity & Theming
- **7 Beautiful Themes**: Choose from a variety of modern, carefully crafted themes:
  - 🌙 **Dark (Default)**: Classic dark theme optimized for long sessions
  - ☀️ **Light**: Clean light theme for bright environments
  - 🎨 **Modern Dark**: VS Code Dark+ inspired theme with enhanced contrast
  - ✨ **Modern Light**: GitHub-style light theme with crisp colors
  - 💙 **Blue**: Cool blue/cyan color scheme for a fresh look
  - 🔆 **High Contrast**: Accessibility-focused theme with maximum contrast
  - 🖥️ **Terminal**: Green-on-black terminal aesthetic for retro vibes
- **Theme Selector**: Easy dropdown menu to switch themes instantly
- **Smooth Transitions**: Animated theme switching for a polished experience
- **Optimized Syntax Highlighting**: All themes include carefully tuned colors for:
  - HTTP methods, paths, headers, and versions
  - JSON keys, strings, numbers, booleans, and null values
  - Parameters and cookies
  - Request method badges (GET, POST, PUT, DELETE, PATCH)
- **Theme Persistence**: Your theme preference is saved and restored automatically
- Request color tags and filters.
- Syntax highlighting for JSON/XML/HTML.

## Quick Start
1) Open Chrome DevTools → “rep+” tab.  
2) Browse: requests auto-capture.  
3) Click a request: see raw request/response immediately.  
4) Edit and “Send” to replay; use AI buttons for explain/attack suggestions.  
5) Use timeline, filters, and bulk replay for deeper testing.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/bscript/rep.git
   ```
2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/` in your browser.
   - Enable **Developer mode** (toggle in the top right corner).
3. **Load the Extension**:
   - Click **Load unpacked**.
   - Select the `rep` folder you just cloned.
4. **Open DevTools**:
   - Press `F12` or right-click -> Inspect.
   - Look for the **rep+** tab (you might need to click the `>>` overflow menu).

This combo makes rep+ handy for bug bounty hunters and vulnerability researchers who want Burp-like iteration without the heavyweight UI. Install the extension, open DevTools, head to the rep+ panel, and start hacking. 😎

### Local Model (Ollama) Setup
If you use a local model (e.g., Ollama) you must allow Chrome extensions to call it, otherwise you’ll see 403/CORS errors.

1. Stop any running Ollama instance.
2. Start Ollama with CORS enabled (pick one):
   - Allow only Chrome extensions:
     ```bash
     OLLAMA_ORIGINS="chrome-extension://*" ollama serve
     ```
   - Allow everything (easier for local dev):
     ```bash
     OLLAMA_ORIGINS="*" ollama serve
     ```
3. Verify your model exists (e.g., `gemma3:4b`) with `ollama list`.
4. Reload the extension and try again. If you still see 403, check Ollama logs for details.

---

## 🔥 MCP Integration — End-to-End Install

<p align="center">
  <img src="https://img.shields.io/badge/🧩-MCP_Powered-FF6B35?style=for-the-badge" alt="MCP Powered">
  <img src="https://img.shields.io/badge/🛠-6_Tools_Exposed-7B68EE?style=for-the-badge" alt="6 Tools Exposed">
  <img src="https://img.shields.io/badge/⚡-Claude_Code_Compatible-success?style=for-the-badge" alt="Claude Code Compatible">
  <img src="https://img.shields.io/badge/🔑-Optional_No_API_Key-blue?style=for-the-badge" alt="Optional No API Key">
</p>

> **The headline feature of this fork.** A bundled Node WebSocket bridge (`rep-mcp`) turns every captured HTTP request into an **MCP tool** that any MCP-compatible client (Claude Code, etc.) can call — list, view, regex-search, replay. As a bonus, the in-panel AI chat can be routed through your local `claude` CLI, skipping API keys entirely.
>
> **Architecture:**
> ```
> Claude Code (or any MCP client) ─stdio─►  rep-mcp server  ◄─ws─►  rep+ panel  ◄─►  captured requests
>                                               ▲
>                                               └── Claude Agent SDK (when chat is routed via claude CLI)
> ```

### 🛠 What the MCP server exposes
| Tool             | Purpose                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `list_requests`  | List captured requests with field projection, filter, sort, regex search across body/headers |
| `view_request`   | Full request dump for one id (headers/cookies redacted by default to save tokens)        |
| `view_response`  | Full response dump for one id (body auto-truncates at 4 KB unless `body="full"`)         |
| `match`          | Boolean predicate — does a regex hit inside request/response? Returns matched lines only |
| `endpoints`      | Deduplicated `METHOD host path × count` inventory — recon without full body dumps        |
| `replay_request` | Replay a captured request through the extension and return the live response             |

### ✅ Prerequisites
- **Node.js 18+** (`node --version`)
- **Chrome / Chromium**
- An MCP-compatible client (e.g. **Claude Code**) — only required if you want to call the tools from outside the panel
- A Claude account (subscription / API key / Bedrock / Vertex) — only required if you want the chat-pane routing through `claude`

### 📦 Step 1 — Install this fork (the rep+ Chrome extension)
```bash
git clone https://github.com/0xdead4f/rep-mcp.git
```
Then in Chrome:
1. Open `chrome://extensions/`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked** → select the cloned `rep-mcp` folder
4. Open DevTools (`F12`) → click the **rep+** tab (use `>>` overflow if needed)

> Upstream rep+ is also on the [Chrome Web Store](https://chromewebstore.google.com/detail/rep+/dhildnnjbegaggknfkagdpnballiepfm), but it does **not** include the MCP bridge — clone this fork to get it.

### 🌉 Step 2 — Start the rep-mcp bridge
The bridge lives in `mcp-server/`. It does double duty: serves an **MCP stdio server** to Claude Code-style clients **and** a **WebSocket server** to the rep+ panel.

```bash
npx rep-mcp
```

You should see:
```
[rep-mcp] Bridge listening on ws://localhost:54321
[rep-mcp] MCP stdio server ready
```

Leave it running. The WS port is configurable via `REP_MCP_PORT=...` and in Settings → **Bridge Port**.

### ⚙️ Step 3 — Connect the panel to the bridge
1. Click the **Settings** gear in the rep+ panel.
2. Toggle **MCP Server** on.
3. The **MCP config snippet** below the toggle is the JSON to paste into your MCP client (e.g. Claude Code's `~/.config/claude/mcp.json`).
4. The status dot should go **green** within ~3 seconds. If not, confirm `npx rep-mcp` is still running.

You can now call `mcp__rep__list_requests`, `mcp__rep__view_response`, etc. from Claude Code against your live capture.

### 🧠 Optional Step 4 — Install the bundled Claude Code skill
A pre-written skill that teaches Claude Code how to use the `mcp__rep__*` tools effectively for blackbox pentesting (token-aware defaults, tool-by-tool examples, browser-MCP composition patterns) ships at `.claude/skills/rep+mcp/SKILL.md`.

**Project scope** (works automatically when Claude Code is launched from this repo):
```bash
# nothing to do — it's already at .claude/skills/rep+mcp/
```

**User scope** (works from any directory):
```bash
mkdir -p ~/.claude/skills
cp -r .claude/skills/rep+mcp ~/.claude/skills/
```

Restart Claude Code (or run `/skills` to confirm `rep-mcp` shows up). The skill auto-triggers on pentest-flavored requests once the MCP tools are visible.

### 💬 Optional Step 5 — Route the panel's AI chat through `claude`
If you also want the in-panel chat to skip API keys and use your local `claude` CLI:

```bash
# install claude CLI (one-time)
npm install -g @anthropic-ai/claude-code

# log in (opens your browser)
claude
```

Then in the rep+ panel: **Settings** → **AI Provider** → **`Claude Code (local CLI)`** → **Save**. The panel now streams chat through `claude`, with extended thinking + Bash enabled by default.

### 🎛️ Defaults for the chat-routing path
| Setting              | Value                            | Why                                                     |
| -------------------- | -------------------------------- | ------------------------------------------------------- |
| `model`              | inherits from `claude` CLI       | Whatever you've configured Claude Code to use           |
| `maxThinkingTokens`  | `32000`                          | Heavy extended thinking; expect a delay before streaming |
| `allowedTools`       | `['Bash']`                       | Shell execution available; nothing else                  |
| `permissionMode`     | `'bypassPermissions'`            | No permission dialogs (panel can't render them anyway)   |
| `customSystemPrompt` | rep+ chat system prompt + transcript | Replaces Claude Code's persona for chat-style behavior |

Tweak any of these in `mcp-server/claude-chat.js` and restart `npx rep-mcp`.

### ⚠️ Security warning — applies only to the chat-routing path (Step 5)
Bash runs **as the user that started `npx rep-mcp`**, in that process's **current working directory**, with **no permission prompts**. Anything the assistant ingests — including content extracted from captured HTTP responses — becomes potential prompt-injection into your shell.

Mitigations:
- Run the bridge from a sandbox/scratch directory.
- Edit `mcp-server/claude-chat.js` and add `cwd: '/path/to/sandbox'` + `additionalDirectories: []` to the `query()` options to constrain filesystem access.
- Remove `'Bash'` from `allowedTools` if you only want chat.
- The MCP tools themselves (Steps 1–3) only **read** captured request data — they don't execute shell commands, so this warning doesn't apply if you skip Step 5.

### 🩺 Troubleshooting
| Symptom                                  | Likely cause                                  | Fix                                                              |
| ---------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Status dot stays grey                    | Bridge not running                            | Start `npx rep-mcp`                                              |
| MCP client can't see the tools           | `mcp.json` missing the snippet from Settings  | Copy from Settings → "MCP config snippet" and restart your client |
| Chat pane stuck in "thinking" forever    | Bridge running old code (no `claude-chat` handler) | Restart `npx rep-mcp`                                            |
| Chat errors with auth message            | `claude` CLI not logged in                    | Run `claude` once interactively, complete login, retry           |
| `EADDRINUSE` on bridge start             | Port 54321 already in use                     | Set `REP_MCP_PORT=PORT npx rep-mcp` and update Settings → Bridge Port |
| First chat chunk takes 5–15s             | Extended thinking is running                  | Expected — lower `maxThinkingTokens` in `claude-chat.js` for snappier replies |


## Permissions & Privacy
- **Optional**: `webRequest` + `<all_urls>` only when you enable multi-tab capture.  
- **Data**: Stored locally; no tracking/analytics.  
- **AI**: Your API keys stay local; request/response content is sent only to the provider you choose (Claude/Gemini) when you invoke AI features. With **Claude Code (local CLI)** the chat goes through your local `claude` binary — auth is whatever that binary is configured with (Anthropic API, Claude subscription, Bedrock, Vertex).


## ⚠️ Limitations

rep+ runs inside Chrome DevTools, so:

- No raw HTTP/1 or malformed requests (fetch() limitation)
- Some headers can’t be overridden (browser sandbox)
- No raw TCP sockets (no smuggling/pipelining tests)
- DevTools panel constraints limit certain UI setups

rep+ is best for quick testing, replaying, and experimenting — not full low-level HTTP work.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=bscript/rep&type=date&legend=top-left)](https://www.star-history.com/#bscript/rep&type=date&legend=top-left)

## Found a Bug or Issue?

If you encounter any bugs, unexpected behavior, or have feature requests, please help me improve **rep+** by [opening an issue here](https://github.com/bscript/rep/issues).  
I’ll do my best to address it as quickly as possible! 🙏

## ❤️ Support the Project

I maintain **rep+** alone, in my free time.  
Sponsorship helps me keep improving the extension, adding new features, and responding to issues quickly.

If **rep+ saved you time** during testing, development, or bug bounty work, please consider supporting the project.  
**Every dollar helps. ❤️**

## Contributors 🤝

<a href="https://github.com/bscript/rep/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bscript/rep" alt="Contributors" />
</a>

---

<h3 align="center">Sponsors</h3>
<p align="center">
  <a href="https://github.com/projectdiscovery">
    <img src="https://avatars.githubusercontent.com/u/50994705?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/Snownin9">
    <img src="https://avatars.githubusercontent.com/u/218675317?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/exxoticx">
    <img src="https://avatars.githubusercontent.com/u/50809037?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/eduquintanilha">
    <img src="https://avatars.githubusercontent.com/u/14018253?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
  &nbsp;&nbsp;
   <a href="https://github.com/Snownull">
    <img src="https://avatars.githubusercontent.com/u/190537179?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/assem-ch">
    <img src="https://avatars.githubusercontent.com/u/315228?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/MrTurvey">
    <img src="https://avatars.githubusercontent.com/u/5578593?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/greenat92">
    <img src="https://avatars.githubusercontent.com/u/8342706?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
   &nbsp;&nbsp;
   <a href="https://github.com/tixxdz">
    <img src="https://avatars.githubusercontent.com/u/1549291?s=60" width="60" style="border-radius:50%;" alt="Sponsor"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/sponsors/bscript">
    <img src="https://img.shields.io/badge/Become%20a%20Sponsor-%F0%9F%92%96-ea4aaa?style=for-the-badge" alt="Become a Sponsor"/>
  </a>
  <a href="https://github.com/user-attachments/assets/8e6933b5-8579-480b-99cf-161a392b4153">
    <img src="https://img.shields.io/badge/Bitcoin%20Sponsor-₿-f7931a?style=for-the-badge&logo=bitcoin&logoColor=white" alt="Bitcoin Sponsor"/>
  </a>
</p>
