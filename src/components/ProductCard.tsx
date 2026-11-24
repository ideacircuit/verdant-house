import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { Link } from '../lib/router.tsx';
import { formatCurrency, safeImageUrl } from '../lib/format.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ResilientImage } from './BrandMark.tsx';

export function ProductCard({
  product,
  darkSurface = false,
}: {
  product: Product;
  darkSurface?: boolean;
}) {
  const { addToCart, toggleWishlist, wishlistIds } = useStore();
  const isWishlisted = wishlistIds.includes(product.id);
  const imageSrc = safeImageUrl(product.images[0]);
  const inStock = product.stockQuantity > 0;
  const hasGenuineDiscount =
    product.originalPrice !== null && product.originalPrice > product.price;

  return (
    <article
      className={`group rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col ${
        darkSurface
          ? 'bg-[#F8F7F2] text-[#292D29] shadow-sm'
          : 'bg-white border border-[#292D29]/8 shadow-xs hover:shadow-md'
      }`}
    >
      <div className="relative aspect-[4/3] bg-[#E8EDE5] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <ResilientImage
            src={imageSrc}
            alt={product.name}
            fallbackName={product.name}
            fallbackCategory={product.categoryName}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-xs ${
            isWishlisted
              ? 'bg-[#34483B] text-[#F8F7F2]'
              : 'bg-[#F8F7F2]/90 text-[#292D29] hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#292D29]/60 mb-1.5">
            <span>{product.categoryName}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}</span>
          </div>
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-serif text-xl font-semibold text-[#292D29] group-hover:text-[#34483B] transition-colors leading-snug">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-baseline gap-2.5 tabular-nums">
            <span className="text-base font-semibold text-[#292D29]">
              {formatCurrency(product.price)}
            </span>
            {hasGenuineDiscount && (
              <span className="text-xs text-[#292D29]/50 line-through">
                {formatCurrency(product.originalPrice!)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={!inStock}
              onClick={() => addToCart(product, product.variants[0]?.id ?? null, 1)}
              className="flex-1 h-10 px-3 rounded-lg bg-[#34483B] text-[#F8F7F2] text-xs font-medium hover:bg-[#29392F] transition-colors disabled:bg-[#292D29]/15 disabled:text-[#292D29]/45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{inStock ? 'Add to Cart' : 'Sold Out'}</span>
            </button>
            <Link
              to={`/product/${product.slug}`}
              className="h-10 px-3.5 rounded-lg border border-[#292D29]/15 text-xs font-medium text-[#292D29] hover:border-[#34483B] hover:text-[#34483B] transition-colors inline-flex items-center justify-center whitespace-nowrap"
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
