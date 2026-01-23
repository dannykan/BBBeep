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

// Add shared package to resolver - include monorepo root for shared package dependencies
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Map workspace package to actual location
config.resolver.extraNodeModules = {
  '@bbbeeep/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

module.exports = config;
