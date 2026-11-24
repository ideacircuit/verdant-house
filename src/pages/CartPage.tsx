import React from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency, safeImageUrl } from '../lib/format.ts';
import { ResilientImage } from '../components/BrandMark.tsx';

export function CartPage() {
  usePageMeta('Shopping Bag — Verdant Living', 'Review items in your Verdant Living shopping bag.');
  const { cartItems, cartSubtotal, updateCartQty, removeFromCart, bootstrap } = useStore();
  const settings = bootstrap?.settings;

  const freeThreshold = settings?.freeDeliveryThreshold ?? null;
  const deliveryFee =
    freeThreshold !== null && cartSubtotal >= freeThreshold ? 0 : settings?.deliveryFee ?? 0;
  const taxRate = settings?.taxRatePercent ?? 0;
  const estimatedTax = Math.round((cartSubtotal * taxRate) / 100);
  const estimatedTotal = cartSubtotal + deliveryFee + estimatedTax;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Order Review
        </p>
        <h1 className="font-serif text-4xl font-semibold text-[#292D29]">Shopping Bag</h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#292D29]/10 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E8EDE5] text-[#34483B] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Your shopping bag is empty</h2>
          <p className="text-sm text-[#292D29]/70 max-w-md mx-auto">
            Explore our published furniture and decorative pieces to begin your order.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex h-11 px-6 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#292D29]/10 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
              >
                <Link
                  to={`/product/${item.product.slug}`}
                  className="w-28 h-24 rounded-lg overflow-hidden bg-[#E8EDE5] shrink-0"
                >
                  <ResilientImage
                    src={safeImageUrl(item.product.images[0])}
                    alt={item.product.name}
                    fallbackName={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="font-serif text-xl font-semibold text-[#292D29] hover:text-[#34483B]"
                  >
                    {item.product.name}
                  </Link>
                  {item.variantLabel && (
                    <p className="text-xs text-[#292D29]/65 mt-0.5">{item.variantLabel}</p>
                  )}
                  <p className="text-sm font-medium text-[#292D29]/80 mt-1 tabular-nums">
                    {formatCurrency(item.unitPrice)} each
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="inline-flex items-center border border-[#292D29]/15 rounded-lg bg-[#F8F7F2]">
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-9 h-9 flex items-center justify-center hover:bg-[#E8EDE5]"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.maxStock}
                      onClick={() => updateCartQty(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                      className="w-9 h-9 flex items-center justify-center hover:bg-[#E8EDE5] disabled:opacity-35"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="w-28 text-right text-base font-semibold text-[#292D29] tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                    className="p-2 text-[#292D29]/45 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link to="/shop" className="text-sm font-medium text-[#34483B] hover:underline">
                &larr; Continue Shopping
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="bg-[#E8EDE5]/70 rounded-xl border border-[#292D29]/10 p-6 space-y-4 sticky top-24">
              <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Order Summary</h2>
              <div className="space-y-2.5 text-sm border-b border-[#292D29]/10 pb-4">
                <div className="flex justify-between text-[#292D29]/75">
                  <span>Subtotal</span>
                  <span className="font-medium text-[#292D29] tabular-nums">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#292D29]/75">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums">
                    {deliveryFee === 0 ? 'Complimentary' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[#292D29]/75">
                    <span>Estimated VAT ({taxRate}%)</span>
                    <span className="tabular-nums">{formatCurrency(estimatedTax)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline text-base font-semibold text-[#292D29] pt-1">
                <span>Total</span>
                <span className="text-xl tabular-nums">{formatCurrency(estimatedTotal)}</span>
              </div>

              <Link
                to="/checkout"
                className="w-full h-12 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
