# Claude CLI Google AI Pro

Scale your Claude Code CLI usage with Google's Gemini models via an intelligent proxy. This project enables seamless integration between Anthropic's CLI tools and Google's high-capacity AI models.

## 🌟 Claude Proxy Extension

This project includes a fully integrated **VS Code Extension** to monitor usage, manage accounts, and auto-start the proxy server.

[![Extension Status](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://github.com/ai-dev-2024/Claude-Proxy-Extension)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Published-purple)](https://open-vsx.org/extension/ai-dev-2024/claude-proxy-status)

### Dashboard Preview
![Dashboard](assets/screenshot.png)

### Key Features
-   **Auto-Accept**: Toggle zero-click edits with `Shift + Tab`.
-   **YOLO Mode**: Bypass permissions with `--dangerously-skip-permissions`.
-   **Auto-Start Proxy**: Startup script included for Windows users.

### Extension Repository
The extension is maintained in a dedicated repository:
👉 [**Claude-Proxy-Extension on GitHub**](https://github.com/ai-dev-2024/Claude-Proxy-Extension)

## 🚀 Installation & Setup

1.  **Clone this repository**: `git clone https://github.com/ai-dev-2024/Claude-Cli-GoogleAiPro.git`
2.  **Add Accounts**:
    ```bash
    cd antigravity-claude-proxy-main
    npm install
    npm run accounts:add
    ```
3.  **Configure Environment**:
    Ensure `~/.claude/settings.json` is set to point to `http://localhost:8080`.
4.  **Auto-Start (Windows)**:
    Run the included `COMPLETE_SETUP.bat` to configure the Windows startup script.

## 🕹️ Usage & Pro-Tips

### YOLO Mode (Startup)
Start Claude with maximum speed and no prompts:
```bash
claude --dangerously-skip-permissions
```

### Auto-Accept (Interactive)
Press **`Shift + Tab`** in-app to cycle to **"accept edits on"**.

### View Sessions
Type `/resume` inside Claude or run `claude --resume` from the terminal.

## ☕ Support
If this project helps you, consider supporting the development!
[Support on Ko-Fi](https://ko-fi.com/ai_dev_2024)