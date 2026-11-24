import React, { useEffect, useState } from 'react';
import { LogOut, MapPin, Package, Trash2, User as UserIcon } from 'lucide-react';
import { Link, usePageMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency, formatDate } from '../lib/format.ts';
import type { Address, Order } from '../types/store.ts';

export function AccountPage() {
  usePageMeta('My Account — Verdant Living', 'Manage your profile, saved addresses, wishlist, and order history.');
  const { user, authToken, logout, setCustomerAuth, showToast } = useStore();
  const { navigate } = useRouter();

  const [tab, setTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState(user?.name || '');
  const [addrPhone, setAddrPhone] = useState(user?.phone || '');
  const [addrLine, setAddrLine] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('Lagos');

  useEffect(() => {
    if (!authToken) return;
    fetch('/api/account/orders', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.orders) setOrders(d.orders);
      });
    fetch('/api/account/addresses', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.addresses) setAddresses(d.addresses);
      });
  }, [authToken]);

  if (!user || !authToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#292D29]">Customer Account</h1>
        <p className="text-sm text-[#292D29]/70">Sign in to view your orders, saved delivery addresses, and account profile.</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/login" className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium inline-flex items-center">
            Sign In
          </Link>
          <Link to="/register" className="h-11 px-6 rounded-lg border border-[#34483B] text-[#34483B] text-sm font-medium inline-flex items-center">
            Register
          </Link>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name, phone, currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not update profile.', 'error');
      return;
    }
    setCustomerAuth(authToken, data.user);
    setCurrentPassword('');
    setNewPassword('');
    showToast('Profile updated.', 'success');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        label: addrLabel,
        recipientName: addrRecipient,
        phone: addrPhone,
        addressLine: addrLine,
        city: addrCity,
        state: addrState,
        isDefault: addresses.length === 0,
      }),
    });
    const data = await res.json();
    if (res.ok && data.address) {
      setAddresses((prev) => [...prev, data.address]);
      setAddrLine('');
      setAddrCity('');
      showToast('Delivery address saved.', 'success');
    } else {
      showToast(data.error || 'Could not save address.', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#292D29]/10 pb-6 mb-8">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-1">
            Customer Portal
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#292D29]">{user.name}</h1>
          <p className="text-sm text-[#292D29]/65 mt-1">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={() => logout().then(() => navigate('/'))}
          className="h-10 px-4 rounded-lg border border-[#292D29]/20 text-sm font-medium inline-flex items-center gap-2 hover:bg-[#E8EDE5] self-start"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: 'orders', label: 'Order History', icon: Package },
          { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
          { id: 'profile', label: 'Profile & Security', icon: UserIcon },
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
        <Link
          to="/wishlist"
          className="h-10 px-4 rounded-lg bg-[#E8EDE5]/70 text-[#292D29] hover:bg-[#E8EDE5] text-sm font-medium inline-flex items-center"
        >
          Wishlist
        </Link>
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#292D29]/10 p-10 text-center space-y-3">
              <p className="font-serif text-2xl font-semibold">No orders yet</p>
              <p className="text-sm text-[#292D29]/65">Once you place an order, its status and payment verification details will appear here.</p>
              <Link to="/shop" className="inline-flex h-10 px-5 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium">
                Start Shopping
              </Link>
            </div>
          ) : (
            orders.map((ord) => (
              <div key={ord.id} className="bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#292D29]/60">{ord.orderNumber}</p>
                    <p className="text-sm text-[#292D29]/75">Placed {formatDate(ord.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-[#34483B]">{ord.status}</span>
                    <span className="text-xs uppercase text-[#292D29]/60">Payment: {ord.paymentStatus}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(ord.totalAmount)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(selectedOrder?.id === ord.id ? null : ord)}
                      className="text-xs font-semibold text-[#34483B] underline"
                    >
                      {selectedOrder?.id === ord.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {selectedOrder?.id === ord.id && (
                  <div className="pt-4 border-t border-[#292D29]/10 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-2">
                      <p className="font-semibold text-xs uppercase tracking-wider text-[#292D29]/60">Items</p>
                      {ord.items.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>
                            {it.productName} × {it.quantity}
                          </span>
                          <span className="tabular-nums">{formatCurrency(it.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-xs uppercase tracking-wider text-[#292D29]/60">Tracking Timeline</p>
                      {ord.statusHistory.map((h, idx) => (
                        <div key={idx} className="text-xs text-[#292D29]/75">
                          <span className="font-semibold text-[#292D29]">{h.status}</span> — {h.note} ({formatDate(h.timestamp)})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            {addresses.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#292D29]/10 p-8 text-sm text-[#292D29]/70">
                No saved delivery addresses yet.
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="bg-white rounded-xl border border-[#292D29]/10 p-5 flex justify-between items-start gap-4">
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-[#292D29]">
                      {addr.label} {addr.isDefault && <span className="text-xs text-[#34483B]">(Default)</span>}
                    </p>
                    <p>{addr.recipientName} · {addr.phone}</p>
                    <p className="text-[#292D29]/75">{addr.addressLine}, {addr.city}, {addr.state}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    aria-label="Delete address"
                    className="p-2 text-[#292D29]/45 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddAddress} className="lg:col-span-6 bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl font-semibold">Add Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Label (e.g. Home, Office)"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Recipient Name"
                value={addrRecipient}
                onChange={(e) => setAddrRecipient(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <input
                type="tel"
                required
                placeholder="Phone"
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <input
                type="text"
                required
                placeholder="State"
                value={addrState}
                onChange={(e) => setAddrState(e.target.value)}
                className="h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                className="sm:col-span-2 h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Street Address"
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                className="sm:col-span-2 h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
              />
            </div>
            <button type="submit" className="h-10 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium">
              Save Address
            </button>
          </form>
        </div>
      )}

      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="max-w-lg bg-white rounded-xl border border-[#292D29]/10 p-6 space-y-4">
          <h2 className="font-serif text-2xl font-semibold">Profile &amp; Password</h2>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
            />
          </div>
          <div className="pt-2 border-t border-[#292D29]/10 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60">Change Password (Optional)</p>
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
            />
            <input
              type="password"
              minLength={8}
              placeholder="New Password (8+ characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#292D29]/20 text-sm"
            />
          </div>
          <button type="submit" className="h-10 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium">
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
}

export function OrderTrackingPage() {
  usePageMeta('Track Order — Verdant Living', 'Track your Verdant Living furniture order status.');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);
    setBusy(true);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Order not found.');
      else setOrder(data.order);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 space-y-8">
      <div>
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Order Status
        </p>
        <h1 className="font-serif text-4xl font-semibold text-[#292D29]">Track Your Order</h1>
        <p className="text-sm text-[#292D29]/70 mt-2">
          Enter your Verdant Living order number and the email address used at checkout.
        </p>
      </div>

      <form onSubmit={handleTrack} className="bg-white rounded-2xl border border-[#292D29]/10 p-6 sm:p-8 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-sm text-red-800">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Order Number</label>
            <input
              type="text"
              required
              placeholder="VL-2026-1001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Checkout Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
        >
          {busy ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {order && (
        <div className="bg-white rounded-2xl border border-[#292D29]/10 p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap justify-between items-baseline gap-2 border-b border-[#292D29]/10 pb-4">
            <div>
              <p className="font-mono text-xs text-[#292D29]/60">{order.orderNumber}</p>
              <h2 className="font-serif text-2xl font-semibold">{order.status}</h2>
            </div>
            <span className="text-sm font-semibold tabular-nums">{formatCurrency(order.totalAmount)}</span>
          </div>

          <div className="space-y-3">
            {order.statusHistory.map((step, i) => (
              <div key={i} className="text-sm border-b border-[#292D29]/8 pb-2.5 last:border-b-0">
                <div className="flex justify-between">
                  <span className="font-semibold text-[#34483B]">{step.status}</span>
                  <span className="text-xs text-[#292D29]/55">{formatDate(step.timestamp)}</span>
                </div>
                <p className="text-xs text-[#292D29]/75 mt-0.5">{step.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
