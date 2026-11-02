// Message loader with fallback chain
// This module handles dynamic imports of locale messages with fallback chain

// Pre-load all messages at build time
import enUSCommon from '@/messages/en-US/common.json';
import enGBCommon from '@/messages/en-GB/common.json';
import esESCommon from '@/messages/es-ES/common.json';
import esMXCommon from '@/messages/es-MX/common.json';
import esARCommon from '@/messages/es-AR/common.json';
import enCommon from '@/messages/en/common.json';
import esCommon from '@/messages/es/common.json';

type MessagesMap = Record<string, Record<string, unknown>>;

const messagesMap: MessagesMap = {
  'en-US': enUSCommon,
  'en-GB': enGBCommon,
  'es-ES': esESCommon,
  'es-MX': esMXCommon,
  'es-AR': esARCommon,
  'en': enCommon,
  'es': esCommon,
};

// Fallback chain: locale -> base language -> en-US
const fallbackChain: Record<string, string[]> = {
  'en-US': ['en-US'],
  'en-GB': ['en-GB', 'en-US'],
  'es-ES': ['es-ES', 'es', 'en-US'],
  'es-MX': ['es-MX', 'es', 'en-US'],
  'es-AR': ['es-AR', 'es', 'en-US'],
  'en': ['en', 'en-US'],
  'es': ['es', 'en-US'],
};

// Synchronous getter for use in layout - returns messages object
export function getMessages(locale: string): Record<string, string> {
  // Debug log to see what locale is being passed
  console.log('[getMessages] locale:', locale);
  
  if (!locale) {
    console.log('[getMessages] locale is undefined/null, using en-US');
    return (messagesMap['en-US'] as Record<string, string>) || {};
  }
  
  const chain = fallbackChain[locale] ?? [locale, 'en-US'];
  
  for (const loc of chain) {
    try {
      const messages = messagesMap[loc];
      if (messages && Object.keys(messages).length > 0) {
        console.log('[getMessages] found messages for locale:', loc, 'count:', Object.keys(messages).length);
        return messages as Record<string, string>;
      }
    } catch (e) {
      console.log('[getMessages] error loading locale:', loc, e);
      continue;
    }
  }
  
  // Ultimate fallback - should never be reached since en-US is always loaded
  console.log('[getMessages] using ultimate fallback: en-US');
  return (messagesMap['en-US'] as Record<string, string>) || {};
}

export async function getMessagesAsync(locale: string): Promise<Record<string, string>> {
  return getMessages(locale);
}