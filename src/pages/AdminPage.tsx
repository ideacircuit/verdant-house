import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Eye,
  Lock,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Tag,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency, formatDate } from '../lib/format.ts';
import type {
  Category,
  Collection,
  ContactMessage,
  DiscountCode,
  JournalPost,
  NewsletterSubscriber,
  Order,
  OrderStatus,
  Product,
  PublicUser,
  StoreSettings,
} from '../types/store.ts';
import { ResilientImage } from '../components/BrandMark.tsx';

interface AdminStatusResponse {
  envConfigured: boolean;
  claimed: boolean;
  authenticated: boolean;
}

interface AdminMetrics {
  totalOrders: number;
  verifiedRevenue: number;
  pendingOrders: number;
  publishedProducts: number;
  draftProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  subscriberCount: number;
  unreadMessages: number;
}

const STUDIO_IMAGES = [
  { label: 'Living Room Sofa & Oak Table', url: '/src/assets/images/hero_verdant_living_1795462775962.jpg' },
  { label: 'Walnut Accent Chair & Coffee Table', url: '/src/assets/images/category_living_room_1795462775918.jpg' },
  { label: 'Upholstered Bed & Bedside Table', url: '/src/assets/images/category_bedroom_1795462775759.jpg' },
  { label: 'Solid Oak Dining Table & Chairs', url: '/src/assets/images/collection_dining_1795462776648.jpg' },
  { label: 'Vases, Brass Lamp & Wall Mirror', url: '/src/assets/images/category_accessories_1795462776866.jpg' },
];

export function AdminPage() {
  usePageMeta('Admin Studio — Verdant Living', 'Verdant Living store administration dashboard.');
  const { adminToken, setAdminAuth, refreshBootstrap, showToast } = useStore();

  const [status, setStatus] = useState<AdminStatusResponse | null>(null);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [tab, setTab] = useState<
    'overview' | 'products' | 'orders' | 'categories' | 'customers' | 'settings'
  >('overview');

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Array<PublicUser & { orderCount: number; totalSpent: number }>>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [journalPosts, setJournalPosts] = useState<JournalPost[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [productFilter, setProductFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState<Category['parentGroup']>('Living Room');
  const [newDiscountCode, setNewDiscountCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [newDiscountValue, setNewDiscountValue] = useState('10');
  const [newDiscountMin, setNewDiscountMin] = useState('0');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const checkAdminStatus = useCallback(async () => {
    const headers: Record<string, string> = {};
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    const res = await fetch('/api/admin/status', { headers });
    if (res.ok) {
      setStatus(await res.json());
    }
  }, [adminToken]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  const loadAdminData = useCallback(async () => {
    if (!adminToken) return;
    const headers = { Authorization: `Bearer ${adminToken}` };

    const [ovRes, prRes, ordRes, custRes, dcRes, subRes, msgRes, jRes, setRes] =
      await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/products', { headers }),
        fetch('/api/admin/orders', { headers }),
        fetch('/api/admin/customers', { headers }),
        fetch('/api/admin/discounts', { headers }),
        fetch('/api/admin/subscribers', { headers }),
        fetch('/api/admin/messages', { headers }),
        fetch('/api/admin/journal', { headers }),
        fetch('/api/admin/settings', { headers }),
      ]);

    if (ovRes.ok) {
      const d = await ovRes.json();
      setMetrics(d.metrics);
      setRecentOrders(d.recentOrders ?? []);
      setPaystackConfigured(Boolean(d.paystackConfigured));
    }
    if (prRes.ok) {
      const d = await prRes.json();
      setProducts(d.products ?? []);
      setCategories(d.categories ?? []);
      setCollections(d.collections ?? []);
    }
    if (ordRes.ok) {
      const d = await ordRes.json();
      setOrders(d.orders ?? []);
    }
    if (custRes.ok) {
      const d = await custRes.json();
      setCustomers(d.customers ?? []);
    }
    if (dcRes.ok) {
      const d = await dcRes.json();
      setDiscounts(d.discounts ?? []);
    }
    if (subRes.ok) {
      const d = await subRes.json();
      setSubscribers(d.subscribers ?? []);
    }
    if (msgRes.ok) {
      const d = await msgRes.json();
      setMessages(d.messages ?? []);
    }
    if (jRes.ok) {
      const d = await jRes.json();
      setJournalPosts(d.posts ?? []);
    }
    if (setRes.ok) {
      const d = await setRes.json();
      setSettings(d.settings);
    }
  }, [adminToken]);

  useEffect(() => {
    if (status?.authenticated && adminToken) {
      loadAdminData();
    }
  }, [status?.authenticated, adminToken, loadAdminData]);

  const handleClaimOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const needsClaim = status && !status.envConfigured && !status.claimed;
      const endpoint = needsClaim ? '/api/admin/claim' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      setAdminAuth(data.token);
      setPasscode('');
      showToast('Signed in to Verdant Living Admin Studio.', 'success');
    } finally {
      setAuthBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center text-sm text-[#292D29]/60">
        Checking administrator access...
      </div>
    );
  }

  if (!status.authenticated || !adminToken) {
    const isFirstRunClaim = !status.envConfigured && !status.claimed;
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E8EDE5] text-[#34483B] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
                Store Administration
              </p>
              <h1 className="font-serif text-2xl font-semibold text-[#292D29]">
                {isFirstRunClaim ? 'Claim Administrator Access' : 'Admin Studio Sign In'}
              </h1>
            </div>
          </div>

          <p className="text-sm text-[#292D29]/75 leading-relaxed">
            {isFirstRunClaim
              ? 'No ADMIN_PASSCODE environment secret is configured yet. Choose a strong administrator passcode (8+ characters) to lock and manage your Verdant Living store.'
              : 'Enter your store administrator passcode to manage catalogue drafts, inventory, orders, and store settings.'}
          </p>

          {authError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {authError}
            </div>
          )}

          <form onSubmit={handleClaimOrLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                Administrator Passcode
              </label>
              <input
                type="password"
                required
                minLength={isFirstRunClaim ? 8 : 1}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder={isFirstRunClaim ? 'Create 8+ character passcode' : 'Enter passcode'}
                className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
              />
            </div>
            <button
              type="submit"
              disabled={authBusy}
              className="w-full h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F]"
            >
              {authBusy
                ? 'Verifying...'
                : isFirstRunClaim
                ? 'Set Admin Passcode & Enter'
                : 'Sign In to Admin Studio'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const adminFetch = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
        ...(options.headers || {}),
      },
    });
    return res;
  };

  const handleQuickPublishToggle = async (p: Product) => {
    const nextStatus = p.status === 'published' ? 'draft' : 'published';
    const nextStock =
      nextStatus === 'published' && p.stockQuantity === 0 ? 5 : p.stockQuantity;
    const res = await adminFetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: nextStatus,
        verified: nextStatus === 'published',
        stockQuantity: nextStock,
      }),
    });
    if (res.ok) {
      await loadAdminData();
      await refreshBootstrap();
      showToast(
        nextStatus === 'published'
          ? `${p.name} verified & published to storefront.`
          : `${p.name} moved back to draft.`,
        'success'
      );
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    const url = isNewProduct
      ? '/api/admin/products'
      : `/api/admin/products/${editingProduct.id}`;
    const method = isNewProduct ? 'POST' : 'PUT';

    const res = await adminFetch(url, {
      method,
      body: JSON.stringify(editingProduct),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not save product.', 'error');
      return;
    }
    setEditingProduct(null);
    await loadAdminData();
    await refreshBootstrap();
    showToast('Product saved.', 'success');
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadAdminData();
      await refreshBootstrap();
      showToast('Product removed.', 'success');
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const res = await adminFetch('/api/admin/uploads', {
          method: 'POST',
          body: JSON.stringify({ dataUrl }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setEditingProduct((prev) =>
            prev ? { ...prev, images: [...(prev.images ?? []), data.url] } : prev
          );
          showToast('Product photograph uploaded.', 'success');
        } else {
          showToast(data.error || 'Upload failed.', 'error');
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      await loadAdminData();
      showToast(`Order marked as ${nextStatus}.`, 'success');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const res = await adminFetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      await refreshBootstrap();
      showToast('Store settings saved.', 'success');
    }
  };

  const filteredProducts = products.filter((p) =>
    productFilter === 'all' ? true : p.status === productFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D29]/10 pb-6 mb-8">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-1">
            Verdant Living Management
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#292D29]">Admin Studio</h1>
        </div>
        <button
          type="button"
          onClick={() => setAdminAuth(null)}
          className="h-10 px-4 rounded-lg border border-[#292D29]/20 text-sm font-medium self-start"
        >
          Lock Admin Session
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'products', label: 'Products & Inventory', icon: Package },
          { id: 'orders', label: 'Orders & Payments', icon: ShoppingCart },
          { id: 'categories', label: 'Categories & Collections', icon: Tag },
          { id: 'customers', label: 'Customers, Discounts & Journal', icon: Users },
          { id: 'settings', label: 'Store Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id as typeof tab)}
            className={`h-10 px-4 rounded-lg text-sm font-medium inline-flex items-center gap-2 transition-colors ${
              tab === item.id
                ? 'bg-[#34483B] text-[#F8F7F2]'
                : 'bg-[#E8EDE5]/70 text-[#292D29] hover:bg-[#E8EDE5]'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && metrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Orders', value: String(metrics.totalOrders) },
              { label: 'Verified Revenue', value: formatCurrency(metrics.verifiedRevenue) },
              { label: 'Pending Orders', value: String(metrics.pendingOrders) },
              { label: 'Published Products', value: `${metrics.publishedProducts} (${metrics.draftProducts} drafts)` },
              { label: 'Low-Stock Published', value: String(metrics.lowStockProducts) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl border border-[#292D29]/10 p-5">
                <p className="text-xs text-[#292D29]/60 mb-1">{kpi.label}</p>
                <p className="font-serif text-2xl font-semibold text-[#292D29] tabular-nums">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {!paystackConfigured && (
            <div className="rounded-xl bg-[#E8EDE5] border border-[#B18A52]/40 p-4 text-sm text-[#292D29]">
              <strong>Paystack Gateway Notice:</strong> Set{' '}
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">PAYSTACK_SECRET_KEY</code>{' '}
              in Settings &rarr; Secrets to enable live/test Paystack checkout initialization and webhook verification.
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#292D29]/10 p-6">
            <h2 className="font-serif text-2xl font-semibold mb-4">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-[#292D29]/65">No orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-[#292D29]/60 border-b border-[#292D29]/10">
                    <tr>
                      <th className="py-2.5 pr-4">Order</th>
                      <th className="py-2.5 pr-4">Customer</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 pr-4">Payment</th>
                      <th className="py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#292D29]/8">
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 pr-4 font-mono text-xs">{o.orderNumber}</td>
                        <td className="py-3 pr-4">{o.customerName}</td>
                        <td className="py-3 pr-4">{o.status}</td>
                        <td className="py-3 pr-4 uppercase text-xs">{o.paymentStatus}</td>
                        <td className="py-3 text-right font-semibold tabular-nums">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {tab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setProductFilter(f)}
                  className={`h-9 px-3.5 rounded-lg text-xs font-medium capitalize ${
                    productFilter === f
                      ? 'bg-[#34483B] text-[#F8F7F2]'
                      : 'bg-white border border-[#292D29]/15 text-[#292D29]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsNewProduct(true);
                setEditingProduct({
                  name: '',
                  categoryId: categories[0]?.id || '',
                  collectionIds: ['col_living'],
                  description: '',
                  images: [],
                  price: 150000,
                  originalPrice: null,
                  dimensions: '',
                  materials: [],
                  colors: [],
                  stockQuantity: 0,
                  sku: `VL-NEW-${products.length + 1}`,
                  tags: [],
                  featured: false,
                  status: 'draft',
                  variants: [],
                });
              }}
              className="h-10 px-4 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#292D29]/10 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-[#292D29]/60 border-b border-[#292D29]/10 bg-[#E8EDE5]/40">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292D29]/8">
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded bg-[#E8EDE5] overflow-hidden shrink-0">
                          <ResilientImage
                            src={p.images[0]}
                            alt={p.name}
                            fallbackName={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium text-[#292D29]">{p.name}</p>
                          <p className="font-mono text-xs text-[#292D29]/55">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#292D29]/75">{p.categoryName}</td>
                    <td className="py-3.5 px-4 font-medium tabular-nums">{formatCurrency(p.price)}</td>
                    <td className="py-3.5 px-4 tabular-nums">{p.stockQuantity}</td>
                    <td className="py-3.5 px-4 capitalize text-xs font-semibold">
                      <span className={p.status === 'published' ? 'text-[#34483B]' : 'text-[#B18A52]'}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickPublishToggle(p)}
                          className="h-8 px-3 rounded border border-[#34483B]/40 text-xs font-medium text-[#34483B] hover:bg-[#E8EDE5]"
                        >
                          {p.status === 'published' ? 'Unpublish' : 'Verify & Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewProduct(false);
                            setEditingProduct(p);
                          }}
                          aria-label={`Edit ${p.name}`}
                          className="p-1.5 rounded hover:bg-[#E8EDE5]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          aria-label={`Delete ${p.name}`}
                          className="p-1.5 rounded hover:bg-red-50 text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT EDITOR MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-[#292D29]/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-[#F8F7F2] rounded-2xl border border-[#292D29]/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#292D29]/10 pb-3">
              <h2 className="font-serif text-2xl font-semibold">
                {isNewProduct ? 'Add Catalogue Product' : `Edit ${editingProduct.name}`}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="text-sm text-[#292D29]/70 hover:text-[#292D29]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={editingProduct.categoryId || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">SKU</label>
                <input
                  type="text"
                  required
                  value={editingProduct.sku || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Selling Price (₦)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editingProduct.price ?? 0}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Original Price (Optional ₦)</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.originalPrice ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      originalPrice: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stockQuantity ?? 0}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, stockQuantity: Number(e.target.value) })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Publication Status</label>
                <select
                  value={editingProduct.status || 'draft'}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      status: e.target.value as Product['status'],
                    })
                  }
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20"
                >
                  <option value="draft">Unpublished Draft</option>
                  <option value="published">Published (Live on Storefront)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Dimensions</label>
                <input
                  type="text"
                  value={editingProduct.dimensions || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, dimensions: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/20"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-3 rounded-lg bg-white border border-[#292D29]/20"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <label className="block text-xs font-medium">Product Photographs</label>
                <div className="flex flex-wrap gap-2">
                  {(editingProduct.images ?? []).map((img, idx) => (
                    <div key={img + idx} className="relative w-20 h-16 rounded border overflow-hidden">
                      <img src={img} alt="Product" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingProduct({
                            ...editingProduct,
                            images: (editingProduct.images ?? []).filter((_, i) => i !== idx),
                          })
                        }
                        className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="h-9 px-3.5 rounded-lg border border-[#34483B] text-xs font-medium text-[#34483B] inline-flex items-center gap-1.5 cursor-pointer bg-white">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Photo'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      setEditingProduct({
                        ...editingProduct,
                        images: [...(editingProduct.images ?? []), e.target.value],
                      });
                    }}
                    className="h-9 px-3 rounded-lg border border-[#292D29]/20 bg-white text-xs"
                  >
                    <option value="">Attach Studio Photo...</option>
                    {STUDIO_IMAGES.map((s) => (
                      <option key={s.url} value={s.url}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="sm:col-span-2 flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(editingProduct.featured)}
                  onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                />
                <span>Feature this product in Customer Favourites (until sales data accumulates)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="h-10 px-4 rounded-lg border border-[#292D29]/20 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#292D29]/10 p-10 text-center text-sm text-[#292D29]/70">
              No customer orders have been placed yet.
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#292D29]/60">{o.orderNumber} · {formatDate(o.createdAt)}</p>
                    <p className="font-semibold text-[#292D29]">
                      {o.customerName} ({o.customerEmail} · {o.customerPhone})
                    </p>
                    <p className="text-xs text-[#292D29]/70">
                      {o.deliveryAddress}, {o.city}, {o.state}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs uppercase font-semibold px-2.5 py-1 rounded bg-[#E8EDE5] text-[#34483B]">
                      Paystack: {o.paymentStatus}
                    </span>
                    <span className="font-semibold tabular-nums">{formatCurrency(o.totalAmount)}</span>
                    <select
                      value={o.status}
                      onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as OrderStatus)}
                      className="h-9 px-3 rounded-lg border border-[#292D29]/20 text-xs font-medium bg-white"
                    >
                      {['Pending Payment', 'Paid', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'].map(
                        (s) => (
                          <option key={s} value={s}>{s}</option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="border-t border-[#292D29]/10 pt-3 text-xs text-[#292D29]/75 space-y-1">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span>{it.productName} ({it.sku}) × {it.quantity}</span>
                      <span className="tabular-nums">{formatCurrency(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CATEGORIES & COLLECTIONS TAB */}
      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl font-semibold">Categories ({categories.length})</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await adminFetch('/api/admin/categories', {
                  method: 'POST',
                  body: JSON.stringify({ name: newCatName, parentGroup: newCatGroup }),
                });
                if (res.ok) {
                  setNewCatName('');
                  await loadAdminData();
                  await refreshBootstrap();
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                required
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <select
                value={newCatGroup}
                onChange={(e) => setNewCatGroup(e.target.value as Category['parentGroup'])}
                className="h-10 px-2.5 rounded-lg border border-[#292D29]/20 text-xs"
              >
                {['Living Room', 'Bedroom', 'Dining & Kitchen', 'Workspace', 'Home Accessories'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <button type="submit" className="h-10 px-4 rounded-lg bg-[#34483B] text-white text-xs font-medium">
                Add
              </button>
            </form>
            <div className="divide-y divide-[#292D29]/8 max-h-96 overflow-y-auto">
              {categories.map((c) => (
                <div key={c.id} className="py-2.5 flex justify-between items-center text-sm">
                  <span>{c.name} <span className="text-xs text-[#292D29]/55">({c.parentGroup})</span></span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminFetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
                      await loadAdminData();
                    }}
                    className="text-xs text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl font-semibold">Featured Homepage Collections</h2>
            <div className="space-y-4">
              {collections.map((col) => (
                <div key={col.id} className="p-4 rounded-lg bg-[#E8EDE5]/50 border border-[#292D29]/8 space-y-2">
                  <p className="font-semibold text-sm">{col.name}</p>
                  <p className="text-xs text-[#292D29]/70">{col.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMERS, DISCOUNTS & JOURNAL TAB */}
      {tab === 'customers' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Discount Codes */}
            <div className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
              <h2 className="font-serif text-2xl font-semibold">Discount Codes</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await adminFetch('/api/admin/discounts', {
                    method: 'POST',
                    body: JSON.stringify({
                      code: newDiscountCode,
                      type: newDiscountType,
                      value: Number(newDiscountValue),
                      minOrderAmount: Number(newDiscountMin),
                    }),
                  });
                  if (res.ok) {
                    setNewDiscountCode('');
                    await loadAdminData();
                    showToast('Discount code created.', 'success');
                  } else {
                    const d = await res.json();
                    showToast(d.error || 'Error', 'error');
                  }
                }}
                className="grid grid-cols-2 gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. WELCOME10)"
                  value={newDiscountCode}
                  onChange={(e) => setNewDiscountCode(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm uppercase"
                />
                <select
                  value={newDiscountType}
                  onChange={(e) => setNewDiscountType(e.target.value as 'percent' | 'fixed')}
                  className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
                >
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₦)</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="Value"
                  value={newDiscountValue}
                  onChange={(e) => setNewDiscountValue(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
                />
                <input
                  type="number"
                  placeholder="Min subtotal ₦"
                  value={newDiscountMin}
                  onChange={(e) => setNewDiscountMin(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
                />
                <button type="submit" className="col-span-2 h-10 rounded-lg bg-[#34483B] text-white text-xs font-medium">
                  Create Discount Code
                </button>
              </form>

              <div className="divide-y divide-[#292D29]/8">
                {discounts.map((d) => (
                  <div key={d.id} className="py-2.5 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-mono font-semibold">{d.code}</span>{' '}
                      <span className="text-xs text-[#292D29]/65">
                        ({d.type === 'percent' ? `${d.value}%` : formatCurrency(d.value)} · used {d.usageCount}×)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await adminFetch(`/api/admin/discounts/${d.id}`, { method: 'DELETE' });
                        await loadAdminData();
                      }}
                      className="text-xs text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Newsletter Subscribers */}
            <div className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
              <h2 className="font-serif text-2xl font-semibold">
                Newsletter Subscribers ({subscribers.length})
              </h2>
              {subscribers.length === 0 ? (
                <p className="text-sm text-[#292D29]/65">No subscribers yet.</p>
              ) : (
                <div className="divide-y divide-[#292D29]/8 max-h-64 overflow-y-auto">
                  {subscribers.map((s) => (
                    <div key={s.id} className="py-2 flex justify-between text-sm">
                      <span>{s.email}</span>
                      <span className="text-xs text-[#292D29]/55">{formatDate(s.subscribedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Registered Customers & Contact Messages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Customers ({customers.length})</h2>
              {customers.length === 0 ? (
                <p className="text-sm text-[#292D29]/65">No registered customer accounts yet.</p>
              ) : (
                <div className="divide-y divide-[#292D29]/8">
                  {customers.map((c) => (
                    <div key={c.id} className="py-2.5 flex justify-between text-sm">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-[#292D29]/60">{c.email}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p>{c.orderCount} orders</p>
                        <p className="font-semibold tabular-nums">{formatCurrency(c.totalSpent)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-3">
              <h2 className="font-serif text-2xl font-semibold">Contact Inquiries ({messages.length})</h2>
              {messages.length === 0 ? (
                <p className="text-sm text-[#292D29]/65">No contact messages yet.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {messages.map((m) => (
                    <div key={m.id} className="p-3 rounded-lg bg-[#E8EDE5]/50 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold">{m.subject}</span>
                        {m.status === 'new' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await adminFetch(`/api/admin/messages/${m.id}`, { method: 'PUT' });
                              await loadAdminData();
                            }}
                            className="text-xs text-[#34483B] underline"
                          >
                            Mark Reviewed
                          </button>
                        ) : (
                          <span className="text-xs text-[#292D29]/55 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Reviewed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#292D29]/70">{m.name} ({m.email})</p>
                      <p className="text-xs text-[#292D29]/85">{m.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Journal Manager */}
          <div className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl font-semibold">Journal Articles ({journalPosts.length})</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await adminFetch('/api/admin/journal', {
                  method: 'POST',
                  body: JSON.stringify({ title: newPostTitle, content: newPostContent }),
                });
                if (res.ok) {
                  setNewPostTitle('');
                  setNewPostContent('');
                  await loadAdminData();
                  await refreshBootstrap();
                }
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Article Title"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <textarea
                rows={3}
                required
                placeholder="Article prose..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full p-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <button type="submit" className="h-10 px-5 rounded-lg bg-[#34483B] text-white text-xs font-medium">
                Publish Journal Article
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {tab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-[#292D29]/10 p-6 sm:p-8 space-y-5 max-w-3xl">
          <h2 className="font-serif text-2xl font-semibold">Store Settings &amp; Content</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium mb-1">Delivery Fee (₦)</label>
              <input
                type="number"
                min="0"
                value={settings.deliveryFee}
                onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Free Delivery Threshold (₦ or blank)</label>
              <input
                type="number"
                min="0"
                value={settings.freeDeliveryThreshold ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    freeDeliveryThreshold: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                value={settings.taxRatePercent}
                onChange={(e) => setSettings({ ...settings, taxRatePercent: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Configured Delivery Promise (Shown on Homepage Customer Experience when set)
              </label>
              <input
                type="text"
                value={settings.deliveryPromiseText}
                onChange={(e) => setSettings({ ...settings, deliveryPromiseText: e.target.value })}
                placeholder="Leave blank if no specific transit guarantee is set"
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Hero Headline</label>
              <input
                type="text"
                value={settings.heroHeadline}
                onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Hero Supporting Text</label>
              <textarea
                rows={2}
                value={settings.heroSubtext}
                onChange={(e) => setSettings({ ...settings, heroSubtext: e.target.value })}
                className="w-full p-3 rounded-lg border border-[#292D29]/20"
              />
            </div>
          </div>

          <button type="submit" className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium">
            Save Store Settings
          </button>
        </form>
      )}
    </div>
  );
}
