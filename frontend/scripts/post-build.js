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

cacheDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Removed: ${dir}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message);
    }
  }
});

// Also remove large cache files
const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  const removeLargeCacheFiles = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    files.forEach((file) => {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        if (file.name === 'cache' || file.name === 'standalone') {
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`✅ Removed directory: ${filePath}`);
          } catch (error) {
            console.error(`❌ Failed to remove ${filePath}:`, error.message);
          }
        } else {
          removeLargeCacheFiles(filePath);
        }
      } else if (file.isFile() && file.name.endsWith('.pack')) {
        // Remove webpack cache pack files
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > 20 * 1024 * 1024) {
            // Files larger than 20MB
            fs.unlinkSync(filePath);
            console.log(`✅ Removed large cache file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          }
        } catch (error) {
          console.error(`❌ Failed to remove ${filePath}:`, error.message);
        }
      }
    });
  };

  try {
    removeLargeCacheFiles(nextDir);
  } catch (error) {
    console.error('❌ Error cleaning cache files:', error.message);
  }
}

console.log('✨ Cleanup complete!');
