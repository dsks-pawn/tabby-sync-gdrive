/**
 * Google Drive Sync Plugin for Tabby Terminal
 *
 * This plugin enables secure synchronization of Tabby configuration across
 * multiple machines using Google Drive as the storage backend.
 *
 * FEATURES:
 * - Syncs SSH profiles (host, port, username, groups)
 * - Syncs saved passwords (encrypted)
 * - Syncs terminal/UI settings
 * - AES-256-GCM encryption with master password
 * - Smart merge with conflict resolution
 * - Auto-sync on config changes
 *
 * SECURITY:
 * - Private keys are NEVER synced
 * - Data is encrypted before upload
 * - Master password is never stored in plaintext
 * - Uses Google Drive AppData folder (hidden from user)
 *
 * @author Your Name
 * @version 1.0.0
 */

import { NgModule, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigProvider, LogService } from 'tabby-core';
import { SettingsTabProvider } from 'tabby-settings';

import { GDriveSyncConfigProvider } from './config.provider';
import { CryptoService } from './services/crypto.service';
import { DriveService } from './services/drive.service';
import { SyncService } from './services/sync.service';
import { SettingsComponent } from './components/settings.component';

// Re-export interfaces for external use
export * from './interfaces/sync.interface';

/**
 * Settings tab provider for integrating with Tabby's settings page.
 */
class GDriveSyncSettingsTabProvider extends SettingsTabProvider {
  id = 'gdrive-sync';
  title = 'Google Drive Sync';
  icon = 'fab fa-google-drive';

  getComponentType(): typeof SettingsComponent {
    return SettingsComponent;
  }
}

/**
 * Main plugin module.
 * Tabby will automatically load this as it's the default export.
 */
@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [SettingsComponent],
  providers: [
    // Services
    CryptoService,
    DriveService,
    SyncService,

    // Config provider
    {
      provide: ConfigProvider,
      useClass: GDriveSyncConfigProvider,
      multi: true,
    },

    // Settings tab
    {
      provide: SettingsTabProvider,
      useClass: GDriveSyncSettingsTabProvider,
      multi: true,
    },
  ],
})
export class GDriveSyncModule implements OnDestroy {
  private syncService: SyncService;

  /**
   * Plugin initialization.
   * Called when Tabby loads the plugin.
   */
  constructor(
    syncService: SyncService,
    private log: LogService,
  ) {
    this.syncService = syncService;
    const logger = log.create('GDriveSync');

    logger.info('Google Drive Sync plugin loaded');

    // Initialize sync service
    this.syncService
      .initialize()
      .then(() => {
        logger.info('Sync service initialized');
      })
      .catch((error) => {
        logger.error('Failed to initialize sync service:', error);
      });
  }

  /**
   * Plugin cleanup.
   * Called when Tabby unloads the plugin.
   */
  ngOnDestroy(): void {
    this.syncService.destroy();
  }
}

// Default export for Tabby plugin loader
export default GDriveSyncModule;
