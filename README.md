# Honasa Ad-Spend Efficiency Ledger

AMS Capstone · Topic 6 — "Build an Ad Spend vs. Outcome Tracker."

A small React app that tracks how Honasa Consumer's (Mamaearth's parent company) ad spend
compares to the revenue it drove, and flags whether that spend is paying off — plus an
interactive "what-if" layer for exploring spend changes.

## Two tabs

- **Real Ledger** — 4 real Honasa quarters (Q3 FY25, Q4 FY25, Q4 FY26, Q1 FY27), each scored
  on 5 checks (efficiency ratio trend, marginal return, brand-metric divergence, profitability,
  category benchmark) into a Green / Yellow / Red verdict. All figures are sourced from
  Honasa's public quarterly disclosures (see notes in-app for citations). Includes a per-quarter
  "what if ad spend had been ₹X" slider — a single-quarter linear projection only, never a
  cross-quarter regression (there are just 4 real data points on record, not enough to fit a
  defensible response curve), with a visible caveat once the hypothetical deviates >15% from
  actual.
- **Modeled Funnel** — one illustrative, clearly-labeled seeded campaign (impressions → clicks
  → conversions → CAC/ROAS/LTV:CAC), since Honasa doesn't disclose campaign-level data. Every
  assumption (spend, CPM, CTR, CVR, AOV, repeat purchases, customer lifetime) is editable and
  every downstream metric recomputes live. Only the gross margin figure is real (Honasa's
  disclosed FY26 gross margin) and is visually flagged as such.

## Run it

```bash
npm install
npm run dev
```

## Stack

Vite + React + [Recharts](https://recharts.org/).

## Docs

See [`docs/`](./docs) for the original capstone topic brief, the build spec for the interactive
what-if layer, and the initial static prototype this app was built from.
