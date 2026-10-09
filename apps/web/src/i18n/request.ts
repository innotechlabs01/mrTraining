import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { getMessages } from '@/lib/messages';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming locale is supported
  const messages = getMessages(locale);
  
  if (Object.keys(messages).length === 0) {
    notFound();
  }

  return {
    locale,
    messages,
  };
});