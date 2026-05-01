# DevGlobe — Zed Extension

Show your live coding presence on the [DevGlobe](https://devglobe.xyz) world map from Zed.

## Requirements

- [Zed](https://zed.dev) editor
- [Node.js](https://nodejs.org) 18 or later
- A DevGlobe API key from [devglobe.xyz/dashboard/settings](https://devglobe.xyz/dashboard/settings)

## Setup

### 1. Get your API key

Sign in on [devglobe.xyz](https://devglobe.xyz) with GitHub, X (Twitter), or Google, then copy your API key from [profile settings](https://devglobe.xyz/dashboard/settings).

### 2. Install the extension

Install DevGlobe from the Zed extensions marketplace, or as a dev extension:

1. Open Zed
2. `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Linux) → "zed: install dev extension"
3. Select this folder

### 3. Configure DevGlobe

Run the setup command from your terminal:

```bash
node /path/to/zed-devglobe/server/dist/server.js setup devglobe_YOUR_KEY_HERE
```

This writes your key to `~/.devglobe/config.toml` (mode `0600`).

Or create the file manually:

```bash
mkdir -p ~/.devglobe
cat > ~/.devglobe/config.toml <<'EOF'
api_key = "devglobe_YOUR_KEY_HERE"
EOF
```

Visibility settings (anonymous mode, repo sharing on the live globe, profile mode) are managed on [devglobe.xyz/dashboard/settings](https://devglobe.xyz/dashboard/settings).

### 4. Trust your project

When you open a project, Zed may ask you to trust the worktree. Accept to allow the DevGlobe language server to start.

### 5. Start coding

Open any code file and start editing. You'll appear on the globe within 30 seconds. The extension detects your language automatically.

### Update status message

```bash
node /path/to/zed-devglobe/server/dist/server.js status "Working on my project"
node /path/to/zed-devglobe/server/dist/server.js status ""  # clear
```

## How it works

The extension runs a lightweight Language Server (LSP) that receives file open/change/save events from Zed. It uses DevGlobe's shared core to send heartbeats every 30 seconds while you're actively coding. After 1 minute of inactivity, heartbeats pause automatically.

## Supported languages

80+ languages including: JavaScript, TypeScript, Python, Rust, Go, C, C++, Java, Kotlin, Swift, Ruby, PHP, Elixir, Haskell, Scala, and many more.

## Privacy

The extension sends programming language, editor name, OS, coding time, the origin remote URL of your current git repo (when present), branch name, and the file path **relative to your repo root** — never an absolute home path.

Files outside any git repository are not tracked beyond their language. We never read source code, file contents, keystrokes, or commit messages.

Local privacy flags can be toggled in `~/.devglobe/config.toml` under `[privacy]`: `hide_file_names`, `hide_branch_names`, `hide_project_names` (the project flag also hides branches).

Globe-side visibility (anonymous mode, repo sharing on the live globe, profile mode) is managed on [devglobe.xyz/dashboard/settings](https://devglobe.xyz/dashboard/settings).

## Source code

This is the standalone repository for the Zed marketplace. The full source code (including `server/src/`) lives in the main DevGlobe extensions monorepo: [Nako0/devglobe-extension](https://github.com/Nako0/devglobe-extension).
