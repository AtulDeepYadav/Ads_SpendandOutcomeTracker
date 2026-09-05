# Ad-Spend vs. Outcome Tracker

AMS Capstone · Topic 6 — "Build an Ad Spend vs. Outcome Tracker."

A generic React app for tracking how any brand's or campaign's ad spend compares to the revenue
it drove, and flagging whether that spend is paying off. Bring your own data (by hand, CSV, or
JSON) — or load the built-in Honasa Consumer (Mamaearth's parent company) worked example to see
it running end to end. Data you enter is saved to your browser's local storage, so it survives a
reload but never leaves your device.

## Three tabs (in order: Campaign Evaluator, Modeled Funnel, Real Ledger)

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
- **Campaign Evaluator** — a single-campaign form-to-report flow: enter campaign details
  (including a **Campaign Objective** — Sales, Lead Gen, Brand Awareness, Website Traffic,
  Engagement, or App Installs), spend by channel (+ optional other costs like creative/agency),
  outcomes (revenue, impressions, reach, clicks, engagements, conversions, leads), and your own
  targets (ROAS, max CPA, CTR, conversion rate). Click **Analyse Campaign Performance** for a
  scored 0–100 verdict (Good / Needs Optimisation / Poor Investment), financial & marketing metric
  cards, spend-vs-revenue and expense-bifurcation visuals, an outcome funnel, a 4-dimension
  performance evaluation (Financial Efficiency, Cost Efficiency, Audience Response, Conversion
  Efficiency, each Strong/Average/Weak with a hedged "why this might be happening" hypothesis),
  a "what's working / what needs attention" breakdown, conditional cross-metric insights (e.g.
  healthy CTR + weak conversion → points at the landing page, not the ad; comfortably-beaten ROAS
  target → a scale-gradually suggestion), a per-channel expense-quality table, and recommendations
  — all ending in an auto-composed summary paragraph.
  **The objective changes how the score is computed**: each dimension is weighted differently per
  objective (e.g. Brand Awareness weights Audience Response far more than Financial Efficiency) —
  a disclosed editorial judgment, shown on-screen, not a claim about your data. Equal weights apply
  with no objective selected. **The score only ever reflects dimensions where you set a target** —
  set none, and the app shows raw metrics with no invented "industry standard" score.
  Three illustrative examples are available (a picker, not just one button), deliberately spanning
  all three verdict bands — D2C beauty (Good, 94/100), B2B SaaS lead gen (Good but mixed across
  dimensions, 97/100), and a fashion flash sale (Poor, 30/100) — so the scoring engine's full range
  is visible without you having to hand-craft a failing case yourself.
- **Modeled Funnel** — model any campaign's funnel (impressions → clicks → conversions →
  CAC/ROAS/LTV:CAC) from your own rate assumptions (spend, CPM, CTR, CVR, AOV, repeat purchases,
  customer lifetime) — every downstream metric recomputes live. Optionally flag the gross margin
  figure as real disclosed data rather than a seeded assumption, with a note on its source. Two
  examples: the Honasa D2C beauty funnel (real gross margin) and a fully-illustrative SaaS
  free-trial funnel with very different assumptions (lower CTR/CVR, much higher LTV:CAC via
  subscription retention) for contrast.

All three tabs have a **"Load example"** picker. Real Ledger's and one Modeled Funnel example use
real, sourced Honasa Consumer disclosures (see in-app citations); Honasa doesn't disclose campaign-
or channel-level figures, so the Campaign Evaluator's examples and the SaaS funnel example use
clearly-labeled seeded numbers from entirely fictional brands instead — never presented as real
data. The Real Ledger tab's checks A–E and verdict logic are unchanged from the original build,
apart from a correctness fix (see below).

## Look & feel

The whole app is dark-themed (all three tabs, not just Modeled Funnel as in earlier versions).
A drifting three.js point field sits behind the content: constellation lines connect nearby
points, a quiet reference grid gives it a "dashboard floor" sense of depth, and a magnetic glow
trails the pointer on devices with a real mouse. It's decorative only (`pointer-events: none`
throughout), stays out of the way of reading forms and tables since solid card backgrounds sit
above it, is deliberately toned down on narrow/mobile viewports (fewer, smaller points; no lines
or grid), and turns itself off for `prefers-reduced-motion` or if WebGL isn't available.

## Run it

```bash
npm install
npm run dev
```

## Stack

Vite + React + [Recharts](https://recharts.org/) + [three.js](https://threejs.org/) (a quiet,
low-opacity ambient point-field background — decorative only, `pointer-events: none`, retints
per tab's light/dark theme, respects `prefers-reduced-motion`, and no-ops if WebGL isn't available).

## Known-fixed bug

Real Ledger's profitability check (Check D) divided profit growth by ad-spend growth to judge
efficiency. If spend fell year-over-year while profit still grew — an unambiguously good outcome —
that division flipped sign and misclassified the period as "Inefficient." Fixed to judge that case
(spend flat or down) directly instead of dividing by a zero/negative denominator.

## Docs

See [`docs/`](./docs) for the original capstone topic brief, the build spec for the interactive
what-if layer, and the initial Honasa-specific static prototype this app was built from.
