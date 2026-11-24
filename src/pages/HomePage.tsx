import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Package, Sparkles } from 'lucide-react';
import { Link } from '../lib/router.tsx';
import { usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency } from '../lib/format.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/BrandMark.tsx';

const CATEGORY_CARDS = [
  {
    title: 'Living Room',
    description: 'Comfortable furniture and timeless pieces for your favourite space.',
    cta: 'Explore Living Room',
    to: '/shop?group=Living%20Room',
    image: '/src/assets/images/category_living_room_1795462775918.jpg',
  },
  {
    title: 'Bedroom',
    description: 'Create a relaxing retreat with carefully selected bedroom essentials.',
    cta: 'Explore Bedroom',
    to: '/shop?group=Bedroom',
    image: '/src/assets/images/category_bedroom_1795462775759.jpg',
  },
  {
    title: 'Home Accessories',
    description: 'The finishing touches that make a house feel like home.',
    cta: 'Discover Accessories',
    to: '/shop?group=Home%20Accessories',
    image: '/src/assets/images/category_accessories_1795462776866.jpg',
  },
];

export function HomePage() {
  usePageMeta(
    'Verdant Living — Contemporary Furniture & Home Décor',
    'Thoughtfully selected furniture and home essentials designed to bring comfort, character and timeless style into your everyday spaces.'
  );

  const { bootstrap, showToast } = useStore();
  const settings = bootstrap?.settings;
  const collections = bootstrap?.collections ?? [];
  const latestArrivals = bootstrap?.latestArrivals ?? [];
  const bestsellers = bootstrap?.bestsellers ?? [];
  const draftCount = bootstrap?.draftCount ?? 0;
  const publishedCount = bootstrap?.publishedCount ?? 0;

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState<string | null>(null);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    if (!newsletterConsent) {
      showToast('Please tick the consent checkbox to subscribe.', 'error');
      return;
    }
    setNewsletterBusy(true);
    setNewsletterSuccess(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail.trim(), consent: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewsletterSuccess(data.message);
        setNewsletterEmail('');
        setNewsletterConsent(false);
      } else {
        showToast(data.error || 'Unable to subscribe.', 'error');
      }
    } catch {
      showToast('Unable to subscribe right now.', 'error');
    } finally {
      setNewsletterBusy(false);
    }
  };

  return (
    <div className="bg-[#F8F7F2]">
      {/* SECTION A — HERO */}
      <section className="relative bg-[#E8EDE5]/55 border-b border-[#292D29]/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-center py-4 lg:py-8">
              <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#B18A52] mb-4">
                Contemporary Interiors
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.65rem] font-semibold text-[#292D29] leading-[1.08] tracking-tight mb-6">
                {settings?.heroHeadline || 'Make Room for Better Living.'}
              </h1>
              <p className="text-base sm:text-lg text-[#292D29]/75 leading-relaxed max-w-xl mb-8">
                {settings?.heroSubtext ||
                  'Thoughtfully selected furniture and home essentials designed to bring comfort, character and timeless style into your everyday spaces.'}
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Link
                  to="/shop"
                  className="h-12 px-7 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <span>Explore the Collection</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={publishedCount > 0 ? '/shop?sort=featured' : '/collections'}
                  className="h-12 px-6 rounded-lg border border-[#34483B]/30 bg-white/80 text-[#34483B] text-sm font-medium hover:border-[#34483B] hover:bg-white transition-colors inline-flex items-center whitespace-nowrap"
                >
                  Shop Bestsellers
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl overflow-hidden shadow-md bg-[#E8EDE5] aspect-[16/10] lg:aspect-auto lg:h-[520px]">
                <ResilientImage
                  src={
                    settings?.heroImageUrl ||
                    '/src/assets/images/hero_verdant_living_1795462775962.jpg'
                  }
                  alt="Verdant Living contemporary living room with oat-linen sofa and solid oak coffee table"
                  fallbackName="Verdant Living Room"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B — SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.title}
              to={cat.to}
              className="group bg-white rounded-xl border border-[#292D29]/8 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden flex flex-col"
            >
              <div className="aspect-[16/10] bg-[#E8EDE5] overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={cat.title}
                  fallbackName={cat.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#292D29] mb-2">
                    {cat.title}
                  </h2>
                  <p className="text-sm text-[#292D29]/70 leading-relaxed mb-4">
                    {cat.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#34483B] group-hover:gap-2.5 transition-all">
                  <span>{cat.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION C — FEATURED COLLECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
              Curated Rooms
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#292D29]">
              Find Your Perfect Space
            </h2>
            <p className="text-base text-[#292D29]/70 mt-2 max-w-xl">
              Explore furniture and décor designed to make every room feel more like yours.
            </p>
          </div>
          <Link
            to="/collections"
            className="text-sm font-medium text-[#34483B] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>All Collections</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.slice(0, 4).map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.slug}`}
              className="group bg-white rounded-xl border border-[#292D29]/8 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#E8EDE5] overflow-hidden">
                <ResilientImage
                  src={col.imageUrl}
                  alt={col.name}
                  fallbackName={col.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#292D29] mb-1.5">
                    {col.name}
                  </h3>
                  <p className="text-sm text-[#292D29]/65 leading-relaxed mb-4">
                    {col.description}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#34483B] inline-flex items-center gap-1.5">
                  <span>View Collection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* SECTION D — LATEST ARRIVALS */}
      <section className="bg-[#34483B] text-[#F8F7F2] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#E8EDE5]/75 mb-2">
                Seasonal Release
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#F8F7F2]">
                New Pieces, Fresh Possibilities
              </h2>
              <p className="text-base text-[#E8EDE5]/80 mt-2 max-w-xl">
                Discover the latest additions to our collection, selected to bring comfort and character into your home.
              </p>
            </div>
            <Link
              to="/shop?sort=newest"
              className="text-sm font-medium text-[#E8EDE5] hover:text-white inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Shop Latest</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {latestArrivals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestArrivals.map((product) => (
                <ProductCard key={product.id} product={product} darkSurface />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#29392F] border border-[#F8F7F2]/15 p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <h3 className="font-serif text-2xl font-semibold text-[#F8F7F2]">
                  Initial Catalogue Awaiting Store Verification
                </h3>
                <p className="text-sm text-[#E8EDE5]/80 leading-relaxed">
                  {draftCount} curated furniture and décor records are saved as unpublished drafts until the store administrator verifies authentic photography, dimensions, pricing, and inventory levels.
                </p>
              </div>
              <Link
                to="/admin"
                className="h-11 px-6 rounded-lg bg-[#F8F7F2] text-[#34483B] text-sm font-medium hover:bg-[#E8EDE5] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Open Admin Catalogue</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SECTION E — BESTSELLERS / CUSTOMER FAVOURITES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
              {bootstrap?.hasRealSalesData ? 'Ordered by Verified Purchases' : 'Storefront Curated'}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#292D29]">
              Customer Favourites
            </h2>
          </div>
          <Link
            to="/shop?sort=featured"
            className="text-sm font-medium text-[#34483B] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Browse All Featured</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {bestsellers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestsellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[#E8EDE5]/65 border border-[#292D29]/10 p-8 text-center">
            <p className="font-serif text-xl text-[#292D29] mb-2">
              Featured pieces will appear here once published
            </p>
            <p className="text-sm text-[#292D29]/70 max-w-lg mx-auto">
              Verdant Living displays customer favourites strictly from verified order data or administrator-featured published products.
            </p>
          </div>
        )}
      </section>

      {/* SECTION F — BRAND STORY */}
      <section className="bg-[#E8EDE5]/70 border-y border-[#292D29]/8 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden bg-[#E8EDE5] aspect-[4/3] lg:h-full">
                <ResilientImage
                  src={
                    settings?.storyImageUrl ||
                    '/src/assets/images/category_accessories_1795462776866.jpg'
                  }
                  alt="Curated ceramic vessels, brass table lamp, and solid oak mirror"
                  fallbackName="Verdant Living Brand Story"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col justify-center py-2">
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-3">
                Our Philosophy
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#292D29] leading-tight mb-5">
                {settings?.storyHeadline || 'Thoughtful Pieces. Beautifully Lived In.'}
              </h2>
              <p className="text-base text-[#292D29]/75 leading-relaxed mb-8">
                {settings?.storyText ||
                  'At Verdant Living, we believe the spaces we inhabit should reflect the way we want to live. We bring together carefully selected furniture and home essentials that balance comfort, function and timeless design.'}
              </p>
              <div>
                <Link
                  to="/about"
                  className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors inline-flex items-center gap-2"
                >
                  <span>Discover Our Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION G — CUSTOMER EXPERIENCE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-7 rounded-xl bg-white border border-[#292D29]/8">
            <Sparkles className="w-5 h-5 text-[#B18A52] mb-4" />
            <h3 className="font-serif text-2xl font-semibold text-[#292D29] mb-2">
              Thoughtful Selection
            </h3>
            <p className="text-sm text-[#292D29]/70 leading-relaxed">
              Carefully selected pieces for everyday living, inspected for material integrity, proportion, and lasting comfort.
            </p>
          </div>

          <div className="p-7 rounded-xl bg-white border border-[#292D29]/8">
            <Lock className="w-5 h-5 text-[#B18A52] mb-4" />
            <h3 className="font-serif text-2xl font-semibold text-[#292D29] mb-2">
              Secure Shopping
            </h3>
            <p className="text-sm text-[#292D29]/70 leading-relaxed">
              Protected customer accounts and server-verified Paystack checkout so every transaction is confirmed safely.
            </p>
          </div>

          <div className="p-7 rounded-xl bg-white border border-[#292D29]/8">
            <Package className="w-5 h-5 text-[#B18A52] mb-4" />
            <h3 className="font-serif text-2xl font-semibold text-[#292D29] mb-2">
              Reliable Delivery
            </h3>
            <p className="text-sm text-[#292D29]/70 leading-relaxed">
              {settings?.deliveryPromiseText
                ? settings.deliveryPromiseText
                : settings?.deliveryFee !== undefined
                ? `Clear delivery information and order tracking. Standard configured delivery fee: ${formatCurrency(settings.deliveryFee)}.`
                : 'Clear delivery information and live order tracking from confirmation to doorstep arrival.'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION H — NEWSLETTER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl bg-[#E8EDE5] border border-[#34483B]/10 p-8 sm:p-12 lg:p-14 text-center">
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
            The Verdant Dispatch
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#292D29] mb-3">
            A Little Inspiration for Your Inbox
          </h2>
          <p className="text-base text-[#292D29]/75 max-w-xl mx-auto mb-8">
            Get new collection updates, interior inspiration and exclusive store announcements.
          </p>

          <form onSubmit={handleNewsletter} className="max-w-lg mx-auto space-y-3 text-left">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                aria-label="Email address for newsletter"
                className="flex-1 h-12 px-4 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29] focus:outline-none focus:border-[#34483B]"
              />
              <button
                type="submit"
                disabled={newsletterBusy}
                className="h-12 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {newsletterBusy ? 'Subscribing...' : 'Subscribe'}
              </button>
            </div>
            <label className="flex items-start gap-2.5 text-xs text-[#292D29]/70 cursor-pointer">
              <input
                type="checkbox"
                checked={newsletterConsent}
                onChange={(e) => setNewsletterConsent(e.target.checked)}
                className="mt-0.5 accent-[#34483B]"
              />
              <span>
                I consent to receive emails from Verdant Living and acknowledge the{' '}
                <Link to="/privacy-policy" className="underline text-[#34483B]">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {newsletterSuccess && (
              <div className="flex items-center gap-2 text-sm text-[#34483B] font-medium pt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{newsletterSuccess}</span>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
