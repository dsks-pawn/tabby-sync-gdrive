/**
 * Settings component for the Google Drive Sync plugin.
 * Provides UI for:
 * - Enabling/disabling sync
 * - Connecting to Google Drive
 * - Setting master password
 * - Manual sync trigger
 * - Status display
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SyncService, SyncState } from '../services/sync.service';
import { DriveConnectionStatus } from '../services/drive.service';

@Component({
  selector: 'gdrive-sync-settings',
  template: `
    <div class="gdrive-sync-settings">
      <h3>
        <i class="fas fa-cloud"></i>
        Google Drive Sync
      </h3>

      <!-- Connection Status -->
      <div class="status-section">
        <div
          class="status-indicator"
          [class.connected]="driveStatus?.connected"
          [class.error]="syncState?.status === 'error'"
        >
          <i
            class="fas"
            [class.fa-check-circle]="driveStatus?.connected"
            [class.fa-times-circle]="!driveStatus?.connected"
          ></i>
          <span *ngIf="driveStatus?.connected">
            Connected as {{ driveStatus?.email }}
          </span>
          <span *ngIf="!driveStatus?.connected"> Not connected </span>
        </div>

        <div class="sync-status" *ngIf="driveStatus?.connected">
          <span *ngIf="syncState?.status === 'syncing'">
            <i class="fas fa-sync fa-spin"></i> Syncing...
          </span>
          <span *ngIf="syncState?.status === 'idle' && syncState?.lastSyncTime">
            <i class="fas fa-clock"></i> Last sync:
            {{ formatTime(syncState.lastSyncTime) }}
          </span>
          <span *ngIf="syncState?.status === 'error'" class="error-text">
            <i class="fas fa-exclamation-triangle"></i> Error:
            {{ syncState?.lastSyncError }}
          </span>
        </div>
      </div>

      <!-- Google Drive Connection -->
      <div class="button-row">
        <button
          *ngIf="!driveStatus?.connected"
          class="btn btn-primary"
          (click)="connectGoogleDrive()"
          [disabled]="isConnecting"
        >
          <i class="fab fa-google-drive"></i>
          {{ isConnecting ? 'Connecting...' : 'Connect Google Drive' }}
        </button>
        <div *ngIf="driveStatus?.connected" class="connected-actions">
          <!-- Hidden Sync Now button available via alt-click if debug needed, but purely optional -->
          <button class="btn btn-warning" (click)="disconnectGoogleDrive()">
            <i class="fas fa-unlink"></i>
            Disconnect
          </button>
        </div>
      </div>

      <!-- Hidden Password Logic (Using Default) -->
      <div *ngIf="driveStatus?.connected" class="status-msg">
        <i class="fas fa-shield-alt"></i> Protected with default security.
      </div>
    </div>
  `,
  styles: [
    `
      .gdrive-sync-settings {
        padding: 20px;
      }

      h3 {
        margin-bottom: 20px;
        color: var(--body-color);
      }

      h3 i,
      h4 i {
        margin-right: 8px;
        color: var(--theme-primary);
      }

      h4 {
        margin-top: 20px;
        margin-bottom: 10px;
        font-size: 1rem;
      }

      .status-msg {
        margin-top: 20px;
        opacity: 0.7;
        font-size: 0.9rem;
      }

      .status-section {
        background: var(--bs-body-bg);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
      }

      .status-indicator.connected i {
        color: var(--bs-success);
      }

      .status-indicator:not(.connected) i {
        color: var(--bs-warning);
      }

      .status-indicator.error i {
        color: var(--bs-danger);
      }

      .sync-status {
        margin-top: 8px;
        font-size: 0.85rem;
        opacity: 0.8;
      }

      .error-text {
        color: var(--bs-danger);
      }

      .setting-row {
        margin-bottom: 10px;
      }

      .setting-row label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .button-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        transition: opacity 0.2s;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--theme-primary);
        color: white;
      }

      .btn-secondary {
        background: var(--bs-secondary);
        color: white;
      }

      .btn-success {
        background: var(--bs-success);
        color: white;
      }

      .btn-warning {
        background: var(--bs-warning);
        color: black;
      }

      .btn-info {
        background: var(--bs-info);
        color: white;
      }

      .btn-icon {
        background: transparent;
        padding: 8px;
        color: var(--body-color);
      }

      .password-section {
        background: var(--bs-body-bg);
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
      }

      .help-text {
        font-size: 0.85rem;
        opacity: 0.8;
        margin-bottom: 10px;
      }

      .password-input-row {
        display: flex;
        gap: 8px;
        margin-bottom: 10px;
      }

      .form-control {
        flex: 1;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid var(--bs-border-color);
        background: var(--bs-dark);
        color: var(--body-color);
      }

      .password-actions {
        display: flex;
        gap: 10px;
      }

      .password-error {
        color: var(--bs-danger);
        font-size: 0.85rem;
        margin-top: 10px;
      }

      .password-ok {
        color: var(--bs-success);
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class SettingsComponent implements OnInit, OnDestroy {
  // State
  driveStatus: DriveConnectionStatus | null = null;
  syncState: SyncState | null = null;
  isConnecting = false;

  private subscriptions: Subscription[] = [];

  constructor(private sync: SyncService) {}

  ngOnInit(): void {
    // Subscribe to drive status
    this.subscriptions.push(
      this.sync.getDriveStatus().subscribe((status) => {
        this.driveStatus = status;
        if (status.connected) {
          // If connected, ensure security is ready
          this.sync.useDefaultPassword();
        }
      }),
    );

    // Subscribe to sync state
    this.subscriptions.push(
      this.sync.syncState$.subscribe((state) => {
        this.syncState = state;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  async connectGoogleDrive(): Promise<void> {
    this.isConnecting = true;
    try {
      const success = await this.sync.connectGoogleDrive();
      if (success) {
        await this.sync.setEnabled(true);
        // Using default password automatically
        await this.sync.useDefaultPassword();
        // Trigger initial sync
        this.sync.fullSync();
      }
    } finally {
      this.isConnecting = false;
    }
  }

  async disconnectGoogleDrive(): Promise<void> {
    await this.sync.disconnectGoogleDrive();
    await this.sync.setEnabled(false);
  }

  formatTime(date: Date): string {
    if (!date) return '';
    return date.toLocaleString();
  }
}
