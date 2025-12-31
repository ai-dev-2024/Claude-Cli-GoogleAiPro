# Antigravity Claude Proxy - Version 1.0
## CLI + Google AI Pro Integration (Working)

**Date:** 2025-12-31
**Status:** ✅ Fully Working

---

## Overview

This version provides a working proxy that routes Claude Code CLI requests through Google AI's Claude and Gemini models, with Perplexity integration for additional chat-only models.

## Features Working

### 1. Google AI Integration ✅
- Claude Opus 4.5 (via `claude-opus-4-5-thinking`)
- Claude Sonnet 4.5 (via `claude-sonnet-4-5-thinking`)
- Gemini 3 Flash, Pro, Pro-High, Pro-Image
- Gemini 2.5 Flash, Flash-Lite, Flash-Thinking
- Gemini 2.5 Pro

### 2. Load Balancing ✅
- 4 Google AI accounts rotating automatically
- Automatic OAuth token refresh
- Account usage tracking

### 3. Perplexity Integration ✅
- Multiple Perplexity models (Sonar, Research, Labs)
- Access to GPT-5.1/5.2, Grok, Claude via Perplexity
- Chat-only mode (no tool support)

### 4. Dashboard ✅
- Model selection dropdown
- Account status display
- Real-time request logging
- Active model display

### 5. CLI Integration ✅
- `/model` command for switching
- Natural language model switching
- Model persistence across restarts
- Bidirectional sync with extension

---

## Configuration Files

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | Claude Code CLI settings, env vars |
| `src/constants.js` | Model aliases and mappings |
| `src/server.js` | Main proxy server |
| `src/public/dashboard.html` | Web dashboard UI |
| `config/accounts.json` | Google AI account credentials |
| `config/perplexity.json` | Perplexity API keys |

---

## Key Components

### Model Aliases (`src/constants.js`)
```javascript
MODEL_ALIASES = {
  'haiku': 'gemini-3-flash',
  'claude-opus': 'claude-opus-4-5-thinking',
  'claude-sonnet': 'claude-sonnet-4-5-thinking',
  // ... more mappings
}
```

### Environment Variables (`~/.claude/settings.json`)
```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:8080",
    "ANTHROPIC_API_KEY": "antigravity-proxy",
    "ANTHROPIC_MODEL": "gemini-3-flash"
  }
}
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /v1/messages` | Main chat endpoint (Anthropic format) |
| `GET /v1/models` | List available models |
| `POST /switch-model` | Switch active model |
| `GET /current-model` | Get current active model |
| `GET /health` | Health check |
| `GET /account-limits` | Account usage info |

---

## Usage

1. Start the proxy: `npm start`
2. Open dashboard: `http://localhost:8080`
3. CLI automatically routes through proxy
4. Use `/model <name>` to switch models

---

## Known Limitations

- Claude Code extension dropdown uses hardcoded options
- Extension dropdown doesn't dynamically refresh
- Only "Custom model" option works with proxy models

---

## Next Version (V2)

See `versions/v2-extension-integration/` for Claude Code VS Code extension work.
