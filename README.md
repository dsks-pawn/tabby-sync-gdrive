# Tabby Google Drive Sync Plugin

🔐 **Secure cloud sync for Tabby Terminal using Google Drive**

Synchronize your Tabby SSH profiles, saved passwords, and terminal settings across multiple machines with end-to-end AES-256 encryption.

## ✨ Features

- **Secure Sync**: AES-256-GCM encryption with master password
- **Smart Merge**: Conflict resolution based on timestamps
- **Privacy First**: SSH private keys are NEVER synced
- **Auto-sync**: Detects config changes and syncs automatically
- **AppData Storage**: Uses Google Drive's hidden app folder
- **Offline Safe**: Works gracefully when offline

## 🔒 What Gets Synced

| ✅ Synced                           | ❌ NOT Synced                     |
| ----------------------------------- | --------------------------------- |
| SSH profiles (host, port, username) | SSH private keys                  |
| Profile groups and labels           | Key file paths                    |
| Saved passwords (encrypted)         | Local filesystem paths            |
| Terminal appearance settings        | Proxy commands with local scripts |
| Hotkey configurations               |                                   |
| Color schemes                       |                                   |

## 📦 Installation

### Prerequisites

- [Tabby Terminal](https://tabby.sh/) v1.0.180 or later
- Node.js 18+ (for building)
- Google Account

### Build from Source

```bash
# Clone or download this plugin
git clone https://github.com/your-repo/tabby-sync-gdrive.git
cd tabby-sync-gdrive

# Install dependencies
yarn install

# Build the plugin
yarn build
```

### Install to Tabby

1. Open Tabby
2. Go to **Settings** → **Plugins**
3. Click **Install from folder**
4. Select the `dist` folder from this plugin

Or manually copy:

```bash
# Windows
copy dist %APPDATA%\tabby\plugins\tabby-sync-gdrive

# macOS
cp -r dist ~/Library/Application\ Support/tabby/plugins/tabby-sync-gdrive

# Linux
cp -r dist ~/.config/tabby/plugins/tabby-sync-gdrive
```

Restart Tabby after installation.

## 🔧 Google Cloud Setup

Before using this plugin, you need to set up OAuth credentials:

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

Update `src/services/drive.service.ts`:

```typescript
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
```

Then rebuild:

```bash
yarn build
```

## 🚀 Usage

### First-Time Setup

1. Open Tabby Settings → **Google Drive Sync**
2. Click **Connect Google Drive**
3. A browser will open for Google authorization
4. Grant the requested permission
5. Set a **Master Password** (remember this!)
6. Click **Sync Now**

### Daily Use

- Plugin auto-syncs whenever you change settings
- Status shown in settings panel
- Manual sync available via **Sync Now** button

### On a New Machine

1. Install the plugin
2. Connect to the same Google account
3. Enter the same Master Password
4. Click **Download Only** to pull config

## ⚠️ Security Notes

### Master Password

- Your master password encrypts all sync data
- It is **NEVER** stored in plaintext
- Only a hash is stored for verification
- If you forget it, you cannot decrypt existing sync data

### What's Safe

- SSH private keys stay local only
- Encryption uses AES-256-GCM (authenticated encryption)
- Keys derived with PBKDF2 (100,000 iterations)
- Each encryption uses unique IV and salt

### Recommendations

1. Use a strong, unique master password
2. Don't share your Google account
3. Regularly verify sync status
4. Keep local backups of important profiles

## 🔄 Merge Behavior

When syncing between machines:

| Scenario                | Behavior                   |
| ----------------------- | -------------------------- |
| New profile on remote   | Added locally              |
| Profile updated on both | Newer timestamp wins       |
| Profile deleted locally | Stays deleted              |
| Settings conflict       | Local takes precedence     |
| Password differs        | Local kept, remote ignored |

## 🐛 Troubleshooting

### "Failed to decrypt"

- Wrong master password
- Or sync data corrupted
- Solution: Re-enter password, or delete remote and re-sync

### "Authorization failed"

- OAuth tokens expired
- Solution: Disconnect and reconnect Google Drive

### "Network error"

- Internet connectivity issue
- Solution: Check connection, retry later

### Sync loop / conflicts

- Rapid changes on multiple machines
- Solution: Wait for sync to complete before switching

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
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## 🧪 Testing on Multiple Machines

1. **Machine A** (first setup):
   - Install plugin
   - Connect Google Drive
   - Set master password
   - Add/modify some SSH profiles
   - Click **Sync Now**

2. **Machine B** (second machine):
   - Install plugin
   - Connect same Google account
   - Enter same master password
   - Click **Download Only**
   - Verify profiles appeared

3. **Verify bidirectional sync**:
   - Modify a profile on Machine B
   - Wait for auto-sync (or manual sync)
   - On Machine A, **Download Only**
   - Verify changes appeared

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `yarn lint` and fix issues
5. Submit a pull request

## 📞 Support

- Open an issue for bugs
- Discussions for questions
- PRs for contributions

---

Made with ❤️ for the Tabby community
