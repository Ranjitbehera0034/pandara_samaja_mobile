// plugins/withAdiRegistration.js
//
// One-time proof-of-ownership step for Google's Android Developer
// Verification program (registers this app's package name + signing key
// so it isn't removed from Play / blocked on certified devices after
// their Sept 2026 deadline). Play Console asks for an APK — any APK signed
// with the matching key, not necessarily the one actually distributed —
// containing assets/adi-registration.properties with a snippet Play
// generates per-account. This just drops that file into the native
// assets folder during prebuild so a normal EAS build satisfies the
// requirement. Safe to leave in permanently; it's inert once verification
// is complete.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SNIPPET = 'C3EESYR3UIQ7GAAAAAAAAAAAAA';

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets');
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.writeFileSync(path.join(assetsDir, 'adi-registration.properties'), SNIPPET + '\n');
      return config;
    },
  ]);
};
