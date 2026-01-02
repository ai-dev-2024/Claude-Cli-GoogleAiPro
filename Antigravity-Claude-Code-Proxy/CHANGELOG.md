# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.2.0] - 2026-01-02

### Added
- **Direct OAuth Re-authentication**: Expired accounts can now be re-authenticated directly from dashboard
  - "Re-authenticate" button opens Google sign-in popup
  - No need for Antigravity IDE - direct Google OAuth flow
  - Account is automatically updated with new refresh token
- **Persistent Multi-State OAuth Server**: Complete rewrite of callback handling
  - Uses `pendingFlows` Map to track multiple concurrent OAuth flows
  - Single persistent callback server that never closes between flows
  - Each flow has unique state and individual timeout
  - Enables **unlimited back-to-back account additions**
- **Auto-Refresh Dashboard**: Polls every 2 seconds after OAuth
  - Detects when new account is added
  - Shows ✅ toast notification immediately
  - No manual refresh needed
- **Enhanced OAuth Logging**: Better visibility into OAuth flow
  - `[OAuth] Registered flow xxx... (N pending)`
  - `[OAuth] Callback received: state=xxx..., hasCode=true`
  - `[OAuth] Flow xxx... completed successfully`

### Changed
- `oauth.js`: Redesigned from per-flow server to persistent multi-state server
- `server.js`: Uses `oauthFlows` Map instead of single `activeOAuthFlow` variable
- Dashboard OAuth functions simplified - no more blocking checks
- Session expired messages now say "Session Already Processed" for stale callbacks

### Fixed
- "OAuth flow already in progress" blocking back-to-back logins
- "State mismatch / CSRF attack" errors on consecutive OAuth attempts
- Callback server being closed when starting new OAuth flow
- Accounts not appearing immediately after successful authentication

## [4.1.0] - 2026-01-01

### Added
- **Per-Window Model Selection**: Each Antigravity window can now use different models independently
  - Extension stores model per-window using VS Code workspaceState
  - Server supports `X-Override-Model` header for per-request model override
  - Status bar shows "This Window:" tooltip indicating window-local model
- **Account Reset Countdown**: Dashboard now shows Claude quota reset time on each account card
  - Dynamic sorting: accounts with soonest reset time appear first
  - Visual countdown tip: `⏱ 2h 30m Claude reset`
- **Dark Theme Dashboard**: Modern OpenAI/Apple-inspired dark theme
  - Inter font family
  - Subtle borders and hover states
  - Refined color palette with accent green (#10a37f)

### Changed
- Model dropdown reordered: Claude → Gemini 3 → Gemini 2.5 → GPT → Other
- Usage page model groups follow same order
- Health check polling now every 5 seconds (was 2 seconds)
- Extension no longer overrides window model on proxy poll

## [4.0.2] - 2026-01-01

### Added
- **PM2 Process Manager**: Automatic crash recovery and process management
  - `ecosystem.config.js` for PM2 configuration
  - Auto-restart on crash (within 2 seconds)
  - Windows Startup batch script for system reboot recovery
- **Dashboard Redesign**: Modern Material Design UI
  - Google Material Symbols Rounded icons
  - Dark zinc color palette
  - Animated components and smooth transitions
  - Improved account cards with quota visualization
- **Triple-Layer Auto-Start Protection**:
  1. PM2 auto-restart on crash
  2. Windows Startup folder batch script
  3. Antigravity tasks.json on project open

### Changed
- Startup task now uses `pm2 resurrect` instead of direct `node` call
- Dashboard uses Material Icons instead of emojis

## [4.0.1] - 2026-01-01

### Added
- **Robust Model Routing**: Claude Code UX dropdown now has highest priority
  - Haiku → gemini-3-flash (mapped automatically)
  - Opus → claude-opus-4-5-thinking  
  - Sonnet/Default → claude-sonnet-4-5-thinking
  - Custom model → Uses dashboard/status bar selection
- **Status Bar Sync**: Status bar now updates to show actual model being used
- **Faster Offline Detection**: 2-second timeout for quick status bar updates

### Changed
- Reduced polling interval from 5 seconds to 2 seconds
- Improved extension connection retry logic (1-second delays)

### Fixed
- Status bar not updating when switching models via Claude Code dropdown
- Model priority conflicts between dashboard and extension

## [4.0.0] - 2026-01-01

### Added
- **Status Bar Model Display**: Real-time model indicator with emoji icons (⚡💎🎭🎵)
- **3-Second Polling**: Status bar updates automatically from `/active-model`
- **Model Change Notifications**: Toast notification when model changes via dashboard
- **Enhanced claude-proxy-status Extension**: Now shows current model instead of static text
- **Showcase Images**: AI-generated dashboard and status bar screenshots

### Changed
- Updated README with v4.0 badge and showcase section
- Added Status Bar documentation section
- Improved .gitignore with logs/ and model-override.json

### Fixed
- Cleaned up debug logging (removed [REQ], [NL-Debug] console spam)

## [3.0.0] - 2025-12-31

### Added
- **Smart Routing**: Extension dropdown controls actual model with pass-through
- **Dashboard Override**: Custom model uses dashboard-selected model
- **Model Persistence**: Survives proxy restarts via model-override.json
- **Auto-Start**: Proxy starts on Antigravity open via global tasks.json
- **Enhanced Logging**: Detailed route logging with source tracking

### Changed
- Refactored model resolution logic for clearer pass-through behavior
- Updated README with model switching methods documentation

## [2.0.0] - 2025-12-30

### Added
- **Multi-Account Load Balancing**: 4 Google accounts with automatic rotation
- **Perplexity Integration**: GPT-5, Grok, Kimi, Claude via Perplexity
- **Beautiful Dashboard**: Real-time account monitoring
- **Model Aliases**: Type "flash" instead of "gemini-3-flash"

## [1.0.0] - 2025-12-29

### Added
- Initial release
- Anthropic-compatible API proxy
- Google AI integration via Antigravity
- Basic streaming support
