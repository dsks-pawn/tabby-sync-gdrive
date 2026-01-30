import * as os from 'os';
import * as path from 'path';

/**
 * Utility for mapping local paths to portable variables and vice versa.
 * Solves the issue of syncing paths between different OS (Windows/Mac/Linux).
 */
export class PathMapper {
  private static readonly HOME_VAR = '$TABBY_SYNC_HOME';

  /**
   * Converts a local absolute path to a portable path with variables.
   * Example: C:\Users\Admin\bg.jpg -> $TABBY_SYNC_HOME/bg.jpg
   */
  static toPortablePath(localPath: unknown): unknown {
    if (typeof localPath !== 'string') {
      return localPath;
    }

    const homeDir = os.homedir();
    const normalizedHome = path.normalize(homeDir);
    const normalizedPath = path.normalize(localPath);

    // Case insensitive check for Windows
    const isWindows = os.platform() === 'win32';
    const startsWithHome = isWindows
      ? normalizedPath.toLowerCase().startsWith(normalizedHome.toLowerCase())
      : normalizedPath.startsWith(normalizedHome);

    if (startsWithHome) {
      let relative = normalizedPath.substring(normalizedHome.length);
      // Remove leading separator if exists
      if (relative.startsWith(path.sep)) {
        relative = relative.substring(1);
      }
      // Convert to forward slashes for portability
      const portableRelative = relative.split(path.sep).join('/');
      return `${this.HOME_VAR}/${portableRelative}`;
    }

    return localPath;
  }

  /**
   * Converts a portable path to a local absolute path.
   * Example: $TABBY_SYNC_HOME/bg.jpg -> C:\Users\Admin\bg.jpg
   */
  static toLocalPath(portablePath: unknown): unknown {
    if (typeof portablePath !== 'string') {
      return portablePath;
    }

    if (portablePath.startsWith(this.HOME_VAR)) {
      const relative = portablePath.substring(this.HOME_VAR.length);
      // Remove leading slash if exists (from portable format)
      const cleanRelative = relative.startsWith('/')
        ? relative.substring(1)
        : relative;

      const homeDir = os.homedir();
      // Join using local separator
      return path.join(homeDir, ...cleanRelative.split('/'));
    }

    return portablePath;
  }
}
