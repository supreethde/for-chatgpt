import { useEffect } from 'react';
import { DEFAULT_SOCIAL_IMAGE, SITE_NAME, SITE_URL } from './seo';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  schemas?: Record<string, unknown>[];
}

function upsertMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function SeoHead({
  title,
  description,
  canonicalPath,
  image = DEFAULT_SOCIAL_IMAGE,
  type = 'website',
  noIndex = false,
  schemas = [],
}: SeoHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const canonicalUrl = canonicalPath.startsWith('http')
      ? canonicalPath
      : `${SITE_URL}${canonicalPath}`;

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: 'description' }, description);
    upsertMeta(
      'meta[name="robots"]',
      { name: 'robots' },
      noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
    );
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, fullTitle);
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, type);
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, canonicalUrl);
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, fullTitle);
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const scripts = schemas.map((schema, index) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = `seo-structured-data-${index}`;
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => scripts.forEach((script) => script.remove());
  }, [canonicalPath, description, image, noIndex, schemas, title, type]);

  return null;
}
