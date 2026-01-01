# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
