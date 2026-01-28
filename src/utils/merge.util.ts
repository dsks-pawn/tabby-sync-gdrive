/**
 * Smart merge utilities for combining local and remote configurations.
 *
 * MERGE STRATEGY:
 * 1. Profiles are matched by their unique `id`
 * 2. If remote profile doesn't exist locally → add it
 * 3. If profile exists in both → merge fields, local wins on conflict by timestamp
 * 4. Private keys are NEVER overwritten from remote
 * 5. `lastUpdated` timestamp determines conflict resolution
 */

import {
  SyncPayload,
  SyncableSSHProfile,
  SyncableProfileGroup,
  SyncableSettings,
  MergeConflict,
} from '../interfaces/sync.interface';

/**
 * Result of a merge operation
 */
export interface MergeResult {
  mergedPayload: SyncPayload;
  conflicts: MergeConflict[];
  addedProfiles: string[];
  updatedProfiles: string[];
  addedGroups: string[];
}

/**
 * Deep merge two objects, with source taking precedence
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key as keyof T];
    const targetValue = target[key as keyof T];

    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge nested objects
      result[key as keyof T] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sourceValue !== undefined) {
      // Source value takes precedence
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Merges a single profile, preserving local private key data.
 *
 * @param localProfile - The local profile (may contain private keys)
 * @param remoteProfile - The remote profile (sanitized, no private keys)
 * @param localWins - If true, local fields take precedence on conflict
 * @returns Merged profile
 */
export function mergeProfile(
  localProfile: Record<string, unknown>,
  remoteProfile: SyncableSSHProfile,
  localWins: boolean,
): Record<string, unknown> {
  // Start with a copy of the local profile (preserves private keys)
  const merged = JSON.parse(JSON.stringify(localProfile)) as Record<
    string,
    unknown
  >;

  // Fields to update from remote (excluding private key related)
  const syncableFields = [
    'name',
    'type',
    'group',
    'icon',
    'color',
    'weight',
    'disableDynamicTitle',
    'behaviorOnSessionEnd',
  ];

  for (const field of syncableFields) {
    const remoteValue = remoteProfile[field as keyof SyncableSSHProfile];
    if (remoteValue !== undefined) {
      if (localWins && merged[field] !== undefined) {
        // Keep local value
        continue;
      }
      merged[field] = remoteValue;
    }
  }

  // Merge options carefully, preserving private key data
  if (remoteProfile.options) {
    const localOptions = (merged['options'] || {}) as Record<string, unknown>;
    const remoteOptions = remoteProfile.options;

    // Safe connection options to merge
    const safeOptionFields = [
      'host',
      'port',
      'user',
      'auth',
      'password',
      'algorithms',
      'keepaliveInterval',
      'keepaliveCountMax',
      'readyTimeout',
      'x11',
      'agentForward',
      'jumpHost',
    ];

    for (const field of safeOptionFields) {
      const remoteValue = remoteOptions[field as keyof typeof remoteOptions];
      if (remoteValue !== undefined) {
        // Special handling for password: always accept remote if local is empty/undefined
        if (field === 'password') {
          if (!localOptions[field]) {
            localOptions[field] = remoteValue;
          }
          continue;
        }
        if (localWins && localOptions[field] !== undefined) {
          continue;
        }
        localOptions[field] = remoteValue;
      }
    }

    merged['options'] = localOptions;
  }

  return merged;
}

/**
 * Merges profile groups, adding any new groups from remote.
 */
export function mergeGroups(
  localGroups: SyncableProfileGroup[],
  remoteGroups: SyncableProfileGroup[],
): { merged: SyncableProfileGroup[]; added: string[] } {
  const merged: SyncableProfileGroup[] = [...localGroups];
  const localIds = new Set(localGroups.map((g) => g.id));
  const added: string[] = [];

  for (const remoteGroup of remoteGroups) {
    if (!localIds.has(remoteGroup.id)) {
      merged.push({ ...remoteGroup });
      added.push(remoteGroup.id);
    }
    // Existing groups keep their local state (e.g., collapsed)
  }

  return { merged, added };
}

/**
 * Merges settings with remote taking precedence.
 * This ensures new machines receive the synced settings from cloud.
 * Local settings are used as fallback for any missing remote values.
 */
export function mergeSettings(
  localSettings: SyncableSettings,
  remoteSettings: SyncableSettings,
): SyncableSettings {
  // Remote takes precedence - local fills in gaps
  return deepMerge(
    localSettings as unknown as Record<string, unknown>,
    remoteSettings as unknown as Record<string, unknown>,
  ) as unknown as SyncableSettings;
}

// Note: Vault merging is simplified since Tabby stores vault as encrypted blob (contents)
// We sync the entire vault from remote if local doesn't have one

/**
 * Main merge function that combines local and remote sync payloads.
 *
 * @param local - Local sync payload (from sanitized current config)
 * @param remote - Remote sync payload (from Google Drive)
 * @param localConfig - Original local config (to preserve private keys)
 * @returns Merged result with conflict information
 */
export function mergePayloads(
  local: SyncPayload,
  remote: SyncPayload,
  localConfig: Record<string, unknown>,
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const addedProfiles: string[] = [];
  const updatedProfiles: string[] = [];

  // Determine which side is newer for conflict resolution
  const localIsNewer = local.lastUpdated >= remote.lastUpdated;

  // Build a map of local profiles by ID
  const localProfileMap = new Map<string, SyncableSSHProfile>();
  for (const profile of local.profiles) {
    localProfileMap.set(profile.id, profile);
  }

  // Build a map of original local config profiles (with private keys)
  const originalProfileMap = new Map<string, Record<string, unknown>>();
  if (Array.isArray(localConfig['profiles'])) {
    for (const profile of localConfig['profiles']) {
      if (typeof profile === 'object' && profile !== null && 'id' in profile) {
        originalProfileMap.set(
          (profile as Record<string, unknown>)['id'] as string,
          profile as Record<string, unknown>,
        );
      }
    }
  }

  // Merge profiles
  const mergedProfiles: SyncableSSHProfile[] = [];

  // First, process all local profiles
  for (const localProfile of local.profiles) {
    const remoteProfile = remote.profiles.find((p) => p.id === localProfile.id);

    if (remoteProfile) {
      // Profile exists in both - merge
      const originalLocal =
        originalProfileMap.get(localProfile.id) || localProfile;
      const merged = mergeProfile(
        originalLocal as Record<string, unknown>,
        remoteProfile,
        localIsNewer,
      );

      // Track as conflict if values differ
      if (JSON.stringify(localProfile) !== JSON.stringify(remoteProfile)) {
        conflicts.push({
          profileId: localProfile.id,
          localProfile,
          remoteProfile,
          resolution: localIsNewer ? 'local' : 'remote',
        });
      }

      // Convert back to SyncableSSHProfile (sanitized)
      mergedProfiles.push({
        id: merged['id'] as string,
        name: merged['name'] as string,
        type: merged['type'] as string,
        group: merged['group'] as string | undefined,
        icon: merged['icon'] as string | undefined,
        color: merged['color'] as string | undefined,
        options: merged['options'] as SyncableSSHProfile['options'],
        weight: merged['weight'] as number | undefined,
        disableDynamicTitle: merged['disableDynamicTitle'] as
          | boolean
          | undefined,
        behaviorOnSessionEnd: merged['behaviorOnSessionEnd'] as
          | string
          | undefined,
      });

      updatedProfiles.push(localProfile.id);
    } else {
      // Profile only exists locally - keep it
      mergedProfiles.push(localProfile);
    }
  }

  // Then, add remote-only profiles
  for (const remoteProfile of remote.profiles) {
    if (!localProfileMap.has(remoteProfile.id)) {
      mergedProfiles.push(remoteProfile);
      addedProfiles.push(remoteProfile.id);
    }
  }

  // Merge groups
  const { merged: mergedGroups, added: addedGroups } = mergeGroups(
    local.groups || [],
    remote.groups || [],
  );

  // Merge settings (local takes precedence)
  const mergedSettings = mergeSettings(
    local.settings || {},
    remote.settings || {},
  );

  // Merge vault - vault is synced as a whole since contents is an encrypted blob
  // Remote vault takes precedence if local doesn't have one (for new machines)
  let mergedVault: SyncPayload['vault'];
  if (local.vault && local.vault.contents) {
    // Local has vault - keep local (vault is machine-specific once set)
    mergedVault = {
      iv: local.vault.iv,
      keySalt: local.vault.keySalt,
      contents: local.vault.contents,
      version: local.vault.version,
    };
  } else if (remote.vault && remote.vault.contents) {
    // Local doesn't have vault but remote does - use remote
    mergedVault = {
      iv: remote.vault.iv,
      keySalt: remote.vault.keySalt,
      contents: remote.vault.contents,
      version: remote.vault.version,
    };
  }

  return {
    mergedPayload: {
      version: Math.max(local.version, remote.version),
      lastUpdated: Date.now(),
      sourceHost: local.sourceHost,
      profiles: mergedProfiles,
      groups: mergedGroups,
      vault: mergedVault,
      settings: mergedSettings,
    },
    conflicts,
    addedProfiles,
    updatedProfiles,
    addedGroups,
  };
}

/**
 * Applies a merged payload back to the original Tabby config.
 * Preserves all local-only data like private keys.
 *
 * @param originalConfig - The original Tabby config object
 * @param mergedPayload - The merged sync payload to apply
 * @returns Updated config object
 */
export function applyPayloadToConfig(
  originalConfig: Record<string, unknown>,
  mergedPayload: SyncPayload,
): Record<string, unknown> {
  const config = JSON.parse(JSON.stringify(originalConfig)) as Record<
    string,
    unknown
  >;

  // Build map of original profiles to preserve private keys
  const originalProfileMap = new Map<string, Record<string, unknown>>();
  if (Array.isArray(config['profiles'])) {
    for (const profile of config['profiles']) {
      if (typeof profile === 'object' && profile !== null && 'id' in profile) {
        originalProfileMap.set(
          (profile as Record<string, unknown>)['id'] as string,
          profile as Record<string, unknown>,
        );
      }
    }
  }

  // Rebuild profiles array, preserving private keys
  const newProfiles: Record<string, unknown>[] = [];

  for (const syncedProfile of mergedPayload.profiles) {
    const originalProfile = originalProfileMap.get(syncedProfile.id);

    if (originalProfile) {
      // Merge with original, preserving private keys
      const merged = mergeProfile(originalProfile, syncedProfile, false);
      newProfiles.push(merged);
    } else {
      // New profile from remote
      newProfiles.push(syncedProfile as unknown as Record<string, unknown>);
    }
  }

  config['profiles'] = newProfiles;

  // Apply groups
  if (mergedPayload.groups && mergedPayload.groups.length > 0) {
    config['groups'] = mergedPayload.groups;
  }

  // Apply vault (replace entire vault from remote if present)
  // Vault is an encrypted blob and must be applied as a whole
  if (mergedPayload.vault && mergedPayload.vault.contents) {
    // Replace entire vault structure
    config['vault'] = {
      version: mergedPayload.vault.version,
      contents: mergedPayload.vault.contents,
      keySalt: mergedPayload.vault.keySalt,
      iv: mergedPayload.vault.iv,
    };
  }

  // Apply settings (merge with existing)
  if (mergedPayload.settings.terminal) {
    config['terminal'] = deepMerge(
      (config['terminal'] || {}) as Record<string, unknown>,
      mergedPayload.settings.terminal as unknown as Record<string, unknown>,
    );
  }

  if (mergedPayload.settings.appearance) {
    config['appearance'] = deepMerge(
      (config['appearance'] || {}) as Record<string, unknown>,
      mergedPayload.settings.appearance as unknown as Record<string, unknown>,
    );
  }

  if (mergedPayload.settings.hotkeys) {
    config['hotkeys'] = mergedPayload.settings.hotkeys;
  }

  // Apply SSH settings
  if (mergedPayload.settings.ssh) {
    config['ssh'] = deepMerge(
      (config['ssh'] || {}) as Record<string, unknown>,
      mergedPayload.settings.ssh as unknown as Record<string, unknown>,
    );
  }

  // Apply custom color schemes
  if (
    mergedPayload.settings.colorSchemes &&
    mergedPayload.settings.colorSchemes.length > 0
  ) {
    config['colorSchemes'] = mergedPayload.settings.colorSchemes;
  }

  // Apply plugin blacklist
  if (mergedPayload.settings.pluginBlacklist) {
    config['pluginBlacklist'] = mergedPayload.settings.pluginBlacklist;
  }

  // Apply application settings
  if (mergedPayload.settings.application) {
    config['application'] = deepMerge(
      (config['application'] || {}) as Record<string, unknown>,
      mergedPayload.settings.application as unknown as Record<string, unknown>,
    );
  }

  // Apply window settings
  if (mergedPayload.settings.window) {
    config['window'] = deepMerge(
      (config['window'] || {}) as Record<string, unknown>,
      mergedPayload.settings.window as unknown as Record<string, unknown>,
    );
  }

  return config;
}
