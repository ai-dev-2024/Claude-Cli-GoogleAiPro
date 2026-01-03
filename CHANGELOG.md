# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## Version Scheme

- **v1.x** = Claude Code **CLI** + Proxy (before extension)
- **v2.x** = Claude Code **Extension** + Proxy (within Antigravity IDE)

---

# Version 2.x — Extension + Proxy

## [2.7.0] - 2026-01-03

### Extension v4.1.1
- **Per-Window Model Selection**: Each window maintains its own model independently
- **Workspace Persistence**: Model choice persists per-workspace across restarts
- **Disabled Settings Watchers**: Fixed issue where global settings were overriding window-local models
- **No More Model Ping-Pong**: Multiple windows no longer conflict over model selection

### Proxy Fixes
- **Correct Entry Point**: PM2 now starts `index.js` instead of `server.js`
- **Session Persistence**: Models survive proxy restarts

---

## [2.6.0] - 2026-01-03

### Added
- **Per-Session Model Isolation**: Each Antigravity window and CLI terminal has its own model
- **Sessions Dashboard Tab**: View all active sessions with model, last used time, and delete option
- **Session Persistence**: Models are persisted per-session in `session-models.json` and survive proxy restarts
- **Auto-Restart on Crash**: Proxy automatically restarts via PM2, sessions resume with their models
- **Universal CLI Support**: Set permanent `ANTHROPIC_BASE_URL` env var for all terminals
- **Cross-Shell Wrappers**: `claude-session.bat` and `claude-session.sh` for per-folder sessions

### Changed
- Extension now uses `/session-model` API instead of `/active-model` for per-window isolation
- Dashboard Sessions page shows auto-session enabled status instead of manual setup instructions

### Fixed
- **Proxy Entry Point**: Fixed PM2 to start `index.js` instead of `server.js` (was causing immediate shutdown)
- **Model Reversion Issue**: Windows no longer affect each other's models

---

## [2.5.0] - 2026-01-02

### Added
- **IDE Account Switcher**: `$(account)` icon in status bar to manage Antigravity IDE accounts
- **Simplified 2-Icon Layout**: Account icon + Model name (shows "Offline" in red when proxy down)
- **Dashboard Improvements**: Yellow highlighted warning about UI name not updating

### Fixed
- **API Endpoint Mismatch**: Fixed `/set-model` → `/active-model` in extension
- **Model Sync**: Claude Code UI selection now syncs properly without reverting

---

## [2.4.0] - 2026-01-02

### Added
- **Direct OAuth Re-authentication**: Expired accounts can be re-authenticated from dashboard
- **Persistent Multi-State OAuth Server**: Supports unlimited back-to-back account additions
- **Auto-Refresh Dashboard**: Polls every 2 seconds after OAuth, shows ✅ toast on success
- **Enhanced OAuth Logging**: Detailed flow tracking with state IDs

### Fixed
- "OAuth flow already in progress" blocking back-to-back logins
- "State mismatch / CSRF attack" errors on consecutive OAuth attempts

---

## [2.3.0] - 2026-01-01

### Added
- **Per-Window Model Selection**: Each Antigravity window can use different models
- **Account Reset Countdown**: Dashboard shows Claude quota reset time per account
- **Dark Theme Dashboard**: Modern OpenAI/Apple-inspired design with Inter font

### Changed
- Model dropdown reordered: Claude → Gemini 3 → Gemini 2.5 → GPT → Other
- Health check polling now every 5 seconds

---

## [2.2.0] - 2026-01-01

### Added
- **PM2 Process Manager**: Automatic crash recovery and process management
- **Windows Startup Script**: Triple-layer auto-start protection
- **Material Design Dashboard**: Google Material Symbols, dark zinc palette

### Changed
- Startup task uses `pm2 resurrect` instead of direct `node` call

---

## [2.1.0] - 2026-01-01

### Added
- **Robust Model Routing**: Claude Code dropdown has highest priority
  - Haiku → `gemini-3-flash`
  - Opus → `claude-opus-4-5-thinking`
  - Sonnet/Default → `claude-sonnet-4-5-thinking`
  - Custom → Uses dashboard/status bar selection
- **Status Bar Sync**: Updates to show actual model being used
- **Faster Offline Detection**: 2-second timeout

### Fixed
- Status bar not updating when switching models via dropdown
- Model priority conflicts between dashboard and extension

---

## [2.0.0] - 2026-01-01

### Added
- **Status Bar Extension**: Real-time model indicator with emoji icons (⚡💎🎭🎵)
- **3-Second Polling**: Status bar auto-updates from `/active-model`
- **Model Change Notifications**: Toast when model changes via dashboard
- **Extension Model Mapping**: Modified `extension.js` for proper dropdown routing

### Changed
- Bidirectional sync between extension and proxy
- Updated README with showcase section

---

# Version 1.x — CLI + Proxy

## [1.2.0] - 2025-12-31

### Added
- **Smart Routing**: Extension dropdown pass-through support
- **Dashboard Override**: "Custom model" uses dashboard-selected model
- **Model Persistence**: Survives proxy restarts via `model-override.json`
- **Auto-Start**: Proxy starts on Antigravity open via `tasks.json`
- **Enhanced Logging**: Detailed route logging with source tracking

---

## [1.1.0] - 2025-12-30

### Added
- **Multi-Account Load Balancing**: 4 Google accounts with automatic rotation
- **Perplexity Integration**: GPT-5, Grok, Kimi, Claude via Perplexity
- **Beautiful Dashboard**: Real-time account monitoring at `localhost:8080`
- **Model Aliases**: Type `flash` instead of `gemini-3-flash`

---

## [1.0.0] - 2025-12-29

### Added
- Initial release
- Anthropic-compatible API proxy
- Google AI integration via Antigravity
- Basic streaming support
- CLI model switching with `/model` command
