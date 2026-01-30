# Tabby Google Drive Sync Plugin

🔐 **Secure cloud sync for Tabby Terminal using Google Drive**

Synchronize your Tabby SSH profiles, saved passwords, terminal settings, snippets, and plugins across multiple machines with end-to-end AES-256 encryption.

## ✨ Features

- **🔒 Secure Sync**: AES-256-GCM encryption for all synced data
- **🎨 Full Personalization Sync**: Theme, fonts, hotkeys, color schemes, and more
- **� Snippets Sync**: Fully supports syncing snippets from the `quick-cmds` plugin
- **🧩 Plugin Sync**: Detects and notifies about missing plugins on other machines
- **⏳ Time Machine**: View and restore previous versions of your config with one click
- **🛣️ Smart Path Mapping**: Automatically handles cross-platform paths (Windows/macOS/Linux) for backgrounds and CWD
- **�🔀 Smart Merge**: Conflict resolution based on timestamps
- **🛡️ Privacy First**: SSH private keys are NEVER synced
- **⚡ Auto-sync**: Detects config changes and syncs automatically
- **📁 AppData Storage**: Uses Google Drive's hidden app folder (invisible to users)
- **🌐 Cross-Platform**: Windows, macOS, Linux support

## 🔒 What Gets Synced

| ✅ Synced                            | ❌ NOT Synced (for security)      |
| ------------------------------------ | --------------------------------- |
| SSH profiles (host, port, username)  | SSH private keys                  |
| Profile groups and labels            | Key file paths (local)            |
| Saved passwords (encrypted)          | Local filesystem paths            |
| Theme & Appearance                   | Proxy commands with local scripts |
| Font settings (family, size, weight) | Machine-specific paths            |
| Terminal settings                    | Screen/Monitor specific IDs       |
| Hotkey configurations                |                                   |
| Custom color schemes                 |                                   |
| Window settings                      |                                   |
| Application preferences              |                                   |
| **Snippets (quick-cmds)**            |                                   |
| **List of installed plugins**        |                                   |

## 🚀 Advanced Features

### ⏳ Time Machine (Version History)

Mistakes happen! This plugin keeps a history of your configuration versions on Google Drive.

- Go to **Settings** -> **Google Drive Sync**.
- Click on **Time Machine (Version History)**.
- Browse past versions and click **Restore** to roll back to any previous state.

### 🛣️ Smart Path Mapping

Sync your background images and working directories across different operating systems seamlessly.

- Local paths like `C:\Users\Admin\wallpapers\bg.jpg` are automatically converted to `$TABBY_SYNC_HOME/wallpapers/bg.jpg` when syncing.
- When downloading on macOS/Linux, it automatically maps back to `/Users/admin/wallpapers/bg.jpg`.
- Works for **Terminal Backgrounds**, **Profile CWD**, and **Shell paths**.

### 🧩 Plugin Synchronization

Never forget which plugins you had installed.

- The plugin syncs the list of your installed plugins.
- If you move to a new machine, it will warn you about **Missing Plugins** so you can install them to match your setup.

### 📝 Snippets (quick-cmds) Support

Fully supports syncing snippets/commands created with the popular `quick-cmds` plugin. Your productivity scripts follow you everywhere.

## � Installation

### Option 1: Install from Tabby Plugin Store (Recommended)

1. Open **Tabby**
2. Go to **Settings** → **Plugins**
3. Search for `tabby-sync-gdrive`
4. Click **Install**
5. Restart Tabby

### Option 2: Manual Installation

1. Download the latest release from GitHub.
2. Unzip into your Tabby plugins folder:
   - Windows: `%APPDATA%\tabby\plugins\node_modules`
   - macOS: `~/Library/Application Support/tabby/plugins`
   - Linux: `~/.config/tabby/plugins`
3. Restart Tabby.

## 🚀 Quick Start

1. Open **Tabby** -> **Settings** -> **Google Drive Sync**
2. Click **"Connect Google Drive"**
3. Sign in with your Google account
4. Done! Your settings will now sync automatically.

## ⚠️ Security & Privacy

### Data Encryption

- All sync data is encrypted with **AES-256-GCM**
- Encryption uses **PBKDF2** for key derivation
- Each encryption uses unique IV and salt
- Data is stored in Google Drive's **AppData folder**, which is hidden from normal view and only accessible by this plugin.

### Privacy Guarantees

- This plugin **CANNOT** access your personal Google Drive files.
- It only has access to its own configuration files.
- No data is sent to any third-party server (direct connection between Tabby and Google).

---

_Made with ❤️ for the Tabby community_
