/**
 * Constants for Antigravity Cloud Code API integration
 * Based on: https://github.com/NoeFabris/opencode-antigravity-auth
 *
 * Configuration values can be overridden via environment variables.
 * See .env.example for available options.
 */

import { config } from 'dotenv';
import { homedir, platform, arch } from 'os';
import { join } from 'path';

// Load environment variables from .env file
config();

/**
 * Get environment variable with optional default value
 * @param {string} name - Environment variable name
 * @param {string|number|undefined} defaultValue - Default value if not set
 * @returns {string|undefined} The environment variable value or default
 */
function getEnv(name, defaultValue = undefined) {
    return process.env[name] ?? defaultValue;
}

/**
 * Get environment variable as integer with default value
 * @param {string} name - Environment variable name
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number} The parsed integer value
 */
function getEnvInt(name, defaultValue) {
    const value = process.env[name];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get the Antigravity database path based on the current platform.
 * - macOS: ~/Library/Application Support/Antigravity/...
 * - Windows: ~/AppData/Roaming/Antigravity/...
 * - Linux/other: ~/.config/Antigravity/...
 * @returns {string} Full path to the Antigravity state database
 */
function getAntigravityDbPath() {
    const home = homedir();
    switch (platform()) {
        case 'darwin':
            return join(home, 'Library/Application Support/Antigravity/User/globalStorage/state.vscdb');
        case 'win32':
            return join(home, 'AppData/Roaming/Antigravity/User/globalStorage/state.vscdb');
        default: // linux, freebsd, etc.
            return join(home, '.config/Antigravity/User/globalStorage/state.vscdb');
    }
}

/**
 * Generate platform-specific User-Agent string.
 * @returns {string} User-Agent in format "antigravity/version os/arch"
 */
function getPlatformUserAgent() {
    const os = platform();
    const architecture = arch();
    return `antigravity/1.11.5 ${os}/${architecture}`;
}

// Cloud Code API endpoints (in fallback order)
const ANTIGRAVITY_ENDPOINT_DAILY = 'https://daily-cloudcode-pa.sandbox.googleapis.com';
const ANTIGRAVITY_ENDPOINT_PROD = 'https://cloudcode-pa.googleapis.com';

// Endpoint fallback order (daily → prod)
export const ANTIGRAVITY_ENDPOINT_FALLBACKS = [
    ANTIGRAVITY_ENDPOINT_DAILY,
    ANTIGRAVITY_ENDPOINT_PROD
];

// Required headers for Antigravity API requests
export const ANTIGRAVITY_HEADERS = {
    'User-Agent': getPlatformUserAgent(),
    'X-Goog-Api-Client': 'google-cloud-sdk vscode_cloudshelleditor/0.1',
    'Client-Metadata': JSON.stringify({
        ideType: 'IDE_UNSPECIFIED',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI'
    })
};

// Default project ID if none can be discovered
export const DEFAULT_PROJECT_ID = getEnv('DEFAULT_PROJECT_ID', 'rising-fact-p41fc');

// Server configuration (can be overridden via environment variables)
export const DEFAULT_PORT = getEnvInt('PORT', 8080);
export const REQUEST_BODY_LIMIT = getEnv('REQUEST_BODY_LIMIT', '50mb');

// Token and timing configuration
export const TOKEN_REFRESH_INTERVAL_MS = getEnvInt('TOKEN_REFRESH_INTERVAL', 5 * 60 * 1000); // 5 minutes
export const DEFAULT_COOLDOWN_MS = getEnvInt('RATE_LIMIT_COOLDOWN', 60 * 1000); // 1 minute default cooldown
export const MAX_WAIT_BEFORE_ERROR_MS = getEnvInt('MAX_WAIT_BEFORE_ERROR', 120000); // 2 minutes

// Auto-wait mode: When enabled, waits indefinitely for rate limits to reset instead of throwing errors
// Set to 'true' or '1' to enable
export const AUTO_WAIT_FOR_RATE_LIMIT = getEnv('AUTO_WAIT_FOR_RATE_LIMIT', 'true') === 'true' ||
    getEnv('AUTO_WAIT_FOR_RATE_LIMIT', 'true') === '1';

// Progress update interval during long waits (in milliseconds)
export const RATE_LIMIT_PROGRESS_INTERVAL_MS = getEnvInt('RATE_LIMIT_PROGRESS_INTERVAL', 30000); // 30 seconds

// Maximum time to wait for rate limit reset (0 = infinite)
export const MAX_RATE_LIMIT_WAIT_MS = getEnvInt('MAX_RATE_LIMIT_WAIT', 0); // 0 = wait forever

// Retry and account limits
export const MAX_RETRIES = getEnvInt('MAX_RETRIES', 5); // Max retry attempts across accounts
export const MAX_ACCOUNTS = getEnvInt('MAX_ACCOUNTS', 10); // Maximum number of accounts allowed

// Request timeout (new)
export const REQUEST_TIMEOUT_MS = getEnvInt('REQUEST_TIMEOUT', 60000); // 60 seconds default

// Antigravity auth port
export const ANTIGRAVITY_AUTH_PORT = getEnvInt('ANTIGRAVITY_AUTH_PORT', 9092);

// Multi-account configuration
export const ACCOUNT_CONFIG_PATH = getEnv('ACCOUNT_CONFIG_PATH', join(
    homedir(),
    '.config/antigravity-proxy/accounts.json'
));

// Antigravity app database path (for legacy single-account token extraction)
// Uses platform-specific path detection
export const ANTIGRAVITY_DB_PATH = getAntigravityDbPath();

// Thinking model constants
export const MIN_SIGNATURE_LENGTH = 50; // Minimum valid thinking signature length

// Gemini-specific limits
export const GEMINI_MAX_OUTPUT_TOKENS = getEnvInt('GEMINI_MAX_OUTPUT_TOKENS', 16384);

// Gemini signature handling
// Sentinel value to skip thought signature validation when Claude Code strips the field
// See: https://ai.google.dev/gemini-api/docs/thought-signatures
export const GEMINI_SKIP_SIGNATURE = 'skip_thought_signature_validator';

// Cache TTL for Gemini thoughtSignatures (2 hours)
export const GEMINI_SIGNATURE_CACHE_TTL_MS = getEnvInt('GEMINI_SIGNATURE_CACHE_TTL', 2 * 60 * 60 * 1000);

// Logging configuration
export const LOG_LEVEL = getEnv('LOG_LEVEL', 'info');

/**
 * Get the model family from model name (dynamic detection, no hardcoded list).
 * @param {string} modelName - The model name from the request
 * @returns {'claude' | 'gemini' | 'unknown'} The model family
 */
export function getModelFamily(modelName) {
    const lower = (modelName || '').toLowerCase();
    if (lower.includes('claude')) return 'claude';
    if (lower.includes('gemini')) return 'gemini';
    return 'unknown';
}

/**
 * Check if a model supports thinking/reasoning output.
 * @param {string} modelName - The model name from the request
 * @returns {boolean} True if the model supports thinking blocks
 */
export function isThinkingModel(modelName) {
    const lower = (modelName || '').toLowerCase();
    // Claude thinking models have "thinking" in the name
    if (lower.includes('claude') && lower.includes('thinking')) return true;
    // Gemini thinking models: explicit "thinking" in name, OR gemini version 3+
    if (lower.includes('gemini')) {
        if (lower.includes('thinking')) return true;
        // Check for gemini-3 or higher (e.g., gemini-3, gemini-3.5, gemini-4, etc.)
        const versionMatch = lower.match(/gemini-(\d+)/);
        if (versionMatch && parseInt(versionMatch[1], 10) >= 3) return true;
    }
    return false;
}

// Default OAuth credentials (can be overridden via environment variables)
// Note: These are public OAuth credentials for the Antigravity integration.
// For custom OAuth apps, set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET
const DEFAULT_OAUTH_CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const DEFAULT_OAUTH_CLIENT_SECRET = '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';

// Google OAuth configuration
export const OAUTH_CONFIG = {
    clientId: getEnv('GOOGLE_OAUTH_CLIENT_ID', DEFAULT_OAUTH_CLIENT_ID),
    clientSecret: getEnv('GOOGLE_OAUTH_CLIENT_SECRET', DEFAULT_OAUTH_CLIENT_SECRET),
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
    callbackPort: getEnvInt('OAUTH_CALLBACK_PORT', 51121),
    scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/cclog',
        'https://www.googleapis.com/auth/experimentsandconfigs'
    ]
};
export const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_CONFIG.callbackPort}/oauth-callback`;

export default {
    ANTIGRAVITY_ENDPOINT_FALLBACKS,
    ANTIGRAVITY_HEADERS,
    DEFAULT_PROJECT_ID,
    TOKEN_REFRESH_INTERVAL_MS,
    REQUEST_BODY_LIMIT,
    ANTIGRAVITY_AUTH_PORT,
    DEFAULT_PORT,
    ACCOUNT_CONFIG_PATH,
    ANTIGRAVITY_DB_PATH,
    DEFAULT_COOLDOWN_MS,
    MAX_RETRIES,
    MAX_ACCOUNTS,
    MAX_WAIT_BEFORE_ERROR_MS,
    AUTO_WAIT_FOR_RATE_LIMIT,
    RATE_LIMIT_PROGRESS_INTERVAL_MS,
    MAX_RATE_LIMIT_WAIT_MS,
    REQUEST_TIMEOUT_MS,
    MIN_SIGNATURE_LENGTH,
    GEMINI_MAX_OUTPUT_TOKENS,
    GEMINI_SKIP_SIGNATURE,
    GEMINI_SIGNATURE_CACHE_TTL_MS,
    LOG_LEVEL,
    getModelFamily,
    isThinkingModel,
    OAUTH_CONFIG,
    OAUTH_REDIRECT_URI
};
