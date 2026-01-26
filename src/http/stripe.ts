import type { IncomingMessage } from 'http';

function formEncode(obj: Record<string, string | number | boolean | undefined | null>): string {
  const pairs: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return pairs.join('&');
}

async function stripeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  const secretKey = process.env.SEI_MCP_STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE não configurado: defina SEI_MCP_STRIPE_SECRET_KEY');

  const url = method === 'GET' && params
    ? `https://api.stripe.com${path}?${formEncode(params)}`
    : `https://api.stripe.com${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? formEncode(params ?? {}) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json && typeof json === 'object' && 'error' in json)
      ? (json as any).error?.message
      : undefined;
    throw new Error(msg || `Stripe error (${res.status})`);
  }
  return json as T;
}

export async function createCheckoutSession(params: {
  plan: 'starter' | 'pro';
  customerEmail: string;
  baseUrl: string;
}): Promise<{ url: string }> {
  const priceStarter = process.env.SEI_MCP_STRIPE_PRICE_STARTER_MONTHLY;
  const pricePro = process.env.SEI_MCP_STRIPE_PRICE_PRO_MONTHLY;
  const price = params.plan === 'starter' ? priceStarter : pricePro;
  if (!price) throw new Error(`Price ID não configurado para ${params.plan} (env SEI_MCP_STRIPE_PRICE_...)`);

  const successUrl = process.env.SEI_MCP_STRIPE_SUCCESS_URL || `${params.baseUrl}/pricing?success=1`;
  const cancelUrl = process.env.SEI_MCP_STRIPE_CANCEL_URL || `${params.baseUrl}/pricing?canceled=1`;

  const session = await stripeRequest<{ url: string }>('POST', '/v1/checkout/sessions', {
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: params.customerEmail,
    'line_items[0][price]': price,
    'line_items[0][quantity]': 1,
    allow_promotion_codes: true,
  });

  if (!session.url) throw new Error('Stripe não retornou URL do checkout');
  return { url: session.url };
}

export async function createPortalSession(params: {
  customerEmail: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  // Buscar customer por email
  const list = await stripeRequest<{ data: Array<{ id: string }> }>('GET', '/v1/customers', {
    email: params.customerEmail,
    limit: 1,
  });
  const customerId = list.data?.[0]?.id;
  if (!customerId) throw new Error('Nenhum cliente Stripe encontrado para este email');

  const portal = await stripeRequest<{ url: string }>('POST', '/v1/billing_portal/sessions', {
    customer: customerId,
    return_url: params.returnUrl,
  });
  if (!portal.url) throw new Error('Stripe não retornou URL do portal');
  return { url: portal.url };
}

export async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

