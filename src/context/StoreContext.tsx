import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  CartItem,
  Category,
  Collection,
  HydratedCartItem,
  JournalPost,
  Product,
  PublicUser,
  StoreSettings,
} from '../types/store.ts';

interface BootstrapData {
  settings: StoreSettings;
  categories: Category[];
  collections: Collection[];
  latestArrivals: Product[];
  bestsellers: Product[];
  hasRealSalesData: boolean;
  publishedCount: number;
  draftCount: number;
  journalPosts: JournalPost[];
}

interface ToastMessage {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  bootstrap: BootstrapData | null;
  loadingBootstrap: boolean;
  refreshBootstrap: () => Promise<void>;
  user: PublicUser | null;
  authToken: string | null;
  adminToken: string | null;
  setCustomerAuth: (token: string, user: PublicUser) => void;
  setAdminAuth: (token: string | null) => void;
  logout: () => Promise<void>;
  cartItems: HydratedCartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variantId?: string | null, quantity?: number) => Promise<void>;
  updateCartQty: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'verdant_cart_items_v1';
const CART_SESSION_KEY = 'verdant_cart_session_v1';
const GUEST_WISHLIST_KEY = 'verdant_wishlist_v1';

function getOrCreateCartSessionId(): string {
  try {
    let id = window.localStorage.getItem(CART_SESSION_KEY);
    if (!id) {
      id = `cs_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
      window.localStorage.setItem(CART_SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'guest_session';
  }
}

function readStoredCartRaw(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCartRaw(items: CartItem[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

function readGuestWishlist(): string[] {
  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [loadingBootstrap, setLoadingBootstrap] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<HydratedCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => readGuestWishlist());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3600);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/store/bootstrap');
      if (res.ok) {
        const data = (await res.json()) as BootstrapData;
        setBootstrap(data);
      }
    } finally {
      setLoadingBootstrap(false);
    }
  }, []);

  const syncCartWithServer = useCallback(
    async (itemsToSave?: CartItem[], tokenOverride?: string | null) => {
      const token = tokenOverride !== undefined ? tokenOverride : authToken;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Cart-Session': getOrCreateCartSessionId(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (itemsToSave !== undefined) {
        const res = await fetch('/api/cart', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ items: itemsToSave }),
        });
        if (res.ok) {
          const data = (await res.json()) as { items: HydratedCartItem[] };
          setCartItems(data.items);
          saveStoredCartRaw(
            data.items.map((i) => ({
              id: i.id,
              productId: i.productId,
              variantId: i.variantId,
              variantLabel: i.variantLabel,
              quantity: i.quantity,
            }))
          );
        }
      } else {
        const storedLocal = readStoredCartRaw();
        if (storedLocal.length > 0) {
          const res = await fetch('/api/cart', {
            method: 'PUT',
            headers,
            body: JSON.stringify({ items: storedLocal }),
          });
          if (res.ok) {
            const data = (await res.json()) as { items: HydratedCartItem[] };
            setCartItems(data.items);
            return;
          }
        }
        const res = await fetch('/api/cart', { headers });
        if (res.ok) {
          const data = (await res.json()) as { items: HydratedCartItem[] };
          setCartItems(data.items);
        }
      }
    },
    [authToken]
  );

  useEffect(() => {
    refreshBootstrap();
    syncCartWithServer();
  }, [refreshBootstrap, syncCartWithServer]);

  const setCustomerAuth = useCallback(
    (token: string, nextUser: PublicUser) => {
      setAuthToken(token);
      setUser(nextUser);
      if (nextUser.role === 'admin') {
        setAdminToken(token);
      }
      const localItems = readStoredCartRaw();
      syncCartWithServer(localItems.length > 0 ? localItems : undefined, token);
      fetch('/api/account/wishlist', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.productIds) setWishlistIds(data.productIds);
        })
        .catch(() => {});
    },
    [syncCartWithServer]
  );

  const setAdminAuth = useCallback((token: string | null) => {
    setAdminToken(token);
  }, []);

  const logout = useCallback(async () => {
    if (authToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    setAuthToken(null);
    setUser(null);
    setWishlistIds(readGuestWishlist());
    showToast('Signed out successfully.');
  }, [authToken, showToast]);

  const addToCart = useCallback(
    async (product: Product, variantId: string | null = null, quantity = 1) => {
      if (product.status !== 'published') {
        showToast('This product is currently unavailable.', 'error');
        return;
      }
      const selectedVariant = variantId
        ? product.variants.find((v) => v.id === variantId) ?? null
        : product.variants[0] ?? null;
      const maxStock = selectedVariant
        ? selectedVariant.stockQuantity
        : product.stockQuantity;

      if (maxStock <= 0) {
        showToast('This item is currently out of stock.', 'error');
        return;
      }

      const itemId = `${product.id}__${selectedVariant?.id ?? 'base'}`;
      const existing = cartItems.find((i) => i.id === itemId);
      const targetQty = Math.min((existing?.quantity ?? 0) + quantity, maxStock);

      if (existing && existing.quantity >= maxStock) {
        showToast(`Maximum available quantity (${maxStock}) already in your bag.`, 'info');
        setIsCartOpen(true);
        return;
      }

      const nextRaw: CartItem[] = existing
        ? cartItems.map((i) =>
            i.id === itemId
              ? {
                  id: i.id,
                  productId: i.productId,
                  variantId: i.variantId,
                  variantLabel: i.variantLabel,
                  quantity: targetQty,
                }
              : {
                  id: i.id,
                  productId: i.productId,
                  variantId: i.variantId,
                  variantLabel: i.variantLabel,
                  quantity: i.quantity,
                }
          )
        : [
            ...cartItems.map((i) => ({
              id: i.id,
              productId: i.productId,
              variantId: i.variantId,
              variantLabel: i.variantLabel,
              quantity: i.quantity,
            })),
            {
              id: itemId,
              productId: product.id,
              variantId: selectedVariant?.id ?? null,
              variantLabel: selectedVariant?.label ?? null,
              quantity: targetQty,
            },
          ];

      await syncCartWithServer(nextRaw);
      showToast(`${product.name} added to your shopping bag.`, 'success');
      setIsCartOpen(true);
    },
    [cartItems, showToast, syncCartWithServer]
  );

  const updateCartQty = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        const nextRaw = cartItems
          .filter((i) => i.id !== itemId)
          .map((i) => ({
            id: i.id,
            productId: i.productId,
            variantId: i.variantId,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
          }));
        await syncCartWithServer(nextRaw);
        return;
      }
      const nextRaw = cartItems.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        variantLabel: i.variantLabel,
        quantity: i.id === itemId ? Math.min(quantity, i.maxStock) : i.quantity,
      }));
      await syncCartWithServer(nextRaw);
    },
    [cartItems, syncCartWithServer]
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      const nextRaw = cartItems
        .filter((i) => i.id !== itemId)
        .map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId,
          variantLabel: i.variantLabel,
          quantity: i.quantity,
        }));
      await syncCartWithServer(nextRaw);
    },
    [cartItems, syncCartWithServer]
  );

  const clearCart = useCallback(async () => {
    await syncCartWithServer([]);
  }, [syncCartWithServer]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (authToken) {
        const res = await fetch(`/api/account/wishlist/${encodeURIComponent(productId)}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { wishlisted: boolean };
          setWishlistIds((prev) =>
            data.wishlisted ? Array.from(new Set([...prev, productId])) : prev.filter((id) => id !== productId)
          );
          showToast(
            data.wishlisted ? 'Saved to your wishlist.' : 'Removed from your wishlist.',
            'success'
          );
        }
        return;
      }

      setWishlistIds((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        try {
          window.localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        showToast(exists ? 'Removed from wishlist.' : 'Saved to wishlist.', 'success');
        return next;
      });
    },
    [authToken, showToast]
  );

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.lineTotal, 0);

  return (
    <StoreContext.Provider
      value={{
        bootstrap,
        loadingBootstrap,
        refreshBootstrap,
        user,
        authToken,
        adminToken,
        setCustomerAuth,
        setAdminAuth,
        logout,
        cartItems,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
