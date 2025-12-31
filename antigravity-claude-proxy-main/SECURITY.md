# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 4.x     | :white_check_mark: |
| 3.x     | :x:                |
| < 3.0   | :x:                |

## Security Features

### Data Protection
- **No credentials stored in code**: All tokens, API keys, and account credentials are stored locally
- **Sensitive files in .gitignore**: `accounts.json`, `perplexity-sessions.json`, `model-override.json` are never committed
- **Local-only proxy**: Runs on `localhost:8080` - no external exposure by default

### Ignored Files
The following sensitive files are automatically excluded from version control:
- `accounts.json` - Google account authentication
- `perplexity-sessions.json` - Perplexity session cookies
- `model-override.json` - User model preferences
- `logs/` - Proxy logs that may contain request details
- `.env` and `.env.*` - Environment variables
- `*.token`, `*.secret` - Any token or secret files

## Security Recommendations

### For Personal Use
1. **Don't share** your `accounts.json` file
2. **Firewall**: Keep port 8080 firewalled from external access
3. **Updates**: Keep dependencies updated with `npm update`

### Network Security
- The proxy binds to `0.0.0.0:8080` by default
- For production, consider binding to `127.0.0.1` only
- Use a reverse proxy (nginx/caddy) if external access is needed

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer directly (see package.json)
3. Provide detailed information about the vulnerability
4. Allow time for a fix before public disclosure

## Audit History

| Date | Type | Result |
|------|------|--------|
| 2026-01-01 | Credential Scan | ✅ Passed - No exposed credentials |
| 2026-01-01 | .gitignore Review | ✅ Complete - All sensitive files ignored |
| 2026-01-01 | Dependency Audit | Run `npm audit` for latest status |
