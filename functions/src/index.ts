/**
 * Firebase Cloud Functions for Anna ERP
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

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

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
    service: 'Anna ERP Functions'
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
