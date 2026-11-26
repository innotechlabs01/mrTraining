const fs = require('fs');
const path = require('path');
const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withDangerousMod,
} = require('@expo/config-plugins');

const GMS_CLASSPATH = "classpath('com.google.gms:google-services:4.4.2')";
const FIREBASE_APPDIST_CLASSPATH =
  "classpath('com.google.firebase:firebase-appdistribution-gradle:5.1.1')";

const QA_APP_ID = '1:399408860598:android:9dc9797d89afbb9cd10517';

/**
 * Adds Google Services and Firebase App Distribution classpaths to android/build.gradle.
 */
function withFirebaseProjectGradle(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    const depAnchor = /dependencies\s*\{/;
    if (!contents.includes('com.google.gms:google-services')) {
      contents = contents.replace(depAnchor, (match) => `${match}\n        ${GMS_CLASSPATH}`);
    }
    if (!contents.includes('com.google.firebase:firebase-appdistribution-gradle')) {
      contents = contents.replace(
        depAnchor,
        (match) => `${match}\n        ${FIREBASE_APPDIST_CLASSPATH}`,
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

/**
 * Configures android/app/build.gradle:
 * - Applies com.google.firebase.appdistribution
 * - Conditionally applies com.google.gms.google-services when google-services.json exists
 * - Supports optional release/qa keystore via ANDROID_KEYSTORE_* env vars
 * - Adds `qa` buildType with firebaseAppDistribution configuration
 */
function withFirebaseAppGradle(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes("apply plugin: 'com.google.firebase.appdistribution'") &&
        !contents.includes('apply plugin: "com.google.firebase.appdistribution"')) {
      contents = contents.replace(
        /(apply plugin:\s*["']com\.android\.application["'])/,
        `$1\napply plugin: 'com.google.firebase.appdistribution'`,
      );
    }

    if (!contents.includes('com.google.gms.google-services')) {
      contents += `
if (file('google-services.json').exists()) {
    apply plugin: 'com.google.gms.google-services'
}
`;
    }

    // Add optional release signingConfig backed by ANDROID_KEYSTORE_* env vars.
    if (!contents.includes('ANDROID_KEYSTORE_PATH')) {
      const signingConfigsAnchor = /signingConfigs\s*\{/;
      const releaseSigningBlock = `signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }`;
      contents = contents.replace(signingConfigsAnchor, releaseSigningBlock);
    }

    // Add qa buildType inside android.buildTypes if not already present.
    if (!contents.includes('firebaseAppDistribution {')) {
      const buildTypesReleaseAnchor = /buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?\n\s*\}/;
      contents = contents.replace(buildTypesReleaseAnchor, (match) => {
        const updatedRelease = match.replace(
          /signingConfig\s+signingConfigs\.debug/,
          'signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug',
        );
        return `${updatedRelease}
        qa {
            initWith release
            applicationIdSuffix ".qa"
            matchingFallbacks = ['release']
            signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug
            firebaseAppDistribution {
                appId = "${QA_APP_ID}"
                artifactType = "APK"
                groups = project.findProperty("firebaseTesterGroups") ?: "qa-testers"
            }
        }`;
      });
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

/**
 * Reads the QA google-services.json from GOOGLE_SERVICES_JSON_QA (inline JSON
 * or file path) or from google-services.qa.json in the project root.
 */
function readQaGoogleServices(projectRoot) {
  const envSource = process.env.GOOGLE_SERVICES_JSON_QA;
  const localSource = path.join(projectRoot, 'google-services.qa.json');

  if (envSource && envSource.trim().startsWith('{')) {
    return envSource;
  }
  if (envSource && fs.existsSync(envSource)) {
    return fs.readFileSync(envSource, 'utf8');
  }
  if (fs.existsSync(localSource)) {
    return fs.readFileSync(localSource, 'utf8');
  }
  return null;
}

/**
 * Copies the QA google-services.json into the qa source set. For QA builds
 * using `android.buildType: apk`, also copy it into the main app source set so
 * the release artifact includes the Firebase config.
 */
function withQaGoogleServicesFile(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const contents = readQaGoogleServices(modConfig.modRequest.projectRoot);
      if (!contents) {
        return modConfig;
      }
      JSON.parse(contents);

      const appDir = path.join(modConfig.modRequest.platformProjectRoot, 'app');
      const destinations = [path.join(appDir, 'src', 'qa')];
      if (process.env.APP_VARIANT === 'qa') {
        destinations.push(appDir);
      }

      for (const destDir of destinations) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(path.join(destDir, 'google-services.json'), contents, 'utf8');
      }

      return modConfig;
    },
  ]);
}

module.exports = function withAndroidFirebaseAppDistribution(config) {
  config = withFirebaseProjectGradle(config);
  config = withFirebaseAppGradle(config);
  config = withQaGoogleServicesFile(config);
  return config;
};
