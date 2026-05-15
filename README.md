# DevGlobe — Zed Extension

Show your live coding presence on the [DevGlobe](https://devglobe.app) world map from Zed.

## Requirements

- [Zed](https://zed.dev) editor
- A DevGlobe API key from [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings)

## Setup

### 1. Get your API key

Sign in on [devglobe.app](https://devglobe.app) with GitHub, X (Twitter), or Google, then copy your API key from [profile settings](https://devglobe.app/dashboard/settings).

### 2. Install the extension

Install DevGlobe from the Zed extensions marketplace, or as a dev extension:

1. Open Zed
2. `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Linux) → "zed: install dev extension"
3. Select this folder

On first activation, the extension downloads the matching `devglobe-core` binary for your platform from [GitHub Releases](https://github.com/Nako0/devglobe-extension/releases) (one-time, ~60 MB).

### 3. Configure DevGlobe

Create your config file:

```bash
mkdir -p ~/.devglobe
cat > ~/.devglobe/config.toml <<'EOF'
api_key = "devglobe_YOUR_KEY_HERE"
EOF
```

Visibility settings (anonymous mode, repo sharing on the live globe, profile mode) are managed on [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings).

### 4. Trust your project

When you open a project, Zed may ask you to trust the worktree. Accept to allow the DevGlobe language server to start.

### 5. Start coding

Open any code file and start editing. You'll appear on the globe within 30 seconds. The extension detects your language automatically.

## How it works

The extension downloads the prebuilt `devglobe-core` binary on first activation, then runs it as a Language Server. The LSP receives file open/change/save events from Zed and sends heartbeats every 30 seconds while you're actively coding. After 1 minute of inactivity, heartbeats pause automatically.

## Supported languages

80+ languages including: JavaScript, TypeScript, Python, Rust, Go, C, C++, Java, Kotlin, Swift, Ruby, PHP, Elixir, Haskell, Scala, and many more.

## Privacy

The extension sends programming language, editor name, OS, coding time, the origin remote URL of your current git repo (when present), branch name, and the file path **relative to your repo root** — never an absolute home path.

Files outside any git repository are not tracked beyond their language. We never read source code, file contents, keystrokes, or commit messages.

Local privacy flags can be toggled in `~/.devglobe/config.toml` under `[privacy]`: `hide_file_names`, `hide_branch_names`, `hide_project_names` (the project flag also hides branches).

Globe-side visibility (anonymous mode, repo sharing on the live globe, profile mode) is managed on [devglobe.app/dashboard/settings](https://devglobe.app/dashboard/settings).

## Source code

This is the standalone repository for the Zed marketplace. The full source code lives in the main DevGlobe extensions monorepo: [Nako0/devglobe-extension](https://github.com/Nako0/devglobe-extension).
