/**
 * Sanitization utilities for removing sensitive data before sync.
 *
 * SECURITY CRITICAL:
 * - SSH private keys must NEVER be synced
 * - Local file paths should not be synced (they differ per machine)
 * - Only sync data that makes sense across machines
 */

import {
  SyncableSSHProfile,
  SyncPayload,
  SyncableSettings,
} from '../interfaces/sync.interface';
import { PathMapper } from './path-mapper.util';

/**
 * Fields that should NEVER be included in sync payload.
 * These contain sensitive local data or machine-specific paths.
 */
const FORBIDDEN_PROFILE_FIELDS = [
  'privateKey',
  'privateKeys',
  'privateKeyPath',
  'privateKeyPaths',
  'keyPath',
  'keyPaths',
  'identityFile',
  'identityFiles',
  'proxyCommand', // Could contain local paths
  'scriptBeforeConnect', // Local scripts
  'scriptAfterConnect',
] as const;

/**
 * Deeply removes specified keys from an object
 */
function deepRemoveKeys<T extends Record<string, unknown>>(
  obj: T,
  keysToRemove: readonly string[],
): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      deepRemoveKeys(item as Record<string, unknown>, keysToRemove),
    ) as unknown as T;
  }

  const result = { ...obj } as Record<string, unknown>;

  for (const key of keysToRemove) {
    if (key in result) {
      delete result[key];
    }
  }

  // Recursively process nested objects
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (value !== null && typeof value === 'object') {
      result[key] = deepRemoveKeys(
        value as Record<string, unknown>,
        keysToRemove,
      );
    }
  }

  return result as T;
}

/**
 * Sanitizes a single SSH profile by removing all sensitive/local data.
 *
 * @param profile - The profile to sanitize
 * @returns Sanitized profile safe for sync
 */
export function sanitizeProfile(
  profile: Record<string, unknown>,
): SyncableSSHProfile | null {
  // Only sync SSH, serial, and local terminal profiles
  const profileType = profile['type'] as string | undefined;
  if (!profileType) {
    return null;
  }

  // Skip profiles without ID
  const profileId = profile['id'] as string | undefined;
  if (!profileId) {
    return null;
  }

  // Create a deep copy and remove forbidden fields
  const sanitized = deepRemoveKeys(
    JSON.parse(JSON.stringify(profile)) as Record<string, unknown>,
    FORBIDDEN_PROFILE_FIELDS,
  );

  // Build the sanitized profile structure
  const result: SyncableSSHProfile = {
    id: profileId,
    name: (sanitized['name'] as string) || 'Unnamed Profile',
    type: profileType,
  };

  // Copy optional fields if present
  if (sanitized['group']) result.group = sanitized['group'] as string;
  if (sanitized['icon']) result.icon = sanitized['icon'] as string;
  if (sanitized['color']) result.color = sanitized['color'] as string;
  if (sanitized['weight'] !== undefined)
    result.weight = sanitized['weight'] as number;
  if (sanitized['disableDynamicTitle'] !== undefined) {
    result.disableDynamicTitle = sanitized['disableDynamicTitle'] as boolean;
  }
  if (sanitized['behaviorOnSessionEnd']) {
    result.behaviorOnSessionEnd = sanitized['behaviorOnSessionEnd'] as string;
  }

  // Handle options object (contains connection details)
  if (sanitized['options'] && typeof sanitized['options'] === 'object') {
    const opts = sanitized['options'] as Record<string, unknown>;
    result.options = {};

    // Only copy safe connection options
    const safeOptionKeys = [
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
      'cwd',
    ];

    for (const key of safeOptionKeys) {
      if (opts[key] !== undefined) {
        let value = opts[key];
        if (key === 'cwd') {
          value = PathMapper.toPortablePath(value);
        }
        (result.options as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}

/**
 * Sanitizes terminal/UI settings for sync.
 * Removes any paths or machine-specific settings.
 */
export function sanitizeSettings(
  config: Record<string, unknown>,
): SyncableSettings {
  const settings: SyncableSettings = {};

  // Terminal settings
  if (config['terminal'] && typeof config['terminal'] === 'object') {
    const term = config['terminal'] as Record<string, unknown>;
    settings.terminal = {
      frontend: term['frontend'] as string | undefined,
      fontSize: term['fontSize'] as number | undefined,
      fontFamily: term['fontFamily'] as string | undefined,
      fontWeight: term['fontWeight'] as number | undefined,
      fontWeightBold: term['fontWeightBold'] as number | undefined,
      ligatures: term['ligatures'] as boolean | undefined,
      cursor: term['cursor'] as string | undefined,
      cursorBlink: term['cursorBlink'] as boolean | undefined,
      bell: term['bell'] as string | undefined,
      bracketedPaste: term['bracketedPaste'] as boolean | undefined,
      background: PathMapper.toPortablePath(term['background']) as
        | string
        | undefined,
      scrollbackLines: term['scrollbackLines'] as number | undefined,
      rightClick: term['rightClick'] as string | undefined,
      wordSeparator: term['wordSeparator'] as string | undefined,
      copyOnSelect: term['copyOnSelect'] as boolean | undefined,
      pasteOnMiddleClick: term['pasteOnMiddleClick'] as boolean | undefined,
      shellIntegration: term['shellIntegration'] as boolean | undefined,
      searchOptions: term['searchOptions'] as
        | Record<string, unknown>
        | undefined,
      // Additional terminal settings
      autoOpen: term['autoOpen'] as boolean | undefined,
      warnOnMultiLinePaste: term['warnOnMultiLinePaste'] as boolean | undefined,
      altIsMeta: term['altIsMeta'] as boolean | undefined,
      scrollOnInput: term['scrollOnInput'] as boolean | undefined,
      focusOnCreation: term['focusOnCreation'] as boolean | undefined,
      hideCloseButton: term['hideCloseButton'] as boolean | undefined,
      hideTabOptions: term['hideTabOptions'] as boolean | undefined,
    };

    // Color scheme
    if (term['colorScheme'] && typeof term['colorScheme'] === 'object') {
      (settings.terminal as Record<string, unknown>)['colorScheme'] =
        term['colorScheme'];
    }

    if (
      term['lightColorScheme'] &&
      typeof term['lightColorScheme'] === 'object'
    ) {
      (settings.terminal as Record<string, unknown>)['lightColorScheme'] =
        term['lightColorScheme'];
    }

    if (Array.isArray(term['customColorSchemes'])) {
      (settings.terminal as Record<string, unknown>)['customColorSchemes'] =
        term['customColorSchemes'];
    }

    // Remove undefined values
    settings.terminal = removeUndefined(settings.terminal);
  }

  // Appearance settings
  if (config['appearance'] && typeof config['appearance'] === 'object') {
    const app = config['appearance'] as Record<string, unknown>;
    settings.appearance = {
      theme: app['theme'] as string | undefined,
      frame: app['frame'] as string | undefined,
      opacity: app['opacity'] as number | undefined,
      vibrancy: app['vibrancy'] as boolean | undefined,
      tabsOnTop: app['tabsOnTop'] as boolean | undefined,
      dockPosition: app['dockPosition'] as string | undefined,
      spaciness: app['spaciness'] as number | undefined,
      colorSchemeMode: app['colorSchemeMode'] as string | undefined,
      // Additional appearance settings
      css: app['css'] as string | undefined,
      font: app['font'] as string | undefined,
      fontSize: app['fontSize'] as number | undefined,
      lastTabClosesWindow: app['lastTabClosesWindow'] as boolean | undefined,
    };
    settings.appearance = removeUndefined(settings.appearance);
  }

  // Hotkeys (safe to sync as they're just key combinations)
  if (config['hotkeys'] && typeof config['hotkeys'] === 'object') {
    settings.hotkeys = config['hotkeys'] as Record<string, string[]>;
  }

  // SSH settings (exclude local paths)
  if (config['ssh'] && typeof config['ssh'] === 'object') {
    const ssh = config['ssh'] as Record<string, unknown>;
    settings.ssh = {
      warnOnClose: ssh['warnOnClose'] as boolean | undefined,
      agentType: ssh['agentType'] as string | undefined,
      x11Display: ssh['x11Display'] as string | undefined,
      // Note: winSCPPath and agentPath are excluded as they're machine-specific
    };
    settings.ssh = removeUndefined(settings.ssh);
  }

  // Custom color schemes
  if (Array.isArray(config['colorSchemes'])) {
    settings.colorSchemes = config[
      'colorSchemes'
    ] as SyncableSettings['colorSchemes'];
  }

  // Plugin blacklist
  if (Array.isArray(config['pluginBlacklist'])) {
    settings.pluginBlacklist = config['pluginBlacklist'] as string[];
  }

  // Quick commands/snippets from quick-cmds plugin
  if (config['quick-cmds'] && typeof config['quick-cmds'] === 'object') {
    const quickCmds = config['quick-cmds'] as Record<string, unknown>;
    settings.quickCmds = {};

    // Process commands
    if (Array.isArray(quickCmds['commands'])) {
      settings.quickCmds.commands = quickCmds['commands'] as Array<{
        name: string;
        text: string;
        appendCR?: boolean;
        group?: string;
        id?: string;
      }>;
    }

    // Process groups
    if (Array.isArray(quickCmds['groups'])) {
      settings.quickCmds.groups = quickCmds['groups'] as Array<{
        name: string;
        id?: string;
      }>;
    }
  }

  // Application settings
  if (config['application'] && typeof config['application'] === 'object') {
    const app = config['application'] as Record<string, unknown>;
    settings.application = {
      restoreTerminalOnStartup: app['restoreTerminalOnStartup'] as
        | boolean
        | undefined,
      enableAnalytics: app['enableAnalytics'] as boolean | undefined,
      enableAutoupdate: app['enableAutoupdate'] as boolean | undefined,
      language: app['language'] as string | undefined,
    };
    settings.application = removeUndefined(settings.application);
  }

  // Window settings
  if (config['window'] && typeof config['window'] === 'object') {
    const win = config['window'] as Record<string, unknown>;
    settings.window = {
      startInTray: win['startInTray'] as boolean | undefined,
      startMinimized: win['startMinimized'] as boolean | undefined,
      closeToTray: win['closeToTray'] as boolean | undefined,
      confirmClose: win['confirmClose'] as boolean | undefined,
      restoreWindowProtocol: win['restoreWindowProtocol'] as
        | boolean
        | undefined,
    };
    settings.window = removeUndefined(settings.window);
  }

  return settings;
}

/**
 * Creates a complete sanitized sync payload from Tabby config.
 */
export function createSyncPayload(
  config: Record<string, unknown>,
  hostname: string,
  installedPlugins: string[] = [],
): SyncPayload {
  const profiles: SyncableSSHProfile[] = [];

  // Process profiles array
  if (Array.isArray(config['profiles'])) {
    for (const profile of config['profiles']) {
      if (typeof profile === 'object' && profile !== null) {
        const sanitized = sanitizeProfile(profile as Record<string, unknown>);
        if (sanitized) {
          profiles.push(sanitized);
        }
      }
    }
  }

  // Process groups
  const groups =
    (config['groups'] as Array<{
      id: string;
      name: string;
      collapsed?: boolean;
    }>) || [];

  // Process vault (entire vault blob - passwords are encrypted inside 'contents')
  let vault: SyncPayload['vault'];
  if (config['vault'] && typeof config['vault'] === 'object') {
    const vaultData = config['vault'] as Record<string, unknown>;

    // Initialize vault object
    vault = {};

    // Copy vault encryption data (required to decrypt passwords on another machine)
    if (typeof vaultData['iv'] === 'string') {
      vault.iv = vaultData['iv'];
    }
    if (typeof vaultData['keySalt'] === 'string') {
      vault.keySalt = vaultData['keySalt'];
    }
    if (typeof vaultData['contents'] === 'string') {
      vault.contents = vaultData['contents'];
    }
    if (typeof vaultData['version'] === 'number') {
      vault.version = vaultData['version'];
    }

    // Only include vault if it has meaningful data (contents is the encrypted blob)
    if (!vault.contents) {
      vault = undefined;
    }
  }

  // Extract settings
  const settings = sanitizeSettings(config);
  settings.installedPlugins = installedPlugins;

  return {
    version: 1,
    lastUpdated: Date.now(),
    sourceHost: hostname,
    profiles,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      collapsed: g.collapsed,
    })),
    vault,
    settings,
  };
}

/**
 * Removes undefined values from an object
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
}
