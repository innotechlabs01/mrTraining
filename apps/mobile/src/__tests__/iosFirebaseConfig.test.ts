import fs from 'fs';
import path from 'path';
import appConfig from '../../app.json';

const QA_BUNDLE_IDENTIFIER = 'com.innotechlabssas.mrtraining.qa';
const QA_GOOGLE_SERVICE_FILE = './GoogleService-Info.qa.plist';
const QA_IOS_APP_ID = '1:399408860598:ios:f96fd0598fdcd759d10517';

type IosConfig = { bundleIdentifier?: string; googleServicesFile?: string };
type AppConfigInput = {
  android?: { package?: string };
  plugins?: unknown[];
  extra?: Record<string, unknown>;
  ios?: IosConfig;
  runtimeVersion?: unknown;
  updates?: unknown;
};
type AppConfigFactory = (input: { config: AppConfigInput }) => { ios?: IosConfig };

function setEnv(name: 'APP_VARIANT' | 'ANDROID_PACKAGE' | 'IOS_BUNDLE_IDENTIFIER', value?: string) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function resolveIosConfig(options: { appVariant?: string; bundleIdentifier?: string }): IosConfig | undefined {
  const previousAppVariant = process.env.APP_VARIANT;
  const previousAndroidPackage = process.env.ANDROID_PACKAGE;
  const previousBundleIdentifier = process.env.IOS_BUNDLE_IDENTIFIER;

  setEnv('APP_VARIANT', options.appVariant);
  setEnv('ANDROID_PACKAGE');
  setEnv('IOS_BUNDLE_IDENTIFIER', options.bundleIdentifier);

  try {
    let ios: IosConfig | undefined;
    jest.isolateModules(() => {
      const factory = jest.requireActual('../../app.config.js') as AppConfigFactory;
      ios = factory({ config: appConfig.expo as unknown as AppConfigInput }).ios;
    });
    return ios;
  } finally {
    setEnv('APP_VARIANT', previousAppVariant);
    setEnv('ANDROID_PACKAGE', previousAndroidPackage);
    setEnv('IOS_BUNDLE_IDENTIFIER', previousBundleIdentifier);
  }
}

describe('iOS Firebase config', () => {
  it('uses the versioned QA plist for the qa app variant', () => {
    const ios = resolveIosConfig({ appVariant: 'qa' });
    expect(ios?.bundleIdentifier).toBe(QA_BUNDLE_IDENTIFIER);
    expect(ios?.googleServicesFile).toBe(QA_GOOGLE_SERVICE_FILE);
  });

  it('uses the versioned QA plist when EAS only sets the QA bundle id', () => {
    const ios = resolveIosConfig({ bundleIdentifier: QA_BUNDLE_IDENTIFIER });
    expect(ios?.googleServicesFile).toBe(QA_GOOGLE_SERVICE_FILE);
  });

  it.each(['development', 'production'])('does not wire the QA plist into %s', (appVariant) => {
    expect(resolveIosConfig({ appVariant })?.googleServicesFile).toBeUndefined();
  });

  it('keeps the versioned plist pointed at the QA Firebase app', () => {
    const plistPath = path.resolve(__dirname, '../../GoogleService-Info.qa.plist');
    const contents = fs.readFileSync(plistPath, 'utf8');
    expect(contents).toContain(`<string>${QA_BUNDLE_IDENTIFIER}</string>`);
    expect(contents).toContain(`<string>${QA_IOS_APP_ID}</string>`);
  });
});
