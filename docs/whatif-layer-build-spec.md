# Honasa Ad-Spend Tracker — Interactive "What-If" Layer
### Build spec for Claude Code

## 1. Context

This is an AMS Capstone (Topic 6) project: an ad-spend-vs-outcome tracker for Honasa Consumer (Mamaearth's
parent company). A working prototype already exists as a React artifact — **attach `honasa_adspend_tracker.jsx`
alongside this document.** It has two tabs:

- **Real Ledger** — 4 real Honasa quarters (Q3 FY25, Q4 FY25, Q4 FY26, Q1 FY27), each scored on 5 checks
  (efficiency ratio trend, marginal return, brand-metric divergence, profitability, category benchmark) into a
  Green / Yellow / Red verdict.
- **Modeled Funnel** — one illustrative, clearly-labeled seeded campaign (impressions → clicks → conversions →
  CAC/ROAS/LTV:CAC) built on stated benchmark assumptions, since Honasa doesn't disclose campaign-level data.

**Task:** add an interactive layer where spend can be adjusted and the outputs update live.

## 2. Read this before building anything

There are two different flavors of "what-if" possible here, and they carry very different amounts of statistical
risk. Keep them separate and do not blur them:

- **Modeled Funnel tab — safe to make fully interactive.** Every number already comes from stated rate
  assumptions (CPM, CTR, CVR, AOV, margin) applied to a spend figure. Changing spend and recalculating downstream
  is just re-running the same formulas — no new risk.
- **Real Ledger tab — do not fit a model across quarters.** There are only 4 real quarters on record. That is
  not enough data to build a defensible spend-to-revenue response curve. A slider that quietly regresses across
  quarters and returns a precise number would misrepresent how much evidence backs it up. If you build anything
  here at all, it must be a single-quarter linear projection only (spec below), with a visible caveat.

**Priority: build section 3 (Modeled Funnel) fully. Section 4 (Real Ledger) is optional and secondary.**

## 3. Feature spec — Modeled Funnel tab (primary)

### 3.1 Assumptions panel

Make these inputs editable, with the current hardcoded values as defaults:

| Input | Default | Control |
|---|---|---|
| Campaign spend | ₹50,00,000 | slider, range ₹10,00,000 – ₹2,00,00,000 |
| CPM | ₹180 | number input |
| CTR | 1.4% | number input |
| CVR | 2.8% | number input |
| AOV | ₹650 | number input |
| Gross margin | 70% | number input, visually flagged as "real — Honasa's disclosed FY26 gross margin" (distinct styling from the other seeded inputs) |
| Repeat purchases / year | 2.4 | number input |
| Customer lifetime (years) | 1.8 | number input |

### 3.2 Recompute chain (exact formulas — reuse these, don't re-derive)

```
impressions   = spend / cpm * 1000
clicks        = impressions * (ctr / 100)
cpc           = spend / clicks
conversions   = clicks * (cvr / 100)
cac           = spend / conversions
revenue       = conversions * aov
roas          = revenue / spend
grossProfit   = revenue * (grossMargin / 100)
marketingROI  = (grossProfit - spend) / spend * 100
ltv           = aov * repeatPurchasesPerYear * customerLifetimeYears * (grossMargin / 100)
ltvToCac      = ltv / cac
```

### 3.3 Visual behavior

- Funnel bar widths (Impressions / Clicks / Conversions) resize proportionally as spend or rates change.
- All metric cards (CPM, CPC, CAC, Revenue, ROAS, Marketing ROI, LTV, LTV:CAC) update live on any input change —
  plain `useState` + recompute on change is fine, no debouncing needed at this scale.
- Keep the existing dark/slate visual language for this tab (see tokens in the attached file: `INK`, `SLATE`,
  `SLATE_LINE`, `MOSS`/`AMBER`/`BRICK` for semantics, `'Source Serif 4'` for numbers, `Inter` for labels). Don't
  reskin — just make the existing look interactive.

## 4. Feature spec — Real Ledger tab (optional, secondary)

### 4.1 What to add

For the currently-selected quarter only, add a "what if ad spend had been ₹X instead" input, defaulting to that
quarter's actual spend.

### 4.2 Computation — exactly this, nothing more

```
mrr               = (quarter.revenue - quarter.priorRevenue) / (quarter.adSpend - quarter.priorAdSpend)
deltaFromActual   = hypotheticalSpend - quarter.adSpend
projectedRevenue  = quarter.revenue + deltaFromActual * mrr
projectedRatio    = hypotheticalSpend / projectedRevenue * 100
```

### 4.3 Required on-screen caveat

Whenever hypothetical spend differs from the quarter's actual spend by more than 15%, show this text visibly
(not just as a code comment):

> This is a straight-line projection using this quarter's own marginal return — not a fitted model. It ignores
> diminishing returns and gets less reliable the further you move from the actual spend level. With only 4 real
> quarters on record, there isn't enough data to build a real response curve across quarters.

### 4.4 Explicit non-goal

Do **not** build a regression, trend line, or any model that uses more than one quarter's data to project
another quarter's outcome. Four data points is not enough, and presenting one anyway would overstate the
analysis's rigor — this is the specific mistake to avoid, not a style preference.

## 5. Acceptance checklist

- [ ] Moving the spend slider on Modeled Funnel recalculates every downstream metric instantly
- [ ] Funnel bar widths visually resize with spend/rate changes
- [ ] Gross margin input is visually distinguished as "real" vs. the other seeded assumptions
- [ ] (If built) Real Ledger what-if only affects the selected quarter, shows the caveat above 15% deviation, and
      never pulls in another quarter's data
- [ ] No new fabricated quarters, category-growth figures, or cross-quarter models are introduced anywhere
- [ ] Existing Real Ledger verdict logic (checks A–E) is left untouched

## 6. Handoff

Attach `honasa_adspend_tracker.jsx` (current prototype) together with this document. All existing data (the 4
real quarters, funnel constants, check logic) should be reused from that file as-is — don't retype or re-derive
the numbers.
