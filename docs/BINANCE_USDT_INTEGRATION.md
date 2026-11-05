# Binance USDT top-ups — disabled scaffold

Status: **NOT LIVE**. This branch intentionally does not accept real payments,
connect to Binance, or credit balances.

## Existing architecture reviewed

- Next.js 15 / TypeScript / Firebase Admin Firestore.
- `src/app/api/mobile/deposits/route.ts` creates pending deposits and lists
  Binance as a reference-based deposit method.
- `src/app/api/admin/deposits/route.ts` approves pending deposits in a Firestore
  transaction, updating `users/{uid}.walletBalance` and creating
  `users/{uid}/wallet_movements/{depositId}`.
- `src/lib/client-wallet-service.ts` also uses browser localStorage; this
  must never be authoritative for financial balances.

## Intended flow: Binance Pay Merchant (preferred)

1. Complete merchant onboarding, eligibility and regulatory checks.
2. Authenticated client requests a USDT top-up with a unique internal order ID.
3. Server creates a merchant order and persists the provider order ID.
4. Client pays using provider-issued QR/link.
5. Server verifies webhook signature, event and provider order status via
   official APIs. Never trust the client-reported payment status.
6. Server atomically claims the provider transaction ID, verifies exact USDT
   amount and payee, and credits the client's **USD primary wallet** using
   an approved, explicitly defined USDT-to-USD rate/fee policy.
7. Store immutable journal records, notify after successful commit, and
   reconcile independently against provider records.

## Spot deposit fallback

A single shared Spot deposit address does not identify the sending client.
Never auto-credit based on amount, timing, a screenshot, or a self-reported TXID.
Require provider-supported unique attribution or manual investigation. Validate
network, confirmations, credited asset, unique transaction identity, and chain
reorganizations before considering funds final.

## Financial safety gates before activation

- Provider merchant approval and business-use permission.
- KYC/AML, sanctions screening and Dominican Republic regulatory review.
- Signed webhook validation and independent order verification.
- Provider transaction ID uniqueness, atomic balance + journal mutation,
  idempotent retries and audit logging.
- Decide whether USDT is converted into USD, or backed at a disclosed
  USDT/USD valuation; do not silently assume parity.
- Confirm primary currency: existing code supports configurable primary
  currencies; a USD top-up must be converted consistently or blocked.
- Prevent the existing manual approval endpoint from crediting Binance orders
  independently of provider verification.
- Migrate financial authority away from localStorage.
- Test duplicate webhooks, forged payloads, mismatched amounts, delayed
  settlements, timeout/retry, refunds and concurrent payments.
- Deploy only after explicit approval. Keep credentials in server-side secrets;
  never commit API keys, private keys or merchant certificates.

## Scaffold routes

- POST /api/binance/create-order — authenticated, always 503.
- POST /api/binance/webhook — always 503; no balance mutations.
- GET /api/binance/order-status — always 503.
- POST /api/binance/reconcile — admin-only, always 503.

No payment credentials, real addresses or payment activation are included.
