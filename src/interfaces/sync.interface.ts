/**
 * Core interfaces for the Google Drive Sync plugin.
 * These define the data structures used throughout the sync process.
 */

/**
 * SSH Profile that will be synced.
 * Excludes private keys and local file paths for security.
 */
export interface SyncableSSHProfile {
  id: string;
  name: string;
  type: string;
  group?: string;
  icon?: string;
  color?: string;

  // SSH connection options (sanitized)
  options?: {
    host?: string;
    port?: number;
    user?: string;
    auth?: string; // 'password' | 'publicKey' | 'agent' | 'keyboardInteractive'
    password?: string; // Will be encrypted
    // NOTE: privateKeys and privateKeyPath are explicitly EXCLUDED
    algorithms?: {
      hmac?: string[];
      kex?: string[];
      cipher?: string[];
      serverHostKey?: string[];
    };
    keepaliveInterval?: number;
    keepaliveCountMax?: number;
    readyTimeout?: number;
    x11?: boolean;
    agentForward?: boolean;
    jumpHost?: string;
  };

  // UI/behavior settings
  weight?: number;
  disableDynamicTitle?: boolean;
  behaviorOnSessionEnd?: string;
}

/**
 * Syncable profile group
 */
export interface SyncableProfileGroup {
  id: string;
  name: string;
  collapsed?: boolean;
}

/**
 * Vault secret for saved passwords
 * Passwords are already encrypted by Tabby's vault
 */
export interface SyncableVaultSecret {
  type: string;
  key: {
    type: string;
    id?: string;
    host?: string;
    user?: string;
  };
  value: string; // Encrypted password
}

/**
 * Syncable UI/Terminal settings
 */
export interface SyncableSettings {
  terminal?: {
    frontend?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    fontWeightBold?: number;
    ligatures?: boolean;
    cursor?: string;
    cursorBlink?: boolean;
    bell?: string;
    bracketedPaste?: boolean;
    background?: string;
    colorScheme?: {
      name?: string;
      foreground?: string;
      background?: string;
      cursor?: string;
      colors?: string[];
    };
    scrollbackLines?: number;
    rightClick?: string;
    wordSeparator?: string;
    copyOnSelect?: boolean;
    pasteOnMiddleClick?: boolean;
    shellIntegration?: boolean;
  };

  appearance?: {
    theme?: string;
    frame?: string;
    opacity?: number;
    vibrancy?: boolean;
    tabsOnTop?: boolean;
    dockScreen?: string;
    dockPosition?: string;
  };

  hotkeys?: Record<string, string[]>;
}

/**
 * The complete sync payload that gets encrypted and stored on Drive
 */
export interface SyncPayload {
  // Metadata
  version: number;
  lastUpdated: number; // Unix timestamp in ms
  sourceHost: string; // Machine hostname for conflict detection

  // Syncable content
  profiles: SyncableSSHProfile[];
  groups: SyncableProfileGroup[];
  vault?: {
    secrets?: SyncableVaultSecret[];
  };
  settings: SyncableSettings;
}

/**
 * Plugin-specific configuration stored in Tabby config
 */
export interface GDriveSyncConfig {
  enabled: boolean;
  autoSyncOnChange: boolean;
  autoSyncOnStartup: boolean;
  syncIntervalMinutes: number;

  // Auth state (tokens are stored encrypted)
  googleAuthTokens?: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  };

  // Master password hash for verification (NEVER store plaintext password)
  masterPasswordHash?: string;
  masterPasswordSalt?: string;

  // Sync status
  lastSyncTime?: number;
  lastSyncError?: string;
  lastSyncHost?: string;

  // Remote file info
  driveFileId?: string;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  action: 'upload' | 'download' | 'merge' | 'none';
  timestamp: number;
  error?: string;
  conflictsResolved?: number;
}

/**
 * Merge conflict information
 */
export interface MergeConflict {
  profileId: string;
  localProfile: SyncableSSHProfile;
  remoteProfile: SyncableSSHProfile;
  resolution: 'local' | 'remote' | 'merged';
}
