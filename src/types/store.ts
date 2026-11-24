export type ProductStatus = 'draft' | 'published' | 'archived';

export type AvailabilityStatus =
  | 'draft_unverified'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'made_to_order';

export type OrderStatus =
  | 'Pending Payment'
  | 'Paid'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus = 'unpaid' | 'pending' | 'verified' | 'failed' | 'refunded';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentGroup: 'Living Room' | 'Bedroom' | 'Dining & Kitchen' | 'Home Accessories' | 'Workspace';
  description: string;
  sortOrder: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  featured: boolean;
  categoryIds: string[];
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  priceDelta: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  collectionIds: string[];
  description: string;
  images: string[];
  price: number;
  originalPrice: number | null;
  variants: ProductVariant[];
  dimensions: string;
  materials: string[];
  colors: string[];
  stockQuantity: number;
  availabilityStatus: AvailabilityStatus;
  sku: string;
  tags: string[];
  featured: boolean;
  status: ProductStatus;
  verified: boolean;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  quantity: number;
}

export interface HydratedCartItem extends CartItem {
  product: Product;
  unitPrice: number;
  maxStock: number;
  lineTotal: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  sku: string;
  variantId: string | null;
  variantLabel: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  note: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  city: string;
  state: string;
  postalCode: string;
  deliveryInstructions: string;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  discountAmount: number;
  discountCode: string | null;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  idempotencyKey: string;
  items: OrderItem[];
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  gateway: 'paystack';
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayMessage: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderAmount: number;
  active: boolean;
  usageCount: number;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  consent: boolean;
  subscribedAt: string;
}

export interface JournalPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  publishedAt: string;
  readTime: string;
  published: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'reviewed';
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  currency: string;
  deliveryFee: number;
  freeDeliveryThreshold: number | null;
  taxRatePercent: number;
  deliveryPromiseText: string;
  deliveryPolicySummary: string;
  returnPolicySummary: string;
  supportEmail: string;
  supportPhone: string;
  showroomAddress: string;
  heroHeadline: string;
  heroSubtext: string;
  heroImageUrl: string;
  storyHeadline: string;
  storyText: string;
  storyImageUrl: string;
  paystackConfigured: boolean;
}
