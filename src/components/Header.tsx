import React, { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { Link, useRouter } from '../lib/router.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { BrandMark } from './BrandMark.tsx';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/collections' },
  { label: 'About Us', to: '/about' },
  { label: 'Journal', to: '/journal' },
  { label: 'Contact', to: '/contact' },
];

export function Header() {
  const { pathname, navigate } = useRouter();
  const { cartCount, wishlistIds, user, setIsCartOpen } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/shop?search=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F8F7F2]/95 backdrop-blur-md border-b border-[#292D29]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-6">
        {/* Left: Brand Wordmark + Original Symbol */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[#34483B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#34483B] rounded"
        >
          <BrandMark className="w-7 h-7 text-[#34483B]" />
          <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#292D29]">
            Verdant Living
          </span>
        </Link>

        {/* Middle: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
          {NAV_LINKS.map((item) => {
            const isActive =
              item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-[#34483B] border-[#34483B]'
                    : 'text-[#292D29]/75 border-transparent hover:text-[#34483B] hover:border-[#34483B]/40'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search, Account, Wishlist, Shopping Bag */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search catalogue"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#292D29] hover:bg-[#E8EDE5] hover:text-[#34483B] transition-colors focus-visible:outline-2 focus-visible:outline-[#34483B]"
          >
            {searchOpen ? <X className="w-[18px] h-[18px]" /> : <Search className="w-[18px] h-[18px]" />}
          </button>

          <Link
            to={user ? '/account' : '/login'}
            aria-label={user ? 'Customer account' : 'Sign in'}
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#292D29] hover:bg-[#E8EDE5] hover:text-[#34483B] transition-colors relative"
          >
            <User className="w-[18px] h-[18px]" />
          </Link>

          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#292D29] hover:bg-[#E8EDE5] hover:text-[#34483B] transition-colors relative"
          >
            <Heart className="w-[18px] h-[18px]" />
            {wishlistIds.length > 0 && (
              <span className="absolute top-1.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#B18A52] text-[#F8F7F2] text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {wishlistIds.length}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label={`Shopping bag with ${cartCount} items`}
            className="h-10 px-2.5 flex items-center gap-1.5 rounded-full text-[#292D29] hover:bg-[#E8EDE5] hover:text-[#34483B] transition-colors focus-visible:outline-2 focus-visible:outline-[#34483B]"
          >
            <ShoppingBag className="w-[18px] h-[18px]" />
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#34483B] text-[#F8F7F2] text-[11px] font-semibold flex items-center justify-center tabular-nums">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full text-[#292D29] hover:bg-[#E8EDE5]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#292D29]/10 bg-[#F8F7F2] py-4 px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex gap-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sofas, dining tables, ceramic vases, oak, linen..."
              autoFocus
              className="flex-1 h-11 px-4 rounded-lg bg-white border border-[#292D29]/15 text-sm text-[#292D29] placeholder:text-[#292D29]/45 focus:outline-none focus:border-[#34483B]"
            />
            <button
              type="submit"
              className="h-11 px-6 rounded-lg bg-[#34483B] text-[#F8F7F2] text-sm font-medium hover:bg-[#29392F] transition-colors whitespace-nowrap shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#292D29]/10 bg-[#F8F7F2] px-4 py-5 space-y-1">
          {NAV_LINKS.map((item) => {
            const isActive =
              item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E8EDE5] text-[#34483B]'
                    : 'text-[#292D29] hover:bg-[#E8EDE5]/60'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-3 mt-3 border-t border-[#292D29]/10 flex flex-wrap gap-3 px-3">
            <Link
              to={user ? '/account' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#34483B] py-2"
            >
              {user ? 'My Account' : 'Sign In / Register'}
            </Link>
            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#292D29]/75 py-2"
            >
              Track Order
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#292D29]/75 py-2"
            >
              Admin Studio
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
