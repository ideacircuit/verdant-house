import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Product } from '../types/store.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function WishlistPage() {
  usePageMeta('Wishlist — Verdant Living', 'Your saved Verdant Living furniture and home décor pieces.');
  const { wishlistIds, authToken } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (authToken) {
      fetch('/api/account/wishlist', {
        headers: { Authorization: `Bearer ${authToken}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (active) setProducts(d.products ?? []);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else if (wishlistIds.length === 0) {
      setProducts([]);
      setLoading(false);
    } else {
      fetch('/api/products?limit=48')
        .then((r) => r.json())
        .then((d) => {
          if (active) {
            const all = (d.items ?? []) as Product[];
            setProducts(all.filter((p) => wishlistIds.includes(p.id)));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
    };
  }, [authToken, wishlistIds]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Saved Pieces
        </p>
        <h1 className="font-serif text-4xl font-semibold text-[#292D29]">Your Wishlist</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-72 rounded-xl bg-[#E8EDE5]/70 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-white border border-[#292D29]/10 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E8EDE5] text-[#34483B] flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#292D29]">
            Your wishlist is currently empty
          </h2>
          <p className="text-sm text-[#292D29]/70 max-w-md mx-auto">
            Save favourite sofas, dining pieces, and decorative accents while you compare finishes and dimensions.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex h-11 px-6 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
            >
              Browse Shop
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
