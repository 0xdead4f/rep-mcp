// Streams a chat turn through the local `claude` CLI via the Claude Agent SDK
// and forwards text deltas to the extension over the WS bridge.
import { query } from '@anthropic-ai/claude-agent-sdk';

const log = (...args) => console.error('[claude-chat]', ...args);

export function registerClaudeChat(bridge) {
    bridge.onExtensionMessage('claude-chat', async (params, send) => {
        const { messages = [], systemPrompt = '' } = params;
        log(`received turn: ${messages.length} messages, last role=${messages[messages.length - 1]?.role}`);

        if (!messages.length) {
            send({ type: 'claude-chat-error', error: 'No messages provided' });
            return;
        }

        const last = messages[messages.length - 1];
        if (!last || last.role !== 'user') {
            send({ type: 'claude-chat-error', error: 'Last message must be from user' });
            return;
        }

        // Flatten prior turns into the system prompt so each query() is stateless.
        const transcript = messages
            .slice(0, -1)
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => `[${m.role.toUpperCase()}]\n${m.content}`)
            .join('\n\n');

        const fullSystem = transcript
            ? `${systemPrompt}\n\nConversation so far:\n${transcript}`
            : systemPrompt;

        // Track text we've already sent via partial deltas, so the assistant-
        // message fallback only emits new tail text rather than re-sending.
        let streamedSoFar = '';

        try {
            const result = query({
                prompt: last.content,
                options: {
                    customSystemPrompt: fullSystem,
                    includePartialMessages: true,
                    allowedTools: ['Bash'],
                    permissionMode: 'bypassPermissions',
                    maxThinkingTokens: 32000,
                    stderr: (data) => log('claude stderr:', String(data).trim()),
                }
            });

            for await (const message of result) {
                if (message.type === 'stream_event') {
                    const evt = message.event;
                    if (evt && evt.type === 'content_block_delta'
                        && evt.delta && evt.delta.type === 'text_delta'
                        && evt.delta.text) {
                        streamedSoFar += evt.delta.text;
                        send({ type: 'claude-chat-delta', text: evt.delta.text });
                    }
                } else if (message.type === 'assistant') {
                    // Fallback: if partial deltas didn't fire (or only fired for
                    // some blocks) flush whatever text the full assistant
                    // message contains beyond what we've already streamed.
                    const blocks = message.message?.content || [];
                    let fullText = '';
                    for (const b of blocks) {
                        if (b.type === 'text' && typeof b.text === 'string') fullText += b.text;
                    }
                    if (fullText && fullText.length > streamedSoFar.length
                        && fullText.startsWith(streamedSoFar)) {
                        const tail = fullText.slice(streamedSoFar.length);
                        streamedSoFar = fullText;
                        send({ type: 'claude-chat-delta', text: tail });
                    } else if (fullText && !streamedSoFar) {
                        streamedSoFar = fullText;
                        send({ type: 'claude-chat-delta', text: fullText });
                    }
                } else if (message.type === 'result') {
                    log(`result subtype=${message.subtype} streamed=${streamedSoFar.length}b`);
                    if (message.subtype === 'success') {
                        send({ type: 'claude-chat-done' });
                    } else {
                        send({
                            type: 'claude-chat-error',
                            error: `Claude Code returned ${message.subtype}`
                        });
                    }
                    return;
                } else {
                    log('other message type:', message.type);
                }
            }

            log('stream ended without result message');
            send({ type: 'claude-chat-done' });
        } catch (err) {
            log('error:', err && err.message ? err.message : err);
            send({
                type: 'claude-chat-error',
                error: err && err.message ? err.message : 'Claude Code error'
            });
        }
    });
}
