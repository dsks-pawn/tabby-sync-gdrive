# Tabby Google Drive Sync Plugin

🔐 **Secure cloud sync for Tabby Terminal using Google Drive**

Synchronize your Tabby SSH profiles, saved passwords, terminal settings, and personalization across multiple machines with end-to-end AES-256 encryption.

## ✨ Features

- **🔒 Secure Sync**: AES-256-GCM encryption for all synced data
- **🎨 Full Personalization Sync**: Theme, fonts, hotkeys, color schemes, and more
- **🔀 Smart Merge**: Conflict resolution based on timestamps
- **🛡️ Privacy First**: SSH private keys are NEVER synced
- **⚡ Auto-sync**: Detects config changes and syncs automatically
- **📁 AppData Storage**: Uses Google Drive's hidden app folder (invisible to users)
- **🌐 Cross-Platform**: Windows, macOS, Linux support
- **🚀 Zero Configuration**: Just install and connect - no API setup required!

## 🔒 What Gets Synced

| ✅ Synced                            | ❌ NOT Synced (for security)      |
| ------------------------------------ | --------------------------------- |
| SSH profiles (host, port, username)  | SSH private keys                  |
| Profile groups and labels            | Key file paths                    |
| Saved passwords (encrypted)          | Local filesystem paths            |
| Theme & Appearance                   | Proxy commands with local scripts |
| Font settings (family, size, weight) | Machine-specific paths            |
| Terminal settings                    |                                   |
| Hotkey configurations                |                                   |
| Custom color schemes                 |                                   |
| Window settings                      |                                   |
| Application preferences              |                                   |

## 📦 Installation

### Option 1: Install from Tabby Plugin Store (Recommended)

1. Open **Tabby**
2. Go to **Settings** → **Plugins**
3. Search for `tabby-sync-gdrive`
4. Click **Install**
5. Restart Tabby

### Option 2: Install via npm

```bash
npm install -g tabby-sync-gdrive
```

Then restart Tabby.

### Option 3: Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/user/tabby-sync-gdrive.git
cd tabby-sync-gdrive

# 2. Install dependencies
yarn install

# 3. Build and install to Tabby (auto-detects OS)
yarn install-plugin

# 4. Restart Tabby
```

## 🚀 Quick Start (2 Steps!)

### Step 1: Connect to Google Drive

1. Open **Tabby**
2. Go to **Settings** → **Google Drive Sync**
3. Click **"Connect Google Drive"**
4. A browser window will open - sign in with your Google account
5. Allow the app to access its own AppData folder
6. Done! ✨

### Step 2: That's it!

Your settings will now sync automatically across all your machines.

## 📱 On a New Machine

1. Install the plugin (any method above)
2. Open Tabby → Settings → Google Drive Sync
3. Click **Connect Google Drive**
4. Sign in with the **same Google account**
5. All your settings sync automatically! 🎉

## ⚠️ Security & Privacy

### Data Encryption

- All sync data is encrypted with **AES-256-GCM**
- Encryption uses **PBKDF2** (100,000 iterations) for key derivation
- Each encryption uses unique IV and salt
- Master password: `123456` (default, can be changed in future versions)

### Privacy Guarantees

- ✅ **SSH private keys are NEVER synced** - they stay on your local machine
- ✅ Data stored in Google Drive's **hidden AppData folder** - not visible in your Drive
- ✅ Only this app can access its own data folder
- ✅ No telemetry or analytics

### Google OAuth Scope

This plugin only requests `drive.appdata` scope - the most restrictive scope that:

- ✅ Can only access the app's own hidden folder
- ❌ Cannot read your personal files
- ❌ Cannot access your documents, photos, etc.

## 🔄 Sync Behavior

| Scenario                | Behavior                                   |
| ----------------------- | ------------------------------------------ |
| New profile on remote   | Added locally                              |
| Profile updated on both | Newer timestamp wins                       |
| Settings differ         | Remote takes precedence (for new machines) |
| New machine syncs       | Receives all settings from cloud           |
| Offline                 | Works offline, syncs when back online      |

## 🐛 Troubleshooting

### "Authorization failed" or connection issues

1. Make sure you're using a valid Google account
2. Try disconnecting and reconnecting
3. Check your internet connection

### "Failed to decrypt"

- Sync data may be corrupted
- Solution: Delete the sync file from Google Drive AppData:
  1. Go to [Google Drive](https://drive.google.com)
  2. Settings → Manage Apps → Find "Tabby Sync"
  3. Click "Delete hidden app data"
  4. Reconnect in Tabby

### Plugin not appearing in Settings

1. Make sure the plugin is installed correctly
2. Restart Tabby completely (including system tray)
3. Check Tabby logs for errors (Ctrl+Shift+I → Console)

### Settings not syncing

1. Check if you're connected (green checkmark in Settings)
2. Try manual disconnect → reconnect
3. Make sure you're using the same Google account on all machines

## 📁 Project Structure

```
tabby-sync-gdrive/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── config.provider.ts    # Default config values
│   ├── interfaces/
│   │   └── sync.interface.ts # Type definitions
│   ├── services/
│   │   ├── crypto.service.ts # AES-256 encryption
│   │   ├── drive.service.ts  # Google Drive API
│   │   └── sync.service.ts   # Main orchestration
│   ├── utils/
│   │   ├── merge.util.ts     # Smart merge logic
│   │   └── sanitize.util.ts  # Remove sensitive data
│   └── components/
│       └── settings.component.ts  # Settings UI
├── scripts/
│   └── install.js            # Cross-platform install script
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 📋 Available Scripts

| Script                | Description                                  |
| --------------------- | -------------------------------------------- |
| `yarn build`          | Build the plugin                             |
| `yarn install-plugin` | Build and install to Tabby (auto-detects OS) |
| `yarn watch`          | Watch mode for development                   |
| `yarn lint`           | Run ESLint                                   |
| `yarn clean`          | Remove dist folder                           |

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn lint` and fix issues
5. Submit a pull request

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/user/tabby-sync-gdrive/issues)
- **Discussions**: [GitHub Discussions](https://github.com/user/tabby-sync-gdrive/discussions)

---

Made with ❤️ for the Tabby community
