/**
 * Type declarations for Tabby modules
 * These stub out the Tabby APIs we depend on
 */

// tabby-core types
declare module 'tabby-core' {
  import { Observable, Subject } from 'rxjs';

  export abstract class ConfigProvider {
    defaults: any;
    platformDefaults: Record<string, any>;
  }

  export interface ConfigProxy {
    [key: string]: any;
  }

  export class ConfigService {
    store: ConfigProxy;
    restartRequested: boolean;
    ready$: Observable<boolean>;
    changed$: Observable<void>;
    save(): Promise<void>;
    readRaw(): string;
    writeRaw(data: string): Promise<void>;
    requestRestart(): void;
  }

  export class Logger {
    info(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    debug(...args: any[]): void;
  }

  export class LogService {
    create(name: string): Logger;
  }

  export class PlatformService {
    openExternal(url: string): void;
    loadConfig(): Promise<string | null>;
    saveConfig(data: string): Promise<void>;
  }

  export class HostAppService {
    platform: string;
    configPlatform: string;
    configChangeBroadcast$: Observable<void>;
  }

  export function configMerge(a: any, b: any): any;
}

// tabby-settings types
declare module 'tabby-settings' {
  import { Type } from '@angular/core';

  export abstract class SettingsTabProvider {
    id: string;
    title: string;
    icon: string;
    abstract getComponentType(): Type<any>;
  }
}
