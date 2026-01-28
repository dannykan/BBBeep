/**
 * Expo Config Plugin to add use_modular_headers! to Podfile
 * Fixes Firebase/GoogleUtilities Swift module compatibility issue
 */

const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');

        // Check if use_modular_headers! already exists
        if (!podfileContent.includes('use_modular_headers!')) {
          // Add use_modular_headers! after prepare_react_native_project!
          podfileContent = podfileContent.replace(
            'prepare_react_native_project!',
            `prepare_react_native_project!

# Fix Firebase/GoogleUtilities Swift module compatibility
use_modular_headers!`
          );

          fs.writeFileSync(podfilePath, podfileContent);
          console.log('[withModularHeaders] Added use_modular_headers! to Podfile');
        } else {
          console.log('[withModularHeaders] use_modular_headers! already exists in Podfile');
        }
      }

      return config;
    },
  ]);
}

module.exports = withModularHeaders;
