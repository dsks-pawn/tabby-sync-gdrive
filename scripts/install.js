const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Determine OS-specific Tabby plugins path
const platform = os.platform();
let pluginsPath;

if (platform === 'win32') {
  if (!process.env.APPDATA) {
    console.error('Error: APPDATA environment variable is not defined.');
    process.exit(1);
  }
  pluginsPath = path.join(
    process.env.APPDATA,
    'tabby',
    'plugins',
    'node_modules',
    'tabby-sync-gdrive',
  );
} else if (platform === 'darwin') {
  pluginsPath = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'tabby',
    'plugins',
    'node_modules',
    'tabby-sync-gdrive',
  );
} else {
  // Linux and others
  pluginsPath = path.join(
    os.homedir(),
    '.config',
    'tabby',
    'plugins',
    'node_modules',
    'tabby-sync-gdrive',
  );
}

console.log(`Installing plugin to: ${pluginsPath}`);

// 1. Build
console.log('Building plugin...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed.');
  process.exit(1);
}

// 2. Clean install directory
if (fs.existsSync(pluginsPath)) {
  console.log('Removing old installation...');
  try {
    fs.rmSync(pluginsPath, { recursive: true, force: true });
  } catch (e) {
    console.warn(`Warning: Could not remove old directory fully: ${e.message}`);
  }
}

// 3. Create directory
console.log('Creating directory...');
fs.mkdirSync(pluginsPath, { recursive: true });

// 4. Copy dist content
const distPath = path.resolve(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory not found.');
  process.exit(1);
}

console.log('Copying files...');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(distPath, pluginsPath);

console.log('✅ Plugin installed successfully!');
console.log('Please restart Tabby to apply changes.');
