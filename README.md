# Ad-Spend vs. Outcome Tracker

AMS Capstone · Topic 6 — "Build an Ad Spend vs. Outcome Tracker."

A generic React app for tracking how any brand's or campaign's ad spend compares to the revenue
it drove, and flagging whether that spend is paying off. Bring your own data (by hand, CSV, or
JSON) — or load the built-in Honasa Consumer (Mamaearth's parent company) worked example to see
it running end to end. Data you enter is saved to your browser's local storage, so it survives a
reload but never leaves your device.

## Two tabs

- **Real Ledger** — add any number of periods (ad spend & revenue this period vs. the same period
  a year earlier, plus optional profit and secondary-metric fields), and each is scored on up to 5
  checks (efficiency ratio trend, marginal return, brand-metric divergence, profitability, category
  benchmark) into a Green / Yellow / Red verdict, alongside ad spend / revenue / ROAS overview
  tiles. Periods can be added one at a time via a form, or bulk-imported from pasted CSV or JSON.
  Each period also supports an optional **channel breakdown** (Meta, Google, YouTube, etc.) —
  spend, revenue, and optionally impressions/clicks/conversions — which surfaces a per-channel
  ROAS/CTR/CVR/CPA comparison table, a rule-based diagnosis of the weakest and strongest channel
  (relative to the channels you actually entered, never an invented industry benchmark),
  plain-language recommendations, and a channel-level reallocation what-if. There's also a
  period-level "what if ad spend had been ₹X" slider — a single-period linear projection only,
  never a regression across periods (a handful of data points isn't enough to fit a defensible
  response curve), with a visible caveat once the hypothetical deviates >15% from actual.
- **Modeled Funnel** — model any campaign's funnel (impressions → clicks → conversions →
  CAC/ROAS/LTV:CAC) from your own rate assumptions (spend, CPM, CTR, CVR, AOV, repeat purchases,
  customer lifetime) — every downstream metric recomputes live. Optionally flag the gross margin
  figure as real disclosed data rather than a seeded assumption, with a note on its source.

Both tabs have a **"Load Honasa example"** button that fills in the real, sourced Honasa Consumer
data used to build and test this tool (see in-app citations), and the Real Ledger tab's checks
A–E and verdict logic are unchanged from that original build.

## Run it

```bash
npm install
npm run dev
```

## Stack

Vite + React + [Recharts](https://recharts.org/).

## Docs

See [`docs/`](./docs) for the original capstone topic brief, the build spec for the interactive
what-if layer, and the initial Honasa-specific static prototype this app was built from.
