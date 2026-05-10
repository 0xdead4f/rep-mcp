---
name: rep-mcp
description: How to use rep+mcp (mcp__rep__*) effectively and efficiently — mainly purposed for web app pentesting.
---

# rep+ MCP — Blackbox Pentest Skill

`mcp__rep__*` queries a live capture of the user's browser HTTP traffic. Pair it with a Browser MCP (`chrome-devtools-mcp`, `claude-in-chrome`, `playwright-mcp`) — Browser MCP **drives** the page, rep+mcp **observes & replays** what fired.

## Tools

| Tool             | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `endpoints`      | Deduped `METHOD host path × count` inventory. Best starting point.     |
| `list_requests`  | Find ids by filter (method, status, host, path, content match).        |
| `view_request`   | One request's full details. Headers/cookies redacted by default.       |
| `view_response`  | One response body. Auto-truncates at 4 KB.                             |
| `match`          | Boolean predicate + matching lines. Cheapest yes/no check.             |
| `replay_request` | Re-execute, optionally with raw-HTTP overrides.                        |

## Cost rules — read first

- **Filter every `list_requests`**; always pass `fields: ["id","method","status","path"]`.
- **Use `match` before `view_response`** for any yes/no question.
- **Body modes**: prefer `head:N` / `tail:N` / `/regex/` over `"full"`.
- **One id at a time** — don't loop `view_response` over many ids.
- `redact: true` (default) hides `Authorization` / `Cookie` / `X-API-Key`. Flip to `false` when you actually need the value.

## One call per tool

```
mcp__rep__endpoints({ host: "api.target.com", sort: "hits" })
mcp__rep__list_requests({ method: "POST,PUT,PATCH", status: "2xx", fields: ["id","method","path","status"] })
mcp__rep__view_request({ id: 87, include_headers: true, redact: false })
mcp__rep__view_response({ id: 87, body: "head:1024" })
mcp__rep__match({ id: 87, pattern: "set-cookie:.*HttpOnly", target: "response.headers" })
mcp__rep__replay_request({ id: 87, modifications: "Authorization: \nCookie: " })
```

Compose these per task — full pentest, single-class hunt, screening, post-ex pivot. No fixed sequence.

## `replay_request` modifications syntax

Raw-HTTP overlay applied to the original captured request:
- Add/override header: `"X-Forwarded-For: 127.0.0.1"`
- Strip header: `"Authorization: "` (empty value)
- Replace request line: put new line first, e.g. `"GET /other/path HTTP/1.1"`
- Replace body: `"\n\n<new body>"` (blank line splits header overrides from body)
- Combined: `"Authorization: Bearer eyJ...\n\n{\"key\":\"v\"}"`

Always replay against the **original** captured id; replay output isn't re-captured into the same id.

## Browser MCP × rep+mcp patterns

- **Trigger → query**: drive an action with Browser MCP, then `list_requests({ limit: 5, sort: "time" })` to see what fired.
- **Reflection canary**: type a unique string into form fields via Browser MCP, then `list_requests({ match: "<canary>", match_in: "response.body" })`.
- **Auth-state diff**: `view_request({ id, redact: false })` to grab token, then `replay_request({ id, modifications: "Authorization: \nCookie: " })`.
- **Forced-browse**: enumerate hrefs via `evaluate_script`, replay each to find 200s where 403s should be.

## Anti-patterns

- ❌ `list_requests({})` unfiltered.
- ❌ `view_response({ body: "full" })` for a yes/no question — use `match`.
- ❌ Looping `view_response` over many ids.
- ❌ `replay_request` on destructive ops (DELETE / payment / account closure) without confirming first.

## Quick screening (only if asked for "first look" / "screen this")

```
mcp__rep__endpoints({ sort: "hits" })
mcp__rep__list_requests({ status: "5xx", fields: ["id","method","path","status"] })
mcp__rep__list_requests({ status: "401,403", fields: ["id","method","path","status"] })
mcp__rep__list_requests({ match: "(secret|token|key|password)", match_in: "response.body", fields: ["id","method","path"] })
mcp__rep__list_requests({ path: "/(admin|internal|debug|_)", fields: ["id","method","path","status"] })
```

If the capture is empty and Browser MCP is loaded: drive the app first (login + main flows + wait for network idle), then sweep.

## Bridge offline

If a tool errors with "extension not connected": user must open Chrome DevTools → rep+ → Settings → enable **MCP Server**, and confirm `npx rep-mcp` is running.
