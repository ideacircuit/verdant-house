import React from 'react';
import { RouterProvider, useRouter } from './lib/router.tsx';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { Header } from './components/Header.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { CollectionDetailPage, CollectionsPage } from './pages/CollectionsPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { WishlistPage } from './pages/WishlistPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage, CheckoutVerifyPage } from './pages/CheckoutPage.tsx';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages.tsx';
import { AccountPage, OrderTrackingPage } from './pages/AccountPage.tsx';
import {
  AboutPage,
  ContactPage,
  JournalDetailPage,
  JournalListPage,
  PolicyPage,
} from './pages/EditorialPages.tsx';
import { AdminPage } from './pages/AdminPage.tsx';

function ToastBanner() {
  const { toast } = useStore();
  if (!toast) return null;
  const bg =
    toast.tone === 'error'
      ? 'bg-red-800 text-white'
      : toast.tone === 'success'
      ? 'bg-[#34483B] text-[#F8F7F2]'
      : 'bg-[#292D29] text-[#F8F7F2]';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium max-w-sm ${bg}`}
    >
      {toast.text}
    </div>
  );
}

function RouteSwitch() {
  const { pathname } = useRouter();
  const clean = pathname.replace(/\/+$/, '') || '/';

  if (clean === '/') return <HomePage />;
  if (clean === '/shop') return <ShopPage />;
  if (clean === '/collections') return <CollectionsPage />;
  if (clean.startsWith('/collections/')) {
    return <CollectionDetailPage slug={decodeURIComponent(clean.slice('/collections/'.length))} />;
  }
  if (clean.startsWith('/product/')) {
    return <ProductDetailPage idOrSlug={decodeURIComponent(clean.slice('/product/'.length))} />;
  }
  if (clean === '/wishlist') return <WishlistPage />;
  if (clean === '/cart') return <CartPage />;
  if (clean === '/checkout') return <CheckoutPage />;
  if (clean === '/checkout/verify') return <CheckoutVerifyPage />;
  if (clean === '/login') return <LoginPage />;
  if (clean === '/register') return <RegisterPage />;
  if (clean === '/forgot-password') return <ForgotPasswordPage />;
  if (clean === '/account') return <AccountPage />;
  if (clean === '/track-order') return <OrderTrackingPage />;
  if (clean === '/about') return <AboutPage />;
  if (clean === '/contact') return <ContactPage />;
  if (clean === '/journal') return <JournalListPage />;
  if (clean.startsWith('/journal/')) {
    return <JournalDetailPage slug={decodeURIComponent(clean.slice('/journal/'.length))} />;
  }
  if (clean === '/shipping-policy') return <PolicyPage type="shipping" />;
  if (clean === '/returns-policy') return <PolicyPage type="returns" />;
  if (clean === '/privacy-policy') return <PolicyPage type="privacy" />;
  if (clean === '/terms') return <PolicyPage type="terms" />;
  if (clean === '/admin') return <AdminPage />;

  return <HomePage />;
}

export default function App() {
  return (
    <RouterProvider>
      <StoreProvider>
        <div className="min-h-screen flex flex-col bg-[#F8F7F2] text-[#292D29]">
          <Header />
          <main className="flex-1">
            <RouteSwitch />
          </main>
          <Footer />
          <CartDrawer />
          <ToastBanner />
        </div>
      </StoreProvider>
    </RouterProvider>
  );
}
