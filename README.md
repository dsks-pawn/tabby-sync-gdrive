# Tabby Google Drive Sync Plugin

🔐 **Secure cloud sync for Tabby Terminal using Google Drive**

Synchronize your Tabby SSH profiles, saved passwords, terminal settings, and personalization across multiple machines with end-to-end AES-256 encryption.

## ✨ Features

- **Secure Sync**: AES-256-GCM encryption
- **Full Personalization Sync**: Theme, fonts, hotkeys, color schemes, and more
- **Smart Merge**: Conflict resolution based on timestamps
- **Privacy First**: SSH private keys are NEVER synced
- **Auto-sync**: Detects config changes and syncs automatically
- **AppData Storage**: Uses Google Drive's hidden app folder
- **Offline Safe**: Works gracefully when offline
- **Cross-Platform**: Windows, macOS, Linux support
- **User-Owned Credentials**: Each user uses their own Google Cloud project

## 🔒 What Gets Synced

| ✅ Synced                            | ❌ NOT Synced                     |
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

### Option 1: Install from npm (Recommended)

```bash
# In Tabby, go to Settings → Plugins → Search for "tabby-sync-gdrive"
# Or install via npm:
npm install -g tabby-sync-gdrive
```

### Option 2: Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/user/tabby-sync-gdrive.git
cd tabby-sync-gdrive

# 2. Install dependencies
yarn install

# 3. Build and install to Tabby (auto-detects OS)
yarn install-plugin
```

Restart Tabby after installation.

## 🚀 First-Time Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Tabby Sync")
3. Select the project

### Step 2: Enable Google Drive API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External**
3. Fill in:
   - App name: "Tabby Sync"
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. Add scope: `https://www.googleapis.com/auth/drive.appdata`
6. Add yourself as a test user

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Desktop app**
4. Name: "Tabby Sync Desktop"
5. Click **Create**
6. Copy **Client ID** and **Client Secret**

### Step 5: Configure in Tabby

1. Open Tabby
2. Go to **Settings** → **Google Drive Sync**
3. Enter your **Client ID** and **Client Secret**
4. Click **Save Credentials**
5. Click **Connect Google Drive**
6. Authorize in browser
7. Done! Sync starts automatically.

## 📱 On a New Machine

1. Install the plugin (npm or build from source)
2. Open Tabby Settings → Google Drive Sync
3. Enter the **same** Client ID and Client Secret
4. Click Connect Google Drive
5. All your settings sync automatically!

## ⚠️ Security Notes

### Data Encryption

- All sync data is encrypted with AES-256-GCM
- Encryption uses PBKDF2 (100,000 iterations) for key derivation
- Each encryption uses unique IV and salt

### Privacy

- **Your credentials stay with you**: Each user creates their own Google Cloud project
- SSH private keys are NEVER synced
- Data is stored in Google Drive's hidden AppData folder

## 🔄 Sync Behavior

| Scenario                | Behavior                                   |
| ----------------------- | ------------------------------------------ |
| New profile on remote   | Added locally                              |
| Profile updated on both | Newer timestamp wins                       |
| Settings differ         | Remote takes precedence (for new machines) |
| New machine syncs       | Receives all settings from cloud           |

## 🐛 Troubleshooting

### "OAuth credentials not configured"

- You need to enter Client ID and Client Secret first
- Get them from Google Cloud Console

### "Authorization failed"

- Check that your Client ID/Secret are correct
- Make sure you added yourself as test user in OAuth consent screen

### "Failed to decrypt"

- Sync data may be corrupted
- Solution: Delete the sync file from Google Drive AppData and re-sync

### Plugin not appearing in Settings

1. Check that plugin is in correct directory
2. Restart Tabby completely

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

---

Made with ❤️ for the Tabby community
