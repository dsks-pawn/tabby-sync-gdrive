/**
 * Cryptographic service for AES-256 encryption/decryption.
 *
 * SECURITY DESIGN:
 * - Uses AES-256-GCM for authenticated encryption
 * - Master password is NEVER stored in plaintext
 * - Password verification uses PBKDF2 hash comparison
 * - Each encryption uses a unique IV for semantic security
 *
 * ASSUMPTIONS:
 * - Running in Electron/Node.js context (has access to 'crypto' module)
 * - Master password is provided by user at runtime
 */

import { Injectable } from '@angular/core';
import { Logger, LogService } from 'tabby-core';
import * as crypto from 'crypto';

/** Encryption algorithm configuration */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000; // Sufficient for password stretching

/**
 * Encrypted data format
 */
export interface EncryptedData {
  /** Format version for future compatibility */
  version: number;
  /** Base64-encoded IV */
  iv: string;
  /** Base64-encoded salt (for key derivation) */
  salt: string;
  /** Base64-encoded authentication tag */
  authTag: string;
  /** Base64-encoded ciphertext */
  ciphertext: string;
}

@Injectable()
export class CryptoService {
  private readonly log: Logger;

  /** Cached derived key - cleared when password changes */
  private cachedKey: Buffer | null = null;
  private cachedPasswordHash: string | null = null;

  constructor(logService: LogService) {
    this.log = logService.create('GDriveSync:Crypto');
  }

  /**
   * Derives an encryption key from the master password using PBKDF2.
   * Uses a secure salt to prevent rainbow table attacks.
   *
   * @param password - User's master password
   * @param salt - Salt for key derivation (use existing or generate new)
   * @returns Derived key buffer
   */
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha512',
    );
  }

  /**
   * Generates a hash of the password for storage verification.
   * This is what gets stored locally to verify the correct password.
   *
   * @param password - User's master password
   * @returns Object containing hash and salt (both base64)
   */
  generatePasswordHash(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(
      password,
      salt,
      PBKDF2_ITERATIONS,
      64, // 512-bit hash for verification
      'sha512',
    );

    return {
      hash: hash.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  /**
   * Verifies a password against a stored hash.
   *
   * @param password - Password to verify
   * @param storedHash - Previously stored hash (base64)
   * @param storedSalt - Previously stored salt (base64)
   * @returns True if password is correct
   */
  verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string,
  ): boolean {
    try {
      const salt = Buffer.from(storedSalt, 'base64');
      const hash = crypto.pbkdf2Sync(
        password,
        salt,
        PBKDF2_ITERATIONS,
        64,
        'sha512',
      );

      // Constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(hash, Buffer.from(storedHash, 'base64'));
    } catch (error) {
      this.log.warn('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypts data using AES-256-GCM.
   *
   * @param data - String data to encrypt
   * @param password - Master password
   * @returns Encrypted data object
   */
  encrypt(data: string, password: string): EncryptedData {
    // Generate unique IV and salt for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    this.log.debug('Data encrypted successfully');

    return {
      version: 1,
      iv: iv.toString('base64'),
      salt: salt.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: encrypted.toString('base64'),
    };
  }

  /**
   * Decrypts data encrypted with encrypt().
   *
   * @param encryptedData - Encrypted data object
   * @param password - Master password
   * @returns Decrypted string or null if decryption fails
   */
  decrypt(encryptedData: EncryptedData, password: string): string | null {
    try {
      // Validate version
      if (encryptedData.version !== 1) {
        this.log.error(
          `Unsupported encryption version: ${encryptedData.version}`,
        );
        return null;
      }

      const iv = Buffer.from(encryptedData.iv, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const authTag = Buffer.from(encryptedData.authTag, 'base64');
      const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');

      const key = this.deriveKey(password, salt);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      this.log.debug('Data decrypted successfully');
      return decrypted.toString('utf8');
    } catch (error) {
      // Decryption failure - likely wrong password or corrupted data
      this.log.error('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Encrypts a JSON object.
   *
   * @param obj - Object to encrypt
   * @param password - Master password
   * @returns Encrypted data object
   */
  encryptObject<T>(obj: T, password: string): EncryptedData {
    const json = JSON.stringify(obj);
    return this.encrypt(json, password);
  }

  /**
   * Decrypts to a JSON object.
   *
   * @param encryptedData - Encrypted data object
   * @param password - Master password
   * @returns Decrypted object or null if decryption fails
   */
  decryptObject<T>(encryptedData: EncryptedData, password: string): T | null {
    const json = this.decrypt(encryptedData, password);
    if (!json) {
      return null;
    }

    try {
      return JSON.parse(json) as T;
    } catch (error) {
      this.log.error('Failed to parse decrypted JSON:', error);
      return null;
    }
  }

  /**
   * Clears the cached key for security.
   * Call this when user logs out or changes password.
   */
  clearCache(): void {
    if (this.cachedKey) {
      // Zero out the key buffer
      this.cachedKey.fill(0);
      this.cachedKey = null;
    }
    this.cachedPasswordHash = null;
    this.log.debug('Key cache cleared');
  }

  /**
   * Generates a random secure token.
   *
   * @param length - Length in bytes
   * @returns Base64-encoded random token
   */
  generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64');
  }
}
