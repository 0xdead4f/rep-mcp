#!/usr/bin/env bash
# rep-mcp one-shot installer.
# Registers rep-mcp with Claude Code so the bridge auto-spawns whenever
# `claude` starts, and installs the bundled pentest skill.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf "\033[1;36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
err() { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; }

# 1. Node.js check
if ! command -v node >/dev/null 2>&1; then
    err "Node.js 18+ required. Install from https://nodejs.org"
    exit 1
fi
ok "Node.js: $(node --version)"

# 2. claude CLI
if ! command -v claude >/dev/null 2>&1; then
    say "Installing claude CLI globally..."
    npm install -g @anthropic-ai/claude-code
    say "Run 'claude' once to log in, then re-run this script."
    exit 0
fi
ok "claude CLI: $(claude --version 2>/dev/null || echo 'present')"

# 3. Register rep-mcp at user scope so it auto-spawns whenever `claude` starts
say "Registering rep-mcp with Claude Code (user scope)..."
if claude mcp list 2>/dev/null | grep -qE '^\s*rep\b'; then
    ok "rep already registered (skipping). Run 'claude mcp remove rep' to re-register."
else
    claude mcp add -s user rep -- npx rep-mcp
    ok "Registered. Run 'claude mcp list' to verify."
fi

# 4. Install the pentest skill at user scope
SKILL_SRC="$REPO_DIR/.claude/skills/rep+mcp"
SKILL_DST="$HOME/.claude/skills/rep+mcp"
if [ -d "$SKILL_SRC" ]; then
    say "Installing rep+mcp pentest skill to $SKILL_DST..."
    mkdir -p "$HOME/.claude/skills"
    cp -r "$SKILL_SRC" "$SKILL_DST"
    ok "Skill installed."
else
    err "Skill source not found at $SKILL_SRC — skipping."
fi

cat <<EOF

\033[1;32m=== Setup complete ===\033[0m

Next steps (manual — Chrome blocks programmatic extension install):
  1. Open chrome://extensions/ → enable Developer mode → Load unpacked
     Select this folder:  $REPO_DIR
  2. Open DevTools (F12) → click the rep+ tab
  3. Click the Settings gear → toggle "MCP Server" ON

Then run \`claude\` in any terminal:
  • The bridge auto-spawns (no need for 'npx rep-mcp')
  • The rep+ panel's status dot goes green within ~3s
  • Claude Code can now call mcp__rep__list_requests, view_response, etc.

Optional: route the panel's in-panel chat through \`claude\` (no API key)
  Settings → AI Provider → "Claude Code (local CLI)" → Save
  (Requires the bridge to be running, i.e. \`claude\` is open OR \`npx rep-mcp\` standalone.)

EOF
