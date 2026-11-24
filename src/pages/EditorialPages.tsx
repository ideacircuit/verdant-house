import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency } from '../lib/format.ts';
import type { JournalPost } from '../types/store.ts';
import { ResilientImage } from '../components/BrandMark.tsx';

export function AboutPage() {
  usePageMeta(
    'About Us — Verdant Living',
    'Learn about Verdant Living, our architectural furniture selection, material standards, and home design philosophy.'
  );
  const { bootstrap } = useStore();
  const settings = bootstrap?.settings;

  return (
    <div className="bg-[#F8F7F2]">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52]">
              About Verdant Living
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#292D29] leading-tight">
              {settings?.storyHeadline || 'Thoughtful Pieces. Beautifully Lived In.'}
            </h1>
            <p className="text-base text-[#292D29]/75 leading-relaxed">
              Verdant Living is a contemporary furniture and home décor retailer created for homeowners, renters, interior designers, and professionals seeking calm, enduring interiors.
            </p>
            <p className="text-base text-[#292D29]/75 leading-relaxed">
              Every sofa, dining table, lighting fixture, and decorative vessel in our catalogue is evaluated for honest materials—kiln-dried timber, tactile linen, natural wool, and matte stoneware—paired with disciplined proportions suited to modern apartments and family homes alike.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#E8EDE5]">
              <ResilientImage
                src="/src/assets/images/category_living_room_1795462775918.jpg"
                alt="Verdant Living seating and solid oak table"
                fallbackName="Verdant Living Showroom"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#E8EDE5]/70 border-y border-[#292D29]/8 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Honest Materials</h2>
            <p className="text-sm text-[#292D29]/75 leading-relaxed">
              We favour solid oak, smoked walnut, brushed brass, and natural woven textiles that age gracefully in everyday living spaces.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Verified Availability</h2>
            <p className="text-sm text-[#292D29]/75 leading-relaxed">
              Catalogue pieces are published to our storefront only after pricing, dimensions, photography, and physical stock have been confirmed.
            </p>
          </div>
          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Dependable Service</h2>
            <p className="text-sm text-[#292D29]/75 leading-relaxed">
              From transparent delivery scheduling to server-verified checkout, every stage of furnishing your space is handled with care.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ContactPage() {
  usePageMeta('Contact Us — Verdant Living', 'Reach the Verdant Living concierge and showroom team.');
  const { bootstrap, showToast } = useStore();
  const settings = bootstrap?.settings;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSent(false);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Unable to send message.', 'error');
        return;
      }
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
              Concierge &amp; Showroom
            </p>
            <h1 className="font-serif text-4xl font-semibold text-[#292D29] mb-3">Contact Us</h1>
            <p className="text-sm text-[#292D29]/75 leading-relaxed">
              Questions regarding dimensions, trade orders, upholstery care, or existing deliveries? Reach our team directly.
            </p>
          </div>

          <div className="space-y-4 pt-2 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#34483B] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#292D29]">Showroom Address</p>
                <p className="text-[#292D29]/70">{settings?.showroomAddress || '14 Admiralty Way, Lekki Phase 1, Lagos'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#34483B] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#292D29]">Email</p>
                <p className="text-[#292D29]/70">{settings?.supportEmail || 'concierge@verdantliving.ng'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#34483B] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#292D29]">Telephone</p>
                <p className="text-[#292D29]/70">{settings?.supportPhone || '+234 800 837 3268'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#292D29]/10 p-6 sm:p-8 space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[#292D29]">Send a Message</h2>
            {sent && (
              <div className="p-3.5 rounded-lg bg-[#E8EDE5] text-sm text-[#34483B] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your inquiry has been received. Our team will respond shortly.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#292D29]/20 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#292D29]/75 mb-1.5">Message</label>
              <textarea
                rows={5}
                required
                minLength={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3.5 rounded-lg border border-[#292D29]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] disabled:opacity-60"
            >
              {busy ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function JournalListPage() {
  usePageMeta('Journal — Verdant Living', 'Interior architecture notes, material care guides, and living inspiration.');
  const { bootstrap } = useStore();
  const posts = bootstrap?.journalPosts ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Editorial Notes
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#292D29] mb-3">
          The Verdant Journal
        </h1>
        <p className="text-base text-[#292D29]/75">
          Reflections on spatial calm, timber and textile care, and designing rooms built to be lived in.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/journal/${post.slug}`}
            className="group bg-white rounded-xl border border-[#292D29]/10 overflow-hidden hover:shadow-md transition-all flex flex-col"
          >
            <div className="aspect-[4/3] bg-[#E8EDE5] overflow-hidden">
              <ResilientImage
                src={post.imageUrl}
                alt={post.title}
                fallbackName={post.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#292D29]/60 mb-2">
                  <span>{post.category}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold text-[#292D29] group-hover:text-[#34483B] leading-snug mb-2">
                  {post.title}
                </h2>
                <p className="text-sm text-[#292D29]/70 leading-relaxed">{post.excerpt}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#34483B]">
                Read Article &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function JournalDetailPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<JournalPost | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta(post ? `${post.title} — Verdant Living Journal` : 'Journal — Verdant Living');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/journal/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPost(d?.post ?? null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="h-72 rounded-2xl bg-[#E8EDE5]/70 animate-pulse" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold">Article Not Found</h1>
        <Link to="/journal" className="text-sm font-medium text-[#34483B] underline">
          Return to Journal
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
      <div className="space-y-3">
        <Link to="/journal" className="text-xs font-medium uppercase tracking-wider text-[#34483B] hover:underline">
          &larr; All Journal Articles
        </Link>
        <div className="flex items-center gap-2 text-xs text-[#292D29]/60 pt-2">
          <span>{post.category}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{post.publishedAt}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{post.readTime}</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#292D29] leading-tight">
          {post.title}
        </h1>
      </div>

      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-[#E8EDE5]">
        <ResilientImage
          src={post.imageUrl}
          alt={post.title}
          fallbackName={post.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="text-base sm:text-lg text-[#292D29]/85 leading-relaxed whitespace-pre-line">
        {post.content}
      </div>
    </article>
  );
}

export function PolicyPage({
  type,
}: {
  type: 'shipping' | 'returns' | 'privacy' | 'terms';
}) {
  const { bootstrap } = useStore();
  const settings = bootstrap?.settings;

  const titles = {
    shipping: 'Shipping & Delivery Policy',
    returns: 'Returns & Refund Policy',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
  };

  usePageMeta(`${titles[type]} — Verdant Living`);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-6">
      <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52]">
        Store Policies
      </p>
      <h1 className="font-serif text-4xl font-semibold text-[#292D29]">{titles[type]}</h1>

      <div className="bg-white rounded-2xl border border-[#292D29]/10 p-7 sm:p-9 space-y-5 text-sm sm:text-base text-[#292D29]/80 leading-relaxed">
        {type === 'shipping' && (
          <>
            <p>{settings?.deliveryPolicySummary}</p>
            <p>
              Standard configured delivery fee:{' '}
              <strong>{formatCurrency(settings?.deliveryFee ?? 15000)}</strong>
              {settings?.freeDeliveryThreshold
                ? ` (Complimentary on orders from ${formatCurrency(settings.freeDeliveryThreshold)}).`
                : '.'}
            </p>
            <p>
              Orders move into dispatch preparation once payment is verified. You can track real-time fulfilment updates using your order number on the{' '}
              <Link to="/track-order" className="text-[#34483B] underline">
                Order Tracking
              </Link>{' '}
              page or inside your Customer Account.
            </p>
          </>
        )}

        {type === 'returns' && (
          <>
            <p>{settings?.returnPolicySummary}</p>
            <p>
              To initiate a return or report transit damage, contact our concierge team at{' '}
              <strong>{settings?.supportEmail}</strong> with your order number within 48 hours of delivery for damaged goods or within 14 days for unused returns.
            </p>
            <p>
              Approved refunds are processed back to the original payment method once the returned item passes warehouse inspection.
            </p>
          </>
        )}

        {type === 'privacy' && (
          <>
            <p>
              Verdant Living collects only the information necessary to process your orders, maintain your customer account, and deliver updates you explicitly subscribe to.
            </p>
            <p>
              We do not store raw payment card numbers. Card and transfer transactions are handled securely through Paystack and verified server-side.
            </p>
            <p>
              You may request deletion or export of your account data at any time by contacting{' '}
              <strong>{settings?.supportEmail}</strong>.
            </p>
          </>
        )}

        {type === 'terms' && (
          <>
            <p>
              All orders placed on Verdant Living are subject to verified stock availability and payment confirmation.
            </p>
            <p>
              Dimensions, natural timber grain variations, and fabric dye lots may exhibit subtle artisanal character inherent to natural furniture materials.
            </p>
            <p>
              Prices are listed in Nigerian Naira (₦) inclusive of store-configured tax calculations shown clearly prior to payment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
