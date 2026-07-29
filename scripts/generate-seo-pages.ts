import fs from 'node:fs/promises';
import path from 'node:path';
import {
  CATEGORY_SEO_CONTENT,
  createCategorySchemas,
  createOrganizationSchemas,
  createProductSchemas,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
  SITE_URL,
} from '../src/features/seo/seo';
import type { CatalogProduct } from '../src/types';
import { createFaqSchema } from '../src/features/seo/faq';

const DIST_DIR = path.resolve('dist');
const FIRESTORE_PRODUCTS_URL =
  'https://firestore.googleapis.com/v1/projects/the-soil-theory/databases/%28default%29/documents/products?pageSize=1000';

function decodeFirestoreValue(value: any): any {
  if (!value) return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nested]) => [
        key,
        decodeFirestoreValue(nested),
      ])
    );
  }
  return undefined;
}

function decodeDocument(document: any): CatalogProduct {
  const fields = Object.fromEntries(
    Object.entries(document.fields || {}).map(([key, value]) => [
      key,
      decodeFirestoreValue(value),
    ])
  ) as Record<string, any>;

  return {
    id: document.name.split('/').pop(),
    name: fields.name || 'Unnamed Produce',
    slug: fields.slug || document.name.split('/').pop(),
    category: fields.category || 'Vegetables',
    scientificName: fields.scientificName || undefined,
    displayOrder: fields.displayOrder ?? 100,
    shortIntro: fields.shortIntro || fields.shortIntroduction || '',
    highlights: fields.highlights || fields.keyHighlights || [],
    description: fields.description || fields.shortIntro || '',
    regionalNameKannada: fields.regionalNameKannada || fields.regionalNames?.kannada,
    regionalNameHindi: fields.regionalNameHindi || fields.regionalNames?.hindi,
    images: fields.images || [],
    variants: fields.variants || [],
    isActive: fields.isActive ?? fields.active ?? true,
    featuredProduct: fields.featuredProduct === true,
    promotionalPriority: fields.promotionalPriority || 'none',
    excludeFromRecommendations: fields.excludeFromRecommendations === true,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
  } as CatalogProduct;
}

async function fetchProducts(): Promise<CatalogProduct[]> {
  try {
    const response = await fetch(FIRESTORE_PRODUCTS_URL);
    if (!response.ok) throw new Error(`Firestore returned ${response.status}`);
    const payload = await response.json();
    return (payload.documents || [])
      .map(decodeDocument)
      .filter((product: CatalogProduct) => product.isActive !== false)
      .sort(
        (left: CatalogProduct, right: CatalogProduct) =>
          (left.displayOrder ?? 100) - (right.displayOrder ?? 100)
      );
  } catch (error) {
    console.warn('SEO generation could not fetch Firestore products:', error);
    return [];
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeXml(value: string): string {
  return escapeHtml(value).replaceAll("'", '&apos;');
}

function serializeSchemas(schemas: Record<string, unknown>[]): string {
  return schemas
    .map(
      (schema) =>
        `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`
    )
    .join('\n');
}

function injectSeo(
  template: string,
  {
    title,
    description,
    canonicalUrl,
    image,
    type,
    schemas,
  }: {
    title: string;
    description: string;
    canonicalUrl: string;
    image: string;
    type: 'website' | 'product';
    schemas: Record<string, unknown>[];
  }
): string {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const cleanTemplate = template.replace(/<title>[\s\S]*?<\/title>/i, '');
  const head = `
    <title>${escapeHtml(fullTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(fullTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(fullTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    ${serializeSchemas(schemas)}
  `;

  return cleanTemplate.replace('</head>', `${head}\n</head>`);
}

async function writeHtmlPage(relativePath: string, html: string) {
  const directory = path.join(DIST_DIR, relativePath);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), html);
}

function getLastModified(product: CatalogProduct): string {
  const value = product.updatedAt || product.createdAt;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

async function generate() {
  const template = await fs.readFile(path.join(DIST_DIR, 'index.html'), 'utf8');
  const products = await fetchProducts();

  const homeHtml = injectSeo(template, {
    title: 'Organic Produce Supply for Bengaluru Restaurants',
    description:
      'The Soil Theory supplies traceable organic and pesticide-free fruits, vegetables, leafy greens, mushrooms and specialty produce to Bengaluru professional kitchens.',
    canonicalUrl: SITE_URL,
    image: DEFAULT_SOCIAL_IMAGE,
    type: 'website',
    schemas: [...createOrganizationSchemas(), createFaqSchema()],
  });
  await fs.writeFile(path.join(DIST_DIR, 'index.html'), homeHtml);

  for (const product of products) {
    const canonicalUrl = `${SITE_URL}/produce/${encodeURIComponent(product.slug)}`;
    const description = (product.shortIntro || product.description).slice(0, 160);
    const html = injectSeo(template, {
      title: `${product.name} for Bengaluru Professional Kitchens`,
      description,
      canonicalUrl,
      image: product.images?.[1] || product.images?.[0] || DEFAULT_SOCIAL_IMAGE,
      type: 'product',
      schemas: createProductSchemas(product),
    });
    await writeHtmlPage(`produce/${product.slug}`, html);
  }

  for (const category of Object.values(CATEGORY_SEO_CONTENT)) {
    const categoryProducts = products.filter((product) => product.category === category.name);
    const canonicalUrl = `${SITE_URL}/produce/category/${category.slug}`;
    const html = injectSeo(template, {
      title: category.title,
      description: category.description,
      canonicalUrl,
      image:
        categoryProducts.find((product) => product.images?.[0])?.images[0] ||
        DEFAULT_SOCIAL_IMAGE,
      type: 'website',
      schemas: createCategorySchemas(category, categoryProducts),
    });
    await writeHtmlPage(`produce/category/${category.slug}`, html);
  }

  const staticUrls = ['/', '/about.html', '/faq.html', '/blog.html', '/privacy.html', '/terms.html'];
  const categoryUrls = Object.values(CATEGORY_SEO_CONTENT).map(
    (category) => `/produce/category/${category.slug}`
  );
  const productUrls = products.map((product) => `/produce/${encodeURIComponent(product.slug)}`);
  const sitemapEntries = [...staticUrls, ...categoryUrls, ...productUrls]
    .map((url) => {
      const product = products.find(
        (item) => `/produce/${encodeURIComponent(item.slug)}` === url
      );
      const lastmod = product ? getLastModified(product) : new Date().toISOString();
      return `  <url><loc>${escapeXml(`${SITE_URL}${url}`)}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemap);

  const imageEntries = products
    .filter((product) => product.images?.length)
    .map((product) => {
      const images = product.images
        .map(
          (image, index) => `    <image:image>
      <image:loc>${escapeXml(image)}</image:loc>
      <image:title>${escapeXml(
        index === 0
          ? `Botanical illustration of ${product.name}`
          : index === 1
            ? `Fresh ${product.name}`
            : index === 2
              ? `Benefits of ${product.name}`
              : `Why ${product.name} should be organic`
      )}</image:title>
    </image:image>`
        )
        .join('\n');
      return `  <url>
    <loc>${escapeXml(`${SITE_URL}/produce/${encodeURIComponent(product.slug)}`)}</loc>
${images}
  </url>`;
    })
    .join('\n');

  const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${imageEntries}\n</urlset>\n`;
  await fs.writeFile(path.join(DIST_DIR, 'image-sitemap.xml'), imageSitemap);

  const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${SITE_URL}/sitemap.xml\nSitemap: ${SITE_URL}/image-sitemap.xml\n`;
  await fs.writeFile(path.join(DIST_DIR, 'robots.txt'), robots);

  console.log(
    `Generated SEO pages for ${products.length} products and ${Object.keys(CATEGORY_SEO_CONTENT).length} categories.`
  );
}

generate().catch((error) => {
  console.error('SEO page generation failed:', error);
  process.exitCode = 1;
});
