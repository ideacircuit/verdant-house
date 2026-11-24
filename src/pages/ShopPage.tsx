import React, { useEffect, useState } from 'react';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { Link, usePageMeta, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Product } from '../types/store.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function ShopPage() {
  usePageMeta(
    'Shop Furniture & Home Décor — Verdant Living',
    'Browse contemporary sofas, armchairs, dining tables, bedroom essentials, lighting, and home accessories.'
  );

  const { search, navigate } = useRouter();
  const { bootstrap } = useStore();
  const categories = bootstrap?.categories ?? [];
  const draftCount = bootstrap?.draftCount ?? 0;

  const params = new URLSearchParams(search);
  const [category, setCategory] = useState(params.get('category') || '');
  const [group, setGroup] = useState(params.get('group') || '');
  const [collection, setCollection] = useState(params.get('collection') || '');
  const [color, setColor] = useState(params.get('color') || '');
  const [material, setMaterial] = useState(params.get('material') || '');
  const [availability, setAvailability] = useState(params.get('availability') || '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') || '');
  const [sort, setSort] = useState(params.get('sort') || 'newest');
  const [query, setQuery] = useState(params.get('search') || '');
  const [page, setPage] = useState(Number(params.get('page')) || 1);

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<{ colors: string[]; materials: string[] }>({
    colors: [],
    materials: [],
  });
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync URL query params into state when navigated externally
  useEffect(() => {
    const p = new URLSearchParams(search);
    setCategory(p.get('category') || '');
    setGroup(p.get('group') || '');
    setCollection(p.get('collection') || '');
    setColor(p.get('color') || '');
    setMaterial(p.get('material') || '');
    setAvailability(p.get('availability') || '');
    setMinPrice(p.get('minPrice') || '');
    setMaxPrice(p.get('maxPrice') || '');
    setSort(p.get('sort') || 'newest');
    setQuery(p.get('search') || '');
    setPage(Number(p.get('page')) || 1);
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (group) qs.set('group', group);
    if (collection) qs.set('collection', collection);
    if (color) qs.set('color', color);
    if (material) qs.set('material', material);
    if (availability) qs.set('availability', availability);
    if (minPrice) qs.set('minPrice', minPrice);
    if (maxPrice) qs.set('maxPrice', maxPrice);
    if (sort) qs.set('sort', sort);
    if (query) qs.set('search', query);
    qs.set('page', String(page));
    qs.set('limit', '12');

    fetch(`/api/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setProducts(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setFacets(data.facets ?? { colors: [], materials: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, group, collection, color, material, availability, minPrice, maxPrice, sort, query, page]);

  const clearFilters = () => {
    setCategory('');
    setGroup('');
    setCollection('');
    setColor('');
    setMaterial('');
    setAvailability('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setQuery('');
    setPage(1);
    navigate('/shop');
  };

  const hasActiveFilters = Boolean(
    category || group || collection || color || material || availability || minPrice || maxPrice || query
  );

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
          Room Group
        </h3>
        <div className="space-y-1.5">
          {['', 'Living Room', 'Bedroom', 'Dining & Kitchen', 'Workspace', 'Home Accessories'].map(
            (g) => (
              <button
                key={g || 'all-groups'}
                type="button"
                onClick={() => {
                  setGroup(g);
                  setCategory('');
                  setPage(1);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                  group === g && !category
                    ? 'bg-[#34483B] text-[#F8F7F2] font-medium'
                    : 'text-[#292D29]/80 hover:bg-[#E8EDE5]'
                }`}
              >
                {g || 'All Rooms'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="border-t border-[#292D29]/10 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
          Category
        </h3>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setGroup('');
            setPage(1);
          }}
          aria-label="Filter by category"
          className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29] focus:outline-none focus:border-[#34483B]"
        >
          <option value="">All 17 Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-[#292D29]/10 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
          Price Range (₦)
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm tabular-nums"
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm tabular-nums"
          />
        </div>
      </div>

      {facets.colors.length > 0 && (
        <div className="border-t border-[#292D29]/10 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
            Colour
          </h3>
          <select
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by colour"
            className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29]"
          >
            <option value="">All Colours</option>
            {facets.colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {facets.materials.length > 0 && (
        <div className="border-t border-[#292D29]/10 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
            Material
          </h3>
          <select
            value={material}
            onChange={(e) => {
              setMaterial(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by material"
            className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29]"
          >
            <option value="">All Materials</option>
            {facets.materials.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-t border-[#292D29]/10 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#292D29]/60 mb-3">
          Availability
        </h3>
        <select
          value={availability}
          onChange={(e) => {
            setAvailability(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by availability"
          className="w-full h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29]"
        >
          <option value="">All Availability</option>
          <option value="in_stock">In Stock Only</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="w-full h-10 rounded-lg border border-[#34483B] text-sm font-medium text-[#34483B] hover:bg-[#E8EDE5] transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="border-b border-[#292D29]/10 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#B18A52] mb-2">
            Catalogue
          </p>
          <h1 className="font-serif text-4xl font-semibold text-[#292D29]">
            {group || (category ? categories.find((c) => c.slug === category)?.name : 'All Furniture & Décor')}
          </h1>
          <p className="text-sm text-[#292D29]/65 mt-2 tabular-nums">
            {loading ? 'Loading catalogue...' : `${total} published ${total === 1 ? 'piece' : 'pieces'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#292D29]/45 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search pieces..."
              className="h-10 pl-9 pr-4 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29] focus:outline-none focus:border-[#34483B] w-56"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort products"
            className="h-10 px-3 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29]"
          >
            <option value="newest">Sort: Newest</option>
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden h-10 px-4 rounded-lg border border-[#292D29]/15 bg-white text-sm font-medium inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-[#E8EDE5]/55 rounded-xl p-6 border border-[#292D29]/8 sticky top-24">
            {FilterPanel}
          </div>
        </aside>

        <main className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-[#E8EDE5]/60 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white border border-[#292D29]/10 p-10 text-center space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-[#292D29]">
                {hasActiveFilters
                  ? 'No published pieces match these filters'
                  : 'Catalogue Pieces Awaiting Publication'}
              </h2>
              <p className="text-sm text-[#292D29]/70 max-w-lg mx-auto leading-relaxed">
                {hasActiveFilters
                  ? 'Try adjusting or clearing your search and filter selections to view available items.'
                  : `${draftCount} initial catalogue items are stored as unpublished drafts until verified with authentic photography, pricing, dimensions, and stock by the store administrator.`}
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-10 px-5 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium"
                  >
                    Clear Filters
                  </button>
                )}
                <Link
                  to="/admin"
                  className="h-10 px-5 rounded-lg border border-[#34483B] text-[#34483B] text-sm font-medium inline-flex items-center"
                >
                  Manage Catalogue in Admin
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-10 px-4 rounded-lg border border-[#292D29]/15 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[#292D29]/70 px-3 tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-10 px-4 rounded-lg border border-[#292D29]/15 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#292D29]/45"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative z-10 w-80 max-w-full bg-[#F8F7F2] h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-full hover:bg-[#E8EDE5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
