import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import {
  generateId,
  getDb,
  mutateDb,
  UPLOADS_DIR,
  type StoreDatabase,
} from './server/store.ts';
import {
  type AuthenticatedRequest,
  createSession,
  ensureAdminAccount,
  hasEnvAdminPasscode,
  hashPassword,
  optionalAuth,
  requireAdmin,
  requireAuth,
  revokeSession,
  toPublicUser,
  verifyEnvAdminPasscode,
  verifyPassword,
} from './server/auth.ts';
import {
  initializePaystackTransaction,
  isPaystackConfigured,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from './server/paystack.ts';
import type {
  AvailabilityStatus,
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
} from './src/types/store.ts';

const PORT = Number(process.env.PORT) || 3000;

function computeAvailability(stockQuantity: number, status: Product['status']): AvailabilityStatus {
  if (status === 'draft') return 'draft_unverified';
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= 3) return 'low_stock';
  return 'in_stock';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sanitizeString(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBaseUrl(req: express.Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function resolveProductPricing(product: Product, variantId: string | null) {
  const variant = variantId ? product.variants.find((v) => v.id === variantId) ?? null : null;
  const unitPrice = product.price + (variant?.priceDelta ?? 0);
  const maxStock = variant && product.variants.length > 0 ? variant.stockQuantity : product.stockQuantity;
  return { variant, unitPrice, maxStock };
}

async function applyVerifiedPaymentToOrder(
  reference: string,
  gatewayMessage: string,
  paidAmountKobo: number
): Promise<Order | null> {
  return mutateDb((db) => {
    const order = db.orders.find((o) => o.paymentReference === reference);
    if (!order) return null;

    const expectedKobo = Math.round(order.totalAmount * 100);
    if (paidAmountKobo < expectedKobo) {
      return order;
    }

    const now = new Date().toISOString();
    const payment = db.payments.find((p) => p.reference === reference);
    if (payment) {
      payment.status = 'verified';
      payment.gatewayMessage = gatewayMessage;
      payment.verifiedAt = now;
    }

    // Idempotent guard: only decrement stock and mark Paid once
    if (order.paymentStatus !== 'verified') {
      order.paymentStatus = 'verified';
      order.status = 'Paid';
      order.updatedAt = now;
      order.statusHistory.push({
        status: 'Paid',
        note: `Payment verified via Paystack (${gatewayMessage})`,
        timestamp: now,
      });

      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.salesCount += item.quantity;
          if (item.variantId) {
            const v = prod.variants.find((vr) => vr.id === item.variantId);
            if (v) {
              v.stockQuantity = Math.max(0, v.stockQuantity - item.quantity);
            }
            prod.stockQuantity = prod.variants.reduce((sum, vr) => sum + vr.stockQuantity, 0);
          } else {
            prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
          }
          prod.availabilityStatus = computeAvailability(prod.stockQuantity, prod.status);
          prod.updatedAt = now;
        }
      }

      if (order.discountCode) {
        const dc = db.discountCodes.find(
          (d) => d.code.toUpperCase() === order.discountCode!.toUpperCase()
        );
        if (dc) {
          dc.usageCount += 1;
        }
      }
    }
    return order;
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Paystack webhook needs raw body for HMAC-SHA512 verification
  app.post(
    '/api/payments/paystack/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
        const signature = req.headers['x-paystack-signature'] as string | undefined;

        if (!verifyPaystackWebhookSignature(rawBody, signature)) {
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }

        const payload = JSON.parse(rawBody.toString('utf-8')) as {
          event?: string;
          data?: {
            reference?: string;
            amount?: number;
            gateway_response?: string;
          };
        };

        const ref = payload.data?.reference;
        if (!ref) return res.status(200).json({ received: true });

        if (payload.event === 'charge.success') {
          await applyVerifiedPaymentToOrder(
            ref,
            payload.data?.gateway_response || 'Successful',
            Number(payload.data?.amount || 0)
          );
        } else if (payload.event === 'charge.failed') {
          await mutateDb((db) => {
            const order = db.orders.find((o) => o.paymentReference === ref);
            const payment = db.payments.find((p) => p.reference === ref);
            if (payment && payment.status !== 'verified') {
              payment.status = 'failed';
              payment.gatewayMessage = payload.data?.gateway_response || 'Charge failed';
            }
            if (order && order.paymentStatus !== 'verified') {
              order.paymentStatus = 'failed';
              order.updatedAt = new Date().toISOString();
            }
          });
        }

        return res.status(200).json({ received: true });
      } catch (error) {
        console.error('Webhook handling error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
      }
    }
  );

  app.use(express.json({ limit: '8mb' }));

  // Serve uploaded product imagery safely from data/uploads
  app.get('/uploads/:filename', async (req, res) => {
    const filename = path.basename(req.params.filename);
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
      return res.status(403).end();
    }
    try {
      await fs.access(resolved);
      return res.sendFile(resolved);
    } catch {
      return res.status(404).json({ error: 'Image not found' });
    }
  });

  // =========================================================================
  // STOREFRONT BOOTSTRAP & PUBLIC CATALOGUE
  // =========================================================================

  app.get('/api/store/bootstrap', async (_req, res) => {
    try {
      const db = await getDb();
      const publishedProducts = db.products.filter((p) => p.status === 'published');
      const latestArrivals = [...publishedProducts]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4);

      const hasSales = publishedProducts.some((p) => p.salesCount > 0);
      const bestsellers = (
        hasSales
          ? [...publishedProducts].sort((a, b) => b.salesCount - a.salesCount)
          : [...publishedProducts].filter((p) => p.featured)
      ).slice(0, 4);

      res.json({
        settings: {
          ...db.settings,
          paystackConfigured: isPaystackConfigured(),
        },
        categories: [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder),
        collections: [...db.collections].sort((a, b) => a.sortOrder - b.sortOrder),
        latestArrivals,
        bestsellers,
        hasRealSalesData: hasSales,
        publishedCount: publishedProducts.length,
        draftCount: db.products.filter((p) => p.status === 'draft').length,
        journalPosts: db.journalPosts.filter((j) => j.published),
      });
    } catch (error) {
      console.error('Bootstrap error:', error);
      res.status(500).json({ error: 'Unable to load storefront data.' });
    }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const db = await getDb();
      let items = db.products.filter((p) => p.status === 'published');

      const categoryParam = sanitizeString(req.query.category, 100);
      const groupParam = sanitizeString(req.query.group, 100);
      const collectionParam = sanitizeString(req.query.collection, 100);
      const colorParam = sanitizeString(req.query.color, 100);
      const materialParam = sanitizeString(req.query.material, 100);
      const availabilityParam = sanitizeString(req.query.availability, 50);
      const searchParam = sanitizeString(req.query.search, 120).toLowerCase();
      const sortParam = sanitizeString(req.query.sort, 40) || 'newest';
      const minPrice = Number(req.query.minPrice);
      const maxPrice = Number(req.query.maxPrice);
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));

      if (categoryParam) {
        const matchedCat = db.categories.find(
          (c) => c.id === categoryParam || c.slug === categoryParam
        );
        if (matchedCat) {
          items = items.filter((p) => p.categoryId === matchedCat.id);
        }
      }

      if (groupParam) {
        const groupCatIds = new Set(
          db.categories
            .filter((c) => c.parentGroup.toLowerCase() === groupParam.toLowerCase())
            .map((c) => c.id)
        );
        items = items.filter((p) => groupCatIds.has(p.categoryId));
      }

      if (collectionParam) {
        const col = db.collections.find(
          (c) => c.id === collectionParam || c.slug === collectionParam
        );
        if (col) {
          items = items.filter(
            (p) => p.collectionIds.includes(col.id) || col.categoryIds.includes(p.categoryId)
          );
        }
      }

      if (!Number.isNaN(minPrice) && minPrice > 0) {
        items = items.filter((p) => p.price >= minPrice);
      }
      if (!Number.isNaN(maxPrice) && maxPrice > 0) {
        items = items.filter((p) => p.price <= maxPrice);
      }

      if (colorParam) {
        items = items.filter((p) =>
          p.colors.some((c) => c.toLowerCase() === colorParam.toLowerCase())
        );
      }

      if (materialParam) {
        items = items.filter((p) =>
          p.materials.some((m) => m.toLowerCase().includes(materialParam.toLowerCase()))
        );
      }

      if (availabilityParam === 'in_stock') {
        items = items.filter((p) => p.stockQuantity > 0);
      } else if (availabilityParam === 'out_of_stock') {
        items = items.filter((p) => p.stockQuantity === 0);
      }

      if (searchParam) {
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(searchParam) ||
            p.description.toLowerCase().includes(searchParam) ||
            p.categoryName.toLowerCase().includes(searchParam) ||
            p.sku.toLowerCase().includes(searchParam) ||
            p.materials.some((m) => m.toLowerCase().includes(searchParam)) ||
            p.tags.some((t) => t.toLowerCase().includes(searchParam))
        );
      }

      if (sortParam === 'price_asc') {
        items = [...items].sort((a, b) => a.price - b.price);
      } else if (sortParam === 'price_desc') {
        items = [...items].sort((a, b) => b.price - a.price);
      } else if (sortParam === 'featured') {
        items = [...items].sort((a, b) => Number(b.featured) - Number(a.featured));
      } else {
        items = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }

      const allPublished = db.products.filter((p) => p.status === 'published');
      const availableColors = Array.from(new Set(allPublished.flatMap((p) => p.colors))).sort();
      const availableMaterials = Array.from(new Set(allPublished.flatMap((p) => p.materials))).sort();

      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const paginated = items.slice((page - 1) * limit, page * limit);

      res.json({
        items: paginated,
        total,
        page,
        totalPages,
        facets: {
          colors: availableColors,
          materials: availableMaterials,
        },
      });
    } catch (error) {
      console.error('Products fetch error:', error);
      res.status(500).json({ error: 'Unable to load products.' });
    }
  });

  app.get('/api/products/:idOrSlug', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const key = req.params.idOrSlug;
      const product = db.products.find((p) => p.id === key || p.slug === key);
      if (!product) {
        return res.status(404).json({ error: 'Product not found.' });
      }
      if (product.status !== 'published' && req.authRole !== 'admin') {
        return res.status(404).json({ error: 'Product is not currently published.' });
      }
      const related = db.products
        .filter(
          (p) =>
            p.status === 'published' &&
            p.id !== product.id &&
            (p.categoryId === product.categoryId ||
              p.collectionIds.some((cid) => product.collectionIds.includes(cid)))
        )
        .slice(0, 4);

      return res.json({ product, related });
    } catch (error) {
      console.error('Product detail error:', error);
      return res.status(500).json({ error: 'Unable to load product details.' });
    }
  });

  app.get('/api/collections/:slug', async (req, res) => {
    try {
      const db = await getDb();
      const collection = db.collections.find(
        (c) => c.slug === req.params.slug || c.id === req.params.slug
      );
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found.' });
      }
      const products = db.products.filter(
        (p) =>
          p.status === 'published' &&
          (p.collectionIds.includes(collection.id) ||
            collection.categoryIds.includes(p.categoryId))
      );
      return res.json({ collection, products });
    } catch (error) {
      console.error('Collection fetch error:', error);
      return res.status(500).json({ error: 'Unable to load collection.' });
    }
  });

  app.get('/api/journal/:slug', async (req, res) => {
    const db = await getDb();
    const post = db.journalPosts.find((p) => p.slug === req.params.slug && p.published);
    if (!post) return res.status(404).json({ error: 'Journal article not found.' });
    return res.json({ post });
  });

  app.post('/api/newsletter/subscribe', async (req, res) => {
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    const consent = Boolean(req.body?.consent);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!consent) {
      return res.status(400).json({ error: 'Please confirm your consent to receive updates.' });
    }

    const result = await mutateDb((db) => {
      const existing = db.newsletterSubscribers.find((s) => s.email === email);
      if (existing) return { alreadySubscribed: true };
      db.newsletterSubscribers.push({
        id: generateId('sub'),
        email,
        consent: true,
        subscribedAt: new Date().toISOString(),
      });
      return { alreadySubscribed: false };
    });

    return res.json({
      success: true,
      message: result.alreadySubscribed
        ? 'You are already subscribed to Verdant Living updates.'
        : 'Thank you for subscribing to Verdant Living.',
    });
  });

  app.post('/api/contact', async (req, res) => {
    const name = sanitizeString(req.body?.name, 120);
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    const subject = sanitizeString(req.body?.subject, 160);
    const message = sanitizeString(req.body?.message, 2500);

    if (!name || !isValidEmail(email) || !subject || message.length < 10) {
      return res.status(400).json({
        error: 'Please provide your name, a valid email, a subject, and a message of at least 10 characters.',
      });
    }

    await mutateDb((db) => {
      db.contactMessages.unshift({
        id: generateId('msg'),
        name,
        email,
        subject,
        message,
        status: 'new',
        createdAt: new Date().toISOString(),
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Your message has been received. Our concierge team will respond via email.',
    });
  });

  app.post('/api/discounts/validate', async (req, res) => {
    const code = sanitizeString(req.body?.code, 40).toUpperCase();
    const subtotal = Number(req.body?.subtotal) || 0;
    if (!code) return res.status(400).json({ error: 'Enter a discount code.' });

    const db = await getDb();
    const dc = db.discountCodes.find((d) => d.code.toUpperCase() === code && d.active);
    if (!dc) {
      return res.status(404).json({ error: 'Discount code is invalid or inactive.' });
    }
    if (subtotal < dc.minOrderAmount) {
      return res.status(400).json({
        error: `This code requires a minimum subtotal of ₦${dc.minOrderAmount.toLocaleString()}.`,
      });
    }
    const discountAmount =
      dc.type === 'percent' ? Math.round((subtotal * dc.value) / 100) : Math.min(subtotal, dc.value);

    return res.json({
      valid: true,
      code: dc.code,
      type: dc.type,
      value: dc.value,
      discountAmount,
    });
  });

  // =========================================================================
  // CUSTOMER AUTHENTICATION & ACCOUNT MANAGEMENT
  // =========================================================================

  app.post('/api/auth/register', async (req, res) => {
    const name = sanitizeString(req.body?.name, 120);
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    const phone = sanitizeString(req.body?.phone, 40);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !isValidEmail(email) || password.length < 8) {
      return res.status(400).json({
        error: 'Provide your full name, a valid email address, and a password of at least 8 characters.',
      });
    }

    const db = await getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser = await mutateDb((d) => {
      const user = {
        id: generateId('usr'),
        email,
        name,
        phone,
        passwordHash: hashPassword(password),
        role: 'customer' as const,
        createdAt: new Date().toISOString(),
      };
      d.users.push(user);
      return user;
    });

    const token = await createSession(newUser.id, 'customer');
    return res.status(201).json({
      token,
      user: toPublicUser(newUser),
    });
  });

  app.post('/api/auth/login', async (req, res) => {
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.passwordHash);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = await createSession(user.id, user.role);
    return res.json({
      token,
      user: toPublicUser(user),
    });
  });

  app.post('/api/auth/logout', optionalAuth, async (req: AuthenticatedRequest, res) => {
    if (req.authTokenHash) {
      await revokeSession(req.authTokenHash);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    res.json({ user: toPublicUser(req.authUser!) });
  });

  app.post('/api/auth/password-reset/request', async (req, res) => {
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const db = await getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email && u.role === 'customer');
    if (user) {
      const rawToken = crypto.randomBytes(24).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await mutateDb((d) => {
        d.passwordResets.push({
          tokenHash,
          userId: user.id,
          email: user.email,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          used: false,
        });
      });
      // Do not leak reset token if email exists; require configured email transport in production
    }
    return res.json({
      success: true,
      message:
        'If an account matches that email, password reset instructions have been queued. Note: outbound reset emails require an email delivery provider configured on the server.',
    });
  });

  app.post('/api/auth/password-reset/confirm', async (req, res) => {
    const token = sanitizeString(req.body?.token, 128);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!token || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid reset token and new password (8+ chars) required.' });
    }
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const ok = await mutateDb((db) => {
      const record = db.passwordResets.find(
        (r) => r.tokenHash === tokenHash && !r.used && new Date(r.expiresAt).getTime() > Date.now()
      );
      if (!record) return false;
      const user = db.users.find((u) => u.id === record.userId);
      if (!user) return false;
      user.passwordHash = hashPassword(newPassword);
      record.used = true;
      return true;
    });
    if (!ok) return res.status(400).json({ error: 'Reset token is invalid or expired.' });
    return res.json({ success: true, message: 'Password updated. You may now sign in.' });
  });

  app.put('/api/account/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const name = sanitizeString(req.body?.name, 120);
    const phone = sanitizeString(req.body?.phone, 40);
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!name) return res.status(400).json({ error: 'Full name is required.' });

    const updated = await mutateDb((db) => {
      const user = db.users.find((u) => u.id === req.authUser!.id);
      if (!user) return null;
      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error('New password must be at least 8 characters.');
        }
        if (!verifyPassword(currentPassword, user.passwordHash)) {
          throw new Error('Current password is incorrect.');
        }
        user.passwordHash = hashPassword(newPassword);
      }
      user.name = name;
      user.phone = phone;
      return user;
    }).catch((err: Error) => err);

    if (updated instanceof Error) {
      return res.status(400).json({ error: updated.message });
    }
    if (!updated) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ user: toPublicUser(updated) });
  });

  app.get('/api/account/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = await getDb();
    res.json({
      addresses: db.addresses.filter((a) => a.userId === req.authUser!.id),
    });
  });

  app.post('/api/account/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
    const label = sanitizeString(req.body?.label, 60) || 'Home';
    const recipientName = sanitizeString(req.body?.recipientName, 120);
    const phone = sanitizeString(req.body?.phone, 40);
    const addressLine = sanitizeString(req.body?.addressLine, 240);
    const city = sanitizeString(req.body?.city, 80);
    const state = sanitizeString(req.body?.state, 80);
    const postalCode = sanitizeString(req.body?.postalCode, 30);
    const isDefault = Boolean(req.body?.isDefault);

    if (!recipientName || !phone || !addressLine || !city || !state) {
      return res.status(400).json({ error: 'All required delivery address fields must be completed.' });
    }

    const address = await mutateDb((db) => {
      if (isDefault) {
        db.addresses
          .filter((a) => a.userId === req.authUser!.id)
          .forEach((a) => {
            a.isDefault = false;
          });
      }
      const created = {
        id: generateId('addr'),
        userId: req.authUser!.id,
        label,
        recipientName,
        phone,
        addressLine,
        city,
        state,
        postalCode,
        isDefault:
          isDefault || !db.addresses.some((a) => a.userId === req.authUser!.id),
        createdAt: new Date().toISOString(),
      };
      db.addresses.push(created);
      return created;
    });

    return res.status(201).json({ address });
  });

  app.delete('/api/account/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    await mutateDb((db) => {
      db.addresses = db.addresses.filter(
        (a) => !(a.id === req.params.id && a.userId === req.authUser!.id)
      );
    });
    res.json({ success: true });
  });

  app.get('/api/account/wishlist', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = await getDb();
    const productIds = db.wishlists
      .filter((w) => w.userId === req.authUser!.id)
      .map((w) => w.productId);
    const products = db.products.filter(
      (p) => productIds.includes(p.id) && p.status === 'published'
    );
    res.json({ productIds, products });
  });

  app.post('/api/account/wishlist/:productId', requireAuth, async (req: AuthenticatedRequest, res) => {
    const productId = req.params.productId;
    const result = await mutateDb((db) => {
      const exists = db.wishlists.find(
        (w) => w.userId === req.authUser!.id && w.productId === productId
      );
      if (exists) {
        db.wishlists = db.wishlists.filter((w) => w.id !== exists.id);
        return { wishlisted: false };
      }
      db.wishlists.push({
        id: generateId('wish'),
        userId: req.authUser!.id,
        productId,
        createdAt: new Date().toISOString(),
      });
      return { wishlisted: true };
    });
    res.json(result);
  });

  app.get('/api/account/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    const db = await getDb();
    const orders = db.orders
      .filter(
        (o) =>
          o.userId === req.authUser!.id ||
          o.customerEmail.toLowerCase() === req.authUser!.email.toLowerCase()
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders });
  });

  app.post('/api/orders/track', async (req, res) => {
    const orderNumber = sanitizeString(req.body?.orderNumber, 40).toUpperCase();
    const email = sanitizeString(req.body?.email, 160).toLowerCase();
    if (!orderNumber || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter both your order number and email address.' });
    }
    const db = await getDb();
    const order = db.orders.find(
      (o) =>
        o.orderNumber.toUpperCase() === orderNumber &&
        o.customerEmail.toLowerCase() === email
    );
    if (!order) {
      return res.status(404).json({ error: 'No matching order found for those details.' });
    }
    return res.json({ order });
  });

  // =========================================================================
  // SERVER-BACKED CART & CHECKOUT + PAYSTACK
  // =========================================================================

  function getCartOwnerKey(req: AuthenticatedRequest): string | null {
    if (req.authUser) return `user:${req.authUser.id}`;
    const guestId = sanitizeString(req.headers['x-cart-session'], 80);
    return guestId ? `guest:${guestId}` : null;
  }

  function hydrateCart(db: StoreDatabase, items: CartItem[]) {
    const hydrated = [];
    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId && p.status === 'published');
      if (!product) continue;
      const { variant, unitPrice, maxStock } = resolveProductPricing(product, item.variantId);
      if (maxStock <= 0) continue;
      const clampedQty = Math.min(Math.max(1, Math.floor(item.quantity)), maxStock);
      hydrated.push({
        ...item,
        variantLabel: variant ? variant.label : item.variantLabel,
        quantity: clampedQty,
        product,
        unitPrice,
        maxStock,
        lineTotal: unitPrice * clampedQty,
      });
    }
    return hydrated;
  }

  app.get('/api/cart', optionalAuth, async (req: AuthenticatedRequest, res) => {
    const ownerKey = getCartOwnerKey(req);
    const db = await getDb();
    if (!ownerKey) return res.json({ items: [] });
    const cart = db.carts.find((c) => c.ownerKey === ownerKey);
    return res.json({ items: hydrateCart(db, cart?.items ?? []) });
  });

  app.put('/api/cart', optionalAuth, async (req: AuthenticatedRequest, res) => {
    const ownerKey = getCartOwnerKey(req);
    if (!ownerKey) {
      return res.status(400).json({ error: 'Missing cart session identifier.' });
    }
    const rawItems = Array.isArray(req.body?.items) ? (req.body.items as CartItem[]) : [];

    const hydrated = await mutateDb((db) => {
      const sanitized: CartItem[] = [];
      for (const raw of rawItems) {
        const product = db.products.find(
          (p) => p.id === raw.productId && p.status === 'published'
        );
        if (!product) continue;
        const { variant, maxStock } = resolveProductPricing(product, raw.variantId ?? null);
        if (maxStock <= 0) continue;
        const qty = Math.min(Math.max(1, Math.floor(Number(raw.quantity) || 1)), maxStock);
        sanitized.push({
          id: raw.id || `${product.id}__${variant?.id ?? 'base'}`,
          productId: product.id,
          variantId: variant?.id ?? null,
          variantLabel: variant?.label ?? null,
          quantity: qty,
        });
      }

      const existing = db.carts.find((c) => c.ownerKey === ownerKey);
      if (existing) {
        existing.items = sanitized;
        existing.updatedAt = new Date().toISOString();
      } else {
        db.carts.push({
          ownerKey,
          items: sanitized,
          updatedAt: new Date().toISOString(),
        });
      }
      return hydrateCart(db, sanitized);
    });

    return res.json({ items: hydrated });
  });

  app.post('/api/checkout/orders', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const customerName = sanitizeString(req.body?.customerName, 120);
      const customerEmail = sanitizeString(req.body?.customerEmail, 160).toLowerCase();
      const customerPhone = sanitizeString(req.body?.customerPhone, 40);
      const deliveryAddress = sanitizeString(req.body?.deliveryAddress, 240);
      const city = sanitizeString(req.body?.city, 80);
      const state = sanitizeString(req.body?.state, 80);
      const postalCode = sanitizeString(req.body?.postalCode, 30);
      const deliveryInstructions = sanitizeString(req.body?.deliveryInstructions, 400);
      const discountCodeInput = sanitizeString(req.body?.discountCode, 40).toUpperCase();
      const idempotencyKey = sanitizeString(req.body?.idempotencyKey, 100);
      const requestedItems = Array.isArray(req.body?.items)
        ? (req.body.items as Array<{ productId: string; variantId: string | null; quantity: number }>)
        : [];

      if (
        !customerName ||
        !isValidEmail(customerEmail) ||
        !customerPhone ||
        !deliveryAddress ||
        !city ||
        !state
      ) {
        return res.status(400).json({
          error: 'Please complete all required customer and delivery fields.',
        });
      }

      if (requestedItems.length === 0) {
        return res.status(400).json({ error: 'Your shopping bag is empty.' });
      }

      const outcome = await mutateDb((db) => {
        if (idempotencyKey) {
          const existingOrder = db.orders.find((o) => o.idempotencyKey === idempotencyKey);
          if (existingOrder) {
            return { order: existingOrder, duplicate: true };
          }
        }

        const orderId = generateId('ord');
        const orderItems: OrderItem[] = [];
        let subtotal = 0;

        for (const reqItem of requestedItems) {
          const product = db.products.find(
            (p) => p.id === reqItem.productId && p.status === 'published'
          );
          if (!product) {
            throw new Error('One or more items in your bag are no longer available.');
          }
          const qty = Math.floor(Number(reqItem.quantity) || 0);
          if (qty <= 0) {
            throw new Error(`Invalid quantity for ${product.name}.`);
          }
          const { variant, unitPrice, maxStock } = resolveProductPricing(
            product,
            reqItem.variantId ?? null
          );
          if (qty > maxStock) {
            throw new Error(
              `Insufficient stock for ${product.name}${variant ? ` (${variant.label})` : ''}. Only ${maxStock} available.`
            );
          }

          const lineTotal = unitPrice * qty;
          subtotal += lineTotal;

          orderItems.push({
            id: generateId('oi'),
            orderId,
            productId: product.id,
            productName: product.name,
            sku: variant?.sku ?? product.sku,
            variantId: variant?.id ?? null,
            variantLabel: variant?.label ?? null,
            unitPrice,
            quantity: qty,
            lineTotal,
            imageUrl: product.images[0] ?? null,
          });
        }

        let discountAmount = 0;
        let appliedCode: string | null = null;
        if (discountCodeInput) {
          const dc = db.discountCodes.find(
            (d) => d.code.toUpperCase() === discountCodeInput && d.active
          );
          if (!dc) {
            throw new Error('The entered discount code is invalid or inactive.');
          }
          if (subtotal < dc.minOrderAmount) {
            throw new Error(
              `Discount code ${dc.code} requires a minimum subtotal of ₦${dc.minOrderAmount.toLocaleString()}.`
            );
          }
          discountAmount =
            dc.type === 'percent'
              ? Math.round((subtotal * dc.value) / 100)
              : Math.min(subtotal, dc.value);
          appliedCode = dc.code;
        }

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const freeThreshold = db.settings.freeDeliveryThreshold;
        const deliveryFee =
          freeThreshold !== null && discountedSubtotal >= freeThreshold
            ? 0
            : db.settings.deliveryFee;
        const taxAmount = Math.round((discountedSubtotal * db.settings.taxRatePercent) / 100);
        const totalAmount = discountedSubtotal + deliveryFee + taxAmount;

        const now = new Date().toISOString();
        const orderNumber = `VL-${new Date().getFullYear()}-${String(db.orders.length + 1001)}`;
        const paymentReference = `VL_PAY_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

        const order: Order = {
          id: orderId,
          orderNumber,
          userId: req.authUser?.id ?? null,
          customerName,
          customerEmail,
          customerPhone,
          deliveryAddress,
          city,
          state,
          postalCode,
          deliveryInstructions,
          subtotal,
          deliveryFee,
          taxAmount,
          discountAmount,
          discountCode: appliedCode,
          totalAmount,
          currency: db.settings.currency,
          status: 'Pending Payment',
          paymentStatus: 'unpaid',
          paymentReference,
          idempotencyKey: idempotencyKey || generateId('idem'),
          items: orderItems,
          statusHistory: [
            {
              status: 'Pending Payment',
              note: 'Order created and awaiting payment verification.',
              timestamp: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };

        db.orders.unshift(order);
        return { order, duplicate: false };
      }).catch((err: Error) => err);

      if (outcome instanceof Error) {
        return res.status(400).json({ error: outcome.message });
      }

      const { order } = outcome;

      if (!isPaystackConfigured()) {
        return res.status(201).json({
          order,
          paymentGateway: {
            configured: false,
            provider: 'paystack',
            message:
              'Order saved as Pending Payment. Configure PAYSTACK_SECRET_KEY in server environment secrets to initialize live or test Paystack checkout.',
          },
        });
      }

      const reference = order.paymentReference!;
      const callbackUrl = `${getBaseUrl(req)}/checkout/verify?reference=${encodeURIComponent(reference)}`;
      const init = await initializePaystackTransaction({
        email: order.customerEmail,
        amountKobo: Math.round(order.totalAmount * 100),
        reference,
        callbackUrl,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
      });

      await mutateDb((db) => {
        const ord = db.orders.find((o) => o.id === order.id);
        if (ord && ord.paymentStatus === 'unpaid') {
          ord.paymentStatus = 'pending';
        }
        const existingPay = db.payments.find((p) => p.reference === reference);
        if (!existingPay) {
          db.payments.unshift({
            id: generateId('pay'),
            orderId: order.id,
            orderNumber: order.orderNumber,
            gateway: 'paystack',
            reference,
            amount: order.totalAmount,
            currency: order.currency,
            status: 'pending',
            gatewayMessage: 'Initialized via Paystack',
            verifiedAt: null,
            createdAt: new Date().toISOString(),
          });
        }
      });

      return res.status(201).json({
        order,
        paymentGateway: {
          configured: true,
          provider: 'paystack',
          authorizationUrl: init.data!.authorization_url,
          reference: init.data!.reference,
        },
      });
    } catch (error: unknown) {
      console.error('Checkout error:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to initialize checkout right now.',
      });
    }
  });

  app.post('/api/checkout/orders/:id/retry-payment', optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const db = await getDb();
      const order = db.orders.find((o) => o.id === req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      if (order.paymentStatus === 'verified') {
        return res.status(400).json({ error: 'This order has already been paid.' });
      }
      if (!isPaystackConfigured()) {
        return res.status(503).json({
          error: 'PAYSTACK_SECRET_KEY is not configured on the server.',
        });
      }

      const newRef = `VL_PAY_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      await mutateDb((d) => {
        const ord = d.orders.find((o) => o.id === order.id);
        if (ord) {
          ord.paymentReference = newRef;
          ord.paymentStatus = 'pending';
          ord.updatedAt = new Date().toISOString();
        }
        d.payments.unshift({
          id: generateId('pay'),
          orderId: order.id,
          orderNumber: order.orderNumber,
          gateway: 'paystack',
          reference: newRef,
          amount: order.totalAmount,
          currency: order.currency,
          status: 'pending',
          gatewayMessage: 'Payment retry initialized',
          verifiedAt: null,
          createdAt: new Date().toISOString(),
        });
      });

      const callbackUrl = `${getBaseUrl(req)}/checkout/verify?reference=${encodeURIComponent(newRef)}`;
      const init = await initializePaystackTransaction({
        email: order.customerEmail,
        amountKobo: Math.round(order.totalAmount * 100),
        reference: newRef,
        callbackUrl,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      });

      return res.json({
        authorizationUrl: init.data!.authorization_url,
        reference: init.data!.reference,
      });
    } catch (error) {
      console.error('Retry payment error:', error);
      return res.status(500).json({ error: 'Unable to re-initialize Paystack payment.' });
    }
  });

  app.get('/api/payments/paystack/verify/:reference', async (req, res) => {
    try {
      const reference = sanitizeString(req.params.reference, 120);
      if (!reference) return res.status(400).json({ error: 'Payment reference required.' });

      const db = await getDb();
      const order = db.orders.find((o) => o.paymentReference === reference);
      if (!order) {
        return res.status(404).json({ error: 'Order matching this payment reference was not found.' });
      }

      if (order.paymentStatus === 'verified') {
        return res.json({ verified: true, order });
      }

      if (!isPaystackConfigured()) {
        return res.status(503).json({
          verified: false,
          error: 'PAYSTACK_SECRET_KEY is not configured on the server.',
          order,
        });
      }

      const verifyRes = await verifyPaystackTransaction(reference);
      const tx = verifyRes.data;
      if (!verifyRes.status || !tx) {
        return res.status(400).json({
          verified: false,
          error: verifyRes.message || 'Payment verification failed.',
          order,
        });
      }

      if (tx.status === 'success' && tx.amount >= Math.round(order.totalAmount * 100)) {
        const updatedOrder = await applyVerifiedPaymentToOrder(
          reference,
          tx.gateway_response || 'Approved',
          tx.amount
        );
        return res.json({ verified: true, order: updatedOrder });
      }

      await mutateDb((d) => {
        const ord = d.orders.find((o) => o.id === order.id);
        const pay = d.payments.find((p) => p.reference === reference);
        if (pay && pay.status !== 'verified') {
          pay.status = 'failed';
          pay.gatewayMessage = tx.gateway_response || tx.status;
        }
        if (ord && ord.paymentStatus !== 'verified') {
          ord.paymentStatus = 'failed';
          ord.updatedAt = new Date().toISOString();
        }
      });

      const refreshed = await getDb();
      const latestOrder = refreshed.orders.find((o) => o.id === order.id);
      return res.json({
        verified: false,
        status: tx.status,
        error: tx.gateway_response || 'Transaction was not completed.',
        order: latestOrder,
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      return res.status(500).json({ error: 'Failed to verify payment with Paystack.' });
    }
  });

  // =========================================================================
  // ADMINISTRATOR AUTH & STUDIO ROUTES
  // =========================================================================

  app.get('/api/admin/status', optionalAuth, async (req: AuthenticatedRequest, res) => {
    const db = await getDb();
    res.json({
      envConfigured: hasEnvAdminPasscode(),
      claimed: db.adminSecurity.claimed,
      authenticated: req.authRole === 'admin',
    });
  });

  app.post('/api/admin/claim', async (req, res) => {
    if (hasEnvAdminPasscode()) {
      return res.status(403).json({
        error: 'Administrator passcode is managed via server environment configuration.',
      });
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 8) {
      return res.status(400).json({ error: 'Administrator passcode must be at least 8 characters.' });
    }

    const claimed = await mutateDb((db) => {
      if (db.adminSecurity.claimed) return false;
      db.adminSecurity.claimed = true;
      db.adminSecurity.adminPasswordHash = hashPassword(password);
      return true;
    });

    if (!claimed) {
      return res.status(409).json({ error: 'Administrator access has already been claimed.' });
    }

    const adminUser = await ensureAdminAccount();
    const token = await createSession(adminUser.id, 'admin');
    return res.status(201).json({
      token,
      user: toPublicUser(adminUser),
    });
  });

  app.post('/api/admin/login', async (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password) {
      return res.status(400).json({ error: 'Administrator passcode is required.' });
    }

    const db = await getDb();
    let valid = false;

    if (hasEnvAdminPasscode()) {
      valid = verifyEnvAdminPasscode(password);
    } else if (db.adminSecurity.claimed && db.adminSecurity.adminPasswordHash) {
      valid = verifyPassword(password, db.adminSecurity.adminPasswordHash);
    } else {
      return res.status(409).json({
        error: 'Administrator access has not been claimed yet. Complete first-run setup first.',
      });
    }

    if (!valid) {
      return res.status(401).json({ error: 'Invalid administrator passcode.' });
    }

    const adminUser = await ensureAdminAccount();
    const token = await createSession(adminUser.id, 'admin');
    return res.json({
      token,
      user: toPublicUser(adminUser),
    });
  });

  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    const db = await getDb();
    const verifiedOrders = db.orders.filter((o) => o.paymentStatus === 'verified');
    const verifiedRevenue = verifiedOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = db.orders.filter(
      (o) => o.status === 'Pending Payment' || o.status === 'Paid' || o.status === 'Processing'
    ).length;
    const publishedProducts = db.products.filter((p) => p.status === 'published').length;
    const draftProducts = db.products.filter((p) => p.status === 'draft').length;
    const lowStockProducts = db.products.filter(
      (p) => p.status === 'published' && p.stockQuantity <= 3
    ).length;

    res.json({
      metrics: {
        totalOrders: db.orders.length,
        verifiedRevenue,
        pendingOrders,
        publishedProducts,
        draftProducts,
        lowStockProducts,
        totalCustomers: db.users.filter((u) => u.role === 'customer').length,
        subscriberCount: db.newsletterSubscribers.length,
        unreadMessages: db.contactMessages.filter((m) => m.status === 'new').length,
      },
      recentOrders: db.orders.slice(0, 8),
      paystackConfigured: isPaystackConfigured(),
    });
  });

  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({
      products: db.products,
      categories: db.categories,
      collections: db.collections,
    });
  });

  app.post('/api/admin/uploads', requireAdmin, async (req, res) => {
    try {
      const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
      const match = dataUrl.match(/^data:(image\/(jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Only JPEG, PNG, and WEBP image uploads are supported.' });
      }
      const ext = match[2] === 'jpeg' ? 'jpg' : match[2];
      const buffer = Buffer.from(match[3], 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size must be 5 MB or less.' });
      }

      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const filename = `product_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
      const targetPath = path.resolve(UPLOADS_DIR, filename);
      if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
        return res.status(403).json({ error: 'Invalid upload destination.' });
      }
      await fs.writeFile(targetPath, buffer);
      return res.status(201).json({ url: `/uploads/${filename}` });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to save uploaded image.' });
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {};
      const name = sanitizeString(body.name, 160);
      const description = sanitizeString(body.description, 3000);
      const price = Math.max(0, Number(body.price) || 0);
      const originalPrice =
        body.originalPrice !== null && body.originalPrice !== undefined && Number(body.originalPrice) > price
          ? Number(body.originalPrice)
          : null;
      const categoryId = sanitizeString(body.categoryId, 60);
      const sku = sanitizeString(body.sku, 60);

      if (!name || !categoryId || price <= 0 || !sku) {
        return res.status(400).json({
          error: 'Product name, category, positive price, and SKU are required.',
        });
      }

      const product = await mutateDb((db) => {
        const category = db.categories.find((c) => c.id === categoryId);
        if (!category) throw new Error('Selected category does not exist.');

        const variants = Array.isArray(body.variants)
          ? (body.variants as Product['variants']).map((v, i) => ({
              id: v.id || generateId(`var${i}`),
              label: sanitizeString(v.label, 80) || 'Standard',
              color: sanitizeString(v.color, 60) || 'Natural',
              colorHex: sanitizeString(v.colorHex, 20) || '#34483B',
              size: sanitizeString(v.size, 60) || 'Standard',
              sku: sanitizeString(v.sku, 60) || `${sku}-${i + 1}`,
              priceDelta: Number(v.priceDelta) || 0,
              stockQuantity: Math.max(0, Math.floor(Number(v.stockQuantity) || 0)),
            }))
          : [];

        const stockQuantity =
          variants.length > 0
            ? variants.reduce((sum, v) => sum + v.stockQuantity, 0)
            : Math.max(0, Math.floor(Number(body.stockQuantity) || 0));

        const status: Product['status'] =
          body.status === 'published' || body.status === 'archived' ? body.status : 'draft';
        const verified = status === 'published' ? true : Boolean(body.verified);
        const now = new Date().toISOString();

        const created: Product = {
          id: generateId('prod'),
          name,
          slug: slugify(name) + '-' + crypto.randomBytes(2).toString('hex'),
          categoryId: category.id,
          categoryName: category.name,
          collectionIds: Array.isArray(body.collectionIds) ? body.collectionIds : [],
          description,
          images: Array.isArray(body.images)
            ? body.images.filter((u: unknown) => typeof u === 'string' && u.length > 0)
            : [],
          price,
          originalPrice,
          variants,
          dimensions: sanitizeString(body.dimensions, 200),
          materials: Array.isArray(body.materials)
            ? body.materials.map((m: unknown) => sanitizeString(m, 80)).filter(Boolean)
            : [],
          colors: Array.isArray(body.colors)
            ? body.colors.map((c: unknown) => sanitizeString(c, 60)).filter(Boolean)
            : [],
          stockQuantity,
          availabilityStatus: computeAvailability(stockQuantity, status),
          sku,
          tags: Array.isArray(body.tags)
            ? body.tags.map((t: unknown) => sanitizeString(t, 50)).filter(Boolean)
            : [],
          featured: Boolean(body.featured),
          status,
          verified,
          salesCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        db.products.unshift(created);
        return created;
      });

      return res.status(201).json({ product });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to create product.',
      });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {};
      const updated = await mutateDb((db) => {
        const prod = db.products.find((p) => p.id === req.params.id);
        if (!prod) return null;

        if (typeof body.name === 'string' && body.name.trim()) {
          prod.name = sanitizeString(body.name, 160);
        }
        if (typeof body.description === 'string') {
          prod.description = sanitizeString(body.description, 3000);
        }
        if (body.price !== undefined) {
          prod.price = Math.max(0, Number(body.price) || prod.price);
        }
        if (body.originalPrice !== undefined) {
          prod.originalPrice =
            body.originalPrice !== null && Number(body.originalPrice) > prod.price
              ? Number(body.originalPrice)
              : null;
        }
        if (typeof body.categoryId === 'string') {
          const cat = db.categories.find((c) => c.id === body.categoryId);
          if (cat) {
            prod.categoryId = cat.id;
            prod.categoryName = cat.name;
          }
        }
        if (Array.isArray(body.collectionIds)) {
          prod.collectionIds = body.collectionIds;
        }
        if (Array.isArray(body.images)) {
          prod.images = body.images.filter((u: unknown) => typeof u === 'string' && u.length > 0);
        }
        if (typeof body.dimensions === 'string') {
          prod.dimensions = sanitizeString(body.dimensions, 200);
        }
        if (Array.isArray(body.materials)) {
          prod.materials = body.materials.map((m: unknown) => sanitizeString(m, 80)).filter(Boolean);
        }
        if (Array.isArray(body.colors)) {
          prod.colors = body.colors.map((c: unknown) => sanitizeString(c, 60)).filter(Boolean);
        }
        if (typeof body.sku === 'string' && body.sku.trim()) {
          prod.sku = sanitizeString(body.sku, 60);
        }
        if (Array.isArray(body.tags)) {
          prod.tags = body.tags.map((t: unknown) => sanitizeString(t, 50)).filter(Boolean);
        }
        if (body.featured !== undefined) {
          prod.featured = Boolean(body.featured);
        }
        if (Array.isArray(body.variants)) {
          prod.variants = (body.variants as Product['variants']).map((v, i) => ({
            id: v.id || generateId(`var${i}`),
            label: sanitizeString(v.label, 80) || 'Standard',
            color: sanitizeString(v.color, 60) || 'Natural',
            colorHex: sanitizeString(v.colorHex, 20) || '#34483B',
            size: sanitizeString(v.size, 60) || 'Standard',
            sku: sanitizeString(v.sku, 60) || `${prod.sku}-${i + 1}`,
            priceDelta: Number(v.priceDelta) || 0,
            stockQuantity: Math.max(0, Math.floor(Number(v.stockQuantity) || 0)),
          }));
        }

        if (prod.variants.length > 0 && body.variants !== undefined) {
          prod.stockQuantity = prod.variants.reduce((sum, v) => sum + v.stockQuantity, 0);
        } else if (body.stockQuantity !== undefined) {
          prod.stockQuantity = Math.max(0, Math.floor(Number(body.stockQuantity) || 0));
        }

        if (body.status === 'draft' || body.status === 'published' || body.status === 'archived') {
          prod.status = body.status;
          if (body.status === 'published') prod.verified = true;
        }
        if (body.verified !== undefined) {
          prod.verified = Boolean(body.verified);
        }

        prod.availabilityStatus = computeAvailability(prod.stockQuantity, prod.status);
        prod.updatedAt = new Date().toISOString();
        return prod;
      });

      if (!updated) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ product: updated });
    } catch (error) {
      console.error('Update product error:', error);
      return res.status(400).json({ error: 'Failed to update product.' });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    await mutateDb((db) => {
      db.products = db.products.filter((p) => p.id !== req.params.id);
    });
    res.json({ success: true });
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    const name = sanitizeString(req.body?.name, 80);
    const parentGroup = req.body?.parentGroup || 'Living Room';
    const description = sanitizeString(req.body?.description, 300);
    if (!name) return res.status(400).json({ error: 'Category name is required.' });

    const category = await mutateDb((db) => {
      const created = {
        id: generateId('cat'),
        name,
        slug: slugify(name),
        parentGroup,
        description,
        sortOrder: db.categories.length + 1,
      };
      db.categories.push(created);
      return created;
    });
    return res.status(201).json({ category });
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    await mutateDb((db) => {
      db.categories = db.categories.filter((c) => c.id !== req.params.id);
    });
    res.json({ success: true });
  });

  app.put('/api/admin/collections/:id', requireAdmin, async (req, res) => {
    const updated = await mutateDb((db) => {
      const col = db.collections.find((c) => c.id === req.params.id);
      if (!col) return null;
      if (typeof req.body?.name === 'string' && req.body.name.trim()) {
        col.name = sanitizeString(req.body.name, 100);
      }
      if (typeof req.body?.description === 'string') {
        col.description = sanitizeString(req.body.description, 400);
      }
      if (typeof req.body?.imageUrl === 'string' && req.body.imageUrl.trim()) {
        col.imageUrl = sanitizeString(req.body.imageUrl, 300);
      }
      if (req.body?.featured !== undefined) {
        col.featured = Boolean(req.body.featured);
      }
      return col;
    });
    if (!updated) return res.status(404).json({ error: 'Collection not found.' });
    return res.json({ collection: updated });
  });

  app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({ orders: db.orders, payments: db.payments });
  });

  app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    const status = req.body?.status as OrderStatus;
    const note = sanitizeString(req.body?.note, 300) || `Status updated to ${status}`;
    const validStatuses: OrderStatus[] = [
      'Pending Payment',
      'Paid',
      'Processing',
      'Shipped',
      'Delivered',
      'Cancelled',
      'Refunded',
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const updated = await mutateDb((db) => {
      const order = db.orders.find((o) => o.id === req.params.id);
      if (!order) return null;

      const wasPaidFlow =
        order.paymentStatus === 'verified' &&
        order.status !== 'Cancelled' &&
        order.status !== 'Refunded';
      const movingToCancelledOrRefunded = status === 'Cancelled' || status === 'Refunded';

      // Restore inventory if cancelling or refunding a paid order
      if (wasPaidFlow && movingToCancelledOrRefunded) {
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            if (item.variantId) {
              const v = prod.variants.find((vr) => vr.id === item.variantId);
              if (v) v.stockQuantity += item.quantity;
              prod.stockQuantity = prod.variants.reduce((sum, vr) => sum + vr.stockQuantity, 0);
            } else {
              prod.stockQuantity += item.quantity;
            }
            prod.availabilityStatus = computeAvailability(prod.stockQuantity, prod.status);
          }
        }
        if (status === 'Refunded') {
          order.paymentStatus = 'refunded';
        }
      }

      order.status = status;
      order.updatedAt = new Date().toISOString();
      order.statusHistory.push({
        status,
        note,
        timestamp: order.updatedAt,
      });
      return order;
    });

    if (!updated) return res.status(404).json({ error: 'Order not found.' });
    return res.json({ order: updated });
  });

  app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
    const db = await getDb();
    const customers = db.users
      .filter((u) => u.role === 'customer')
      .map((u) => {
        const userOrders = db.orders.filter(
          (o) =>
            o.userId === u.id || o.customerEmail.toLowerCase() === u.email.toLowerCase()
        );
        const totalSpent = userOrders
          .filter((o) => o.paymentStatus === 'verified')
          .reduce((sum, o) => sum + o.totalAmount, 0);
        return {
          ...toPublicUser(u),
          orderCount: userOrders.length,
          totalSpent,
        };
      });
    res.json({ customers });
  });

  app.get('/api/admin/discounts', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({ discounts: db.discountCodes });
  });

  app.post('/api/admin/discounts', requireAdmin, async (req, res) => {
    const code = sanitizeString(req.body?.code, 40).toUpperCase();
    const type: 'fixed' | 'percent' = req.body?.type === 'fixed' ? 'fixed' : 'percent';
    const value = Math.max(1, Number(req.body?.value) || 0);
    const minOrderAmount = Math.max(0, Number(req.body?.minOrderAmount) || 0);
    if (!code || value <= 0) {
      return res.status(400).json({ error: 'Code and positive discount value are required.' });
    }
    const created = await mutateDb((db) => {
      if (db.discountCodes.some((d) => d.code.toUpperCase() === code)) {
        throw new Error('Discount code already exists.');
      }
      const item = {
        id: generateId('dc'),
        code,
        type,
        value,
        minOrderAmount,
        active: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      db.discountCodes.unshift(item);
      return item;
    }).catch((err: Error) => err);

    if (created instanceof Error) {
      return res.status(400).json({ error: created.message });
    }
    return res.status(201).json({ discount: created });
  });

  app.put('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
    const updated = await mutateDb((db) => {
      const dc = db.discountCodes.find((d) => d.id === req.params.id);
      if (!dc) return null;
      if (req.body?.active !== undefined) dc.active = Boolean(req.body.active);
      return dc;
    });
    if (!updated) return res.status(404).json({ error: 'Discount not found.' });
    return res.json({ discount: updated });
  });

  app.delete('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
    await mutateDb((db) => {
      db.discountCodes = db.discountCodes.filter((d) => d.id !== req.params.id);
    });
    res.json({ success: true });
  });

  app.get('/api/admin/subscribers', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({ subscribers: db.newsletterSubscribers });
  });

  app.get('/api/admin/messages', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({ messages: db.contactMessages });
  });

  app.put('/api/admin/messages/:id', requireAdmin, async (req, res) => {
    await mutateDb((db) => {
      const msg = db.contactMessages.find((m) => m.id === req.params.id);
      if (msg) msg.status = 'reviewed';
    });
    res.json({ success: true });
  });

  app.get('/api/admin/journal', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({ posts: db.journalPosts });
  });

  app.post('/api/admin/journal', requireAdmin, async (req, res) => {
    const title = sanitizeString(req.body?.title, 180);
    const category = sanitizeString(req.body?.category, 80) || 'Interior Notes';
    const excerpt = sanitizeString(req.body?.excerpt, 400);
    const content = sanitizeString(req.body?.content, 5000);
    const imageUrl =
      sanitizeString(req.body?.imageUrl, 300) ||
      '/src/assets/images/hero_verdant_living_1795462775962.jpg';

    if (!title || !content) {
      return res.status(400).json({ error: 'Article title and content are required.' });
    }
    const post = await mutateDb((db) => {
      const created = {
        id: generateId('post'),
        title,
        slug: slugify(title) + '-' + crypto.randomBytes(2).toString('hex'),
        category,
        excerpt: excerpt || content.slice(0, 140) + '...',
        content,
        imageUrl,
        publishedAt: new Date().toISOString().slice(0, 10),
        readTime: `${Math.max(2, Math.ceil(content.split(/\s+/).length / 180))} min read`,
        published: true,
      };
      db.journalPosts.unshift(created);
      return created;
    });
    return res.status(201).json({ post });
  });

  app.delete('/api/admin/journal/:id', requireAdmin, async (req, res) => {
    await mutateDb((db) => {
      db.journalPosts = db.journalPosts.filter((p) => p.id !== req.params.id);
    });
    res.json({ success: true });
  });

  app.get('/api/admin/settings', requireAdmin, async (_req, res) => {
    const db = await getDb();
    res.json({
      settings: {
        ...db.settings,
        paystackConfigured: isPaystackConfigured(),
      },
    });
  });

  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const body = req.body ?? {};
    const updated = await mutateDb((db) => {
      if (typeof body.storeName === 'string' && body.storeName.trim()) {
        db.settings.storeName = sanitizeString(body.storeName, 80);
      }
      if (body.deliveryFee !== undefined) {
        db.settings.deliveryFee = Math.max(0, Number(body.deliveryFee) || 0);
      }
      if (body.freeDeliveryThreshold !== undefined) {
        db.settings.freeDeliveryThreshold =
          body.freeDeliveryThreshold === null || body.freeDeliveryThreshold === ''
            ? null
            : Math.max(0, Number(body.freeDeliveryThreshold) || 0);
      }
      if (body.taxRatePercent !== undefined) {
        db.settings.taxRatePercent = Math.max(0, Math.min(30, Number(body.taxRatePercent) || 0));
      }
      if (typeof body.deliveryPromiseText === 'string') {
        db.settings.deliveryPromiseText = sanitizeString(body.deliveryPromiseText, 240);
      }
      if (typeof body.deliveryPolicySummary === 'string') {
        db.settings.deliveryPolicySummary = sanitizeString(body.deliveryPolicySummary, 400);
      }
      if (typeof body.returnPolicySummary === 'string') {
        db.settings.returnPolicySummary = sanitizeString(body.returnPolicySummary, 400);
      }
      if (typeof body.supportEmail === 'string') {
        db.settings.supportEmail = sanitizeString(body.supportEmail, 160);
      }
      if (typeof body.supportPhone === 'string') {
        db.settings.supportPhone = sanitizeString(body.supportPhone, 60);
      }
      if (typeof body.showroomAddress === 'string') {
        db.settings.showroomAddress = sanitizeString(body.showroomAddress, 240);
      }
      if (typeof body.heroHeadline === 'string' && body.heroHeadline.trim()) {
        db.settings.heroHeadline = sanitizeString(body.heroHeadline, 140);
      }
      if (typeof body.heroSubtext === 'string') {
        db.settings.heroSubtext = sanitizeString(body.heroSubtext, 400);
      }
      if (typeof body.storyHeadline === 'string' && body.storyHeadline.trim()) {
        db.settings.storyHeadline = sanitizeString(body.storyHeadline, 140);
      }
      if (typeof body.storyText === 'string') {
        db.settings.storyText = sanitizeString(body.storyText, 600);
      }
      return db.settings;
    });

    res.json({
      settings: {
        ...updated,
        paystackConfigured: isPaystackConfigured(),
      },
    });
  });

  // =========================================================================
  // VITE / STATIC SERVING
  // =========================================================================

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Verdant Living server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Verdant Living server:', err);
  process.exit(1);
});
