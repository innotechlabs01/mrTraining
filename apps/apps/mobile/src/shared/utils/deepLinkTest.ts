/**
 * Deep Link Test Utility
 * 
 * Use this to test deep linking on iOS Simulator or Android Emulator.
 * 
 * iOS Simulator:
 *   xcrun simctl openurl booted "mrtraining://invite?code=MR-A3X9"
 * 
 * Android Emulator:
 *   adb shell am start -a android.intent.action.VIEW -d "mrtraining://invite?code=MR-A3X9" com.innotechlabssas.mrtraining
 * 
 * Or test with https:
 *   xcrun simctl openurl booted "https://app.mrtraining.com/invite?code=MR-A3X9"
 */

import { Linking } from 'react-native';

const DEEP_LINK_TEST_URLS = {
  // Custom scheme
  invite: 'mrtraining://invite?code=test-invite-code-123',
  inviteWithoutCode: 'mrtraining://invite',
  
  // HTTPS fallback
  httpsInvite: 'https://app.mrtraining.com/invite?code=test-invite-code-123',
  
  // Auth
  auth: 'mrtraining://auth',
  
  // Home
  home: 'mrtraining://home',
};

export async function testDeepLink(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url);
    console.log(`[DeepLink Test] ${url}`);
    console.log(`  Supported: ${supported}`);
    
    if (supported) {
      await Linking.openURL(url);
      console.log(`  Opened successfully`);
    }
    
    return supported;
  } catch (error) {
    console.log(`[DeepLink Test] ${url}`);
    console.log(`  Error: ${error}`);
    return false;
  }
}

export async function runDeepLinkTests(): Promise<void> {
  console.log('\n=== Deep Link Tests ===\n');
  
  for (const [name, url] of Object.entries(DEEP_LINK_TEST_URLS)) {
    await testDeepLink(url);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n=== Tests Complete ===\n');
}

// Parse deep link URL and extract parameters
export function parseDeepLink(url: string): {
  scheme: string;
  host: string;
  path: string;
  params: Record<string, string>;
} | null {
  try {
    // Handle custom scheme: mrtraining://invite?code=xxx
    if (url.startsWith('mrtraining://')) {
      const withoutScheme = url.replace('mrtraining://', '');
      const [pathAndParams] = withoutScheme.split('?');
      const path = pathAndParams || '';
      const params: Record<string, string> = {};
      
      const queryString = url.split('?')[1];
      if (queryString) {
        queryString.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        });
      }
      
      return {
        scheme: 'mrtraining',
        host: '',
        path,
        params,
      };
    }
    
    // Handle HTTPS: https://app.mrtraining.com/invite?code=xxx
    if (url.startsWith('https://')) {
      const urlObj = new URL(url);
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return {
        scheme: 'https',
        host: urlObj.hostname,
        path: urlObj.pathname,
        params,
      };
    }
    
    return null;
  } catch {
    return null;
  }
}
