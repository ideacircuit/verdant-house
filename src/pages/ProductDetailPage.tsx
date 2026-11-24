import React, { useEffect, useState } from 'react';
import { Heart, Maximize2, Minus, Plus, ShoppingBag, Truck, RotateCcw, X } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { formatCurrency, safeImageUrl } from '../lib/format.ts';
import type { Product } from '../types/store.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/BrandMark.tsx';

export function ProductDetailPage({ idOrSlug }: { idOrSlug: string }) {
  const { addToCart, toggleWishlist, wishlistIds, bootstrap } = useStore();
  const settings = bootstrap?.settings;

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  usePageMeta(
    product ? `${product.name} — Verdant Living` : 'Product Details — Verdant Living',
    product?.description
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    setActiveImageIdx(0);
    setQuantity(1);
    fetch(`/api/products/${encodeURIComponent(idOrSlug)}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error || 'Product not found.');
        }
        return r.json();
      })
      .then((data) => {
        const p = data.product as Product;
        setProduct(p);
        setSelectedVariantId(p.variants[0]?.id ?? null);
        setRelated(data.related ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[4/3] rounded-2xl bg-[#E8EDE5]/70 animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 rounded bg-[#E8EDE5]/70 animate-pulse" />
            <div className="h-6 w-1/3 rounded bg-[#E8EDE5]/70 animate-pulse" />
            <div className="h-28 rounded bg-[#E8EDE5]/70 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold text-[#292D29]">Product Unavailable</h1>
        <p className="text-sm text-[#292D29]/70">{error || 'This product could not be found.'}</p>
        <Link
          to="/shop"
          className="inline-flex h-11 px-6 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0] ?? null;
  const effectivePrice = product.price + (activeVariant?.priceDelta ?? 0);
  const effectiveStock = activeVariant ? activeVariant.stockQuantity : product.stockQuantity;
  const isWishlisted = wishlistIds.includes(product.id);
  const images = product.images.map((u) => safeImageUrl(u)).filter(Boolean) as string[];
  const mainImage = images[activeImageIdx] ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[#292D29]/60 mb-8" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[#34483B]">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[#34483B]">Shop</Link>
        <span>/</span>
        <span className="text-[#292D29] font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#E8EDE5] border border-[#292D29]/8">
            <ResilientImage
              src={mainImage}
              alt={product.name}
              fallbackName={product.name}
              fallbackCategory={product.categoryName}
              className="w-full h-full object-cover"
            />
            {mainImage && (
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Zoom product photograph"
                className="absolute bottom-4 right-4 h-10 px-3.5 rounded-lg bg-[#F8F7F2]/90 hover:bg-white text-xs font-medium text-[#292D29] inline-flex items-center gap-1.5 shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Zoom</span>
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors ${
                    idx === activeImageIdx ? 'border-[#34483B]' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} view ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#292D29]/60 mb-2">
                <span>{product.categoryName}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="font-mono">{activeVariant?.sku || product.sku}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#292D29] leading-tight mb-3">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 tabular-nums">
                <span className="text-2xl font-semibold text-[#292D29]">
                  {formatCurrency(effectivePrice)}
                </span>
                {product.originalPrice !== null && product.originalPrice > effectivePrice && (
                  <span className="text-sm text-[#292D29]/50 line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm sm:text-base text-[#292D29]/80 leading-relaxed">
              {product.description}
            </p>

            {/* Variant / Colour Selector */}
            {product.variants.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#292D29]/65">
                  Finish / Option: <span className="text-[#292D29]">{activeVariant?.label}</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => {
                    const selected = v.id === activeVariant?.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVariantId(v.id);
                          setQuantity(1);
                        }}
                        className={`h-10 px-3.5 rounded-lg border text-xs font-medium inline-flex items-center gap-2 transition-colors ${
                          selected
                            ? 'border-[#34483B] bg-[#E8EDE5] text-[#34483B]'
                            : 'border-[#292D29]/15 bg-white text-[#292D29] hover:border-[#34483B]/50'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-[#292D29]/20 shrink-0"
                          style={{ backgroundColor: v.colorHex }}
                        />
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Indicator */}
            <div className="text-sm">
              {effectiveStock > 0 ? (
                <span className="text-[#34483B] font-medium tabular-nums">
                  Available ({effectiveStock} in stock)
                </span>
              ) : (
                <span className="text-red-700 font-medium">Currently Out of Stock</span>
              )}
            </div>

            {/* Quantity + Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex items-center h-12 rounded-lg border border-[#292D29]/20 bg-white">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-11 h-full flex items-center justify-center text-[#292D29] disabled:opacity-35"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= effectiveStock}
                  onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                  aria-label="Increase quantity"
                  className="w-11 h-full flex items-center justify-center text-[#292D29] disabled:opacity-35"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={effectiveStock <= 0}
                onClick={() => addToCart(product, activeVariant?.id ?? null, quantity)}
                className="flex-1 h-12 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors disabled:bg-[#292D29]/20 disabled:text-[#292D29]/45 inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{effectiveStock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Save to wishlist"
                className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-colors ${
                  isWishlisted
                    ? 'border-[#34483B] bg-[#34483B] text-[#F8F7F2]'
                    : 'border-[#292D29]/20 bg-white text-[#292D29] hover:border-[#34483B]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Specifications */}
            <div className="border-t border-[#292D29]/10 pt-6 space-y-4 text-sm">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-1">
                  Dimensions
                </h2>
                <p className="text-[#292D29]">{product.dimensions || 'Configured by store'}</p>
              </div>

              {product.materials.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-1">
                    Materials
                  </h2>
                  <p className="text-[#292D29]">{product.materials.join(' · ')}</p>
                </div>
              )}

              {product.colors.length > 0 && (
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-1">
                    Colours
                  </h2>
                  <p className="text-[#292D29]">{product.colors.join(' · ')}</p>
                </div>
              )}
            </div>

            {/* Delivery & Return Policy */}
            <div className="rounded-xl bg-[#E8EDE5]/65 border border-[#292D29]/8 p-5 space-y-3.5 text-sm">
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-[#34483B] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#292D29]">Delivery Information</p>
                  <p className="text-xs text-[#292D29]/70 mt-0.5 leading-relaxed">
                    {settings?.deliveryPolicySummary ||
                      'Delivery fee and dispatch schedule are calculated at checkout.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-[#34483B] mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-[#292D29]">Returns &amp; Exchanges</p>
                  <p className="text-xs text-[#292D29]/70 mt-0.5 leading-relaxed">
                    {settings?.returnPolicySummary}{' '}
                    <Link to="/returns-policy" className="underline text-[#34483B]">
                      Read Return Policy
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20 pt-14 border-t border-[#292D29]/10">
          <h2 className="font-serif text-3xl font-semibold text-[#292D29] mb-8">
            Complementary Pieces
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Lightbox Zoom Modal */}
      {zoomOpen && mainImage && (
        <div
          className="fixed inset-0 z-50 bg-[#292D29]/85 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Close zoom preview"
            className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={mainImage}
            alt={product.name}
            className="max-w-full max-h-[88vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
