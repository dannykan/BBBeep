#!/usr/bin/env node

/**
 * Post-build script to clean up cache files for Cloudflare Pages
 * This script removes cache directories that exceed Cloudflare's 25MB file size limit
 */

const fs = require('fs');
const path = require('path');

const cacheDirs = [
  path.join(__dirname, '..', '.next', 'cache'),
  path.join(__dirname, '..', '.next', 'standalone'),
];

console.log('🧹 Cleaning up cache directories...');
console.log('Current working directory:', process.cwd());

cacheDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message);
    }
  } else {
    console.log(`ℹ️  Directory does not exist: ${dir}`);
  }
});

// Also remove large cache files recursively
const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  const removeLargeCacheFiles = (dir) => {
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      files.forEach((file) => {
        const filePath = path.join(dir, file.name);
        try {
          if (file.isDirectory()) {
            if (file.name === 'cache' || file.name === 'standalone') {
              fs.rmSync(filePath, { recursive: true, force: true });
              console.log(`✅ Removed directory: ${filePath}`);
            } else {
              // Recursively check subdirectories
              removeLargeCacheFiles(filePath);
            }
          } else if (file.isFile()) {
            // Remove all .pack files (webpack cache files)
            if (file.name.endsWith('.pack')) {
              const stats = fs.statSync(filePath);
              fs.unlinkSync(filePath);
              console.log(`✅ Removed cache file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
            }
          }
        } catch (error) {
          // Ignore errors for individual files/directories
          console.warn(`⚠️  Warning: ${error.message}`);
        }
      });
    } catch (error) {
      console.error(`❌ Error reading directory ${dir}:`, error.message);
    }
  };

  try {
    removeLargeCacheFiles(nextDir);
  } catch (error) {
    console.error('❌ Error cleaning cache files:', error.message);
  }
}

console.log('✨ Cleanup complete!');
