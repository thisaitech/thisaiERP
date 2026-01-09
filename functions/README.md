# Anna ERP - Firebase Cloud Functions

This directory contains Firebase Cloud Functions for Anna ERP, including the Razorpay webhook handler for automatic subscription activation.

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Razorpay Webhook Secret

Get your webhook secret from Razorpay Dashboard → Settings → Webhooks:

```bash
# Set the webhook secret in Firebase config
firebase functions:config:set razorpay.webhook_secret="YOUR_WEBHOOK_SECRET_HERE"
```

### 3. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:razorpayWebhook
```

### 4. Get Webhook URL

After deployment, your webhook URL will be:
```
https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook
```

For example:
```
https://us-central1-bill-anna.cloudfunctions.net/razorpayWebhook
```

### 5. Configure Razorpay Dashboard

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click "Add New Webhook"
3. Enter the webhook URL from step 4
4. Enter the same secret you configured in step 2
5. Select these events:
   - `payment.captured`
   - `order.paid`
   - `subscription.activated` (if using Razorpay Subscriptions)
   - `subscription.cancelled` (optional)
6. Click "Create Webhook"

## Functions Overview

### `razorpayWebhook`
Handles Razorpay payment webhooks for automatic subscription activation.

**Endpoint:** `POST /razorpayWebhook`

**Events Handled:**
- `payment.captured` - When a payment is successfully captured
- `order.paid` - When an order is fully paid
- `subscription.activated` - When a Razorpay subscription is activated
- `subscription.cancelled` - When a subscription is cancelled

**Required Payment Notes:**
When creating a Razorpay order, include these notes:
```javascript
{
  companyId: 'company-firebase-id',
  billingCycle: 'monthly' | 'yearly'
}
```

### `healthCheck`
Simple health check endpoint.

**Endpoint:** `GET /healthCheck`

### `checkExpiredSubscriptions`
Scheduled function that runs daily at midnight (IST) to:
- Check for expired trials and move to grace period
- Check for expired subscriptions
- Update subscription status accordingly

## Testing Locally

```bash
# Start Firebase emulators
npm run serve

# The webhook will be available at:
# http://localhost:5001/<project-id>/<region>/razorpayWebhook
```

## Troubleshooting

### View Function Logs
```bash
firebase functions:log
```

### Test Webhook Manually
```bash
curl -X POST https://<region>-<project-id>.cloudfunctions.net/razorpayWebhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <signature>" \
  -d '{"event": "payment.captured", ...}'
```

### Common Issues

1. **"Webhook secret not configured"**
   - Run: `firebase functions:config:set razorpay.webhook_secret="YOUR_SECRET"`
   - Redeploy functions

2. **"Invalid signature"**
   - Ensure the webhook secret matches between Razorpay and Firebase config
   - Check that you're using the correct secret (not API key)

3. **"No company ID found"**
   - Ensure payment notes include `companyId` when creating the order
