# Grace & Grind Website

Self-hosted Grace & Grind website copied from the original Polsia site and rebuilt as an independent React + Express app.

## Start The Site

Double-click:

```text
START_WEBSITE.bat
```

Or run:

```powershell
cd C:\Grace-Grind-Website
npm install
npm run build
npm start
```

The default local URL is:

```text
http://localhost:3000
```

Alternate test script URL:

```text
http://localhost:3107
```

## Client Portal, Admin, and Payments

The site now includes:

- `/book.html` for service booking and Stripe-hosted payment/subscription checkout.
- `/signup` and `/portal` for client profiles, bookings, messages, notifications, payments, file/photo uploads, and document signing.
- `/admin` for managing clients, bookings, the calendar, messages, notifications, documents, uploaded files, and payment status. This route is intentionally not shown in the public navigation.

The booking form posts to:

```text
/api/bookings
```

Real requests are saved locally at:

```text
C:\Grace-Grind-Website\data\bookings.jsonl
```

That file is created automatically after the first booking request.

The portal/admin data is saved locally at:

```text
C:\Grace-Grind-Website\data\portal-store.json
```

Uploaded client/admin files are saved locally at:

```text
C:\Grace-Grind-Website\data\uploads
```

Stripe payments use Checkout Sessions on the server. Copy `.env.local.example` to `.env.local` and set:

```text
STRIPE_SECRET_KEY=sk_live_or_sk_test_here
STRIPE_WEBHOOK_SECRET=whsec_here
PUBLIC_BASE_URL=https://your-domain.com
ADMIN_ACCESS_CODE=change-this-before-public-hosting
```

Payment details are collected by Stripe-hosted Checkout pages, not by this website.

Stripe implementation references:

- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/payments/ach-debit
- https://docs.stripe.com/billing/subscriptions/build-subscriptions
- https://docs.stripe.com/webhooks

## Host It Yourself

Copy this folder to your server, install Node.js, run `npm install`, run `npm run build`, then keep `npm start` running. Set `PORT` if your host requires a specific port.

For Windows startup and custom domain instructions, see:

```text
PUBLIC_HOSTING.md
```
