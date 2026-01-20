#!/usr/bin/env node

/**
 * Pre-build script to set environment variables that disable Next.js caching
 */

// Set environment variables to disable caching
process.env.NEXT_DISABLE_CACHE = '1';
process.env.NEXT_TELEMETRY_DISABLED = '1';

console.log('🔧 Pre-build: Disabled Next.js caching');
