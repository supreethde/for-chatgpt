import { CatalogProduct, ProductCategory } from '../../types';
import {
  getActiveQualityRanges,
  getActiveVariants,
  getQualityRangeDisplayLabel,
} from '../products/productModel';

export const SITE_URL = 'https://www.thesoiltheory.in';
export const SITE_NAME = 'The Soil Theory';
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

export interface CategorySeoContent {
  slug: string;
  name: ProductCategory;
  title: string;
  description: string;
  introduction: string;
  education: string;
  relatedCategories: ProductCategory[];
}

export const CATEGORY_SEO_CONTENT: Record<string, CategorySeoContent> = {
  vegetables: {
    slug: 'vegetables',
    name: 'Vegetables',
    title: 'Organic Vegetables',
    description:
      'Source traceable organic and pesticide-free vegetables for restaurants, hotels, cafés and professional kitchens across Bengaluru.',
    introduction:
      'A dependable kitchen starts with vegetables that arrive fresh, perform consistently and come with a clear sourcing story. Our Bengaluru catalogue brings together seasonal staples and chef-ready specialty produce from verified Karnataka farms.',
    education:
      'We prioritise harvest timing, cold-chain handling and weekly residue testing so vegetables retain flavour, texture and usable shelf life. Availability changes naturally with farm conditions, but every listed product remains transparent about its source and pack options.',
    relatedCategories: ['Leafy Greens', 'Mushrooms', 'Exotics'],
  },
  fruits: {
    slug: 'fruits',
    name: 'Fruits',
    title: 'Organic Fruits',
    description:
      'Discover seasonal, traceable and pesticide-free fruits supplied to Bengaluru restaurants, hotels, cafés and catering teams.',
    introduction:
      'From breakfast service to pastry, beverage and plated dessert programmes, professional kitchens need fruit with reliable ripeness and flavour. The Soil Theory sources carefully handled fruit for Bengaluru food businesses.',
    education:
      'Fruit is selected for usable maturity, transport resilience and menu application. Seasonal availability is treated as a quality signal, while transparent farm sourcing helps kitchens plan substitutions without compromising standards.',
    relatedCategories: ['Exotics', 'Microgreens', 'Vegetables'],
  },
  'leafy-greens': {
    slug: 'leafy-greens',
    name: 'Leafy Greens',
    title: 'Organic Leafy Greens',
    description:
      'Shop crisp, traceable leafy greens and salad produce for restaurants, cafés, hotels and cloud kitchens in Bengaluru.',
    introduction:
      'Leafy greens are among the most time-sensitive ingredients in a professional kitchen. We focus on short harvest-to-delivery windows, careful handling and varieties chosen for freshness, flavour and culinary yield.',
    education:
      'Because leaves have a high surface area and are often served raw, cultivation and handling standards matter. Our sourcing approach emphasises controlled inputs, residue checks and fast delivery into Bengaluru.',
    relatedCategories: ['Vegetables', 'Microgreens', 'Mushrooms'],
  },
  mushrooms: {
    slug: 'mushrooms',
    name: 'Mushrooms',
    title: 'Organic Mushrooms',
    description:
      'Source fresh specialty mushrooms with transparent cultivation and dependable Bengaluru delivery for chefs and food businesses.',
    introduction:
      'Mushrooms bring umami, texture and high menu value across cuisines. Our catalogue is designed for chefs who need clean, firm produce with predictable pack sizes and cultivation transparency.',
    education:
      'Fresh mushrooms are sensitive to moisture and temperature. We prioritise hygienic cultivation, careful packing and rapid delivery so kitchens receive better texture and less trim loss.',
    relatedCategories: ['Exotics', 'Vegetables', 'Microgreens'],
  },
  microgreens: {
    slug: 'microgreens',
    name: 'Microgreens',
    title: 'Fresh Microgreens',
    description:
      'Buy fresh, chef-ready microgreens for premium plating, salads and high-value menus across Bengaluru.',
    introduction:
      'Microgreens deliver concentrated flavour, colour and visual precision. The Soil Theory connects Bengaluru kitchens with carefully grown varieties suited to premium plating and fresh menu applications.',
    education:
      'Short crop cycles make hygiene, seed quality and harvest timing especially important. Our approach favours clean cultivation, careful handling and delivery close to harvest.',
    relatedCategories: ['Leafy Greens', 'Exotics', 'Mushrooms'],
  },
  exotics: {
    slug: 'exotics',
    name: 'Exotics',
    title: 'Exotic and Specialty Produce',
    description:
      'Explore traceable exotic and specialty produce for fine-dining restaurants, hotels and premium kitchens in Bengaluru.',
    introduction:
      'Specialty produce helps chefs build distinctive menus, but availability and quality can vary widely. We curate exotic ingredients with clear sourcing, practical pack formats and realistic seasonal expectations.',
    education:
      'Our catalogue balances locally grown specialty crops with carefully verified supply where local cultivation is not practical. The goal is differentiation without sacrificing traceability or kitchen reliability.',
    relatedCategories: ['Mushrooms', 'Microgreens', 'Fruits'],
  },
};

export function getCategorySeoByName(category: ProductCategory): CategorySeoContent {
  return (
    Object.values(CATEGORY_SEO_CONTENT).find((item) => item.name === category) ||
    CATEGORY_SEO_CONTENT.vegetables
  );
}

export function createOrganizationSchemas() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/android-chrome-512x512.png`,
        width: 512,
        height: 512,
      },
      email: 'hello@soiltheory.in',
      telephone: '+91-98805-85292',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#localbusiness`,
      name: SITE_NAME,
      url: SITE_URL,
      image: DEFAULT_SOCIAL_IMAGE,
      telephone: '+91-98805-85292',
      email: 'hello@soiltheory.in',
      priceRange: '₹₹',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bengaluru',
        addressRegion: 'Karnataka',
        addressCountry: 'IN',
      },
      areaServed: {
        '@type': 'City',
        name: 'Bengaluru',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 12.9716,
        longitude: 77.5946,
      },
      hasMap: 'https://www.google.com/maps/search/?api=1&query=The+Soil+Theory+Bengaluru',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/shop?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

export function createProductSchemas(product: CatalogProduct) {
  const canonicalUrl = `${SITE_URL}/produce/${encodeURIComponent(product.slug)}`;
  const images = (product.images || []).filter(Boolean);
  const offers = getActiveQualityRanges(product).flatMap((range) =>
    getActiveVariants(range)
      .filter((variant) => Number.isFinite(variant.sellingPrice ?? variant.price))
      .map((variant) => ({
        '@type': 'Offer',
        name: `${getQualityRangeDisplayLabel(range)} · ${variant.label}`,
        sku: variant.sku || `${product.slug}-${range.id}-${variant.id}`,
        priceCurrency: 'INR',
        price: variant.sellingPrice ?? variant.price,
        availability:
          range.stockStatus === 'out_of_stock' ||
          variant.stockStatus === 'out_of_stock'
            ? 'https://schema.org/OutOfStock'
            : range.stockStatus === 'low_stock' ||
                variant.stockStatus === 'low_stock'
              ? 'https://schema.org/LimitedAvailability'
              : 'https://schema.org/InStock',
        url: canonicalUrl,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${SITE_URL}/#organization` },
      }))
  );

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${canonicalUrl}#product`,
      name: product.name,
      description: product.description || product.shortIntro,
      sku: product.slug,
      category: product.category,
      image: images.map((url, index) => ({
        '@type': 'ImageObject',
        url,
        caption:
          index === 0
            ? `Botanical illustration of ${product.name}`
            : index === 1
              ? `Fresh ${product.name}`
              : index === 2
                ? `Benefits of ${product.name}`
                : `Why ${product.name} should be organic`,
      })),
      brand: { '@type': 'Brand', name: SITE_NAME },
      offers,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Produce Catalogue',
          item: `${SITE_URL}/shop`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.category,
          item: `${SITE_URL}/${getCategorySeoByName(product.category).slug}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: product.name,
          item: canonicalUrl,
        },
      ],
    },
  ];
}

export function createCategorySchemas(
  category: CategorySeoContent,
  products: CatalogProduct[]
) {
  const canonicalUrl = `${SITE_URL}/${category.slug}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      name: category.title,
      description: category.description,
      url: canonicalUrl,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: {
        '@type': 'Thing',
        name: `${category.name} for professional kitchens in Bengaluru`,
      },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.name,
          url: `${SITE_URL}/produce/${encodeURIComponent(product.slug)}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Produce Catalogue',
          item: `${SITE_URL}/shop`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: category.name,
          item: canonicalUrl,
        },
      ],
    },
  ];
}

export function createShopSchemas(products: CatalogProduct[]) {
  const canonicalUrl = `${SITE_URL}/shop`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      name: 'Produce Catalogue',
      description:
        'Explore active, traceable produce from trusted farms for Bengaluru professional kitchens.',
      url: canonicalUrl,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: products.length,
        itemListElement: products.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: product.name,
          url: `${SITE_URL}/produce/${encodeURIComponent(product.slug)}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Produce Catalogue',
          item: canonicalUrl,
        },
      ],
    },
  ];
}
