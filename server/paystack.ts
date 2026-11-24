import crypto from 'node:crypto';

export interface PaystackInitParams {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string; // 'success' | 'failed' | 'abandoned'
    reference: string;
    amount: number; // in kobo
    currency: string;
    gateway_response: string;
    paid_at?: string;
    channel?: string;
  };
}

export function getPaystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!key || key === 'MY_PAYSTACK_SECRET_KEY') return null;
  return key;
}

export function isPaystackConfigured(): boolean {
  return getPaystackSecretKey() !== null;
}

export async function initializePaystackTransaction(
  params: PaystackInitParams
): Promise<PaystackInitResponse> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error('PAYSTACK_NOT_CONFIGURED');
  }

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountKobo),
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: 'NGN',
      metadata: params.metadata ?? {},
    }),
  });

  const data = (await response.json()) as PaystackInitResponse;
  if (!response.ok || !data.status) {
    throw new Error(data.message || 'Unable to initialize Paystack transaction.');
  }
  return data;
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    throw new Error('PAYSTACK_NOT_CONFIGURED');
  }

  const encodedRef = encodeURIComponent(reference);
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodedRef}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
    },
  });

  const data = (await response.json()) as PaystackVerifyResponse;
  if (!response.ok) {
    throw new Error(data.message || 'Failed to verify Paystack transaction.');
  }
  return data;
}

export function verifyPaystackWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signatureHeader) return false;
  const computed = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
  const a = Buffer.from(computed);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
