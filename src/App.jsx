import React, { useState, useMemo, useEffect } from "react";
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
const REAL_GOLD = "#C9A24B"; // flags a value as real/disclosed data, not a seeded assumption

const VERDICT_COLOR = { Green: MOSS, Yellow: AMBER, Red: BRICK };

/* ---------- Shared button styles ---------- */
const btnPrimary = {
  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: PAPER,
  background: INK_TEXT, border: `1px solid ${INK_TEXT}`, borderRadius: 6, padding: "8px 14px", cursor: "pointer"
};
const btnSecondary = {
  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT,
  background: "transparent", border: `1px solid ${INK_TEXT}`, borderRadius: 6, padding: "8px 14px", cursor: "pointer"
};
const btnDanger = {
  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: BRICK,
  background: "transparent", border: `1px solid ${BRICK}66`, borderRadius: 6, padding: "8px 14px", cursor: "pointer"
};
const btnGhostSmall = {
  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: MUTED_TEXT,
  background: "transparent", border: `1px solid ${PAPER_LINE}`, borderRadius: 5, padding: "5px 10px", cursor: "pointer"
};
const btnSecondaryDark = {
  fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: ON_DARK,
  background: "transparent", border: `1px solid ${SLATE_LINE}`, borderRadius: 6, padding: "8px 14px", cursor: "pointer"
};

/* ---------- localStorage persistence (per-viewer only; nothing leaves the browser) ---------- */
const LS_PREFIX = "adspend-tracker:";
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch { /* ignore */ }
}
const LS_KEYS = {
  quarters: "ledger.quarters",
  categoryGrowth: "ledger.categoryGrowth",
  funnelName: "funnel.name",
  funnelDesc: "funnel.description",
  funnelAssumptions: "funnel.assumptions",
  funnelGmReal: "funnel.gmReal",
  funnelGmNote: "funnel.gmNote"
};

/* ---------- Honasa Consumer worked example (loadable, not baked in) ---------- */
/* All figures sourced from Honasa Consumer's public quarterly disclosures. */
const HONASA_EXAMPLE_QUARTERS = [
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
const HONASA_CATEGORY_GROWTH_ESTIMATE = 8.5;

const HONASA_FUNNEL_EXAMPLE = {
  campaignName: "Honasa Consumer — Derma Co. serum launch",
  description: "Honasa doesn't publish campaign-level funnel data (impressions, clicks, conversions), so this illustrates the full performance-marketing framework on one hypothetical campaign — an influencer push for a Derma Co. serum launch — using realistic, stated benchmark assumptions rather than invented numbers. Only the gross margin figure is real.",
  assumptions: { spend: 5000000, cpm: 180, ctr: 1.4, cvr: 2.8, aov: 650, grossMargin: 70, repeatPurchasesPerYear: 2.4, customerLifetimeYears: 1.8 },
  grossMarginIsReal: true,
  grossMarginNote: "real — Honasa's disclosed FY26 gross margin"
};
const BLANK_FUNNEL_ASSUMPTIONS = { spend: 500000, cpm: 200, ctr: 1.5, cvr: 2.5, aov: 500, grossMargin: 50, repeatPurchasesPerYear: 2, customerLifetimeYears: 1.5 };

/* ---------- Check logic — generic, works on any entered period's data ---------- */
function computeChecks(q, categoryGrowthEstimate) {
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
    bText = `Ad spend fell YoY while revenue still grew by ₹${deltaRevenue.toFixed(0)}.`;
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
      dText = `${q.profitLabel} turned from a loss of ₹${Math.abs(q.priorProfit)} to a profit of ₹${q.profit}.`;
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

  if (categoryGrowthEstimate && categoryGrowthEstimate > 0) {
    const revGrowthPct = (deltaRevenue / q.priorRevenue) * 100;
    const ratioToCategoryGrowth = revGrowthPct / categoryGrowthEstimate;
    let eStatus, eScore;
    if (ratioToCategoryGrowth >= 1.5) { eStatus = "Beating market"; eScore = 1; }
    else if (ratioToCategoryGrowth >= 1) { eStatus = "Keeping pace"; eScore = 0; }
    else { eStatus = "Losing ground"; eScore = -1; }
    checks.push({
      key: "E", name: "Category benchmark",
      detail: `Revenue grew ${revGrowthPct.toFixed(1)}% YoY vs. an estimated ${categoryGrowthEstimate}% category growth rate.`,
      status: eStatus, score: eScore
    });
  }

  const avgScore = checks.length ? checks.reduce((s, c) => s + c.score, 0) / checks.length : 0;
  let verdict;
  if (!checks.length) verdict = "Yellow";
  else if (avgScore >= 0.4) verdict = "Green";
  else if (avgScore <= -0.4) verdict = "Red";
  else verdict = "Yellow";

  return { checks, avgScore, verdict, ratioNow, ratioPrior };
}

/* ---------- Formatting helpers ---------- */
const inr = (n, opts = {}) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0, ...opts });
const inrShort = (n) => `₹${Number(n).toFixed(0)}`;

/* ---------- Import parsing (CSV or JSON) ---------- */
function toNumOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { result.push(cur); cur = ""; }
      else cur += c;
    }
  }
  result.push(cur);
  return result.map(s => s.trim());
}

function rowObjectToQuarter(row, index) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk === k);
      if (found !== undefined && row[found] !== "") return row[found];
    }
    return undefined;
  };
  const label = String(get("label", "quarter", "period") ?? "").trim();
  const sub = String(get("sub", "daterange") ?? "").trim();
  const adSpend = toNumOrNull(get("adspend", "spend"));
  const priorAdSpend = toNumOrNull(get("prioradspend", "prevadspend", "lastyearadspend"));
  const revenue = toNumOrNull(get("revenue"));
  const priorRevenue = toNumOrNull(get("priorrevenue", "prevrevenue", "lastyearrevenue"));
  const profitLabel = get("profitlabel") ? String(get("profitlabel")).trim() : null;
  const profit = toNumOrNull(get("profit"));
  const priorProfit = toNumOrNull(get("priorprofit", "prevprofit"));
  const secondaryLabel = get("secondarylabel") ? String(get("secondarylabel")).trim() : null;
  const secondaryGrowthPct = toNumOrNull(get("secondarygrowthpct", "secondarygrowth"));
  const notesRaw = get("notes");
  const notes = notesRaw ? String(notesRaw).split(";").map(s => s.trim()).filter(Boolean) : [];

  if (!label) throw new Error(`Row ${index + 1}: "label" is required.`);
  if (adSpend == null) throw new Error(`Row ${index + 1} (${label}): "adSpend" must be a number.`);
  if (priorAdSpend == null || priorAdSpend === 0) throw new Error(`Row ${index + 1} (${label}): "priorAdSpend" must be a non-zero number.`);
  if (revenue == null) throw new Error(`Row ${index + 1} (${label}): "revenue" must be a number.`);
  if (priorRevenue == null || priorRevenue === 0) throw new Error(`Row ${index + 1} (${label}): "priorRevenue" must be a non-zero number.`);

  const hasProfit = profitLabel && profit != null && priorProfit != null;
  const hasSecondary = secondaryLabel && secondaryGrowthPct != null;

  return {
    id: `q-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label, sub, adSpend, priorAdSpend, revenue, priorRevenue,
    profitLabel: hasProfit ? profitLabel : null,
    profit: hasProfit ? profit : null,
    priorProfit: hasProfit ? priorProfit : null,
    secondary: hasSecondary ? { label: secondaryLabel, growthPct: secondaryGrowthPct } : null,
    notes
  };
}

function jsonObjectToQuarter(q, index) {
  const label = String(q.label ?? q.quarter ?? "").trim();
  const adSpend = toNumOrNull(q.adSpend);
  const priorAdSpend = toNumOrNull(q.priorAdSpend);
  const revenue = toNumOrNull(q.revenue);
  const priorRevenue = toNumOrNull(q.priorRevenue);
  if (!label) throw new Error(`Item ${index + 1}: "label" is required.`);
  if (adSpend == null) throw new Error(`Item ${index + 1} (${label}): "adSpend" must be a number.`);
  if (priorAdSpend == null || priorAdSpend === 0) throw new Error(`Item ${index + 1} (${label}): "priorAdSpend" must be a non-zero number.`);
  if (revenue == null) throw new Error(`Item ${index + 1} (${label}): "revenue" must be a number.`);
  if (priorRevenue == null || priorRevenue === 0) throw new Error(`Item ${index + 1} (${label}): "priorRevenue" must be a non-zero number.`);

  const profitLabel = q.profitLabel ? String(q.profitLabel).trim() : null;
  const profit = toNumOrNull(q.profit);
  const priorProfit = toNumOrNull(q.priorProfit);
  const hasProfit = profitLabel && profit != null && priorProfit != null;

  const secondary = q.secondary && q.secondary.label && toNumOrNull(q.secondary.growthPct) != null
    ? { label: String(q.secondary.label).trim(), growthPct: toNumOrNull(q.secondary.growthPct) }
    : null;

  return {
    id: `q-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    label, sub: String(q.sub ?? "").trim(),
    adSpend, priorAdSpend, revenue, priorRevenue,
    profitLabel: hasProfit ? profitLabel : null,
    profit: hasProfit ? profit : null,
    priorProfit: hasProfit ? priorProfit : null,
    secondary,
    notes: Array.isArray(q.notes) ? q.notes.map(String) : []
  };
}

function parseImportText(text) {
  const trimmed = text.trim();
  if (!trimmed) return { quarters: null, error: "Paste some data first." };

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed.quarters;
      if (!Array.isArray(arr) || !arr.length) throw new Error("Expected a non-empty JSON array of periods.");
      return { quarters: arr.map(jsonObjectToQuarter), error: null };
    } catch (e) {
      return { quarters: null, error: "Couldn't parse JSON — " + e.message };
    }
  }

  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return { quarters: null, error: "CSV needs a header row plus at least one data row." };
  const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[\s_-]/g, ""));
  try {
    const quarters = lines.slice(1).map((line, i) => {
      const cells = splitCsvLine(line);
      const row = {};
      headers.forEach((h, hi) => { row[h] = cells[hi] ?? ""; });
      return rowObjectToQuarter(row, i);
    });
    return { quarters, error: null };
  } catch (e) {
    return { quarters: null, error: e.message };
  }
}

const CSV_PLACEHOLDER = `label,sub,adSpend,priorAdSpend,revenue,priorRevenue,profitLabel,profit,priorProfit,secondaryLabel,secondaryGrowthPct,notes
Q1 FY24,Jan-Mar 2024,100,90,400,350,EBITDA,20,15,,,"Source: company filing"`;

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

function LightField({ label, required, value, onChange, type = "text", placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT }}>
        {label}{required && <span style={{ color: BRICK }}> *</span>}
      </span>
      <input type={type} value={value} placeholder={placeholder} onChange={onChange}
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "8px 10px", background: "#fff" }} />
    </label>
  );
}

function DarkField({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED }}>{label}</span>
      <input type="text" value={value} onChange={onChange} placeholder={placeholder}
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK, background: SLATE, border: `1px solid ${SLATE_LINE}44`, borderRadius: 6, padding: "8px 10px" }} />
    </label>
  );
}

/* ---------- Quarter add/edit form ---------- */
function blankQuarterDraft() {
  return { label: "", sub: "", adSpend: "", priorAdSpend: "", revenue: "", priorRevenue: "", profitLabel: "", profit: "", priorProfit: "", secondaryLabel: "", secondaryGrowthPct: "", notes: "" };
}
function quarterToDraft(q) {
  return {
    label: q.label ?? "", sub: q.sub ?? "",
    adSpend: q.adSpend ?? "", priorAdSpend: q.priorAdSpend ?? "",
    revenue: q.revenue ?? "", priorRevenue: q.priorRevenue ?? "",
    profitLabel: q.profitLabel ?? "", profit: q.profit ?? "", priorProfit: q.priorProfit ?? "",
    secondaryLabel: q.secondary?.label ?? "", secondaryGrowthPct: q.secondary?.growthPct ?? "",
    notes: (q.notes ?? []).join("\n")
  };
}
function draftToQuarter(draft, existingId) {
  const errors = [];
  if (!draft.label.trim()) errors.push("Label is required.");
  const nums = {
    "ad spend": Number(draft.adSpend), "prior ad spend": Number(draft.priorAdSpend),
    revenue: Number(draft.revenue), "prior revenue": Number(draft.priorRevenue)
  };
  for (const [k, v] of Object.entries(nums)) {
    if (!Number.isFinite(v)) errors.push(`${k} must be a number.`);
  }
  if (Number.isFinite(nums["prior ad spend"]) && nums["prior ad spend"] === 0) errors.push("Prior-period ad spend can't be zero (used as a divisor).");
  if (Number.isFinite(nums["prior revenue"]) && nums["prior revenue"] === 0) errors.push("Prior-period revenue can't be zero (used as a divisor).");
  if (errors.length) return { error: errors.join(" ") };

  const hasProfit = draft.profitLabel.trim() && draft.profit !== "" && draft.priorProfit !== "";
  const hasSecondary = draft.secondaryLabel.trim() && draft.secondaryGrowthPct !== "";

  return {
    quarter: {
      id: existingId || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: draft.label.trim(),
      sub: draft.sub.trim(),
      adSpend: nums["ad spend"], priorAdSpend: nums["prior ad spend"],
      revenue: nums.revenue, priorRevenue: nums["prior revenue"],
      profitLabel: hasProfit ? draft.profitLabel.trim() : null,
      profit: hasProfit ? Number(draft.profit) : null,
      priorProfit: hasProfit ? Number(draft.priorProfit) : null,
      secondary: hasSecondary ? { label: draft.secondaryLabel.trim(), growthPct: Number(draft.secondaryGrowthPct) } : null,
      notes: draft.notes.split("\n").map(s => s.trim()).filter(Boolean)
    }
  };
}

function QuarterForm({ initialQuarter, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => initialQuarter ? quarterToDraft(initialQuarter) : blankQuarterDraft());
  const [error, setError] = useState(null);
  const set = (key) => (e) => setDraft(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = () => {
    const result = draftToQuarter(draft, initialQuarter?.id);
    if (result.error) { setError(result.error); return; }
    onSave(result.quarter);
  };

  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 20, marginBottom: 22 }}>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 14 }}>
        {initialQuarter ? "Edit period" : "Add a period"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
        <LightField label="Label" required value={draft.label} onChange={set("label")} placeholder="e.g. Q1 FY24" />
        <LightField label="Period (optional)" value={draft.sub} onChange={set("sub")} placeholder="e.g. Jan–Mar 2024" />
        <LightField label="Ad spend (this period)" required type="number" value={draft.adSpend} onChange={set("adSpend")} />
        <LightField label="Ad spend (same period last year)" required type="number" value={draft.priorAdSpend} onChange={set("priorAdSpend")} />
        <LightField label="Revenue (this period)" required type="number" value={draft.revenue} onChange={set("revenue")} />
        <LightField label="Revenue (same period last year)" required type="number" value={draft.priorRevenue} onChange={set("priorRevenue")} />
        <LightField label="Profit metric name (optional)" value={draft.profitLabel} onChange={set("profitLabel")} placeholder="e.g. EBITDA" />
        <LightField label="Profit (this period)" type="number" value={draft.profit} onChange={set("profit")} />
        <LightField label="Profit (same period last year)" type="number" value={draft.priorProfit} onChange={set("priorProfit")} />
        <LightField label="Secondary metric name (optional)" value={draft.secondaryLabel} onChange={set("secondaryLabel")} placeholder="e.g. Brand search index growth" />
        <LightField label="Secondary metric YoY growth %" type="number" value={draft.secondaryGrowthPct} onChange={set("secondaryGrowthPct")} />
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT }}>Sources & notes (optional, one per line)</span>
        <textarea rows={3} value={draft.notes} onChange={set("notes")}
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "8px 10px", resize: "vertical" }} />
      </label>
      {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: BRICK, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary}>{initialQuarter ? "Save changes" : "Add period"}</button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  );
}

function ImportPanel({ onImport, onCancel }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const handleImport = () => {
    const { quarters, error } = parseImportText(text);
    if (error) { setError(error); return; }
    onImport(quarters);
  };

  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 20, marginBottom: 22 }}>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 8 }}>
        Import periods
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 10, lineHeight: 1.6 }}>
        Paste CSV (with a header row) or a JSON array of periods. This replaces the periods currently loaded.
      </div>
      <textarea rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={CSV_PLACEHOLDER}
        style={{ width: "100%", boxSizing: "border-box", fontFamily: "ui-monospace, monospace", fontSize: 12, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: 10, marginBottom: 10, resize: "vertical" }} />
      {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: BRICK, marginBottom: 10, whiteSpace: "pre-wrap" }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleImport} style={btnPrimary}>Import</button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", background: PAPER, border: `1px dashed ${PAPER_LINE}`, borderRadius: 8 }}>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT, marginBottom: 8 }}>No periods yet</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
        Use the buttons above to add a period by hand, import a CSV/JSON file, or load the Honasa Consumer example
        to see the tool working end to end.
      </div>
    </div>
  );
}

/* ---------- What-if panel (single quarter, linear projection only — see project notes on why) ---------- */
function WhatIfLedger({ quarter }) {
  const [hypSpend, setHypSpend] = useState(quarter.adSpend);

  const deltaSpend = quarter.adSpend - quarter.priorAdSpend;
  const deltaRevenue = quarter.revenue - quarter.priorRevenue;
  const canProject = deltaSpend !== 0;
  const mrr = canProject ? deltaRevenue / deltaSpend : null;

  const deltaFromActual = hypSpend - quarter.adSpend;
  const projectedRevenue = canProject ? quarter.revenue + deltaFromActual * mrr : null;
  const projectedRatio = canProject && projectedRevenue > 0 ? (hypSpend / projectedRevenue) * 100 : null;

  const pctDeviation = quarter.adSpend !== 0 ? Math.abs(deltaFromActual / quarter.adSpend) * 100 : 0;
  const showCaveat = pctDeviation > 15;

  const min = Math.round(quarter.adSpend * 0.5);
  const max = Math.round(quarter.adSpend * 1.5);

  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24, marginTop: 22 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT, marginBottom: 4 }}>
        What if {quarter.label} ad spend had been different?
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 16 }}>
        Single-period linear projection, using only {quarter.label}'s own marginal return. See caveat below.
      </div>

      {!canProject ? (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT }}>
          Ad spend didn't change YoY in this period, so there's no marginal return to project from.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
            <input
              type="range" min={min} max={max} step={1} value={hypSpend}
              onChange={e => setHypSpend(Number(e.target.value))}
              style={{ flex: 1, minWidth: 180, accentColor: BRICK }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT, fontVariantNumeric: "tabular-nums" }}>
                {inrShort(hypSpend)}
              </span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT }}>
                (actual: {inrShort(quarter.adSpend)})
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: showCaveat ? 16 : 0 }}>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>This period's marginal return</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: INK_TEXT }}>₹{mrr.toFixed(2)} rev / ₹1 spend</div>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>Projected revenue</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: INK_TEXT }}>{inrShort(projectedRevenue)}</div>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>Projected spend / revenue</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: projectedRatio != null ? INK_TEXT : MUTED_TEXT }}>
                {projectedRatio != null ? `${projectedRatio.toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>

          {showCaveat && (
            <div style={{
              background: `${AMBER}14`, border: `1px solid ${AMBER}55`, borderRadius: 6, padding: "12px 14px",
              fontFamily: "Inter, sans-serif", fontSize: 12, color: INK_TEXT, lineHeight: 1.6
            }}>
              This is a straight-line projection using this period's own marginal return — not a fitted model. It
              ignores diminishing returns and gets less reliable the further you move from the actual spend level.
              With only one prior period to compare against, there isn't enough data to build a real response curve.
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------- Real Ledger tab — generic: bring your own periods, or load the Honasa example ---------- */
function RealLedger() {
  const [quarters, setQuarters] = useState(() => loadJSON(LS_KEYS.quarters, []));
  const [categoryGrowthEstimate, setCategoryGrowthEstimate] = useState(() => loadJSON(LS_KEYS.categoryGrowth, 0));
  const [selectedId, setSelectedId] = useState(() => {
    const qs = loadJSON(LS_KEYS.quarters, []);
    return qs.length ? qs[qs.length - 1].id : null;
  });
  const [mode, setMode] = useState(null); // null | "add" | "edit" | "import"

  useEffect(() => { saveJSON(LS_KEYS.quarters, quarters); }, [quarters]);
  useEffect(() => { saveJSON(LS_KEYS.categoryGrowth, categoryGrowthEstimate); }, [categoryGrowthEstimate]);

  const enriched = useMemo(
    () => quarters.map(q => ({ ...q, result: computeChecks(q, categoryGrowthEstimate) })),
    [quarters, categoryGrowthEstimate]
  );
  const selected = enriched.find(q => q.id === selectedId) || null;
  const editingQuarter = mode === "edit" ? quarters.find(q => q.id === selectedId) : null;

  function handleAdd(q) { setQuarters(prev => [...prev, q]); setSelectedId(q.id); setMode(null); }
  function handleUpdate(q) { setQuarters(prev => prev.map(x => x.id === q.id ? q : x)); setSelectedId(q.id); setMode(null); }
  function handleDelete(id) {
    if (!window.confirm("Remove this period? This can't be undone.")) return;
    const next = quarters.filter(x => x.id !== id);
    setQuarters(next);
    if (selectedId === id) setSelectedId(next.length ? next[next.length - 1].id : null);
    if (mode === "edit") setMode(null);
  }
  function handleLoadExample() {
    if (quarters.length && !window.confirm("Load the Honasa example? This replaces your current data.")) return;
    setQuarters(HONASA_EXAMPLE_QUARTERS);
    setCategoryGrowthEstimate(HONASA_CATEGORY_GROWTH_ESTIMATE);
    setSelectedId(HONASA_EXAMPLE_QUARTERS[HONASA_EXAMPLE_QUARTERS.length - 1].id);
    setMode(null);
  }
  function handleClearAll() {
    if (!window.confirm("Clear all periods? This can't be undone.")) return;
    setQuarters([]); setCategoryGrowthEstimate(0); setSelectedId(null); setMode(null);
  }
  function handleImport(importedQuarters) {
    if (quarters.length && !window.confirm(`Import ${importedQuarters.length} period(s)? This replaces your current data.`)) return;
    setQuarters(importedQuarters);
    setSelectedId(importedQuarters.length ? importedQuarters[importedQuarters.length - 1].id : null);
    setMode(null);
  }

  const chartData = enriched.map(q => ({
    name: q.label,
    "Ad spend": q.adSpend,
    Revenue: q.revenue,
    "Spend / revenue (%)": Number(q.result.ratioNow.toFixed(1))
  }));

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={() => setMode("add")} style={btnPrimary}>+ Add period</button>
        <button onClick={() => setMode("import")} style={btnSecondary}>Import CSV/JSON</button>
        <button onClick={handleLoadExample} style={btnSecondary}>Load Honasa example</button>
        {quarters.length > 0 && <button onClick={handleClearAll} style={btnDanger}>Clear all</button>}
      </div>

      {mode === "add" && <QuarterForm onSave={handleAdd} onCancel={() => setMode(null)} />}
      {mode === "edit" && editingQuarter && <QuarterForm initialQuarter={editingQuarter} onSave={handleUpdate} onCancel={() => setMode(null)} />}
      {mode === "import" && <ImportPanel onImport={handleImport} onCancel={() => setMode(null)} />}

      {quarters.length === 0 ? (
        mode === null && <EmptyState />
      ) : (
        <>
          {/* Category growth estimate */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>
              Category growth estimate (optional — powers the category-benchmark check):
            </span>
            <input type="number" step="0.1" value={categoryGrowthEstimate || ""} placeholder="e.g. 8.5"
              onChange={e => setCategoryGrowthEstimate(e.target.value === "" ? 0 : Number(e.target.value))}
              style={{ width: 70, fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "6px 8px" }} />
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>%</span>
          </div>

          {/* Period strip */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
            {enriched.map(q => (
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
                {/* isAnimationActive=false: Recharts' Bar entrance animation miscomputes its end state
                    at narrow container widths (bars render squashed/missing on mobile). Disabling it
                    renders bars directly at their correct final geometry on every screen size. */}
                <Bar yAxisId="left" dataKey="Ad spend" fill={INK_TEXT} opacity={0.35} radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} />
                <Bar yAxisId="left" dataKey="Revenue" fill={MOSS} radius={[3, 3, 0, 0]} barSize={22} isAnimationActive={false} />
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
                  {selected.sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT }}>{selected.sub}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Dot verdict={selected.result.verdict} size={12} />
                  <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: VERDICT_COLOR[selected.result.verdict] }}>{selected.result.verdict}</span>
                  <button onClick={() => setMode("edit")} style={btnGhostSmall}>Edit</button>
                  <button onClick={() => handleDelete(selected.id)} style={{ ...btnGhostSmall, color: BRICK, borderColor: `${BRICK}55` }}>Delete</button>
                </div>
              </div>

              <div style={{ height: 1, background: PAPER_LINE, margin: "16px 0" }} />

              {selected.result.checks.length === 0 && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, padding: "8px 0" }}>
                  Not enough data entered to run any checks on this period.
                </div>
              )}
              {selected.result.checks.map(c => (
                <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "10px 0", borderBottom: `1px solid ${PAPER_LINE}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT, marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, fontVariantNumeric: "tabular-nums" }}>{c.detail}</div>
                  </div>
                  <StatusPill status={c.status} score={c.score} />
                </div>
              ))}

              {selected.notes && selected.notes.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: MUTED_TEXT, marginBottom: 6 }}>Sources & notes for this period</div>
                  {selected.notes.map((n, i) => (
                    <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 3 }}>· {n}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interactive what-if layer — single period, linear projection only */}
          {selected && <WhatIfLedger key={selected.id} quarter={selected} />}
        </>
      )}
    </div>
  );
}

/* ---------- Modeled funnel tab — generic assumptions, loadable Honasa example ---------- */
function computeFunnel(a) {
  const impressions = (a.spend / a.cpm) * 1000;
  const clicks = impressions * (a.ctr / 100);
  const cpc = clicks > 0 ? a.spend / clicks : 0;
  const conversions = clicks * (a.cvr / 100);
  const cac = conversions > 0 ? a.spend / conversions : 0;
  const revenue = conversions * a.aov;
  const roas = a.spend > 0 ? revenue / a.spend : 0;
  const grossProfit = revenue * (a.grossMargin / 100);
  const marketingROI = a.spend > 0 ? ((grossProfit - a.spend) / a.spend) * 100 : 0;
  const ltv = a.aov * a.repeatPurchasesPerYear * a.customerLifetimeYears * (a.grossMargin / 100);
  const ltvToCac = cac > 0 ? ltv / cac : 0;
  return { impressions, clicks, cpc, conversions, cac, revenue, roas, grossProfit, marketingROI, ltv, ltvToCac };
}

function fmtCompact(n) {
  if (!isFinite(n)) return "—";
  if (n >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + " L";
  return Math.round(n).toLocaleString("en-IN");
}

function NumberField({ label, value, onChange, suffix, step = "any", isReal = false }) {
  return (
    <div style={{
      background: SLATE, border: `1px solid ${isReal ? REAL_GOLD : SLATE_LINE + "44"}`, borderRadius: 8,
      padding: "12px 14px", position: "relative"
    }}>
      {isReal && (
        <div style={{
          position: "absolute", top: -9, left: 12, background: SLATE, padding: "0 6px",
          fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: REAL_GOLD, letterSpacing: "0.04em"
        }}>REAL</div>
      )}
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          type="number" value={value} step={step}
          onChange={e => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600,
            color: isReal ? REAL_GOLD : ON_DARK, fontVariantNumeric: "tabular-nums"
          }}
        />
        {suffix && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: ON_DARK_MUTED }}>{suffix}</span>}
      </div>
    </div>
  );
}

function ModeledFunnel() {
  const [campaignName, setCampaignName] = useState(() => loadJSON(LS_KEYS.funnelName, ""));
  const [description, setDescription] = useState(() => loadJSON(LS_KEYS.funnelDesc, ""));
  const [a, setA] = useState(() => loadJSON(LS_KEYS.funnelAssumptions, BLANK_FUNNEL_ASSUMPTIONS));
  const [grossMarginIsReal, setGrossMarginIsReal] = useState(() => loadJSON(LS_KEYS.funnelGmReal, false));
  const [grossMarginNote, setGrossMarginNote] = useState(() => loadJSON(LS_KEYS.funnelGmNote, ""));

  useEffect(() => saveJSON(LS_KEYS.funnelName, campaignName), [campaignName]);
  useEffect(() => saveJSON(LS_KEYS.funnelDesc, description), [description]);
  useEffect(() => saveJSON(LS_KEYS.funnelAssumptions, a), [a]);
  useEffect(() => saveJSON(LS_KEYS.funnelGmReal, grossMarginIsReal), [grossMarginIsReal]);
  useEffect(() => saveJSON(LS_KEYS.funnelGmNote, grossMarginNote), [grossMarginNote]);

  const set = (key) => (val) => setA(prev => ({ ...prev, [key]: val }));

  function loadExample() {
    if ((campaignName.trim() || description.trim()) && !window.confirm("Load the Honasa example? This replaces your current funnel inputs.")) return;
    setCampaignName(HONASA_FUNNEL_EXAMPLE.campaignName);
    setDescription(HONASA_FUNNEL_EXAMPLE.description);
    setA(HONASA_FUNNEL_EXAMPLE.assumptions);
    setGrossMarginIsReal(HONASA_FUNNEL_EXAMPLE.grossMarginIsReal);
    setGrossMarginNote(HONASA_FUNNEL_EXAMPLE.grossMarginNote);
  }
  function resetAll() {
    if (!window.confirm("Reset the funnel to blank defaults?")) return;
    setCampaignName(""); setDescription(""); setA(BLANK_FUNNEL_ASSUMPTIONS);
    setGrossMarginIsReal(false); setGrossMarginNote("");
  }

  const m = useMemo(() => computeFunnel(a), [a]);

  const stages = [
    { name: "Impressions", value: m.impressions, display: fmtCompact(m.impressions) },
    { name: "Clicks", value: m.clicks, display: fmtCompact(m.clicks), rateFromPrev: `CTR ${a.ctr}%` },
    { name: "Conversions", value: m.conversions, display: fmtCompact(m.conversions), rateFromPrev: `CVR ${a.cvr}%` }
  ];
  const maxVal = stages[0].value || 1;
  const widths = stages.map(s => Math.max(8, Math.min(100, (s.value / maxVal) * 100)));

  const metrics = [
    { label: "Campaign spend", value: inr(a.spend), note: "assumed budget · drag the slider below" },
    { label: "CPM", value: inr(a.cpm), note: "seeded assumption" },
    { label: "CPC", value: inr(m.cpc, { maximumFractionDigits: 2 }), note: "spend ÷ clicks" },
    { label: "CAC", value: inr(m.cac), note: "spend ÷ conversions" },
    { label: "Revenue", value: "₹" + fmtCompact(m.revenue), note: "conversions × AOV (seeded)" },
    { label: "ROAS", value: m.roas.toFixed(2) + "×", note: "revenue ÷ spend" },
    { label: "Gross margin", value: a.grossMargin + "%", note: grossMarginNote || "seeded assumption", isReal: grossMarginIsReal },
    { label: "Marketing ROI", value: m.marketingROI.toFixed(1) + "%", note: "(gross profit − spend) ÷ spend, first purchase only" },
    { label: "LTV", value: inr(m.ltv), note: "AOV × repeat/yr × lifetime × margin (seeded)" },
    { label: "LTV : CAC", value: m.ltvToCac.toFixed(1) + "×", note: m.ltvToCac >= 3 ? "healthy (benchmark: ~3× or higher)" : "below the ~3× health benchmark" }
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={loadExample} style={btnSecondaryDark}>Load Honasa example</button>
        <button onClick={resetAll} style={btnSecondaryDark}>Reset to blank</button>
      </div>

      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK_MUTED, marginBottom: 16, maxWidth: 640, lineHeight: 1.6 }}>
        Model any campaign's funnel — impressions through clicks, conversions, CAC, ROAS and LTV — from your own
        rate assumptions. Nothing here is looked up automatically; every number below comes from what you enter.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, maxWidth: 640 }}>
        <DarkField label="Brand / campaign name (optional)" value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Your Brand — Summer launch" />
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED }}>Description (optional)</span>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="What is this campaign? Where do the assumption values below come from?"
            style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK, background: SLATE, border: `1px solid ${SLATE_LINE}44`, borderRadius: 6, padding: "8px 10px", resize: "vertical" }} />
        </label>
      </div>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 20,
        border: `1px dashed ${SLATE_LINE}`, borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12,
        fontWeight: 600, color: ON_DARK
      }}>
        MODELED — seeded assumptions unless flagged real below. Adjust freely.
      </div>

      {/* Assumptions panel */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: ON_DARK, marginBottom: 10, letterSpacing: "0.02em" }}>
          ASSUMPTIONS
        </div>

        {/* Spend slider */}
        <div style={{ background: SLATE, border: `1px solid ${SLATE_LINE}44`, borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED }}>Campaign spend</span>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: ON_DARK, fontVariantNumeric: "tabular-nums" }}>
              {inr(a.spend)}
            </span>
          </div>
          <input
            type="range" min={10000} max={20000000} step={10000} value={a.spend}
            onChange={e => set("spend")(Number(e.target.value))}
            style={{ width: "100%", accentColor: AMBER }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 10, color: ON_DARK_MUTED, marginTop: 4 }}>
            <span>₹10,000</span>
            <span>₹2,00,00,000</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          <NumberField label="CPM" value={a.cpm} onChange={set("cpm")} suffix="₹" />
          <NumberField label="CTR" value={a.ctr} onChange={set("ctr")} suffix="%" step="0.1" />
          <NumberField label="CVR" value={a.cvr} onChange={set("cvr")} suffix="%" step="0.1" />
          <NumberField label="AOV" value={a.aov} onChange={set("aov")} suffix="₹" />
          <NumberField label="Gross margin" value={a.grossMargin} onChange={set("grossMargin")} suffix="%" isReal={grossMarginIsReal} />
          <NumberField label="Repeat purchases / yr" value={a.repeatPurchasesPerYear} onChange={set("repeatPurchasesPerYear")} step="0.1" />
          <NumberField label="Customer lifetime (yrs)" value={a.customerLifetimeYears} onChange={set("customerLifetimeYears")} step="0.1" />
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxWidth: 640 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 12, color: ON_DARK_MUTED }}>
            <input type="checkbox" checked={grossMarginIsReal} onChange={e => setGrossMarginIsReal(e.target.checked)} />
            Gross margin above is real disclosed data, not a seeded assumption
          </label>
          {grossMarginIsReal && (
            <input type="text" value={grossMarginNote} onChange={e => setGrossMarginNote(e.target.value)}
              placeholder='Note why this is real, e.g. "disclosed FY26 gross margin"'
              style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: ON_DARK, background: SLATE, border: `1px solid ${SLATE_LINE}44`, borderRadius: 6, padding: "6px 10px" }} />
          )}
        </div>
      </div>

      {/* Funnel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 32 }}>
        {stages.map((s, i) => (
          <div key={s.name}>
            {i > 0 && (
              <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: SLATE_LINE, border: `1px dashed ${SLATE_LINE}`, borderRadius: 4, padding: "2px 8px" }}>
                  {s.rateFromPrev}
                </span>
              </div>
            )}
            <div style={{
              width: `${widths[i]}%`, margin: "0 auto", background: SLATE, border: `1px solid ${SLATE_LINE}`,
              borderRadius: 6, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
              transition: "width 0.15s ease-out"
            }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK_MUTED }}>{s.name}</span>
              <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600, color: ON_DARK, fontVariantNumeric: "tabular-nums" }}>{s.display}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {metrics.map(mc => (
          <div key={mc.label} style={{
            background: SLATE, border: `1px solid ${mc.isReal ? REAL_GOLD : SLATE_LINE + "44"}`, borderRadius: 8, padding: 16
          }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED, marginBottom: 6 }}>{mc.label}</div>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 600, color: mc.isReal ? REAL_GOLD : ON_DARK, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{mc.value}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: ON_DARK_MUTED, lineHeight: 1.4 }}>{mc.note}</div>
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');
      input[type="range"] { cursor: pointer; }
      input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { opacity: 0.6; }`}</style>

      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "'Source Serif 4', serif", fontSize: 30, fontWeight: 700,
          color: isReal ? INK_TEXT : ON_DARK, letterSpacing: "-0.01em"
        }}>Ad-Spend vs. Outcome Tracker</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: isReal ? MUTED_TEXT : ON_DARK_MUTED, marginTop: 4 }}>
          AMS Capstone · Topic 6 — enter your own ad spend and revenue data, or load the Honasa Consumer example
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
