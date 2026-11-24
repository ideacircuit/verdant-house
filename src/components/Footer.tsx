import React, { useState } from 'react';
import { Link } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { BrandMark } from './BrandMark.tsx';

export function Footer() {
  const { bootstrap, showToast } = useStore();
  const settings = bootstrap?.settings;
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!consent) {
      showToast('Please tick the consent box to subscribe.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Subscribed to Verdant Living updates.', 'success');
        setEmail('');
        setConsent(false);
      } else {
        showToast(data.error || 'Unable to subscribe.', 'error');
      }
    } catch {
      showToast('Unable to subscribe right now.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#292D29] text-[#F8F7F2] border-t border-[#292D29]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2.5 text-[#F8F7F2]">
              <BrandMark className="w-7 h-7 text-[#E8EDE5]" />
              <span className="font-serif text-2xl font-semibold tracking-tight">
                Verdant Living
              </span>
            </Link>
            <p className="text-sm text-[#F8F7F2]/75 leading-relaxed max-w-sm">
              Contemporary furniture, home furnishings, and interior décor selected to bring comfort, character, and lasting calm into modern Nigerian homes.
            </p>
            <div className="pt-2 text-xs text-[#F8F7F2]/65 space-y-1">
              <p>{settings?.showroomAddress || '14 Admiralty Way, Lekki Phase 1, Lagos'}</p>
              <p>{settings?.supportEmail || 'concierge@verdantliving.ng'}</p>
              <p>{settings?.supportPhone || '+234 800 837 3268'}</p>
            </div>
          </div>

          {/* Shop Links */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
              Shop
            </h3>
            <ul className="space-y-2.5 text-sm text-[#F8F7F2]/80">
              <li><Link to="/shop" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link to="/collections/living-room-furniture" className="hover:text-white transition-colors">Living Room</Link></li>
              <li><Link to="/collections/bedroom-essentials" className="hover:text-white transition-colors">Bedroom Essentials</Link></li>
              <li><Link to="/collections/dining-kitchen" className="hover:text-white transition-colors">Dining &amp; Kitchen</Link></li>
              <li><Link to="/collections/decorative-accessories" className="hover:text-white transition-colors">Decorative Accessories</Link></li>
            </ul>
          </div>

          {/* Customer Support & Policies */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
              Customer Care &amp; Policies
            </h3>
            <ul className="space-y-2.5 text-sm text-[#F8F7F2]/80">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition-colors">Order Tracking</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping Policy</Link></li>
              <li><Link to="/returns-policy" className="hover:text-white transition-colors">Returns &amp; Refund Policy</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
            </ul>
          </div>

          {/* Footer Newsletter */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#B18A52]">
              Newsletter
            </h3>
            <p className="text-sm text-[#F8F7F2]/75 leading-relaxed">
              Receive collection announcements and seasonal interior notes.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-10 px-3.5 rounded-lg bg-[#F8F7F2]/10 border border-[#F8F7F2]/20 text-sm text-[#F8F7F2] placeholder:text-[#F8F7F2]/45 focus:outline-none focus:border-[#B18A52]"
              />
              <label className="flex items-start gap-2 text-xs text-[#F8F7F2]/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#B18A52]"
                />
                <span>I agree to receive store updates in line with the Privacy Policy.</span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-lg bg-[#34483B] hover:bg-[#415949] text-sm font-medium text-[#F8F7F2] transition-colors disabled:opacity-60"
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#F8F7F2]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#F8F7F2]/60">
          <p>&copy; {new Date().getFullYear()} Verdant Living. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F8F7F2] transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://pinterest.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F8F7F2] transition-colors"
            >
              Pinterest
            </a>
            <Link to="/admin" className="text-[#E8EDE5]/80 hover:text-white transition-colors">
              Store Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
