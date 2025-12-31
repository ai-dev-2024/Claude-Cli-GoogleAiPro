/**
 * Express Server - Anthropic-compatible API
 * Proxies to Google Cloud Code via Antigravity
 * Supports multi-account load balancing
 */

import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sendMessage, sendMessageStream, listModels, getModelQuotas } from './cloudcode-client.js';
import { PerplexityClient } from './perplexity-client.js';
import { PerplexityAccountManager } from './perplexity-account-manager.js';
import { PerplexitySessionClient } from './perplexity-session-client.js';
import { PerplexitySessionAccountManager } from './perplexity-session-account-manager.js';
import { getLoginService } from './perplexity-browser-login.js';
import { getPerplexityBrowserClient } from './perplexity-browser-client.js';
import { forceRefresh } from './token-extractor.js';
import { REQUEST_BODY_LIMIT, resolveModelAlias } from './constants.js';
import { AccountManager } from './account-manager.js';
import { formatDuration } from './utils/helpers.js';

const app = express();
const accountManager = new AccountManager();
const perplexityAccountManager = new PerplexityAccountManager();
const perplexityClient = new PerplexityClient(perplexityAccountManager);
// Perplexity Session-based client (uses subscription instead of API keys)
const perplexitySessionManager = new PerplexitySessionAccountManager();
const perplexitySessionClient = new PerplexitySessionClient(perplexitySessionManager);
let isInitialized = false;
let initPromise = null;

// Per-model usage tracking (in-memory, resets on server restart)
const modelUsageTracker = {
    google: {},      // { modelId: count }
    perplexity: {},  // { modelId: count }
    lastReset: new Date().toISOString()
};

function trackModelUsage(provider, modelId) {
    const tracker = provider === 'perplexity' ? modelUsageTracker.perplexity : modelUsageTracker.google;
    tracker[modelId] = (tracker[modelId] || 0) + 1;
}

function getModelUsageStats() {
    return {
        google: { ...modelUsageTracker.google },
        perplexity: { ...modelUsageTracker.perplexity },
        lastReset: modelUsageTracker.lastReset,
        totalGoogle: Object.values(modelUsageTracker.google).reduce((a, b) => a + b, 0),
        totalPerplexity: Object.values(modelUsageTracker.perplexity).reduce((a, b) => a + b, 0)
    };
}

async function ensureInitialized() {
    if (isInitialized) return;
    if (initPromise) return initPromise;
    initPromise = (async () => {
        try {
            await accountManager.initialize();
            await perplexityAccountManager.initialize();
            await perplexitySessionManager.initialize();
            isInitialized = true;
            console.log(`[Server] Account pool initialized: ${accountManager.getStatus().summary}`);
            if (perplexitySessionManager.hasAccounts()) {
                console.log(`[Server] Perplexity session accounts loaded: ${perplexitySessionManager.getAccounts().length}`);
            }
        } catch (error) {
            initPromise = null;
            console.error('[Server] Init failed:', error);
            throw error;
        }
    })();
    return initPromise;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));

// Serve static files (dashboard)
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'public')));

// Dashboard redirect
app.get('/dashboard', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

// Restart endpoint - restarts the proxy server
app.post('/restart', (req, res) => {
    console.log('[Server] Restart requested via dashboard');
    res.json({ status: 'restarting', message: 'Proxy will restart in 2 seconds...' });

    // Graceful restart after response is sent
    setTimeout(() => {
        console.log('[Server] Restarting...');
        process.exit(0); // Exit cleanly - the startup script (VBS) or npm will restart
    }, 2000);
});

// Perplexity Session Account Management
app.get('/perplexity-sessions', async (req, res) => {
    try {
        await ensureInitialized();
        const accounts = perplexitySessionManager.getAccounts();
        res.json({ accounts, count: accounts.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/perplexity-sessions', async (req, res) => {
    try {
        await ensureInitialized();
        const { email, sessionToken } = req.body;

        if (!email || !sessionToken) {
            return res.status(400).json({ error: 'email and sessionToken are required' });
        }

        await perplexitySessionManager.addAccount(email, sessionToken);
        res.json({ success: true, message: `Account ${email} added successfully` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/perplexity-sessions/:email', async (req, res) => {
    try {
        await ensureInitialized();
        const removed = await perplexitySessionManager.removeAccount(req.params.email);
        if (removed) {
            res.json({ success: true, message: `Account ${req.params.email} removed` });
        } else {
            res.status(404).json({ error: 'Account not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Rename a Perplexity session account
app.patch('/perplexity-sessions/:email', async (req, res) => {
    try {
        await ensureInitialized();
        const { newName } = req.body;
        if (!newName) {
            return res.status(400).json({ error: 'newName is required' });
        }
        const renamed = await perplexitySessionManager.renameAccount(req.params.email, newName);
        if (renamed) {
            res.json({ success: true, message: `Account renamed to ${newName}` });
        } else {
            res.status(404).json({ error: 'Account not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Browser-based login for Perplexity - opens dedicated browser with stealth mode
app.post('/perplexity-login', async (req, res) => {
    try {
        await ensureInitialized();
        const loginService = getLoginService(perplexitySessionManager);

        if (loginService.isActive()) {
            return res.status(409).json({
                error: 'Login already in progress',
                message: 'Please complete the login in the browser window that opened'
            });
        }

        // Respond immediately that browser is opening
        res.json({
            status: 'started',
            message: 'Browser window opened. Please login to Perplexity - your session will be captured automatically.'
        });

        // Start login in background
        loginService.startLogin().then(result => {
            if (result.success) {
                console.log(`[Server] Perplexity login successful: ${result.email}`);
            } else {
                console.log(`[Server] Perplexity login: ${result.error}`);
            }
        }).catch(err => {
            console.error('[Server] Perplexity login error:', err.message);
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check login status
app.get('/perplexity-login/status', async (req, res) => {
    await ensureInitialized();
    const loginService = getLoginService(perplexitySessionManager);
    res.json({
        inProgress: loginService.isActive(),
        accounts: perplexitySessionManager.getAccounts().length
    });
});

/**
 * Model usage statistics endpoint
 * Returns per-model request counts for both Google and Perplexity
 */
app.get('/model-usage', (req, res) => {
    res.json(getModelUsageStats());
});

// Perplexity stats from Python server
app.get('/perplexity-stats', async (req, res) => {
    try {
        const pythonStats = await fetch('http://localhost:8000/stats');
        if (pythonStats.ok) {
            const stats = await pythonStats.json();
            res.json(stats);
        } else {
            res.json({ error: 'Python server not available', requests_today: 0 });
        }
    } catch (e) {
        res.json({ error: 'Python server not running', requests_today: 0 });
    }
});

/**
 * Parse error message to extract error type, status code, and user-friendly message
 */
function parseError(error) {
    let errorType = 'api_error';
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.message.includes('401') || error.message.includes('UNAUTHENTICATED')) {
        errorType = 'authentication_error';
        statusCode = 401;
        errorMessage = 'Authentication failed. Make sure Antigravity is running with a valid token.';
    } else if (error.message.includes('429') || error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('QUOTA_EXHAUSTED')) {
        errorType = 'invalid_request_error';  // Use invalid_request_error to force client to purge/stop
        statusCode = 400;  // Use 400 to ensure client does not retry (429 and 529 trigger retries)

        // Try to extract the quota reset time from the error
        const resetMatch = error.message.match(/quota will reset after (\d+h\d+m\d+s|\d+m\d+s|\d+s)/i);
        const modelMatch = error.message.match(/"model":\s*"([^"]+)"/);
        const model = modelMatch ? modelMatch[1] : 'the model';

        if (resetMatch) {
            errorMessage = `You have exhausted your capacity on ${model}. Quota will reset after ${resetMatch[1]}.`;
        } else {
            errorMessage = `You have exhausted your capacity on ${model}. Please wait for your quota to reset.`;
        }
    } else if (error.message.includes('invalid_request_error') || error.message.includes('INVALID_ARGUMENT')) {
        errorType = 'invalid_request_error';
        statusCode = 400;
        const msgMatch = error.message.match(/"message":"([^"]+)"/);
        if (msgMatch) errorMessage = msgMatch[1];
    } else if (error.message.includes('All endpoints failed')) {
        errorType = 'api_error';
        statusCode = 503;
        errorMessage = 'Unable to connect to Claude API. Check that Antigravity is running.';
    } else if (error.message.includes('PERMISSION_DENIED')) {
        errorType = 'permission_error';
        statusCode = 403;
        errorMessage = 'Permission denied. Check your Antigravity license.';
    }

    return { errorType, statusCode, errorMessage };
}

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
    try {
        await ensureInitialized();
        const status = accountManager.getStatus();

        res.json({
            status: 'ok',
            accounts: status.summary,
            available: status.available,
            rateLimited: status.rateLimited,
            invalid: status.invalid,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Account limits endpoint - fetch quota/limits for all accounts × all models
 * Returns a table showing remaining quota and reset time for each combination
 * Use ?format=table for ASCII table output, default is JSON
 */
app.get('/account-limits', async (req, res) => {
    try {
        await ensureInitialized();
        const allAccounts = accountManager.getAllAccounts();
        const format = req.query.format || 'json';

        // Fetch quotas for each account in parallel
        const results = await Promise.allSettled(
            allAccounts.map(async (account) => {
                // Skip invalid accounts
                if (account.isInvalid) {
                    return {
                        email: account.email,
                        status: 'invalid',
                        error: account.invalidReason,
                        models: {}
                    };
                }

                try {
                    const token = await accountManager.getTokenForAccount(account);
                    const quotas = await getModelQuotas(token);

                    return {
                        email: account.email,
                        status: 'ok',
                        models: quotas
                    };
                } catch (error) {
                    return {
                        email: account.email,
                        status: 'error',
                        error: error.message,
                        models: {}
                    };
                }
            })
        );

        // Process results
        const accountLimits = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    email: allAccounts[index].email,
                    status: 'error',
                    error: result.reason?.message || 'Unknown error',
                    models: {}
                };
            }
        });

        // Collect all unique model IDs
        const allModelIds = new Set();
        for (const account of accountLimits) {
            for (const modelId of Object.keys(account.models || {})) {
                allModelIds.add(modelId);
            }
        }

        const sortedModels = Array.from(allModelIds).sort();

        // Return ASCII table format
        if (format === 'table') {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');

            // Build table
            const lines = [];
            const timestamp = new Date().toLocaleString();
            lines.push(`Account Limits (${timestamp})`);

            // Get account status info
            const status = accountManager.getStatus();
            lines.push(`Accounts: ${status.total} total, ${status.available} available, ${status.rateLimited} rate-limited, ${status.invalid} invalid`);
            lines.push('');

            // Table 1: Account status
            const accColWidth = 25;
            const statusColWidth = 15;
            const lastUsedColWidth = 25;
            const resetColWidth = 25;

            let accHeader = 'Account'.padEnd(accColWidth) + 'Status'.padEnd(statusColWidth) + 'Last Used'.padEnd(lastUsedColWidth) + 'Quota Reset';
            lines.push(accHeader);
            lines.push('─'.repeat(accColWidth + statusColWidth + lastUsedColWidth + resetColWidth));

            for (const acc of status.accounts) {
                const shortEmail = acc.email.split('@')[0].slice(0, 22);
                const lastUsed = acc.lastUsed ? new Date(acc.lastUsed).toLocaleString() : 'never';

                // Get status and error from accountLimits
                const accLimit = accountLimits.find(a => a.email === acc.email);
                let accStatus;
                if (acc.isInvalid) {
                    accStatus = 'invalid';
                } else if (acc.isRateLimited) {
                    const remaining = acc.rateLimitResetTime ? acc.rateLimitResetTime - Date.now() : 0;
                    accStatus = remaining > 0 ? `limited (${formatDuration(remaining)})` : 'rate-limited';
                } else {
                    accStatus = accLimit?.status || 'ok';
                }

                // Get reset time from quota API
                const claudeModel = sortedModels.find(m => m.includes('claude'));
                const quota = claudeModel && accLimit?.models?.[claudeModel];
                const resetTime = quota?.resetTime
                    ? new Date(quota.resetTime).toLocaleString()
                    : '-';

                let row = shortEmail.padEnd(accColWidth) + accStatus.padEnd(statusColWidth) + lastUsed.padEnd(lastUsedColWidth) + resetTime;

                // Add error on next line if present
                if (accLimit?.error) {
                    lines.push(row);
                    lines.push('  └─ ' + accLimit.error);
                } else {
                    lines.push(row);
                }
            }
            lines.push('');

            // Calculate column widths
            const modelColWidth = Math.max(25, ...sortedModels.map(m => m.length)) + 2;
            const accountColWidth = 22;

            // Header row
            let header = 'Model'.padEnd(modelColWidth);
            for (const acc of accountLimits) {
                const shortEmail = acc.email.split('@')[0].slice(0, 18);
                header += shortEmail.padEnd(accountColWidth);
            }
            lines.push(header);
            lines.push('─'.repeat(modelColWidth + accountLimits.length * accountColWidth));

            // Data rows
            for (const modelId of sortedModels) {
                let row = modelId.padEnd(modelColWidth);
                for (const acc of accountLimits) {
                    const quota = acc.models?.[modelId];
                    let cell;
                    if (acc.status !== 'ok') {
                        cell = `[${acc.status}]`;
                    } else if (!quota) {
                        cell = '-';
                    } else if (quota.remainingFraction === null) {
                        cell = '0% (exhausted)';
                    } else {
                        const pct = Math.round(quota.remainingFraction * 100);
                        cell = `${pct}%`;
                    }
                    row += cell.padEnd(accountColWidth);
                }
                lines.push(row);
            }

            return res.send(lines.join('\n'));
        }

        // Default: JSON format
        const perplexityAccounts = perplexityAccountManager.getAccounts().map(acc => ({
            apiKey: '...' + acc.apiKey.slice(-5),
            addedAt: acc.addedAt,
            lastUsed: acc.lastUsed,
            isRateLimited: acc.isRateLimited,
            status: acc.isRateLimited ? 'rate-limited' : 'ok',
            usageCount: acc.usageCount || 0
        }));

        const responsePayload = {
            timestamp: new Date().toLocaleString(),
            totalAccounts: allAccounts.length,
            perplexityAccounts: perplexityAccounts,
            models: sortedModels,
            accounts: accountLimits.map(acc => {
                const originalAcc = allAccounts.find(a => a.email === acc.email);
                return {
                    email: acc.email,
                    status: acc.status,
                    error: acc.error || null,
                    lastUsed: originalAcc?.lastUsed || null,
                    limits: acc.models
                };
            })
        };

        res.json(responsePayload);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * Force token refresh endpoint
 */
app.post('/refresh-token', async (req, res) => {
    try {
        await ensureInitialized();
        // Clear all caches
        accountManager.clearTokenCache();
        accountManager.clearProjectCache();
        // Force refresh default token
        const token = await forceRefresh();
        res.json({
            status: 'ok',
            message: 'Token caches cleared and refreshed',
            tokenPrefix: token.substring(0, 10) + '...'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

/**
 * List models endpoint (OpenAI-compatible format)
 * Includes Perplexity models when Perplexity accounts are configured
 */
app.get('/v1/models', async (req, res) => {
    try {
        await ensureInitialized();

        let allModels = { data: [] };

        // Get Google Cloud Code models if available
        const account = accountManager.pickNext();
        if (account) {
            const token = await accountManager.getTokenForAccount(account);
            const googleModels = await listModels(token);
            if (googleModels && googleModels.data) {
                allModels.data.push(...googleModels.data);
            }
        }

        // Add Perplexity models if Perplexity accounts are configured
        if (perplexitySessionManager.hasAccounts()) {
            const pplxModels = await perplexitySessionClient.listModels();
            const pplxModelData = pplxModels.map(m => ({
                id: m.id,
                object: 'model',
                created: Date.now(),
                owned_by: 'perplexity',
                description: m.description
            }));
            allModels.data.push(...pplxModelData);
        }

        if (allModels.data.length === 0) {
            return res.status(503).json({
                type: 'error',
                error: {
                    type: 'api_error',
                    message: 'No accounts available. Add Google AI or Perplexity accounts via dashboard.'
                }
            });
        }

        res.json(allModels);
    } catch (error) {
        console.error('[API] Error listing models:', error);
        res.status(500).json({
            type: 'error',
            error: {
                type: 'api_error',
                message: error.message
            }
        });
    }
});

/**
 * Count tokens endpoint (not supported)
 */
app.post('/v1/messages/count_tokens', (req, res) => {
    res.status(501).json({
        type: 'error',
        error: {
            type: 'not_implemented',
            message: 'Token counting is not implemented. Use /v1/messages with max_tokens or configure your client to skip token counting.'
        }
    });
});

/**
 * Main messages endpoint - Anthropic Messages API compatible
 */
app.post('/v1/messages', async (req, res) => {
    try {
        // Ensure account manager is initialized
        await ensureInitialized();

        // Optimistic Retry: If ALL accounts are rate-limited, reset them to force a fresh check.
        // If we have some available accounts, we try them first.
        if (accountManager.isAllRateLimited()) {
            console.log('[Server] All accounts rate-limited. Resetting state for optimistic retry.');
            accountManager.resetAllRateLimits();
        }

        const {
            model,
            messages,
            max_tokens,
            stream,
            system,
            tools,
            tool_choice,
            thinking,
            top_p,
            top_k,
            temperature
        } = req.body;

        // Validate required fields
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                type: 'error',
                error: {
                    type: 'invalid_request_error',
                    message: 'messages is required and must be an array'
                }
            });
        }

        // Build the request object (resolve model alias if used)
        const resolvedModel = resolveModelAlias(model) || 'gemini-3-flash';

        const request = {
            model: resolvedModel,
            messages,
            max_tokens: max_tokens || 4096,
            stream,
            system,
            tools,
            tool_choice,
            thinking,
            top_p,
            top_k,
            temperature
        };

        const requestStartTime = Date.now();
        console.log(`[API] Request for model: ${request.model}, stream: ${!!stream}, messages: ${messages.length}`);

        // Debug: Log message structure to diagnose tool_use/tool_result ordering
        if (process.env.DEBUG) {
            console.log('[API] Message structure:');
            messages.forEach((msg, i) => {
                const contentTypes = Array.isArray(msg.content)
                    ? msg.content.map(c => c.type || 'text').join(', ')
                    : (typeof msg.content === 'string' ? 'text' : 'unknown');
                console.log(`  [${i}] ${msg.role}: ${contentTypes}`);
            });
        }

        // Route to Perplexity if model is sonar, perplexity, or pplx- prefixed
        const modelLower = request.model.toLowerCase();
        let isPerplexityModel = modelLower.includes('sonar') ||
            modelLower.includes('perplexity') ||
            modelLower.startsWith('pplx-');

        // AUTO-FALLBACK: If Perplexity model is used WITH tools, switch to Gemini
        // Perplexity API doesn't support tool use - it will hallucinate actions
        const hasTools = tools && Array.isArray(tools) && tools.length > 0;
        if (isPerplexityModel && hasTools) {
            const originalModel = request.model;
            request.model = 'gemini-3-flash'; // Fallback to fast agentic model
            isPerplexityModel = false;
            console.log(`[API] ⚠️ AUTO-FALLBACK: ${originalModel} → gemini-3-flash (Perplexity can't use tools)`);
        }

        if (isPerplexityModel) {
            console.log('[API] Routing to Perplexity via Python Server (curl_cffi)');
            try {
                // Forward to Python server running on port 8000
                // The Python server uses curl_cffi for TLS fingerprint impersonation
                const pythonServerUrl = 'http://localhost:8000/v1/chat/completions';

                // Convert Anthropic format to OpenAI format for Python server
                const openaiPayload = {
                    model: request.model,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: typeof m.content === 'string' ? m.content :
                            m.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
                    })),
                    stream: stream  // Use the stream flag from request
                };

                if (system) {
                    openaiPayload.messages.unshift({ role: 'system', content: system });
                }

                console.log(`[API] Forwarding to Python server: ${pythonServerUrl} (stream: ${stream})`);
                const pythonResponse = await fetch(pythonServerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(openaiPayload)
                });

                if (!pythonResponse.ok) {
                    const errorText = await pythonResponse.text();
                    throw new Error(`Python server error: ${pythonResponse.status} - ${errorText}`);
                }

                if (stream) {
                    // Handle streaming response - convert OpenAI SSE to Anthropic SSE
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    res.setHeader('X-Accel-Buffering', 'no');
                    res.flushHeaders();

                    const msgId = `msg_pplx_${Date.now()}`;
                    let fullText = '';

                    // Send message_start
                    const startEvent = {
                        type: 'message_start',
                        message: {
                            id: msgId,
                            type: 'message',
                            role: 'assistant',
                            content: [],
                            model: request.model,
                            stop_reason: null,
                            stop_sequence: null,
                            usage: { input_tokens: 0, output_tokens: 0 }
                        }
                    };
                    res.write(`event: message_start\ndata: ${JSON.stringify(startEvent)}\n\n`);

                    // Send content_block_start
                    res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}\n\n`);

                    // Process SSE stream from Python server
                    const reader = pythonResponse.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                try {
                                    const chunk = JSON.parse(data);
                                    const delta = chunk.choices?.[0]?.delta?.content || '';
                                    if (delta) {
                                        fullText += delta;
                                        const textDelta = { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta } };
                                        res.write(`event: content_block_delta\ndata: ${JSON.stringify(textDelta)}\n\n`);
                                    }
                                } catch (e) { /* ignore parse errors */ }
                            }
                        }
                    }

                    // Send content_block_stop
                    res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);

                    // Send message_delta with stop_reason
                    res.write(`event: message_delta\ndata: ${JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: fullText.length } })}\n\n`);

                    // Send message_stop
                    res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);

                    trackModelUsage('perplexity', request.model);
                    res.end();
                } else {
                    // Non-streaming response
                    const openaiResult = await pythonResponse.json();

                    // Convert OpenAI response back to Anthropic format
                    const anthropicResponse = {
                        id: openaiResult.id || `msg_pplx_${Date.now()}`,
                        type: 'message',
                        role: 'assistant',
                        content: [{
                            type: 'text',
                            text: openaiResult.choices?.[0]?.message?.content || 'No response from Perplexity'
                        }],
                        model: request.model,
                        stop_reason: 'end_turn',
                        stop_sequence: null,
                        usage: openaiResult.usage || { input_tokens: 0, output_tokens: 0 }
                    };

                    // Track usage
                    trackModelUsage('perplexity', request.model);
                    res.json(anthropicResponse);
                }
            } catch (err) {
                console.error('[API] Perplexity Error:', err);
                const { errorType, errorMessage } = parseError(err);
                res.status(500).json({
                    type: 'error',
                    error: { type: errorType, message: errorMessage }
                });
            }
        } else if (stream) {
            // Handle streaming response
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            // Flush headers immediately to start the stream
            res.flushHeaders();

            try {
                // Use the streaming generator with account manager
                for await (const event of sendMessageStream(request, accountManager)) {
                    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
                    // Flush after each event for real-time streaming
                    if (res.flush) res.flush();
                }
                // Track usage for streaming
                trackModelUsage('google', request.model);
                const elapsed = Date.now() - requestStartTime;
                console.log(`[API] Stream completed for ${request.model} in ${elapsed}ms`);
                res.end();

            } catch (streamError) {
                console.error('[API] Stream error:', streamError);

                const { errorType, errorMessage } = parseError(streamError);

                res.write(`event: error\ndata: ${JSON.stringify({
                    type: 'error',
                    error: { type: errorType, message: errorMessage }
                })}\n\n`);
                res.end();
            }

        } else {
            // Handle non-streaming response
            const response = await sendMessage(request, accountManager);
            // Track usage for non-streaming
            trackModelUsage('google', request.model);
            const elapsed = Date.now() - requestStartTime;
            console.log(`[API] Non-streaming response for ${request.model} in ${elapsed}ms`);
            res.json(response);
        }

    } catch (error) {
        console.error('[API] Error:', error);

        let { errorType, statusCode, errorMessage } = parseError(error);

        // For auth errors, try to refresh token
        if (errorType === 'authentication_error') {
            console.log('[API] Token might be expired, attempting refresh...');
            try {
                accountManager.clearProjectCache();
                accountManager.clearTokenCache();
                await forceRefresh();
                errorMessage = 'Token was expired and has been refreshed. Please retry your request.';
            } catch (refreshError) {
                errorMessage = 'Could not refresh token. Make sure Antigravity is running.';
            }
        }

        console.log(`[API] Returning error response: ${statusCode} ${errorType} - ${errorMessage}`);

        // Check if headers have already been sent (for streaming that failed mid-way)
        if (res.headersSent) {
            console.log('[API] Headers already sent, writing error as SSE event');
            res.write(`event: error\ndata: ${JSON.stringify({
                type: 'error',
                error: { type: errorType, message: errorMessage }
            })}\n\n`);
            res.end();
        } else {
            res.status(statusCode).json({
                type: 'error',
                error: {
                    type: errorType,
                    message: errorMessage
                }
            });
        }
    }
});

/**
 * Catch-all for unsupported endpoints
 */
app.use('*', (req, res) => {
    res.status(404).json({
        type: 'error',
        error: {
            type: 'not_found_error',
            message: `Endpoint ${req.method} ${req.originalUrl} not found`
        }
    });
});

export default app;
