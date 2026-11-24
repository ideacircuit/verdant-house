import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, usePageMeta } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Collection, Product } from '../types/store.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/BrandMark.tsx';

export function CollectionsPage() {
  usePageMeta(
    'Collections — Verdant Living',
    'Explore curated interior collections for living rooms, bedrooms, dining spaces, and decorative accents.'
  );
  const { bootstrap } = useStore();
  const collections = bootstrap?.collections ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="max-w-2xl mb-12">
        <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
          Curated Spaces
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#292D29] mb-4">
          All Collections
        </h1>
        <p className="text-base text-[#292D29]/75 leading-relaxed">
          Each Verdant Living collection brings together furniture silhouettes, warm timber finishes, and tactile accessories designed to live harmoniously together.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map((col) => (
          <Link
            key={col.id}
            to={`/collections/${col.slug}`}
            className="group bg-white rounded-2xl border border-[#292D29]/10 overflow-hidden hover:shadow-md transition-all flex flex-col"
          >
            <div className="aspect-[16/10] bg-[#E8EDE5] overflow-hidden">
              <ResilientImage
                src={col.imageUrl}
                alt={col.name}
                fallbackName={col.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-7 flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#292D29] mb-2">
                  {col.name}
                </h2>
                <p className="text-sm sm:text-base text-[#292D29]/70 leading-relaxed mb-5">
                  {col.description}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#34483B]">
                <span>Explore Collection</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CollectionDetailPage({ slug }: { slug: string }) {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta(
    collection ? `${collection.name} — Verdant Living` : 'Collection — Verdant Living',
    collection?.description
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/collections/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Collection not found.');
        return r.json();
      })
      .then((data) => {
        setCollection(data.collection);
        setProducts(data.products ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="h-64 rounded-2xl bg-[#E8EDE5]/70 animate-pulse" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold">Collection Not Found</h1>
        <Link
          to="/collections"
          className="inline-flex h-10 px-5 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
        >
          View All Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#E8EDE5]/65 rounded-2xl p-6 sm:p-10 mb-12 border border-[#292D29]/8">
        <div className="lg:col-span-6 space-y-4">
          <Link to="/collections" className="text-xs font-medium uppercase tracking-wider text-[#34483B] hover:underline">
            &larr; All Collections
          </Link>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#292D29]">
            {collection.name}
          </h1>
          <p className="text-base text-[#292D29]/75 leading-relaxed">
            {collection.description}
          </p>
        </div>
        <div className="lg:col-span-6">
          <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#E8EDE5]">
            <ResilientImage
              src={collection.imageUrl}
              alt={collection.name}
              fallbackName={collection.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl bg-white border border-[#292D29]/10 p-10 text-center space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-[#292D29]">
            No published pieces in this collection yet
          </h2>
          <p className="text-sm text-[#292D29]/70 max-w-md mx-auto">
            Pieces assigned to this collection will appear automatically once verified and published in the Admin Studio.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex h-10 px-5 items-center rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
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
