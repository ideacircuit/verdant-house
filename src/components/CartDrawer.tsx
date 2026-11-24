import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency, safeImageUrl } from '../lib/format.ts';
import { Link, useRouter } from '../lib/router.tsx';
import { ResilientImage } from './BrandMark.tsx';

export function CartDrawer() {
  const {
    cartItems,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    bootstrap,
  } = useStore();
  const { navigate } = useRouter();

  if (!isCartOpen) return null;

  const settings = bootstrap?.settings;
  const deliveryFee =
    settings?.freeDeliveryThreshold !== null &&
    settings?.freeDeliveryThreshold !== undefined &&
    cartSubtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings?.deliveryFee ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div
        className="fixed inset-0 bg-[#292D29]/45 backdrop-blur-[1px]"
        onClick={() => setIsCartOpen(false)}
      />

      <aside className="relative z-10 w-full max-w-md bg-[#F8F7F2] h-full flex flex-col shadow-2xl border-l border-[#292D29]/10">
        <div className="px-6 py-5 border-b border-[#292D29]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#34483B]" />
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">
              Shopping Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close shopping bag"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#292D29]/70 hover:bg-[#E8EDE5] hover:text-[#292D29]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <div className="w-14 h-14 rounded-full bg-[#E8EDE5] flex items-center justify-center text-[#34483B] mb-4">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="font-serif text-xl text-[#292D29] mb-1">Your bag is empty</p>
              <p className="text-sm text-[#292D29]/65 max-w-xs mb-6">
                Browse our contemporary furniture and home accessories to begin curating your space.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors"
              >
                Explore Shop
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 pb-5 border-b border-[#292D29]/10 last:border-b-0"
              >
                <Link
                  to={`/product/${item.product.slug}`}
                  onClick={() => setIsCartOpen(false)}
                  className="w-20 h-20 rounded-lg overflow-hidden bg-[#E8EDE5] shrink-0"
                >
                  <ResilientImage
                    src={safeImageUrl(item.product.images[0])}
                    alt={item.product.name}
                    fallbackName={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.product.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="font-serif text-base font-semibold text-[#292D29] hover:text-[#34483B] truncate"
                    >
                      {item.product.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.product.name}`}
                      className="text-[#292D29]/45 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.variantLabel && (
                    <p className="text-xs text-[#292D29]/60 mt-0.5">{item.variantLabel}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#292D29]/15 rounded-lg bg-white">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#292D29] hover:bg-[#E8EDE5]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.maxStock}
                        onClick={() => updateCartQty(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="w-8 h-8 flex items-center justify-center text-[#292D29] hover:bg-[#E8EDE5] disabled:opacity-35"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-[#292D29] tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 bg-[#E8EDE5]/70 border-t border-[#292D29]/10 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#292D29]/75">
                <span>Subtotal</span>
                <span className="font-medium text-[#292D29] tabular-nums">
                  {formatCurrency(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#292D29]/75">
                <span>Configured Delivery</span>
                <span className="tabular-nums">
                  {deliveryFee === 0 ? 'Complimentary' : formatCurrency(deliveryFee)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/cart');
                }}
                className="h-11 rounded-lg border border-[#34483B] text-[#34483B] text-sm font-medium hover:bg-white transition-colors"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="h-11 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
