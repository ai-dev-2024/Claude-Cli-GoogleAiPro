# Antigravity Claude Proxy - Version 2.0
## Claude Code Extension Integration (Partial)

**Date:** 2025-12-31
**Status:** ⚠️ Partially Working

---

## Overview

This version adds Claude Code VS Code extension integration, enabling bidirectional sync between the extension and proxy. The extension routes through the proxy, but the dropdown has limitations.

## What Works ✅

### 1. Extension → Proxy Routing
- Extension sends requests to `localhost:8080`
- Proxy routes to Google AI / Perplexity
- All models accessible via proxy

### 2. Custom Model Option
- "Custom model" dropdown option works correctly
- Displays model from `~/.claude/settings.json` `model` field
- Sends exact model name to proxy
- Fully functional for model switching

### 3. Bidirectional Sync
- Dropdown selection updates proxy's active model
- Proxy updates settings files automatically
- Model persistence across sessions

### 4. Settings Synchronization
- `~/.claude/settings.json` auto-updated
- `ANTHROPIC_MODEL` env var synced
- Model changes logged in proxy

---

## What Doesn't Work ❌

### 1. Hardcoded Dropdown Options
The dropdown has 4 fixed options:
- **Default** → Sends Anthropic's default model (not configurable)
- **Opus** → Sends cached/previous value (not `ANTHROPIC_DEFAULT_OPUS_MODEL`)
- **Haiku** → Sends cached value (not `ANTHROPIC_DEFAULT_HAIKU_MODEL`)
- **Custom** → ✅ Works correctly

### 2. Dynamic Model List
- Extension doesn't fetch from `/v1/models`
- Dropdown is compiled into extension.js
- Can't add more models via settings

### 3. Environment Variables
- `ANTHROPIC_DEFAULT_OPUS_MODEL` etc. are ignored by extension
- Extension caches its own model mappings

---

## Technical Findings

### Extension Settings Schema
```json
// From claude-code-settings.schema.json (line 129-132)
"model": {
  "type": "string",  // Single string only!
  "description": "Override the default model used by Claude Code"
}
```

### Extension Structure
```
C:\Users\Muhib\.vscode\extensions\anthropic.claude-code-2.0.75-win32-x64\
├── extension.js       # 1.1MB minified bundle ← Dropdown code here
├── package.json       # Extension manifest
├── claude-code-settings.schema.json  # Settings schema
└── ...
```

### Package.json Model Config
```json
"claudeCode.selectedModel": {
  "type": "string",  // NO enum constraint
  "default": "default",
  "description": "The AI model for Claude Code."
}
```

---

## Proxy Log Examples

### Custom Model (Works)
```
[DEBUG] Raw model from extension: "gemini-2.5-flash"
[API] Request for model: gemini-2.5-flash
```

### Opus Selection (Doesn't Work)
```
[DEBUG] Raw model from extension: "gemini-3-pro-high"  # Should be claude-opus-4-5-thinking
[API] Request for model: gemini-3-pro-high
```

---

## Configuration Made

### `~/.claude/settings.json`
```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5-thinking",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5-thinking",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "gemini-3-flash"
  },
  "model": "gemini-3-flash"
}
```

---

## Next Version (V3)

**Goal:** Decompile and modify `extension.js` to:
1. Make dropdown fetch from `/v1/models`
2. Add more model options
3. Fix Opus/Haiku/Default mappings

See `versions/v3-extension-modification/` for decompilation work.
