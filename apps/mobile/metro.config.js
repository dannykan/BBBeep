/**
 * Metro configuration for Expo with shared package
 * The mobile app uses npm instead of pnpm workspace to avoid Metro symlink issues
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package for hot reloading
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/shared'),
];

// Add shared package to resolver - mobile has its own node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Map workspace package to actual location
config.resolver.extraNodeModules = {
  '@bbbeeep/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

module.exports = config;
