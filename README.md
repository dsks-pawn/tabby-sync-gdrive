# Tabby Google Drive Sync Plugin

🔐 **Secure cloud sync for Tabby Terminal using Google Drive**

Synchronize your Tabby SSH profiles, saved passwords, terminal settings, and personalization across multiple machines with end-to-end AES-256 encryption.

## ✨ Features

- **Secure Sync**: AES-256-GCM encryption with master password
- **Full Personalization Sync**: Theme, fonts, hotkeys, color schemes, and more
- **Smart Merge**: Conflict resolution based on timestamps
- **Privacy First**: SSH private keys are NEVER synced
- **Auto-sync**: Detects config changes and syncs automatically
- **AppData Storage**: Uses Google Drive's hidden app folder
- **Offline Safe**: Works gracefully when offline
- **Cross-Platform**: Windows, macOS, Linux support

## 🔒 What Gets Synced

| ✅ Synced                                | ❌ NOT Synced                     |
| ---------------------------------------- | --------------------------------- |
| SSH profiles (host, port, username)      | SSH private keys                  |
| Profile groups and labels                | Key file paths                    |
| Saved passwords (encrypted)              | Local filesystem paths            |
| **Theme & Appearance**                   | Proxy commands with local scripts |
| **Font settings (family, size, weight)** | Machine-specific paths            |
| **Terminal settings**                    |                                   |
| **Hotkey configurations**                |                                   |
| **Custom color schemes**                 |                                   |
| **Window settings**                      |                                   |
| **Application preferences**              |                                   |

## 📦 Installation

### Prerequisites

- [Tabby Terminal](https://tabby.sh/) v1.0.180 or later
- Node.js 18+ (for building)
- Google Account

### Quick Install

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/tabby-sync-gdrive.git
cd tabby-sync-gdrive

# 2. Install dependencies
yarn install

# 3. Configure Google OAuth (see below)
# Edit .env file with your credentials

# 4. Build and install to Tabby (auto-detects OS)
yarn install-plugin
```

**That's it!** Restart Tabby after installation.

### Manual Installation

If automated install doesn't work:

```bash
# Build first
yarn build

# Then copy dist folder to Tabby plugins directory:

# Windows (PowerShell)
Copy-Item -Recurse -Force dist/* "$env:APPDATA\tabby\plugins\node_modules\tabby-sync-gdrive\"

# Windows (Git Bash)
cp -r dist/* "$APPDATA/tabby/plugins/node_modules/tabby-sync-gdrive/"

# macOS
cp -r dist/* ~/Library/Application\ Support/tabby/plugins/node_modules/tabby-sync-gdrive/

# Linux
cp -r dist/* ~/.config/tabby/plugins/node_modules/tabby-sync-gdrive/
```

Restart Tabby after installation.

## 🔧 Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Tabby Sync")
3. Select the project

### Step 2: Enable Google Drive API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal if using Google Workspace)
3. Fill in:
   - App name: "Tabby Sync"
   - User support email: your email
   - Developer contact: your email
4. Add scope: `https://www.googleapis.com/auth/drive.appdata`
5. Add yourself as a test user (while in testing mode)

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: "Tabby Sync Desktop"
5. Click **Create**
6. Download the JSON or copy **Client ID** and **Client Secret**

### Step 5: Configure the Plugin

Create/edit the `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

Then rebuild:

```bash
yarn install-plugin
```

## 🚀 Usage

### First-Time Setup

1. Open Tabby
2. Go to **Settings** → **Google Drive Sync**
3. Click **Connect Google Drive**
4. A browser will open for Google authorization
5. Grant the requested permission
6. Done! Sync starts automatically.

### Daily Use

- Plugin auto-syncs whenever you change settings
- Status shown in settings panel (last sync time)
- No manual action needed

### On a New Machine

1. Clone this repo and install (see Installation above)
2. Configure `.env` with the same Google OAuth credentials
3. Run `yarn install-plugin`
4. Restart Tabby
5. Connect to the same Google account
6. Your settings will sync automatically!

## ⚠️ Security Notes

### Data Encryption

- All sync data is encrypted with AES-256-GCM
- A default master password is used for simplicity
- Encryption uses PBKDF2 (100,000 iterations) for key derivation
- Each encryption uses unique IV and salt

### What's Safe

- SSH private keys stay local only
- Local file paths are excluded from sync
- Authentication tokens are stored securely

## 🔄 Sync Behavior

| Scenario                | Behavior                                   |
| ----------------------- | ------------------------------------------ |
| New profile on remote   | Added locally                              |
| Profile updated on both | Newer timestamp wins                       |
| Settings differ         | Remote takes precedence (for new machines) |
| New machine syncs       | Receives all settings from cloud           |

## 🐛 Troubleshooting

### "Failed to decrypt"

- Sync data may be corrupted
- Solution: Delete remote file from Google Drive AppData and re-sync

### "Authorization failed"

- OAuth tokens expired
- Solution: Disconnect and reconnect Google Drive

### "Network error"

- Internet connectivity issue
- Solution: Check connection, retry later

### Plugin not appearing in Settings

1. Check that plugin is in correct directory:
   - Windows: `%APPDATA%\tabby\plugins\node_modules\tabby-sync-gdrive\`
   - macOS: `~/Library/Application Support/tabby/plugins/node_modules/tabby-sync-gdrive/`
   - Linux: `~/.config/tabby/plugins/node_modules/tabby-sync-gdrive/`
2. Ensure `package.json` exists in that folder
3. Restart Tabby completely

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
├── .env                      # Google OAuth credentials (create this)
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

## 🧪 Testing on Multiple Machines

1. **Machine A** (first setup):
   - Install plugin with your OAuth credentials
   - Connect Google Drive
   - Customize Tabby (theme, fonts, profiles, etc.)
   - Wait for auto-sync or check Settings

2. **Machine B** (second machine):
   - Clone repo, configure same `.env`, run `yarn install-plugin`
   - Restart Tabby
   - Connect same Google account
   - All your customizations appear automatically!

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn lint` and fix issues
5. Submit a pull request

---

Made with ❤️ for the Tabby community
