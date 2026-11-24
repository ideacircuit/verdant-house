import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import { Link, usePageMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency } from '../lib/format.ts';
import type { Address, Order } from '../types/store.ts';

const NIGERIAN_STATES = [
  'Lagos',
  'Abuja FCT',
  'Ogun',
  'Oyo',
  'Rivers',
  'Enugu',
  'Delta',
  'Edo',
  'Kaduna',
  'Kano',
  'Anambra',
  'Akwa Ibom',
  'Cross River',
  'Kwara',
  'Osun',
  'Ondo',
];

export function CheckoutPage() {
  usePageMeta('Checkout — Verdant Living', 'Complete your Verdant Living order securely.');
  const { cartItems, cartSubtotal, bootstrap, user, authToken, clearCart, showToast } = useStore();
  const settings = bootstrap?.settings;

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Lagos');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedOrderResult, setSavedOrderResult] = useState<{
    order: Order;
    message: string;
  } | null>(null);

  const idempotencyKey = useMemo(
    () => `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  // Pre-fill default address if user is signed in
  useEffect(() => {
    if (!authToken) return;
    fetch('/api/account/addresses', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = (data?.addresses ?? []) as Address[];
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) {
          setCustomerName((prev) => prev || def.recipientName);
          setCustomerPhone((prev) => prev || def.phone);
          setDeliveryAddress((prev) => prev || def.addressLine);
          setCity((prev) => prev || def.city);
          setState(def.state || 'Lagos');
          setPostalCode((prev) => prev || def.postalCode);
        }
      })
      .catch(() => {});
  }, [authToken]);

  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const freeThreshold = settings?.freeDeliveryThreshold ?? null;
  const deliveryFee =
    freeThreshold !== null && discountedSubtotal >= freeThreshold
      ? 0
      : settings?.deliveryFee ?? 0;
  const taxRate = settings?.taxRatePercent ?? 0;
  const taxAmount = Math.round((discountedSubtotal * taxRate) / 100);
  const totalPayable = discountedSubtotal + deliveryFee + taxAmount;

  const handleApplyDiscount = async () => {
    setDiscountError(null);
    if (!discountInput.trim()) return;
    const res = await fetch('/api/discounts/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discountInput.trim(), subtotal: cartSubtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAppliedDiscount(null);
      setDiscountError(data.error || 'Invalid discount code.');
    } else {
      setAppliedDiscount({ code: data.code, discountAmount: data.discountAmount });
      showToast(`Discount code ${data.code} applied.`, 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (cartItems.length === 0) {
      setSubmitError('Your shopping bag is empty.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch('/api/checkout/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          city: city.trim(),
          state,
          postalCode: postalCode.trim(),
          deliveryInstructions: deliveryInstructions.trim(),
          discountCode: appliedDiscount?.code ?? '',
          idempotencyKey,
          items: cartItems.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || 'Unable to place order.');
        return;
      }

      if (data.paymentGateway?.configured && data.paymentGateway?.authorizationUrl) {
        await clearCart();
        window.location.assign(data.paymentGateway.authorizationUrl);
        return;
      }

      await clearCart();
      setSavedOrderResult({
        order: data.order,
        message:
          data.paymentGateway?.message ||
          'Order saved as Pending Payment. Paystack gateway credentials are required to process payment.',
      });
    } catch {
      setSubmitError('Network error while submitting checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  if (savedOrderResult) {
    const { order, message } = savedOrderResult;
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-7 h-7 text-[#B18A52] shrink-0 mt-1" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
                Order Reference {order.orderNumber}
              </p>
              <h1 className="font-serif text-3xl font-semibold text-[#292D29] mt-1">
                Order Saved — Pending Payment
              </h1>
              <p className="text-sm text-[#292D29]/75 mt-2 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="rounded-xl bg-[#E8EDE5]/60 p-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#292D29]/70">Order Status</span>
              <span className="font-semibold text-[#292D29]">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#292D29]/70">Payment Status</span>
              <span className="font-semibold text-[#B18A52] uppercase">{order.paymentStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#292D29]/70">Total Payable</span>
              <span className="font-semibold text-[#292D29] tabular-nums">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/track-order"
              className="h-11 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium inline-flex items-center"
            >
              Track Order Status
            </Link>
            <Link
              to="/shop"
              className="h-11 px-5 rounded-lg border border-[#292D29]/20 text-sm font-medium inline-flex items-center"
            >
              Return to Shop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Secure Checkout
        </p>
        <h1 className="font-serif text-4xl font-semibold text-[#292D29]">Delivery &amp; Payment</h1>
      </div>

      {!settings?.paystackConfigured && (
        <div className="mb-8 rounded-xl bg-[#E8EDE5] border border-[#B18A52]/40 p-4 flex items-start gap-3 text-sm text-[#292D29]">
          <AlertCircle className="w-5 h-5 text-[#B18A52] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Paystack Secret Key Required for Live Card/Transfer Payments</p>
            <p className="text-[#292D29]/75 mt-0.5">
              Set <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">PAYSTACK_SECRET_KEY</code> in server environment Secrets to enable Paystack checkout initialization and verification. Orders placed now are saved as <strong>Pending Payment</strong>.
            </p>
          </div>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#292D29]/10 p-10 text-center space-y-4">
          <h2 className="font-serif text-2xl font-semibold">Your bag is empty</h2>
          <Link
            to="/shop"
            className="inline-flex h-11 px-6 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
          >
            Browse Catalogue
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6 bg-white rounded-2xl border border-[#292D29]/10 p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">
              Customer &amp; Delivery Details
            </h2>

            {submitError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+234..."
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Delivery Street Address *
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House number, street name, estate or landmark"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  State *
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm bg-white focus:outline-none focus:border-[#34483B]"
                >
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">
                  Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Floor number, security gate code, or preferred delivery hours"
                  className="w-full p-3.5 rounded-lg border border-[#292D29]/20 text-sm focus:outline-none focus:border-[#34483B]"
                />
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="lg:col-span-5">
            <div className="bg-[#E8EDE5]/75 rounded-2xl border border-[#292D29]/10 p-6 sm:p-8 space-y-5 sticky top-24">
              <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Order Summary</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-[#292D29]">
                        {item.product.name} <span className="text-[#292D29]/60">× {item.quantity}</span>
                      </p>
                      {item.variantLabel && (
                        <p className="text-xs text-[#292D29]/60">{item.variantLabel}</p>
                      )}
                    </div>
                    <span className="font-medium text-[#292D29] tabular-nums shrink-0">
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Discount Code */}
              <div className="pt-2 border-t border-[#292D29]/10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    placeholder="Discount code"
                    className="flex-1 h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    className="h-10 px-4 rounded-lg border border-[#34483B] text-[#34483B] text-xs font-semibold hover:bg-white"
                  >
                    Apply
                  </button>
                </div>
                {discountError && <p className="text-xs text-red-700 mt-1.5">{discountError}</p>}
              </div>

              <div className="space-y-2 text-sm border-t border-[#292D29]/10 pt-4">
                <div className="flex justify-between text-[#292D29]/75">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#34483B] font-medium">
                    <span>Discount ({appliedDiscount?.code})</span>
                    <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#292D29]/75">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums">
                    {deliveryFee === 0 ? 'Complimentary' : formatCurrency(deliveryFee)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[#292D29]/75">
                    <span>VAT ({taxRate}%)</span>
                    <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline border-t border-[#292D29]/15 pt-4">
                <span className="font-semibold text-[#292D29]">Final Payable Amount</span>
                <span className="font-serif text-2xl font-semibold text-[#292D29] tabular-nums">
                  {formatCurrency(totalPayable)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Initializing Order...'
                    : settings?.paystackConfigured
                    ? 'Pay Securely with Paystack'
                    : 'Place Order (Pending Payment)'}
                </span>
              </button>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}

export function CheckoutVerifyPage() {
  usePageMeta('Payment Verification — Verdant Living');
  const { search } = useRouter();
  const reference = new URLSearchParams(search).get('reference') || new URLSearchParams(search).get('trxref') || '';

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setError('No payment reference provided.');
      return;
    }
    fetch(`/api/payments/paystack/verify/${encodeURIComponent(reference)}`)
      .then(async (r) => {
        const data = await r.json();
        setOrder(data.order ?? null);
        if (data.verified) {
          setVerified(true);
        } else {
          setError(data.error || 'Transaction was not completed.');
        }
      })
      .catch(() => setError('Unable to reach payment verification server.'))
      .finally(() => setLoading(false));
  }, [reference]);

  const handleRetryPayment = async () => {
    if (!order) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/checkout/orders/${order.id}/retry-payment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
      } else {
        setError(data.error || 'Unable to restart payment.');
      }
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-[#292D29]/10 p-8 sm:p-10 space-y-6">
        {loading ? (
          <div className="text-center py-8 space-y-3">
            <p className="font-serif text-2xl font-semibold">Verifying Payment with Paystack...</p>
            <p className="text-sm text-[#292D29]/65">Please wait while we confirm your transaction.</p>
          </div>
        ) : verified && order ? (
          <>
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="w-7 h-7 text-[#34483B] shrink-0 mt-1" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
                  Order Confirmed · {order.orderNumber}
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[#292D29] mt-1">
                  Thank you, {order.customerName}
                </h1>
                <p className="text-sm text-[#292D29]/75 mt-2">
                  Your payment has been verified and your order is now queued for preparation.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#E8EDE5]/65 p-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#292D29]/70">Payment Reference</span>
                <span className="font-mono text-xs">{order.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#292D29]/70">Order Status</span>
                <span className="font-semibold text-[#34483B]">{order.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#292D29]/70">Total Paid</span>
                <span className="font-semibold tabular-nums">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/track-order"
                className="h-11 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium inline-flex items-center"
              >
                Track Order
              </Link>
              <Link
                to="/shop"
                className="h-11 px-5 rounded-lg border border-[#292D29]/20 text-sm font-medium inline-flex items-center"
              >
                Continue Shopping
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3.5">
              <AlertCircle className="w-7 h-7 text-red-700 shrink-0 mt-1" />
              <div>
                <h1 className="font-serif text-3xl font-semibold text-[#292D29]">
                  Payment Not Completed
                </h1>
                <p className="text-sm text-[#292D29]/75 mt-2">
                  {error || 'Your payment was cancelled or could not be verified.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {order && (
                <button
                  type="button"
                  disabled={retrying}
                  onClick={handleRetryPayment}
                  className="h-11 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium disabled:opacity-60"
                >
                  {retrying ? 'Redirecting...' : 'Retry Paystack Payment'}
                </button>
              )}
              <Link
                to="/cart"
                className="h-11 px-5 rounded-lg border border-[#292D29]/20 text-sm font-medium inline-flex items-center"
              >
                Return to Bag
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
