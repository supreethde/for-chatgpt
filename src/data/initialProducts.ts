import { CatalogProduct } from '../types';

export const INITIAL_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod-001',
    name: 'Hydroponic Butterhead Lettuce',
    slug: 'hydroponic-butterhead-lettuce',
    category: 'Leafy Greens',
    shortIntro: 'Tender, sweet butterhead lettuce grown in mineral-rich water without synthetic pesticides. Harvested daily with roots intact for maximum crunch and longevity.',
    highlights: [
      'Zero synthetic chemical pesticides or herbicides',
      'Harvested with root-ball intact for 10-day shelf life',
      'Naturally rich in Vitamin A, Folate and Iron',
      'Sustainably cultivated using 90% less land & water'
    ],
    description: 'Grown inside climate-controlled precision greenhouses, our Butterhead Lettuce features buttery, soft green leaves wrapped around a tender compact heart. Nourished exclusively with pure filtered water and natural mineral salts, every head is meticulously inspected for quality. Because it is harvested with the root ball intact, it stays farm-fresh in your refrigerator for up to ten days. Perfect for artisanal salads, gourmet sandwich wraps, or light summer rolls. Enjoy pure, vibrant greens free from heavy metals or chemical runoff.',
    regionalNameKannada: 'ಬೆಣ್ಣೆ ಸಾಲಡ್ ಸೊಪ್ಪು (Benne Salad Soppu)',
    regionalNameHindi: 'बटरहेड सलाद पत्ता (Butterhead Salad Patta)',
    images: [
      'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
    ],
    variants: [
      {
        id: 'var-101',
        label: '1 Head (approx 180g)',
        price: 95,
        mrp: 120,
        stockStatus: 'in_stock'
      },
      {
        id: 'var-102',
        label: 'Pack of 2 Heads',
        price: 175,
        mrp: 230,
        stockStatus: 'in_stock'
      }
    ],
    isActive: true,
    createdAt: '2026-07-20T10:00:00Z',
    updatedAt: '2026-07-25T14:30:00Z'
  },
  {
    id: 'prod-002',
    name: 'Artisanal King Oyster Mushrooms',
    slug: 'artisanal-king-oyster-mushrooms',
    category: 'Mushrooms',
    shortIntro: 'Thick, meaty mushroom stems with a rich savory umami flavor and dense texture. Cultivated on organic hardwood substrate under controlled humidity.',
    highlights: [
      'Rich in plant protein, beta-glucans and antioxidants',
      'Dense, thick stems ideal for pan-searing or grilling',
      'Cultivated on 100% chemical-free organic sawdust substrate',
      'Hand-harvested at peak firmness for maximum culinary yield'
    ],
    description: 'King Oyster Mushrooms are prized by chefs for their hearty, meaty texture and deeply satisfying umami profile. Unlike traditional mushrooms, the thick stem is tender and succulently sliceable, making it an exceptional plant-based centerpiece for searing, stir-frying, or roasting. Grown under strict hygiene in pasteurized oak sawdust substrate without chemical inputs, these mushrooms deliver incredible flavor integrity and extended kitchen shelf life.',
    regionalNameKannada: 'ಕಿಂಗ್ ಆಯ್ಸ್ಟರ್ ಅಣಬೆ (King Oyster Anabe)',
    regionalNameHindi: 'किंग ऑयस्टर मशरूम (King Oyster Mushroom)',
    images: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
    ],
    variants: [
      {
        id: 'var-201',
        label: '250 g',
        price: 140,
        mrp: 180,
        stockStatus: 'in_stock'
      },
      {
        id: 'var-202',
        label: '500 g',
        price: 260,
        mrp: 340,
        stockStatus: 'low_stock'
      }
    ],
    isActive: true,
    createdAt: '2026-07-21T11:20:00Z',
    updatedAt: '2026-07-26T09:15:00Z'
  },
  {
    id: 'prod-003',
    name: 'Live Sunflower Microgreens',
    slug: 'live-sunflower-microgreens',
    category: 'Microgreens',
    shortIntro: 'Nutty, crunchy microgreens packed with up to 40 times more nutrients than mature greens. Harvested fresh at day 10 for vibrant salads and bowls.',
    highlights: [
      'Concentrated nutrient density with high chlorophyll & zinc',
      'Pleasant nutty crunch that complements any warm or cold dish',
      'Organically sprouted from non-GMO heirloom sunflower seeds',
      'Delivered live in bio-degradable growing trays'
    ],
    description: 'Sunflower microgreens are tiny powerhouses of nutrition, offering a nutty, robust flavor and satisfying crisp texture. Harvested when the first true leaves emerge, they contain elevated levels of vitamins A, C, E, and essential amino acids. Sprinkle over avocado toast, fold into fresh wraps, or top hearty grain bowls for an instant gourmet upgrade that nourishes your body with living enzymes.',
    regionalNameKannada: 'ಸೂರ್ಯಕಾಂತಿ ಮೈಕ್ರೋಗ್ರೀನ್ಸ್ (Suryakanthi Microgreens)',
    regionalNameHindi: 'सूरजमुखी माइक्रोग्रीन्स (Surajmukhi Microgreens)',
    images: [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'
    ],
    variants: [
      {
        id: 'var-301',
        label: '100 g tray',
        price: 110,
        mrp: 140,
        stockStatus: 'in_stock'
      }
    ],
    isActive: true,
    createdAt: '2026-07-22T08:45:00Z',
    updatedAt: '2026-07-24T16:00:00Z'
  },
  {
    id: 'prod-004',
    name: 'Sweet Vine-Ripe Red Cherry Tomatoes',
    slug: 'sweet-vine-ripe-red-cherry-tomatoes',
    category: 'Vegetables',
    shortIntro: 'Bite-sized cherry tomatoes bursting with intense natural sweetness and balanced acidity. Vine-ripened under natural sunlight for peak flavor.',
    highlights: [
      'High Brix sweetness rating for candy-like flavor',
      'Naturally rich in Lycopene and Vitamin C',
      'Vine-matured without artificial ripening agents',
      'Ideal for snacking, pasta sauces, and pan-roasting'
    ],
    description: 'Our red cherry tomatoes are grown on guided trellises in sunny greenhouse bays, allowing each cluster to absorb natural sunlight until perfectly ripe. The result is a vibrant crimson tomato with thin skin, firm flesh, and an explosive sweet flavor that elevates fresh caprese salads, roasted pastas, or quick appetizers. Every punnet is carefully hand-sorted to ensure uniform size and zero blemishes.',
    regionalNameKannada: 'ಸಿಹಿ ಚೆರ್ರಿ ಟೊಮೆಟೊ (Sihi Cherry Tomato)',
    regionalNameHindi: 'मीठा चेरी टमाटर (Meetha Cherry Tamatar)',
    images: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80'
    ],
    variants: [
      {
        id: 'var-401',
        label: '250 g punnet',
        price: 85,
        mrp: 110,
        stockStatus: 'in_stock'
      },
      {
        id: 'var-402',
        label: '500 g punnet',
        price: 160,
        mrp: 210,
        stockStatus: 'out_of_stock'
      }
    ],
    isActive: false,
    createdAt: '2026-07-23T14:10:00Z',
    updatedAt: '2026-07-25T11:00:00Z'
  }
];
