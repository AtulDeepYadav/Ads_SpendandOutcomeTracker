import React, { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

/* ---------- Design tokens ---------- */
const INK = "#181C21";
const PAPER = "#F6F2E9";
const PAPER_LINE = "#DDD5C3";
const SLATE = "#1B2531";
const SLATE_LINE = "#5E7A90";
const MOSS = "#4B7856";
const AMBER = "#B9862F";
const BRICK = "#AB4A34";
const INK_TEXT = "#20242A";
const MUTED_TEXT = "#6B6355";
const ON_DARK = "#E7E9EC";
const ON_DARK_MUTED = "#93A3B2";

const VERDICT_COLOR = { Green: MOSS, Yellow: AMBER, Red: BRICK };
const CATEGORY_GROWTH_ESTIMATE = 8.5;

/* ---------- Real data (all figures sourced from Honasa Consumer's public quarterly disclosures) ---------- */
const REAL_QUARTERS = [
  {
    id: "q3fy25", label: "Q3 FY25", sub: "Oct–Dec 2024",
    adSpend: 177, priorAdSpend: 166,
    revenue: 518, priorRevenue: 489,
    profitLabel: null, profit: null, priorProfit: null,
    secondary: null,
    notes: [
      "Ad spend & revenue: Storyboard18, Feb 2025.",
      "Prior-year (Q3 FY24) revenue of ₹489cr is derived from the disclosed 6.0% YoY growth rate — not a directly stated figure.",
      "No comparable profitability or brand-health figure was found disclosed for this quarter pair, so those checks are marked unavailable rather than estimated."
    ]
  },
  {
    id: "q4fy25", label: "Q4 FY25", sub: "Jan–Mar 2025",
    adSpend: 184, priorAdSpend: 160,
    revenue: 534, priorRevenue: 471,
    profitLabel: "EBITDA", profit: 27, priorProfit: 33,
    secondary: null,
    notes: [
      "Ad spend, revenue & EBITDA: Storyboard18 and India Infoline, May 2025.",
      "No comparable brand-health figure was found disclosed for this quarter, so the brand-metric check is marked unavailable."
    ]
  },
  {
    id: "q4fy26", label: "Q4 FY26", sub: "Jan–Mar 2026",
    adSpend: 216, priorAdSpend: 183,
    revenue: 657, priorRevenue: 534,
    profitLabel: "EBITDA", profit: 77, priorProfit: 27,
    secondary: { label: "Focus-category revenue growth", growthPct: 35 },
    notes: [
      "Ad spend, revenue & EBITDA: Business Standard, May 2026 (Q4 FY26 results).",
      "Focus-category growth of 35% YoY as stated on the Q4 FY26 earnings call."
    ]
  },
  {
    id: "q1fy27", label: "Q1 FY27", sub: "Apr–Jun 2026",
    adSpend: 241, priorAdSpend: 206,
    revenue: 755.95, priorRevenue: 595.25,
    profitLabel: "Profit before tax", profit: 119.24, priorProfit: 55.59,
    secondary: { label: "Brand search index growth", growthPct: 36 },
    notes: [
      "Ad spend, revenue & PBT: Storyboard18 and Business Standard, Aug 2026.",
      "Prior-year (Q1 FY26) ad spend of ₹206cr is derived from the disclosed 16.7% YoY growth rate — not a directly stated figure.",
      "Brand search index rose from an indexed base of 100 to 136 YoY, as disclosed on the earnings call."
    ]
  }
];

/* ---------- Check logic ---------- */
function computeChecks(q) {
  const checks = [];
  const ratioNow = (q.adSpend / q.revenue) * 100;
  const ratioPrior = (q.priorAdSpend / q.priorRevenue) * 100;
  const deltaPP = ratioNow - ratioPrior;
  let aStatus, aScore;
  if (deltaPP <= -2) { aStatus = "Improving"; aScore = 1; }
  else if (deltaPP >= 2) { aStatus = "Worsening"; aScore = -1; }
  else { aStatus = "Stable"; aScore = 0; }
  checks.push({
    key: "A", name: "Efficiency ratio trend",
    detail: `Ad spend ran ${ratioNow.toFixed(1)}% of revenue, vs ${ratioPrior.toFixed(1)}% a year earlier (${deltaPP >= 0 ? "+" : ""}${deltaPP.toFixed(1)}pp).`,
    status: aStatus, score: aScore
  });

  const deltaRevenue = q.revenue - q.priorRevenue;
  const deltaSpend = q.adSpend - q.priorAdSpend;
  const spendGrowthPct = (deltaSpend / q.priorAdSpend) * 100;
  let bStatus, bScore, bText;
  if (deltaSpend <= 0 && deltaRevenue > 0) {
    bStatus = "Efficient"; bScore = 1;
    bText = `Ad spend fell YoY while revenue still grew by ₹${deltaRevenue.toFixed(0)}cr.`;
  } else if (deltaSpend > 0) {
    const mrr = deltaRevenue / deltaSpend;
    bText = `Every extra ₹1 of ad spend brought in ₹${mrr.toFixed(1)} of extra revenue vs. last year.`;
    if (mrr > 2) { bStatus = "Efficient"; bScore = 1; }
    else if (mrr >= 1) { bStatus = "Watch"; bScore = 0; }
    else { bStatus = "Inefficient"; bScore = -1; }
  } else {
    bStatus = "Inefficient"; bScore = -1;
    bText = "Ad spend and revenue both fell YoY.";
  }
  checks.push({ key: "B", name: "Marginal return", detail: bText, status: bStatus, score: bScore });

  if (q.secondary) {
    const metricGrowth = q.secondary.growthPct;
    let cStatus, cScore;
    if (metricGrowth >= spendGrowthPct) { cStatus = "Keeping pace"; cScore = 1; }
    else if (metricGrowth > spendGrowthPct / 2) { cStatus = "Lagging"; cScore = 0; }
    else { cStatus = "Diverging"; cScore = -1; }
    checks.push({
      key: "C", name: q.secondary.label,
      detail: `${q.secondary.label} rose ${metricGrowth}% YoY, vs ${spendGrowthPct.toFixed(1)}% growth in ad spend.`,
      status: cStatus, score: cScore
    });
  }

  if (q.profit != null && q.priorProfit != null) {
    let dStatus, dScore, dText;
    if (q.priorProfit <= 0 && q.profit > 0) {
      dStatus = "Efficient"; dScore = 1;
      dText = `${q.profitLabel} turned from a loss of ₹${Math.abs(q.priorProfit)}cr to a profit of ₹${q.profit}cr.`;
    } else {
      const profitGrowthPct = ((q.profit - q.priorProfit) / Math.abs(q.priorProfit)) * 100;
      dText = `${q.profitLabel} ${profitGrowthPct >= 0 ? "grew" : "fell"} ${Math.abs(profitGrowthPct).toFixed(0)}% YoY, while ad spend grew ${spendGrowthPct.toFixed(1)}%.`;
      if (profitGrowthPct < 0) { dStatus = "Inefficient"; dScore = -1; }
      else {
        const ratio = profitGrowthPct / spendGrowthPct;
        if (ratio >= 2) { dStatus = "Efficient"; dScore = 1; }
        else if (ratio >= 0.5) { dStatus = "Watch"; dScore = 0; }
        else { dStatus = "Inefficient"; dScore = -1; }
      }
    }
    checks.push({ key: "D", name: `Profitability (${q.profitLabel})`, detail: dText, status: dStatus, score: dScore });
  }

  const revGrowthPct = (deltaRevenue / q.priorRevenue) * 100;
  const ratioToCategoryGrowth = revGrowthPct / CATEGORY_GROWTH_ESTIMATE;
  let eStatus, eScore;
  if (ratioToCategoryGrowth >= 1.5) { eStatus = "Beating market"; eScore = 1; }
  else if (ratioToCategoryGrowth >= 1) { eStatus = "Keeping pace"; eScore = 0; }
  else { eStatus = "Losing ground"; eScore = -1; }
  checks.push({
    key: "E", name: "Category benchmark",
    detail: `Revenue grew ${revGrowthPct.toFixed(1)}% YoY vs. an estimated ${CATEGORY_GROWTH_ESTIMATE}% category growth rate (industry estimates vary; see notes).`,
    status: eStatus, score: eScore
  });

  const avgScore = checks.reduce((s, c) => s + c.score, 0) / checks.length;
  let verdict;
  if (avgScore >= 0.4) verdict = "Green";
  else if (avgScore <= -0.4) verdict = "Red";
  else verdict = "Yellow";

  return { checks, avgScore, verdict, ratioNow, ratioPrior };
}

const ENRICHED = REAL_QUARTERS.map(q => ({ ...q, result: computeChecks(q) }));

/* ---------- Small UI atoms ---------- */
function Dot({ verdict, size = 10 }) {
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: VERDICT_COLOR[verdict], flexShrink: 0 }} />;
}

function StatusPill({ status, score }) {
  const color = score > 0 ? MOSS : score < 0 ? BRICK : AMBER;
  return (
    <span style={{
      fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color,
      border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 8px", whiteSpace: "nowrap"
    }}>{status}</span>
  );
}

/* ---------- Real Ledger tab ---------- */
function RealLedger() {
  const [selectedId, setSelectedId] = useState(ENRICHED[ENRICHED.length - 1].id);
  const selected = ENRICHED.find(q => q.id === selectedId);

  const chartData = ENRICHED.map(q => ({
    name: q.label,
    "Ad spend (₹cr)": q.adSpend,
    "Revenue (₹cr)": q.revenue,
    "Spend / revenue (%)": Number(q.result.ratioNow.toFixed(1))
  }));

  return (
    <div>
      {/* Quarter strip */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        {ENRICHED.map(q => (
          <button key={q.id} onClick={() => setSelectedId(q.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              background: q.id === selectedId ? INK_TEXT : "transparent",
              color: q.id === selectedId ? PAPER : INK_TEXT,
              border: `1px solid ${INK_TEXT}`, borderRadius: 6, padding: "8px 14px",
              fontFamily: "Inter, sans-serif", transition: "background 0.15s, color 0.15s"
            }}>
            <Dot verdict={q.result.verdict} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: "20px 12px 8px", marginBottom: 22 }}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={PAPER_LINE} vertical={false} />
            <XAxis dataKey="name" tick={{ fontFamily: "Inter, sans-serif", fontSize: 12, fill: INK_TEXT }} axisLine={{ stroke: PAPER_LINE }} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: MUTED_TEXT }} axisLine={false} tickLine={false} width={40} />
            <YAxis yAxisId="right" orientation="right" unit="%" tick={{ fontFamily: "Inter, sans-serif", fontSize: 11, fill: MUTED_TEXT }} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={{ fontFamily: "Inter, sans-serif", fontSize: 12, borderRadius: 6, border: `1px solid ${PAPER_LINE}` }} />
            <Bar yAxisId="left" dataKey="Ad spend (₹cr)" fill={INK_TEXT} opacity={0.35} radius={[3, 3, 0, 0]} barSize={22} />
            <Bar yAxisId="left" dataKey="Revenue (₹cr)" fill={MOSS} radius={[3, 3, 0, 0]} barSize={22} />
            <Line yAxisId="right" type="monotone" dataKey="Spend / revenue (%)" stroke={BRICK} strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 24, fontWeight: 600, color: INK_TEXT }}>{selected.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT }}>{selected.sub}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Dot verdict={selected.result.verdict} size={12} />
              <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: VERDICT_COLOR[selected.result.verdict] }}>{selected.result.verdict}</span>
            </div>
          </div>

          <div style={{ height: 1, background: PAPER_LINE, margin: "16px 0" }} />

          {selected.result.checks.map(c => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: `1px solid ${PAPER_LINE}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT, marginBottom: 2 }}>{c.name}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, fontVariantNumeric: "tabular-nums" }}>{c.detail}</div>
              </div>
              <StatusPill status={c.status} score={c.score} />
            </div>
          ))}

          <div style={{ marginTop: 18 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED_TEXT, marginBottom: 6 }}>Sources & notes for this quarter</div>
            {selected.notes.map((n, i) => (
              <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 3 }}>· {n}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginTop: 16, lineHeight: 1.6 }}>
        Q2 FY25 (revenue −6.9% YoY, EBITDA loss of ₹31cr) and Q2 FY26 (turnaround to ₹53cr pre-tax profit) are known from
        disclosures but excluded from verdict scoring above — Honasa did not separately disclose ad spend for those two
        quarters in the sources checked, so a verdict would have relied on an estimated number rather than a real one.
      </div>
    </div>
  );
}

/* ---------- Modeled funnel tab ---------- */
const FUNNEL_STAGES = [
  { name: "Impressions", value: 27777778, display: "2.78 Cr", widthPct: 100 },
  { name: "Clicks", value: 388889, display: "3.89 L", widthPct: 62, rateFromPrev: "CTR 1.4%" },
  { name: "Conversions", value: 10889, display: "10,889", widthPct: 32, rateFromPrev: "CVR 2.8%" }
];

const FUNNEL_METRICS = [
  { label: "Campaign spend", value: "₹50.00 L", note: "assumed budget" },
  { label: "CPM", value: "₹180", note: "seeded (₹150–250 India beauty range)" },
  { label: "CPC", value: "₹12.86", note: "spend ÷ clicks" },
  { label: "CAC", value: "₹459", note: "spend ÷ conversions" },
  { label: "Revenue", value: "₹70.78 L", note: "conversions × ₹650 AOV (seeded)" },
  { label: "ROAS", value: "1.42×", note: "revenue ÷ spend" },
  { label: "Gross margin", value: "70%", note: "real — Honasa's disclosed FY26 gross margin" },
  { label: "Marketing ROI", value: "−0.9%", note: "(gross profit − spend) ÷ spend, first purchase only" },
  { label: "LTV", value: "₹1,965", note: "AOV × 2.4 purchases/yr × 1.8yr lifetime × 70% margin (seeded)" },
  { label: "LTV : CAC", value: "4.3×", note: "generally healthy (benchmark: ~3× or higher)" }
];

function ModeledFunnel() {
  return (
    <div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 20,
        border: `1px dashed ${SLATE_LINE}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12,
        fontWeight: 600, color: ON_DARK
      }}>
        MODELED — seeded assumptions, not disclosed company data
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK_MUTED, marginBottom: 24, maxWidth: 640, lineHeight: 1.6 }}>
        Honasa doesn't publish campaign-level funnel data (impressions, clicks, conversions), so this illustrates the full
        performance-marketing framework on one hypothetical campaign — an influencer push for a Derma Co. serum launch —
        using realistic, stated benchmark assumptions rather than invented numbers. Only the gross margin figure is real.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
        {FUNNEL_STAGES.map((s, i) => (
          <div key={s.name}>
            {i > 0 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: SLATE_LINE, border: `1px dashed ${SLATE_LINE}`, borderRadius: 4, padding: "2px 8px" }}>
                  {s.rateFromPrev}
                </span>
              </div>
            )}
            <div style={{
              width: `${s.widthPct}%`, margin: "0 auto", background: SLATE, border: `1px solid ${SLATE_LINE}`,
              borderRadius: 6, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK_MUTED }}>{s.name}</span>
              <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600, color: ON_DARK, fontVariantNumeric: "tabular-nums" }}>{s.display}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {FUNNEL_METRICS.map(m => (
          <div key={m.label} style={{ background: SLATE, border: `1px solid ${SLATE_LINE}44`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED, marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600, color: ON_DARK, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED, lineHeight: 1.4 }}>{m.note}</div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: ON_DARK_MUTED, marginTop: 24, lineHeight: 1.6, maxWidth: 640 }}>
        Incrementality (isolating revenue actually caused by the campaign) is deliberately not modeled here — it needs a
        real holdout or control-group test, and simulating one would just be inventing a number with no basis.
      </div>
    </div>
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [tab, setTab] = useState("real");
  const isReal = tab === "real";

  return (
    <div style={{
      minHeight: "100%", background: isReal ? "#FBF9F4" : INK, transition: "background 0.2s",
      padding: "32px 28px", boxSizing: "border-box", fontFamily: "Inter, sans-serif"
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "'Source Serif 4', serif", fontSize: 30, fontWeight: 700,
          color: isReal ? INK_TEXT : ON_DARK, letterSpacing: "-0.01em"
        }}>Honasa Ad-Spend Efficiency Ledger</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: isReal ? MUTED_TEXT : ON_DARK_MUTED, marginTop: 4 }}>
          AMS Capstone · Topic 6 — real quarterly performance and one modeled campaign funnel
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${isReal ? PAPER_LINE : SLATE_LINE}`, marginBottom: 28 }}>
        {[["real", "Real Ledger"], ["modeled", "Modeled Funnel"]].map(([id, name]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "0 0 12px 0",
            fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
            color: tab === id ? (isReal ? INK_TEXT : ON_DARK) : (isReal ? MUTED_TEXT : ON_DARK_MUTED),
            borderBottom: tab === id ? `2px solid ${isReal ? INK_TEXT : ON_DARK}` : "2px solid transparent",
            marginBottom: -1
          }}>{name}</button>
        ))}
      </div>

      {isReal ? <RealLedger /> : <ModeledFunnel />}
    </div>
  );
}
