/**
 * Firebase Cloud Functions for ThisAI ERP
 *
 * This file contains the Razorpay webhook handler for automatic subscription activation.
 *
 * SETUP INSTRUCTIONS:
 * 1. Install dependencies: cd functions && npm install
 * 2. Set Razorpay secret: firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET"
 * 3. Deploy: firebase deploy --only functions
 * 4. Copy the webhook URL and add it to Razorpay Dashboard → Settings → Webhooks
 * 5. Select events: payment.captured, subscription.activated
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const apiApp = express();

type UserRole = 'admin' | 'manager' | 'cashier';

type ApiUser = {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  companyName: string;
  companyId: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
};

type JwtPayload = {
  sub: string;
  email: string;
  companyId: string;
  role: UserRole;
};

type AuthedRequest = express.Request & {
  user?: JwtPayload;
};

const jwtSecret = process.env.JWT_SECRET || functions.config().api?.jwt_secret || 'thisai-erp-production-secret-2026';
const usersCollection = 'api_users';
const recordsCollection = 'api_records';
const entityTypes = ['items', 'parties', 'invoices', 'expenses', 'quotations', 'leads', 'visitors', 'banking', 'settings', 'permissions'];

const defaultAdmins = [
  {
    email: 'admin@thisaitech.com',
    password: 'ThisAI@2024!',
    displayName: 'ThisAI Admin',
    companyName: 'Thisai Technology',
  },
  {
    email: 'admin@sandrasoftware.com',
    password: 'Sandra@2024!',
    displayName: 'Sandra Admin',
    companyName: 'Sandra Software',
  },
];

function deriveCompanyId(email: string, companyName: string): string {
  const source = companyName.trim() || email.split('@')[1] || 'default-company';
  return source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default-company';
}

function publicUser(user: ApiUser) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    companyName: user.companyName,
    companyId: user.companyId,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

async function getUserByEmail(email: string): Promise<ApiUser | null> {
  const snapshot = await db.collection(usersCollection).where('email', '==', email.toLowerCase()).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as ApiUser;
}

async function ensureDefaultAdmins(): Promise<void> {
  for (const adminUser of defaultAdmins) {
    const email = adminUser.email.toLowerCase();
    const existing = await getUserByEmail(email);
    if (existing) continue;

    const now = new Date().toISOString();
    const uid = crypto.randomUUID();
    const user: ApiUser = {
      uid,
      email,
      passwordHash: await bcrypt.hash(adminUser.password, 10),
      displayName: adminUser.displayName,
      companyName: adminUser.companyName,
      companyId: deriveCompanyId(email, adminUser.companyName),
      role: 'admin',
      status: 'active',
      createdAt: now,
      lastLogin: now,
    };

    await db.collection(usersCollection).doc(uid).set(user);
  }
}

function requireAuth(req: AuthedRequest, res: express.Response, next: express.NextFunction): void {
  const header = req.headers.authorization || '';
  const [kind, token] = header.split(' ');
  if (kind !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return;
  }

  try {
    req.user = jwt.verify(token, jwtSecret) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

apiApp.use(express.json({ limit: '5mb' }));
apiApp.use(cors({ origin: true, credentials: true }));

apiApp.get('/api/health', async (_req: express.Request, res: express.Response) => {
  await ensureDefaultAdmins();
  res.json({ ok: true });
});

apiApp.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  await ensureDefaultAdmins();

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await getUserByEmail(email);
  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const lastLogin = new Date().toISOString();
  await db.collection(usersCollection).doc(user.uid).update({ lastLogin });
  const updatedUser = { ...user, lastLogin };

  res.json({
    token: signToken({ sub: user.uid, email: user.email, companyId: user.companyId, role: user.role }),
    user: publicUser(updatedUser),
  });
});

apiApp.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
  await ensureDefaultAdmins();

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const displayName = String(req.body?.displayName || '').trim();
  const companyName = String(req.body?.companyName || '').trim();
  if (!email || !password || !displayName || !companyName) {
    res.status(400).json({ error: 'Email, password, display name, and company name are required' });
    return;
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const now = new Date().toISOString();
  const uid = crypto.randomUUID();
  const user: ApiUser = {
    uid,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    displayName,
    companyName,
    companyId: deriveCompanyId(email, companyName),
    role: 'admin',
    status: 'active',
    createdAt: now,
    lastLogin: now,
  };

  await db.collection(usersCollection).doc(uid).set(user);

  res.status(201).json({
    token: signToken({ sub: uid, email, companyId: user.companyId, role: user.role }),
    user: publicUser(user),
  });
});

for (const type of entityTypes) {
  const router = express.Router();

  router.get('/', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId;
    const snapshot = await db.collection(recordsCollection)
      .where('companyId', '==', companyId)
      .where('type', '==', type)
      .orderBy('updatedAt', 'desc')
      .get();

    res.json({ data: snapshot.docs.map((doc) => doc.data().data) });
  });

  router.get('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId;
    const id = req.params.id;
    const doc = await db.collection(recordsCollection).doc(`${companyId}_${type}_${id}`).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ data: doc.data()?.data });
  });

  router.post('/', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId || 'default-company';
    const now = new Date().toISOString();
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID();
    const data = { ...body, id, companyId, createdAt: body.createdAt || now, updatedAt: now };

    await db.collection(recordsCollection).doc(`${companyId}_${type}_${id}`).set({
      id,
      companyId,
      type,
      data,
      createdAt: data.createdAt,
      updatedAt: now,
    });

    res.status(201).json({ data });
  });

  router.put('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId || 'default-company';
    const id = req.params.id;
    const now = new Date().toISOString();
    const ref = db.collection(recordsCollection).doc(`${companyId}_${type}_${id}`);
    const existing = await ref.get();
    const existingData = existing.exists ? existing.data()?.data || {} : {};
    const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const data = { ...existingData, ...body, id, companyId, createdAt: existingData.createdAt || body.createdAt || now, updatedAt: now };

    await ref.set({
      id,
      companyId,
      type,
      data,
      createdAt: data.createdAt,
      updatedAt: now,
    });

    res.json({ data });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const companyId = req.user?.companyId || 'default-company';
    await db.collection(recordsCollection).doc(`${companyId}_${type}_${req.params.id}`).delete();
    res.json({ ok: true });
  });

  apiApp.use(`/api/${type}`, requireAuth, router);
}

export const api = functions.https.onRequest(apiApp);

// Razorpay webhook secret from Firebase config
const getRazorpayWebhookSecret = (): string => {
  return functions.config().razorpay?.webhook_secret || process.env.RAZORPAY_WEBHOOK_SECRET || '';
};

// Verify Razorpay webhook signature
const verifyWebhookSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Update subscription status in Firestore
const activateSubscription = async (
  companyId: string,
  paymentId: string,
  orderId: string,
  billingCycle: 'monthly' | 'yearly',
  amount: number
): Promise<void> => {
  const subscriptionRef = db.collection('subscriptions').doc(companyId);
  const subscriptionDoc = await subscriptionRef.get();

  if (!subscriptionDoc.exists) {
    console.error(`Subscription not found for company: ${companyId}`);
    return;
  }

  const now = new Date();
  const subscriptionEndDate = new Date(now);

  if (billingCycle === 'monthly') {
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
  } else {
    subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
  }

  // Update subscription
  await subscriptionRef.update({
    status: 'active',
    billingCycle: billingCycle,
    subscriptionStartDate: now.toISOString(),
    subscriptionEndDate: subscriptionEndDate.toISOString(),
    lastPaymentId: paymentId,
    lastOrderId: orderId,
    lastPaymentDate: now.toISOString(),
    paymentProvider: 'razorpay',
    updatedAt: now.toISOString(),
    webhookActivated: true // Flag to indicate webhook activation
  });

  // Create billing record
  await db.collection('billing_records').add({
    companyId: companyId,
    subscriptionId: companyId, // Using companyId as subscription ID
    billingDate: now.toISOString(),
    amount: amount / 100, // Razorpay sends amount in paise
    currency: 'INR',
    status: 'paid',
    paymentId: paymentId,
    orderId: orderId,
    billingCycle: billingCycle,
    paymentMethod: 'razorpay',
    createdAt: now.toISOString()
  });

  console.log(`Subscription activated for company ${companyId} via webhook`);
};

// Extract company ID from Razorpay notes
const extractCompanyId = (notes: Record<string, string>): string | null => {
  // Razorpay notes contain companyId and subscriptionId
  return notes?.companyId || notes?.company_id || null;
};

// Extract billing cycle from amount or notes
const extractBillingCycle = (
  amount: number,
  notes: Record<string, string>
): 'monthly' | 'yearly' => {
  // Check notes first
  if (notes?.billingCycle) {
    return notes.billingCycle as 'monthly' | 'yearly';
  }
  if (notes?.billing_cycle) {
    return notes.billing_cycle as 'monthly' | 'yearly';
  }

  // Fallback: determine from amount (in paise)
  // Monthly: 49900 (₹499), Yearly: 499900 (₹4999)
  if (amount >= 400000) {
    return 'yearly';
  }
  return 'monthly';
};

/**
 * Razorpay Webhook Handler
 *
 * This function handles Razorpay payment webhooks for subscription activation.
 *
 * Events handled:
 * - payment.captured: When a payment is successfully captured
 * - order.paid: When an order is fully paid
 *
 * Webhook URL (after deployment):
 * https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook
 */
export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string;
  const webhookSecret = getRazorpayWebhookSecret();

  if (!webhookSecret) {
    console.error('Razorpay webhook secret not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  if (!signature) {
    console.error('Missing Razorpay signature header');
    res.status(400).send('Missing signature');
    return;
  }

  // Get raw body for signature verification
  const rawBody = JSON.stringify(req.body);

  // Verify signature
  try {
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      res.status(401).send('Invalid signature');
      return;
    }
  } catch (error) {
    console.error('Signature verification failed:', error);
    res.status(401).send('Signature verification failed');
    return;
  }

  // Parse webhook event
  const event = req.body;
  const eventType = event.event;

  console.log(`Received Razorpay webhook: ${eventType}`);

  try {
    // Handle payment.captured event
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = event.payload?.payment?.entity || event.payload?.order?.entity?.payments?.[0];

      if (!payment) {
        console.error('No payment data in webhook');
        res.status(400).send('No payment data');
        return;
      }

      const notes = payment.notes || {};
      const companyId = extractCompanyId(notes);

      if (!companyId) {
        console.error('No company ID in payment notes');
        // Still return 200 to acknowledge receipt (might be a non-subscription payment)
        res.status(200).json({
          received: true,
          message: 'No company ID found - not a subscription payment'
        });
        return;
      }

      const paymentId = payment.id;
      const orderId = payment.order_id;
      const amount = payment.amount;
      const billingCycle = extractBillingCycle(amount, notes);

      await activateSubscription(companyId, paymentId, orderId, billingCycle, amount);

      console.log(`Successfully processed payment for company: ${companyId}`);
      res.status(200).json({
        received: true,
        companyId,
        paymentId,
        billingCycle,
        message: 'Subscription activated successfully'
      });
      return;
    }

    // Handle subscription.activated (if using Razorpay Subscriptions)
    if (eventType === 'subscription.activated') {
      const subscription = event.payload?.subscription?.entity;
      const notes = subscription?.notes || {};
      const companyId = extractCompanyId(notes);

      if (companyId) {
        const planId = subscription.plan_id;
        const billingCycle = planId?.includes('yearly') ? 'yearly' : 'monthly';

        await activateSubscription(
          companyId,
          subscription.id,
          '',
          billingCycle,
          subscription.current_start ? subscription.current_start * 100 : 49900
        );
      }

      res.status(200).json({ received: true, message: 'Subscription activated' });
      return;
    }

    // Handle subscription.cancelled
    if (eventType === 'subscription.cancelled') {
      const subscription = event.payload?.subscription?.entity;
      const notes = subscription?.notes || {};
      const companyId = extractCompanyId(notes);

      if (companyId) {
        const subscriptionRef = db.collection('subscriptions').doc(companyId);
        await subscriptionRef.update({
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: 'User cancelled via Razorpay',
          updatedAt: new Date().toISOString()
        });
      }

      res.status(200).json({ received: true, message: 'Subscription cancelled' });
      return;
    }

    // Acknowledge other events we don't process
    console.log(`Unhandled event type: ${eventType}`);
    res.status(200).json({
      received: true,
      message: `Event ${eventType} acknowledged but not processed`
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * Health check endpoint
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ThisAI ERP Functions'
  });
});

/**
 * Daily subscription status check (scheduled function)
 * Runs every day at midnight to update expired subscriptions
 */
export const checkExpiredSubscriptions = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const now = new Date();

    // Find subscriptions that have expired
    const expiredQuery = await db.collection('subscriptions')
      .where('status', 'in', ['active', 'trialing'])
      .get();

    let updatedCount = 0;

    for (const doc of expiredQuery.docs) {
      const data = doc.data();

      // Check trial expiry
      if (data.status === 'trialing' && data.trialEndDate) {
        const trialEnd = new Date(data.trialEndDate);
        if (now > trialEnd) {
          // Trial expired - move to grace period
          const gracePeriodEnd = new Date(trialEnd);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

          if (now > gracePeriodEnd) {
            // Grace period also expired
            await doc.ref.update({
              status: 'expired',
              updatedAt: now.toISOString()
            });
          } else {
            // In grace period
            await doc.ref.update({
              status: 'grace_period',
              updatedAt: now.toISOString()
            });
          }
          updatedCount++;
        }
      }

      // Check subscription expiry
      if (data.status === 'active' && data.subscriptionEndDate) {
        const subEnd = new Date(data.subscriptionEndDate);
        if (now > subEnd) {
          // Check grace period
          const gracePeriodEnd = new Date(subEnd);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

          if (now > gracePeriodEnd) {
            await doc.ref.update({
              status: 'expired',
              updatedAt: now.toISOString()
            });
          } else {
            await doc.ref.update({
              status: 'grace_period',
              updatedAt: now.toISOString()
            });
          }
          updatedCount++;
        }
      }
    }

    console.log(`Checked ${expiredQuery.size} subscriptions, updated ${updatedCount}`);
    return null;
  });
