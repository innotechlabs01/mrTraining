import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mr-training.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/sign-in', '/sign-up', '/coach/', '/admin/', '/checkout/', '/payment/', '/meet/', '/invite/', '/l/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
