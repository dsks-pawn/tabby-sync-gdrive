/**
 * Google Drive API service for file operations.
 *
 * DESIGN:
 * - Uses Google Drive API v3
 * - Stores data in AppData folder (hidden from user's Drive view)
 * - Implements OAuth 2.0 Desktop App flow
 * - Handles token refresh automatically
 *
 * SCOPE: https://www.googleapis.com/auth/drive.appdata
 * This scope only allows access to the app-specific folder, not user's files.
 */

import { Injectable, NgZone } from '@angular/core';
import { Logger, LogService, PlatformService } from 'tabby-core';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client, Credentials } from 'google-auth-library';
import { BehaviorSubject, Observable } from 'rxjs';
import * as http from 'http';
import * as url from 'url';

/** Google OAuth configuration */
const SCOPES = ['https://www.googleapis.com/auth/drive.appdata'];
const SYNC_FILE_NAME = 'tabby-sync.json';
const REDIRECT_PORT = 45678; // Local port for OAuth callback
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

/** Hardcoded OAuth credentials */
const GOOGLE_CLIENT_ID =
  '1034070286602-m5arl71ke9ctad6905psbsaencjheeeu.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

/**
 * Connection status for UI
 */
export interface DriveConnectionStatus {
  connected: boolean;
  email?: string;
  lastError?: string;
}

@Injectable()
export class DriveService {
  private readonly log: Logger;
  private oauth2Client: OAuth2Client | null = null;
  private drive: drive_v3.Drive | null = null;
  private activeServer: http.Server | null = null;

  // Stored credentials
  private clientId: string = '';
  private clientSecret: string = '';

  /** Observable for connection status updates */
  private connectionStatus = new BehaviorSubject<DriveConnectionStatus>({
    connected: false,
  });
  public connectionStatus$: Observable<DriveConnectionStatus> =
    this.connectionStatus.asObservable();

  /** Cached file ID for the sync file */
  private syncFileId: string | null = null;

  constructor(
    private platform: PlatformService,
    private zone: NgZone,
    logService: LogService,
  ) {
    this.log = logService.create('GDriveSync:Drive');

    // Auto-configure with hardcoded credentials
    this.configure(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  }

  /**
   * Configure OAuth credentials. Must be called before authorize().
   */
  configure(clientId: string, clientSecret: string): void {
    this.clientId = clientId;
    this.clientSecret = clientSecret;

    // Reinitialize OAuth2 client with new credentials
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      REDIRECT_URI,
    );

    // Set up token refresh handling
    this.oauth2Client.on('tokens', (_tokens) => {
      this.log.info('OAuth tokens refreshed');
      // Tokens will be saved by SyncService
    });

    this.log.debug('OAuth credentials configured');
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get OAuth2 client, throws if not configured
   */
  private getOAuth2Client(): OAuth2Client {
    if (!this.oauth2Client) {
      throw new Error(
        'OAuth credentials not configured. Please set up Google API credentials first.',
      );
    }
    return this.oauth2Client;
  }

  /**
   * Initializes the Drive client with stored tokens.
   *
   * @param tokens - Stored OAuth tokens
   * @returns True if initialization successful
   */
  async initialize(tokens: Credentials): Promise<boolean> {
    try {
      const client = this.getOAuth2Client();
      client.setCredentials(tokens);

      // Verify tokens are valid by making a simple request
      await client.getAccessToken();

      this.drive = google.drive({ version: 'v3', auth: client });

      // Get user email for display
      const about = await this.drive.about.get({ fields: 'user' });
      const email = about.data.user?.emailAddress ?? undefined;

      this.connectionStatus.next({
        connected: true,
        email,
      });

      this.log.info(`Connected to Google Drive as ${email}`);
      return true;
    } catch (error) {
      this.log.error('Failed to initialize Drive client:', error);
      this.connectionStatus.next({
        connected: false,
        lastError: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Gets the current OAuth tokens.
   *
   * @returns Current credentials or null
   */
  getTokens(): Credentials | null {
    if (!this.oauth2Client) return null;
    return this.oauth2Client.credentials;
  }

  /**
   * Starts the OAuth 2.0 authorization flow.
   * Opens a browser window for user to grant permissions.
   *
   * @returns Promise resolving to OAuth tokens
   */
  async authorize(): Promise<Credentials> {
    return new Promise((resolve, reject) => {
      const client = this.getOAuth2Client();

      // Generate auth URL
      const authUrl = client.generateAuthUrl({
        access_type: 'offline', // Get refresh token
        scope: SCOPES,
        prompt: 'consent', // Force consent screen to get refresh_token
      });

      this.log.info('Starting OAuth flow');

      // Create temporary local server to receive the callback
      if (this.activeServer) {
        this.activeServer.close();
        this.activeServer = null;
      }

      const server = http.createServer(async (req, res) => {
        try {
          if (!req.url) {
            res.writeHead(400);
            res.end('Invalid request');
            return;
          }

          const parsedUrl = url.parse(req.url, true);

          if (parsedUrl.pathname !== '/oauth2callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const code = parsedUrl.query.code as string;
          const error = parsedUrl.query.error as string;

          if (error) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>❌ Authorization Failed</h1>
                  <p>Error: ${error}</p>
                  <p>You can close this window.</p>
                </body>
              </html>
            `);
            server.close();
            this.activeServer = null;
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400);
            res.end('No authorization code received');
            server.close();
            this.activeServer = null;
            reject(new Error('No authorization code received'));
            return;
          }

          // Exchange code for tokens
          const { tokens } = await client.getToken(code);
          client.setCredentials(tokens);

          // Initialize Drive client
          this.drive = google.drive({ version: 'v3', auth: client });

          // Get user email
          const about = await this.drive.about.get({ fields: 'user' });
          const email = about.data.user?.emailAddress ?? undefined;

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Authorization Successful</h1>
                <p>Connected as: ${email}</p>
                <p>You can close this window and return to Tabby.</p>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
            </html>
          `);

          server.close();
          this.activeServer = null;

          this.zone.run(() => {
            this.connectionStatus.next({
              connected: true,
              email,
            });
          });

          this.log.info(`OAuth flow completed successfully for ${email}`);
          resolve(tokens);
        } catch (err) {
          this.log.error('OAuth callback error:', err);
          res.writeHead(500);
          res.end('Internal server error');
          server.close();
          this.activeServer = null;
          reject(err);
        }
      });

      server.listen(REDIRECT_PORT, () => {
        this.activeServer = server;
        this.log.debug(
          `OAuth callback server listening on port ${REDIRECT_PORT}`,
        );
        // Open browser for authorization
        this.platform.openExternal(authUrl);
      });

      // Handle server errors
      server.on('error', (err) => {
        this.log.error('OAuth server error:', err);
        reject(err);
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          if (server.listening) {
            server.close();
            this.activeServer = null;
            reject(new Error('OAuth flow timed out'));
          }
        },
        5 * 60 * 1000,
      );
    });
  }

  /**
   * Disconnects from Google Drive.
   * Revokes tokens and clears cached state.
   */
  async disconnect(): Promise<void> {
    try {
      if (this.oauth2Client?.credentials?.access_token) {
        await this.oauth2Client.revokeCredentials();
      }
    } catch (error) {
      this.log.warn('Error revoking credentials:', error);
    }

    if (this.oauth2Client) {
      this.oauth2Client.setCredentials({});
    }
    this.drive = null;
    this.syncFileId = null;

    this.connectionStatus.next({
      connected: false,
    });

    this.log.info('Disconnected from Google Drive');
  }

  /**
   * Finds the sync file in AppData folder.
   *
   * @returns File ID or null if not found
   */
  private async findSyncFile(): Promise<string | null> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    // Check cache first
    if (this.syncFileId) {
      // Verify file still exists
      try {
        await this.drive.files.get({
          fileId: this.syncFileId,
        });
        return this.syncFileId;
      } catch {
        // File no longer exists, clear cache
        this.syncFileId = null;
      }
    }

    // Search for the file
    const response = await this.drive.files.list({
      spaces: 'appDataFolder',
      q: `name = '${SYNC_FILE_NAME}'`,
      fields: 'files(id, name, modifiedTime)',
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      this.syncFileId = response.data.files[0].id || null;
      return this.syncFileId;
    }

    return null;
  }

  /**
   * Downloads the sync file content.
   *
   * @returns File content as string, or null if file doesn't exist
   */
  async downloadSyncFile(): Promise<string | null> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.findSyncFile();
    if (!fileId) {
      this.log.debug('Sync file not found on Drive');
      return null;
    }

    try {
      const response = await this.drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        {
          responseType: 'text',
        },
      );

      this.log.debug('Sync file downloaded successfully');
      return response.data as string;
    } catch (error) {
      this.log.error('Failed to download sync file:', error);
      throw error;
    }
  }

  /**
   * Uploads content to the sync file.
   * Creates the file if it doesn't exist.
   *
   * @param content - Content to upload
   * @returns File ID
   */
  async uploadSyncFile(content: string): Promise<string> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.findSyncFile();

    const media = {
      mimeType: 'application/json',
      body: content,
    };

    let response: { data: drive_v3.Schema$File };

    if (fileId) {
      // Update existing file
      this.log.debug('Updating existing sync file');
      response = await this.drive.files.update({
        fileId,
        media,
        fields: 'id',
      });
    } else {
      // Create new file
      this.log.debug('Creating new sync file');
      response = await this.drive.files.create({
        requestBody: {
          name: SYNC_FILE_NAME,
          parents: ['appDataFolder'],
        },
        media,
        fields: 'id',
      });
    }

    this.syncFileId = response.data.id || null;
    this.log.info('Sync file uploaded successfully');

    return this.syncFileId || '';
  }

  /**
   * Gets metadata about the sync file.
   *
   * @returns File metadata or null
   */
  async getSyncFileMetadata(): Promise<{ modifiedTime: Date } | null> {
    if (!this.drive) {
      return null;
    }

    const fileId = await this.findSyncFile();
    if (!fileId) {
      return null;
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'modifiedTime',
      });

      if (response.data.modifiedTime) {
        return {
          modifiedTime: new Date(response.data.modifiedTime),
        };
      }
    } catch (error) {
      this.log.warn('Failed to get sync file metadata:', error);
    }

    return null;
  }

  /**
   * Deletes the sync file from Drive.
   */
  async deleteSyncFile(): Promise<void> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.findSyncFile();
    if (fileId) {
      await this.drive.files.delete({
        fileId,
      });
      this.syncFileId = null;
      this.log.info('Sync file deleted');
    }
  }

  /**
   * Lists available versions of the sync file.
   */
  async listVersions(): Promise<drive_v3.Schema$Revision[]> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.findSyncFile();
    if (!fileId) {
      return [];
    }

    try {
      const response = await this.drive.revisions.list({
        fileId,
        fields: 'revisions(id, modifiedTime, size)',
        pageSize: 20,
      });
      return response.data.revisions || [];
    } catch (error) {
      this.log.error('Failed to list versions:', error);
      throw error;
    }
  }

  /**
   * Downloads a specific version of the sync file.
   */
  async downloadVersion(revisionId: string): Promise<string | null> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const fileId = await this.findSyncFile();
    if (!fileId) {
      return null;
    }

    try {
      const response = await this.drive.revisions.get(
        {
          fileId,
          revisionId,
          alt: 'media',
        },
        {
          responseType: 'text',
        },
      );
      return response.data as string;
    } catch (error) {
      this.log.error(`Failed to download version ${revisionId}:`, error);
      throw error;
    }
  }

  /**
   * Checks if the service is connected and ready.
   */
  isConnected(): boolean {
    return this.drive !== null && this.connectionStatus.value.connected;
  }
}
