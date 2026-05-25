// ═══════════════════════════════════════════════════════════════
// /api/create-order.js  —  Vercel serverless function
//
// Receives the cart from the website, creates a Square Payment Link
// via the Orders + Online Checkout API, returns the checkout URL.
// Customer pays on Square → order auto-appears on Square POS / KDS.
//
// Required Environment Variables (set in Vercel dashboard):
//   SQUARE_ACCESS_TOKEN    — Production or Sandbox token
//   SQUARE_LOCATION_ID     — Mill Park location ID
//   SQUARE_ENV             — "sandbox" or "production"  (default: production)
//   SITE_URL               — e.g. "https://justdosa.com.au"  (for redirect)
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  // ── CORS headers (allow same-origin POST) ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, customerName, customerPhone, pickupTime, notes } = req.body || {};

    // ── Basic validation ──
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    for (const i of items) {
      if (!i.name || typeof i.price !== 'number' || !i.qty || i.qty < 1) {
        return res.status(400).json({ error: 'Invalid cart item: ' + JSON.stringify(i) });
      }
    }

    // ── Required env check ──
    const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
    const LOCATION = process.env.SQUARE_LOCATION_ID;
    if (!TOKEN || !LOCATION) {
      console.error('Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID env var');
      return res.status(500).json({ error: 'Server is not configured for online payments' });
    }

    // ── Pick API host based on environment ──
    const isSandbox = (process.env.SQUARE_ENV || 'production').toLowerCase() === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com';

    // ── Determine redirect URL after payment ──
    const siteUrl = process.env.SITE_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const redirectUrl = siteUrl ? `${siteUrl}/order-success.html` : undefined;

    // ── Build Square line items (amounts in CENTS, AUD) ──
    const line_items = items.map(i => ({
      name: String(i.name).slice(0, 255),
      quantity: String(i.qty),
      base_price_money: {
        amount: Math.round(i.price * 100),
        currency: 'AUD'
      }
    }));

    // ── Build the order metadata ──
    const note = [
      customerName  ? `Name: ${customerName}`     : '',
      customerPhone ? `Phone: ${customerPhone}`   : '',
      pickupTime    ? `Pickup: ${pickupTime}`     : '',
      notes         ? `Notes: ${notes}`           : ''
    ].filter(Boolean).join(' | ').slice(0, 500);

    // ── Build the Square API payload ──
    const body = {
      idempotency_key: (globalThis.crypto && globalThis.crypto.randomUUID)
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      order: {
        location_id: LOCATION,
        line_items,
        ...(note ? { note } : {})
      },
      checkout_options: {
        allow_tipping: true,
        ask_for_shipping_address: false,
        ...(redirectUrl ? { redirect_url: redirectUrl } : {})
      },
      ...(customerName || customerPhone
        ? { pre_populated_data: {
              ...(customerName  ? { buyer_email: '' } : {}),
              ...(customerPhone ? { buyer_phone_number: customerPhone } : {})
          } }
        : {})
    };

    // ── Call Square ──
    const sqRes = await fetch(`${baseUrl}/v2/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await sqRes.json();

    if (!sqRes.ok) {
      console.error('Square API error:', JSON.stringify(data));
      const msg = data?.errors?.[0]?.detail || 'Could not create payment link';
      return res.status(502).json({ error: msg });
    }

    const paymentUrl = data?.payment_link?.url;
    const orderId    = data?.payment_link?.order_id;

    if (!paymentUrl) {
      console.error('Square returned no payment URL:', data);
      return res.status(502).json({ error: 'No payment URL returned from Square' });
    }

    return res.status(200).json({ paymentUrl, orderId });

  } catch (err) {
    console.error('create-order failed:', err);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
}
