"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkExpiredSubscriptions = exports.healthCheck = exports.razorpayWebhook = exports.api = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const apiApp = (0, express_1.default)();
const jwtSecret = process.env.JWT_SECRET || ((_a = functions.config().api) === null || _a === void 0 ? void 0 : _a.jwt_secret) || 'thisai-erp-production-secret-2026';
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
function deriveCompanyId(email, companyName) {
    const source = companyName.trim() || email.split('@')[1] || 'default-company';
    return source.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default-company';
}
function publicUser(user) {
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
function signToken(payload) {
    return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}
async function getUserByEmail(email) {
    const snapshot = await db.collection(usersCollection).where('email', '==', email.toLowerCase()).limit(1).get();
    if (snapshot.empty)
        return null;
    return snapshot.docs[0].data();
}
async function ensureDefaultAdmins() {
    for (const adminUser of defaultAdmins) {
        const email = adminUser.email.toLowerCase();
        const existing = await getUserByEmail(email);
        if (existing)
            continue;
        const now = new Date().toISOString();
        const uid = crypto.randomUUID();
        const user = {
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
function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [kind, token] = header.split(' ');
    if (kind !== 'Bearer' || !token) {
        res.status(401).json({ error: 'Missing Authorization header' });
        return;
    }
    try {
        req.user = jwt.verify(token, jwtSecret);
        next();
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
apiApp.use(express_1.default.json({ limit: '5mb' }));
apiApp.use((0, cors_1.default)({ origin: true, credentials: true }));
apiApp.get('/api/health', async (_req, res) => {
    await ensureDefaultAdmins();
    res.json({ ok: true });
});
apiApp.post('/api/auth/login', async (req, res) => {
    var _a, _b;
    await ensureDefaultAdmins();
    const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    const password = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) || '');
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
    const updatedUser = Object.assign(Object.assign({}, user), { lastLogin });
    res.json({
        token: signToken({ sub: user.uid, email: user.email, companyId: user.companyId, role: user.role }),
        user: publicUser(updatedUser),
    });
});
apiApp.post('/api/auth/register', async (req, res) => {
    var _a, _b, _c, _d;
    await ensureDefaultAdmins();
    const email = String(((_a = req.body) === null || _a === void 0 ? void 0 : _a.email) || '').trim().toLowerCase();
    const password = String(((_b = req.body) === null || _b === void 0 ? void 0 : _b.password) || '');
    const displayName = String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.displayName) || '').trim();
    const companyName = String(((_d = req.body) === null || _d === void 0 ? void 0 : _d.companyName) || '').trim();
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
    const user = {
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
    const router = express_1.default.Router();
    router.get('/', async (req, res) => {
        var _a;
        const companyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId;
        const snapshot = await db.collection(recordsCollection)
            .where('companyId', '==', companyId)
            .where('type', '==', type)
            .orderBy('updatedAt', 'desc')
            .get();
        res.json({ data: snapshot.docs.map((doc) => doc.data().data) });
    });
    router.get('/:id', async (req, res) => {
        var _a, _b;
        const companyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId;
        const id = req.params.id;
        const doc = await db.collection(recordsCollection).doc(`${companyId}_${type}_${id}`).get();
        if (!doc.exists) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.json({ data: (_b = doc.data()) === null || _b === void 0 ? void 0 : _b.data });
    });
    router.post('/', async (req, res) => {
        var _a;
        const companyId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId) || 'default-company';
        const now = new Date().toISOString();
        const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
        const id = typeof body.id === 'string' && body.id ? body.id : crypto.randomUUID();
        const data = Object.assign(Object.assign({}, body), { id, companyId, createdAt: body.createdAt || now, updatedAt: now });
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
    router.put('/:id', async (req, res) => {
        var _a, _b;
        const companyId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId) || 'default-company';
        const id = req.params.id;
        const now = new Date().toISOString();
        const ref = db.collection(recordsCollection).doc(`${companyId}_${type}_${id}`);
        const existing = await ref.get();
        const existingData = existing.exists ? ((_b = existing.data()) === null || _b === void 0 ? void 0 : _b.data) || {} : {};
        const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
        const data = Object.assign(Object.assign(Object.assign({}, existingData), body), { id, companyId, createdAt: existingData.createdAt || body.createdAt || now, updatedAt: now });
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
    router.delete('/:id', async (req, res) => {
        var _a;
        const companyId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.companyId) || 'default-company';
        await db.collection(recordsCollection).doc(`${companyId}_${type}_${req.params.id}`).delete();
        res.json({ ok: true });
    });
    apiApp.use(`/api/${type}`, requireAuth, router);
}
exports.api = functions.https.onRequest(apiApp);
// Razorpay webhook secret from Firebase config
const getRazorpayWebhookSecret = () => {
    var _a;
    return ((_a = functions.config().razorpay) === null || _a === void 0 ? void 0 : _a.webhook_secret) || process.env.RAZORPAY_WEBHOOK_SECRET || '';
};
// Verify Razorpay webhook signature
const verifyWebhookSignature = (body, signature, secret) => {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};
// Update subscription status in Firestore
const activateSubscription = async (companyId, paymentId, orderId, billingCycle, amount) => {
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
    }
    else {
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
const extractCompanyId = (notes) => {
    // Razorpay notes contain companyId and subscriptionId
    return (notes === null || notes === void 0 ? void 0 : notes.companyId) || (notes === null || notes === void 0 ? void 0 : notes.company_id) || null;
};
// Extract billing cycle from amount or notes
const extractBillingCycle = (amount, notes) => {
    // Check notes first
    if (notes === null || notes === void 0 ? void 0 : notes.billingCycle) {
        return notes.billingCycle;
    }
    if (notes === null || notes === void 0 ? void 0 : notes.billing_cycle) {
        return notes.billing_cycle;
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
exports.razorpayWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const signature = req.headers['x-razorpay-signature'];
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
    }
    catch (error) {
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
            const payment = ((_b = (_a = event.payload) === null || _a === void 0 ? void 0 : _a.payment) === null || _b === void 0 ? void 0 : _b.entity) || ((_f = (_e = (_d = (_c = event.payload) === null || _c === void 0 ? void 0 : _c.order) === null || _d === void 0 ? void 0 : _d.entity) === null || _e === void 0 ? void 0 : _e.payments) === null || _f === void 0 ? void 0 : _f[0]);
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
            const subscription = (_h = (_g = event.payload) === null || _g === void 0 ? void 0 : _g.subscription) === null || _h === void 0 ? void 0 : _h.entity;
            const notes = (subscription === null || subscription === void 0 ? void 0 : subscription.notes) || {};
            const companyId = extractCompanyId(notes);
            if (companyId) {
                const planId = subscription.plan_id;
                const billingCycle = (planId === null || planId === void 0 ? void 0 : planId.includes('yearly')) ? 'yearly' : 'monthly';
                await activateSubscription(companyId, subscription.id, '', billingCycle, subscription.current_start ? subscription.current_start * 100 : 49900);
            }
            res.status(200).json({ received: true, message: 'Subscription activated' });
            return;
        }
        // Handle subscription.cancelled
        if (eventType === 'subscription.cancelled') {
            const subscription = (_k = (_j = event.payload) === null || _j === void 0 ? void 0 : _j.subscription) === null || _k === void 0 ? void 0 : _k.entity;
            const notes = (subscription === null || subscription === void 0 ? void 0 : subscription.notes) || {};
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
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal server error');
    }
});
/**
 * Health check endpoint
 */
exports.healthCheck = functions.https.onRequest((req, res) => {
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
exports.checkExpiredSubscriptions = functions.pubsub
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
                }
                else {
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
                }
                else {
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
//# sourceMappingURL=index.js.map