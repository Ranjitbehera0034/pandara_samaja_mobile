// plugins/withAndroidShareTarget.js
//
// expo-share-intent's own plugin only adds a plain ACTION_SEND intent-filter
// to MainActivity — enough to make Pandara Samaja eligible to appear in
// Android's share sheet at all, but gives it no extra prominence there.
// Registering a static Direct Share target (a shortcuts.xml resource +
// the "android.app.shortcuts" meta-data on MainActivity) is the one
// additional, legitimate lever Android exposes for a share target to be
// considered for the predictive row shown above the full app list — not a
// guarantee of the #1 slot (that ranking is entirely OS/usage-driven, see
// developer.android.com/training/sharing/direct-share-targets), just
// improved eligibility for it.
const { withDangerousMod, withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SHORTCUTS_XML = `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
    <share-target android:targetClass="{{TARGET_CLASS}}">
        <data android:mimeType="text/*" />
        <category android:name="android.intent.category.DEFAULT" />
    </share-target>
</shortcuts>
`;

function withShareTargetResource(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const targetClass = `${config.android.package}.MainActivity`;
      const xmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, 'shareable_targets.xml'),
        SHORTCUTS_XML.replace('{{TARGET_CLASS}}', targetClass)
      );
      return config;
    },
  ]);
}

function withShareTargetManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity['meta-data'] = mainActivity['meta-data'] || [];
    const alreadyPresent = mainActivity['meta-data'].some(
      (item) => item.$['android:name'] === 'android.app.shortcuts'
    );
    if (!alreadyPresent) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shareable_targets',
        },
      });
    }
    return config;
  });
}

module.exports = function withAndroidShareTarget(config) {
  config = withShareTargetResource(config);
  config = withShareTargetManifest(config);
  return config;
};
