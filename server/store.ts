import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  Address,
  CartItem,
  Category,
  Collection,
  ContactMessage,
  DiscountCode,
  JournalPost,
  NewsletterSubscriber,
  Order,
  PaymentRecord,
  Product,
  StoreSettings,
} from '../src/types/store.ts';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface StoredSession {
  tokenHash: string;
  userId: string;
  role: 'customer' | 'admin';
  expiresAt: string;
}

export interface PasswordResetRecord {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

export interface WishlistRecord {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
}

export interface CartRecord {
  ownerKey: string; // 'user:<id>' or 'guest:<id>'
  items: CartItem[];
  updatedAt: string;
}

export interface AdminSecurityState {
  claimed: boolean;
  adminPasswordHash: string | null;
}

export interface StoreDatabase {
  users: StoredUser[];
  sessions: StoredSession[];
  passwordResets: PasswordResetRecord[];
  adminSecurity: AdminSecurityState;
  categories: Category[];
  collections: Collection[];
  products: Product[];
  addresses: Address[];
  wishlists: WishlistRecord[];
  carts: CartRecord[];
  orders: Order[];
  payments: PaymentRecord[];
  discountCodes: DiscountCode[];
  newsletterSubscribers: NewsletterSubscriber[];
  journalPosts: JournalPost[];
  contactMessages: ContactMessage[];
  settings: Omit<StoreSettings, 'paystackConfigured'>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'verdant_store.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const nowIso = () => new Date().toISOString();

function createInitialCategories(): Category[] {
  const specs: Array<{
    name: string;
    slug: string;
    parentGroup: Category['parentGroup'];
    description: string;
  }> = [
    { name: 'Sofas & Couches', slug: 'sofas-couches', parentGroup: 'Living Room', description: 'Tailored seating built for everyday lounging and architectural balance.' },
    { name: 'Armchairs', slug: 'armchairs', parentGroup: 'Living Room', description: 'Sculptural accent seating in solid hardwood and tactile upholstery.' },
    { name: 'Coffee Tables', slug: 'coffee-tables', parentGroup: 'Living Room', description: 'Grounded centrepieces crafted from timber, stone, and natural veneers.' },
    { name: 'TV Stands', slug: 'tv-stands', parentGroup: 'Living Room', description: 'Low-profile media consoles with concealed cable routing and warm grain.' },
    { name: 'Beds & Bed Frames', slug: 'beds-bed-frames', parentGroup: 'Bedroom', description: 'Upholstered and timber bed frames shaped for quiet evening rest.' },
    { name: 'Mattresses', slug: 'mattresses', parentGroup: 'Bedroom', description: 'Supportive multi-layer mattresses designed for breathable comfort.' },
    { name: 'Wardrobes', slug: 'wardrobes', parentGroup: 'Bedroom', description: 'Generous freestanding storage in refined matte and timber finishes.' },
    { name: 'Bedside Tables', slug: 'bedside-tables', parentGroup: 'Bedroom', description: 'Compact nightstands keeping bedside essentials within easy reach.' },
    { name: 'Dining Tables', slug: 'dining-tables', parentGroup: 'Dining & Kitchen', description: 'Gather-round dining tables proportioned for intimate and hosted meals.' },
    { name: 'Dining Chairs', slug: 'dining-chairs', parentGroup: 'Dining & Kitchen', description: 'Ergonomic timber and woven seating built for unhurried conversation.' },
    { name: 'Desks & Office Furniture', slug: 'desks-office-furniture', parentGroup: 'Workspace', description: 'Calm, uncluttered work desks and seating for focused home studios.' },
    { name: 'Lighting', slug: 'lighting', parentGroup: 'Home Accessories', description: 'Table lamps, floor lamps, and pendants casting warm ambient light.' },
    { name: 'Rugs & Carpets', slug: 'rugs-carpets', parentGroup: 'Home Accessories', description: 'Hand-woven textures that anchor seating zones and soften acoustics.' },
    { name: 'Mirrors', slug: 'mirrors', parentGroup: 'Home Accessories', description: 'Timber and brass-edged mirrors that open up natural daylight.' },
    { name: 'Vases & Decorative Objects', slug: 'vases-decorative-objects', parentGroup: 'Home Accessories', description: 'Stoneware vessels and sculpted objects for shelves and consoles.' },
    { name: 'Cushions & Throws', slug: 'cushions-throws', parentGroup: 'Home Accessories', description: 'Tactile linen cushions and wool-blend throws in muted botanical tones.' },
    { name: 'Storage & Shelving', slug: 'storage-shelving', parentGroup: 'Living Room', description: 'Open bookcases, sideboards, and modular shelving systems.' },
  ];

  return specs.map((item, idx) => ({
    id: `cat_${idx + 1}`,
    name: item.name,
    slug: item.slug,
    parentGroup: item.parentGroup,
    description: item.description,
    sortOrder: idx + 1,
  }));
}

function createInitialCollections(): Collection[] {
  return [
    {
      id: 'col_living',
      name: 'Living Room Furniture',
      slug: 'living-room-furniture',
      description: 'Tailored sofas, sculptural armchairs, and grounded timber tables built for conversation.',
      imageUrl: '/src/assets/images/category_living_room_1795462775918.jpg',
      featured: true,
      categoryIds: ['cat_1', 'cat_2', 'cat_3', 'cat_4', 'cat_17'],
      sortOrder: 1,
    },
    {
      id: 'col_bedroom',
      name: 'Bedroom Essentials',
      slug: 'bedroom-essentials',
      description: 'Restful upholstered beds, bedside tables, and tactile layers for quiet evenings.',
      imageUrl: '/src/assets/images/category_bedroom_1795462775759.jpg',
      featured: true,
      categoryIds: ['cat_5', 'cat_6', 'cat_7', 'cat_8'],
      sortOrder: 2,
    },
    {
      id: 'col_dining',
      name: 'Dining & Kitchen',
      slug: 'dining-kitchen',
      description: 'Solid oak tables and woven dining chairs made for shared meals and unhurried hosting.',
      imageUrl: '/src/assets/images/collection_dining_1795462776648.jpg',
      featured: true,
      categoryIds: ['cat_9', 'cat_10'],
      sortOrder: 3,
    },
    {
      id: 'col_accessories',
      name: 'Decorative Accessories',
      slug: 'decorative-accessories',
      description: 'Ceramic vessels, warm ambient lighting, mirrors, and woven textiles that complete a room.',
      imageUrl: '/src/assets/images/category_accessories_1795462776866.jpg',
      featured: true,
      categoryIds: ['cat_12', 'cat_13', 'cat_14', 'cat_15', 'cat_16'],
      sortOrder: 4,
    },
  ];
}

function createInitialDraftProducts(categories: Category[]): Product[] {
  const createdAt = nowIso();
  const catByName = new Map(categories.map((c) => [c.name, c]));

  const draftSpecs: Array<{
    name: string;
    slug: string;
    categoryName: string;
    collectionIds: string[];
    description: string;
    price: number;
    originalPrice: number | null;
    dimensions: string;
    materials: string[];
    colors: string[];
    sku: string;
    tags: string[];
    featured: boolean;
    variants: Array<{ label: string; color: string; colorHex: string; size: string; sku: string; priceDelta: number }>;
  }> = [
    {
      name: 'The Haven Three-Seater Sofa',
      slug: 'the-haven-three-seater-sofa',
      categoryName: 'Sofas & Couches',
      collectionIds: ['col_living'],
      description:
        'Proportioned with deep feather-wrapped seat cushions and tailored bench upholstery, The Haven Three-Seater Sofa anchors contemporary living spaces with quiet architectural poise and kiln-dried hardwood support.',
      price: 985000,
      originalPrice: null,
      dimensions: '224 cm W × 94 cm D × 78 cm H (Seat height: 43 cm)',
      materials: ['Kiln-dried European Oak', 'Belgian Linen-Cotton Blend', 'High-resilience Foam Core'],
      colors: ['Oat Linen', 'Sage Olive', 'Warm Charcoal'],
      sku: 'VL-SOF-001',
      tags: ['living-room', 'three-seater', 'linen', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Oat Linen / 224 cm', color: 'Oat Linen', colorHex: '#DDD6C7', size: '224 cm', sku: 'VL-SOF-001-OAT', priceDelta: 0 },
        { label: 'Sage Olive / 224 cm', color: 'Sage Olive', colorHex: '#6E7C69', size: '224 cm', sku: 'VL-SOF-001-SAG', priceDelta: 25000 },
      ],
    },
    {
      name: 'The Alder Accent Chair',
      slug: 'the-alder-accent-chair',
      categoryName: 'Armchairs',
      collectionIds: ['col_living'],
      description:
        'Shaped with gently curved solid walnut armrests and a generously pitched bouclé seat, The Alder Accent Chair offers relaxed reading posture while maintaining a light visual footprint.',
      price: 420000,
      originalPrice: null,
      dimensions: '74 cm W × 80 cm D × 76 cm H',
      materials: ['Solid Smoked Walnut', 'Textured Wool Bouclé', 'Brass Joinery Pins'],
      colors: ['Cream Bouclé', 'Forest Moss'],
      sku: 'VL-ARM-002',
      tags: ['armchair', 'reading-chair', 'walnut', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Cream Bouclé / Walnut', color: 'Cream Bouclé', colorHex: '#EFECE3', size: 'Standard', sku: 'VL-ARM-002-CRM', priceDelta: 0 },
        { label: 'Forest Moss / Walnut', color: 'Forest Moss', colorHex: '#34483B', size: 'Standard', sku: 'VL-ARM-002-FOR', priceDelta: 15000 },
      ],
    },
    {
      name: 'The Rowan Round Coffee Table',
      slug: 'the-rowan-round-coffee-table',
      categoryName: 'Coffee Tables',
      collectionIds: ['col_living'],
      description:
        'A low architectural plinth coffee table turned from FSC-certified oak veneer over solid timber framing. Its softened bullnose perimeter encourages natural flow through living spaces.',
      price: 345000,
      originalPrice: null,
      dimensions: '95 cm Diameter × 36 cm H',
      materials: ['Natural White Oak', 'Matte Water-Based Lacquer'],
      colors: ['Natural Oak', 'Smoked Ash'],
      sku: 'VL-TBL-003',
      tags: ['coffee-table', 'oak', 'living-room', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Natural Oak / 95 cm', color: 'Natural Oak', colorHex: '#C4A277', size: '95 cm', sku: 'VL-TBL-003-OAK', priceDelta: 0 },
        { label: 'Smoked Ash / 95 cm', color: 'Smoked Ash', colorHex: '#5D4C3E', size: '95 cm', sku: 'VL-TBL-003-ASH', priceDelta: 20000 },
      ],
    },
    {
      name: 'The Solace Upholstered Bed',
      slug: 'the-solace-upholstered-bed',
      categoryName: 'Beds & Bed Frames',
      collectionIds: ['col_bedroom'],
      description:
        'Designed as a serene bedroom retreat, The Solace Upholstered Bed pairs a gently padded linen headboard with recessed timber slats for silent, breathable mattress support.',
      price: 860000,
      originalPrice: null,
      dimensions: 'Queen: 172 cm W × 214 cm L × 106 cm H | King: 202 cm W × 214 cm L × 106 cm H',
      materials: ['Woven Linen Upholstery', 'Solid Hardwood Frame', 'Sprung Beech Slats'],
      colors: ['Warm Ivory', 'Soft Sage'],
      sku: 'VL-BED-004',
      tags: ['bedroom', 'bed-frame', 'upholstered', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Warm Ivory / Queen (5×6 ft)', color: 'Warm Ivory', colorHex: '#EAE5D8', size: 'Queen', sku: 'VL-BED-004-IVQ', priceDelta: 0 },
        { label: 'Warm Ivory / King (6×6 ft)', color: 'Warm Ivory', colorHex: '#EAE5D8', size: 'King', sku: 'VL-BED-004-IVK', priceDelta: 95000 },
      ],
    },
    {
      name: 'The Elara Bedside Table',
      slug: 'the-elara-bedside-table',
      categoryName: 'Bedside Tables',
      collectionIds: ['col_bedroom'],
      description:
        'A compact nightstand combining a soft-close walnut drawer with an open lower shelf for hardcover books and evening essentials.',
      price: 215000,
      originalPrice: null,
      dimensions: '50 cm W × 42 cm D × 54 cm H',
      materials: ['American Walnut Veneer', 'Solid Timber Legs', 'Concealed Soft-Close Runners'],
      colors: ['Warm Walnut', 'Natural Oak'],
      sku: 'VL-BST-005',
      tags: ['bedroom', 'nightstand', 'walnut', 'draft-record'],
      featured: false,
      variants: [
        { label: 'Warm Walnut', color: 'Warm Walnut', colorHex: '#6F4E37', size: '50 cm', sku: 'VL-BST-005-WAL', priceDelta: 0 },
      ],
    },
    {
      name: 'The Camden Dining Table',
      slug: 'the-camden-dining-table',
      categoryName: 'Dining Tables',
      collectionIds: ['col_dining'],
      description:
        'Crafted for shared meals and unhurried gatherings, The Camden Dining Table seats six to eight comfortably on solid tapered oak legs with a chamfered tabletop edge.',
      price: 920000,
      originalPrice: null,
      dimensions: '200 cm L × 95 cm W × 75 cm H',
      materials: ['Solid European Oak', 'Hand-Rubbed Hardwax Oil'],
      colors: ['Natural Oak', 'Warm Chestnut'],
      sku: 'VL-DIN-006',
      tags: ['dining', 'solid-oak', 'six-seater', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Natural Oak / 200 cm', color: 'Natural Oak', colorHex: '#C4A277', size: '200 cm', sku: 'VL-DIN-006-OAK', priceDelta: 0 },
        { label: 'Natural Oak / 240 cm', color: 'Natural Oak', colorHex: '#C4A277', size: '240 cm', sku: 'VL-DIN-006-240', priceDelta: 140000 },
      ],
    },
    {
      name: 'The Ellis Dining Chair',
      slug: 'the-ellis-dining-chair',
      categoryName: 'Dining Chairs',
      collectionIds: ['col_dining'],
      description:
        'Steam-bent timber backrest paired with a hand-woven Danish paper cord seat for breathable, enduring comfort around the dining table.',
      price: 165000,
      originalPrice: null,
      dimensions: '52 cm W × 50 cm D × 79 cm H (Seat height: 46 cm)',
      materials: ['Solid Ash Timber', 'Natural Paper Cord Seat'],
      colors: ['Natural Ash', 'Ebonized Charcoal'],
      sku: 'VL-CHR-007',
      tags: ['dining-chair', 'woven', 'ash', 'draft-record'],
      featured: false,
      variants: [
        { label: 'Natural Ash / Paper Cord', color: 'Natural Ash', colorHex: '#D2B995', size: 'Standard', sku: 'VL-CHR-007-ASH', priceDelta: 0 },
        { label: 'Ebonized Charcoal', color: 'Ebonized Charcoal', colorHex: '#292D29', size: 'Standard', sku: 'VL-CHR-007-CHR', priceDelta: 10000 },
      ],
    },
    {
      name: 'The Forma Minimalist Desk',
      slug: 'the-forma-minimalist-desk',
      categoryName: 'Desks & Office Furniture',
      collectionIds: ['col_living'],
      description:
        'A calm, clutter-free writing and studio desk featuring an integrated rear cable channel and two shallow utility drawers finished in matte oak.',
      price: 390000,
      originalPrice: null,
      dimensions: '140 cm W × 65 cm D × 74 cm H',
      materials: ['White Oak Veneer', 'Powder-Coated Steel Underframe'],
      colors: ['White Oak', 'Forest Slate'],
      sku: 'VL-DSK-008',
      tags: ['home-office', 'desk', 'workspace', 'draft-record'],
      featured: false,
      variants: [
        { label: 'White Oak / 140 cm', color: 'White Oak', colorHex: '#C9AE87', size: '140 cm', sku: 'VL-DSK-008-OAK', priceDelta: 0 },
      ],
    },
    {
      name: 'The Sora Ceramic Vase',
      slug: 'the-sora-ceramic-vase',
      categoryName: 'Vases & Decorative Objects',
      collectionIds: ['col_accessories'],
      description:
        'Wheel-thrown stoneware vessel finished in a tactile matte mineral glaze, suited for dried botanicals or standalone shelf styling.',
      price: 48000,
      originalPrice: null,
      dimensions: '18 cm Diameter × 26 cm H',
      materials: ['Glazed Stoneware Ceramic'],
      colors: ['Chalk Clay', 'Speckled Umber'],
      sku: 'VL-DEC-009',
      tags: ['ceramic', 'vase', 'decor', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Chalk Clay / 26 cm', color: 'Chalk Clay', colorHex: '#EBE6DC', size: '26 cm', sku: 'VL-DEC-009-CHK', priceDelta: 0 },
        { label: 'Speckled Umber / 26 cm', color: 'Speckled Umber', colorHex: '#9C8D7B', size: '26 cm', sku: 'VL-DEC-009-UMB', priceDelta: 0 },
      ],
    },
    {
      name: 'The Luma Table Lamp',
      slug: 'the-luma-table-lamp',
      categoryName: 'Lighting',
      collectionIds: ['col_accessories'],
      description:
        'Turned brushed brass base topped with a woven oatmeal linen drum shade that diffuses warm, glare-free illumination across bedside tables and consoles.',
      price: 118000,
      originalPrice: null,
      dimensions: '32 cm Shade Diameter × 48 cm Total H',
      materials: ['Brushed Solid Brass', 'Natural Woven Linen Shade', 'Braided Fabric Cord'],
      colors: ['Brushed Brass & Oatmeal'],
      sku: 'VL-LGT-010',
      tags: ['lighting', 'table-lamp', 'brass', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Brushed Brass / Oatmeal Linen', color: 'Brushed Brass', colorHex: '#B18A52', size: '48 cm', sku: 'VL-LGT-010-BRS', priceDelta: 0 },
      ],
    },
    {
      name: 'The Woven Haven Area Rug',
      slug: 'the-woven-haven-area-rug',
      categoryName: 'Rugs & Carpets',
      collectionIds: ['col_accessories', 'col_living'],
      description:
        'Hand-loomed flatweave wool and cotton area rug featuring subtle tonal ribbing to ground living rooms and dining suites with soft underfoot warmth.',
      price: 275000,
      originalPrice: null,
      dimensions: '200 cm × 300 cm (Low 8 mm pile)',
      materials: ['80% Undyed New Zealand Wool', '20% Organic Cotton Warp'],
      colors: ['Natural Jute Tone', 'Muted Sage'],
      sku: 'VL-RUG-011',
      tags: ['rug', 'textile', 'living-room', 'draft-record'],
      featured: false,
      variants: [
        { label: 'Natural Tone / 200 × 300 cm', color: 'Natural Tone', colorHex: '#C7B89E', size: '200×300 cm', sku: 'VL-RUG-011-NAT', priceDelta: 0 },
        { label: 'Muted Sage / 200 × 300 cm', color: 'Muted Sage', colorHex: '#8E9B87', size: '200×300 cm', sku: 'VL-RUG-011-SAG', priceDelta: 15000 },
      ],
    },
    {
      name: 'The Arlo Wall Mirror',
      slug: 'the-arlo-wall-mirror',
      categoryName: 'Mirrors',
      collectionIds: ['col_accessories'],
      description:
        'Clean rectangular wall mirror framed in mitered solid white oak with concealed French cleat hardware for vertical or horizontal mounting.',
      price: 185000,
      originalPrice: null,
      dimensions: '75 cm W × 110 cm H × 3.5 cm D',
      materials: ['Solid White Oak Frame', 'Low-Iron Silvered Mirror Glass'],
      colors: ['Natural Oak', 'Matte Brass Trim'],
      sku: 'VL-MIR-012',
      tags: ['mirror', 'wall-decor', 'oak', 'draft-record'],
      featured: true,
      variants: [
        { label: 'Natural Oak / 75 × 110 cm', color: 'Natural Oak', colorHex: '#C4A277', size: '75×110 cm', sku: 'VL-MIR-012-OAK', priceDelta: 0 },
      ],
    },
  ];

  return draftSpecs.map((spec, index) => {
    const category = catByName.get(spec.categoryName) ?? categories[0];
    return {
      id: `prod_${index + 1}`,
      name: spec.name,
      slug: spec.slug,
      categoryId: category.id,
      categoryName: category.name,
      collectionIds: spec.collectionIds,
      description: spec.description,
      images: [], // Intentionally empty until administrator uploads & verifies authentic product photography
      price: spec.price,
      originalPrice: spec.originalPrice,
      variants: spec.variants.map((v, vIdx) => ({
        id: `var_${index + 1}_${vIdx + 1}`,
        label: v.label,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        sku: v.sku,
        priceDelta: v.priceDelta,
        stockQuantity: 0, // Unverified draft inventory
      })),
      dimensions: spec.dimensions,
      materials: spec.materials,
      colors: spec.colors,
      stockQuantity: 0, // Set as unverified draft until administrator verifies stock
      availabilityStatus: 'draft_unverified',
      sku: spec.sku,
      tags: spec.tags,
      featured: spec.featured,
      status: 'draft', // Unpublished draft per Section 5 rules
      verified: false,
      salesCount: 0,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function createInitialJournalPosts(): JournalPost[] {
  return [
    {
      id: 'post_1',
      title: 'Proportion, Daylight, and Calm: Designing an Everyday Living Room',
      slug: 'proportion-daylight-and-calm-living-room',
      category: 'Interior Architecture',
      excerpt: 'How leaving breathing room around anchor seating transforms the flow and warmth of modern apartments.',
      content:
        'A calm living room begins before a single cushion is placed. Start by mapping natural daylight paths and circulation corridors of at least 80 cm around seating edges. Grounding the room with a low timber coffee table and tactile natural fabrics—linen, bouclé, and brushed wool—allows light to soften across surfaces from morning through dusk.',
      imageUrl: '/src/assets/images/hero_verdant_living_1795462775962.jpg',
      publishedAt: '2026-10-18',
      readTime: '4 min read',
      published: true,
    },
    {
      id: 'post_2',
      title: 'Caring for Solid Oak, Walnut, and Matte Stoneware at Home',
      slug: 'caring-for-solid-oak-walnut-and-stoneware',
      category: 'Materials & Craft',
      excerpt: 'Practical routines to preserve timber grain, brass patinas, and hand-glazed ceramic surfaces for decades.',
      content:
        'Natural timber responds gracefully to lived-in homes when treated gently. Dust weekly with a dry microfibre cloth, keep direct afternoon heat away from oiled tabletops, and refresh matte oak annually with a thin coat of plant-based wax. Unlacquered brass accents deepen gently with touch, adding quiet character over years of use.',
      imageUrl: '/src/assets/images/collection_dining_1795462776648.jpg',
      publishedAt: '2026-11-02',
      readTime: '3 min read',
      published: true,
    },
    {
      id: 'post_3',
      title: 'Layering Warm Ambient Light for Restful Bedrooms',
      slug: 'layering-warm-ambient-light-for-bedrooms',
      category: 'Lighting Notes',
      excerpt: 'Replacing harsh overhead glare with linen-shaded bedside lamps and tactile evening palettes.',
      content:
        'Bedrooms feel most restorative when illumination sits at eye level or below after sunset. Pair 2700K warm LED bulbs inside woven linen shades with muted sage bedding and matte timber bedside tables to signal a slower evening rhythm.',
      imageUrl: '/src/assets/images/category_bedroom_1795462775759.jpg',
      publishedAt: '2026-11-14',
      readTime: '3 min read',
      published: true,
    },
  ];
}

function createInitialDatabase(): StoreDatabase {
  const categories = createInitialCategories();
  return {
    users: [],
    sessions: [],
    passwordResets: [],
    adminSecurity: {
      claimed: false,
      adminPasswordHash: null,
    },
    categories,
    collections: createInitialCollections(),
    products: createInitialDraftProducts(categories),
    addresses: [],
    wishlists: [],
    carts: [],
    orders: [],
    payments: [],
    discountCodes: [],
    newsletterSubscribers: [],
    journalPosts: createInitialJournalPosts(),
    contactMessages: [],
    settings: {
      storeName: 'Verdant Living',
      currency: 'NGN',
      deliveryFee: 15000,
      freeDeliveryThreshold: null,
      taxRatePercent: 7.5,
      deliveryPromiseText: '',
      deliveryPolicySummary: 'Scheduled white-glove and courier dispatch across Lagos, Abuja, and major Nigerian cities once orders are verified.',
      returnPolicySummary: 'Unused items in original packaging may be returned or exchanged within 14 days of delivery.',
      supportEmail: 'concierge@verdantliving.ng',
      supportPhone: '+234 800 837 3268',
      showroomAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
      heroHeadline: 'Make Room for Better Living.',
      heroSubtext:
        'Thoughtfully selected furniture and home essentials designed to bring comfort, character and timeless style into your everyday spaces.',
      heroImageUrl: '/src/assets/images/hero_verdant_living_1795462775962.jpg',
      storyHeadline: 'Thoughtful Pieces. Beautifully Lived In.',
      storyText:
        'At Verdant Living, we believe the spaces we inhabit should reflect the way we want to live. We bring together carefully selected furniture and home essentials that balance comfort, function and timeless design.',
      storyImageUrl: '/src/assets/images/category_accessories_1795462776866.jpg',
    },
  };
}

let cachedDb: StoreDatabase | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function getDb(): Promise<StoreDatabase> {
  if (cachedDb) return cachedDb;
  await ensureDirs();
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as StoreDatabase;
    cachedDb = parsed;
    return cachedDb;
  } catch {
    const initial = createInitialDatabase();
    cachedDb = initial;
    await persistDb(initial);
    return cachedDb;
  }
}

async function persistDb(db: StoreDatabase): Promise<void> {
  await ensureDirs();
  const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  await fs.rename(tmpFile, DB_FILE);
}

export async function mutateDb<T>(mutator: (db: StoreDatabase) => Promise<T> | T): Promise<T> {
  let result!: T;
  const run = writeChain.then(async () => {
    const db = await getDb();
    result = await mutator(db);
    await persistDb(db);
  });
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  await run;
  return result;
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}
