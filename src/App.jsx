import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import * as THREE from "three";

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
const lightInputStyle = {
  fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT,
  border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "8px 10px", background: "#fff"
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
  funnelGmNote: "funnel.gmNote",
  evaluatorCampaign: "evaluator.campaign",
  evaluatorShowResults: "evaluator.showResults"
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
const SAAS_FUNNEL_EXAMPLE = {
  campaignName: "Illustrative — SaaS free-trial funnel",
  description: "A fully hypothetical example for a different business model (subscription SaaS), not tied to any real company. Useful for seeing how the same formulas play out with a lower CTR/CVR but much higher LTV:CAC than a D2C consumer example — subscription retention does a lot of work here. No figure in this example is real.",
  assumptions: { spend: 2000000, cpm: 250, ctr: 0.9, cvr: 1.2, aov: 12000, grossMargin: 82, repeatPurchasesPerYear: 1, customerLifetimeYears: 3 },
  grossMarginIsReal: false,
  grossMarginNote: ""
};
const FUNNEL_EXAMPLES = [
  { key: "honasa", label: "Honasa Consumer — D2C beauty (real gross margin)", data: HONASA_FUNNEL_EXAMPLE },
  { key: "saas", label: "Illustrative — SaaS free-trial funnel", data: SAAS_FUNNEL_EXAMPLE }
];
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
      if (profitGrowthPct < 0) {
        dStatus = "Inefficient"; dScore = -1;
      } else if (spendGrowthPct <= 0) {
        // Spend didn't grow (or fell) YoY. Dividing profit growth by a zero/negative spend-growth
        // figure would flip or blow up the ratio below, so judge this case directly instead:
        // profit grew on flat-or-lower spend is unambiguously good; flat profit on flat-or-lower
        // spend is neutral, not a penalty.
        if (profitGrowthPct > 0) { dStatus = "Efficient"; dScore = 1; }
        else { dStatus = "Watch"; dScore = 0; }
      } else {
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
const inr = (n, opts = {}) => {
  const num = Number(n);
  return (num < 0 ? "-" : "") + "₹" + Math.abs(num).toLocaleString("en-IN", { maximumFractionDigits: 0, ...opts });
};
const inrShort = (n) => {
  const num = Number(n);
  return (num < 0 ? "-" : "") + "₹" + Math.abs(num).toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

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

/* ---------- Channel breakdown (optional, per period) ----------
   Everything here is derived only from numbers the user enters for THIS period's channels —
   no external benchmarks, no fitted models. "Weakest"/"strongest" and the recommendation text
   are relative comparisons among the channels actually entered, not industry claims. */
function computeChannelStats(ch) {
  const roas = ch.spend > 0 ? ch.revenue / ch.spend : null;
  const ctr = (ch.impressions != null && ch.impressions > 0 && ch.clicks != null) ? (ch.clicks / ch.impressions) * 100 : null;
  const cvr = (ch.clicks != null && ch.clicks > 0 && ch.conversions != null) ? (ch.conversions / ch.clicks) * 100 : null;
  const cpa = (ch.conversions != null && ch.conversions > 0) ? ch.spend / ch.conversions : null;
  return { roas, ctr, cvr, cpa };
}

function analyzeChannels(channels) {
  const withStats = channels.map(ch => ({ ...ch, stats: computeChannelStats(ch) }));
  const withRoas = withStats.filter(ch => ch.stats.roas != null);
  if (!withRoas.length) return { enriched: withStats, blendedRoas: null, avgCtr: null, avgCvr: null };

  const totalSpend = withRoas.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = withRoas.reduce((s, c) => s + c.revenue, 0);
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : null;

  let weakestId = null, strongestId = null;
  if (withRoas.length >= 2) {
    const sorted = [...withRoas].sort((a, b) => a.stats.roas - b.stats.roas);
    weakestId = sorted[0].id;
    strongestId = sorted[sorted.length - 1].id;
  }

  const ctrVals = withRoas.map(c => c.stats.ctr).filter(v => v != null);
  const cvrVals = withRoas.map(c => c.stats.cvr).filter(v => v != null);
  const avgCtr = ctrVals.length ? ctrVals.reduce((a, b) => a + b, 0) / ctrVals.length : null;
  const avgCvr = cvrVals.length ? cvrVals.reduce((a, b) => a + b, 0) / cvrVals.length : null;

  const enriched = withStats.map(ch => ({
    ...ch,
    flag: ch.id === strongestId ? "strongest" : ch.id === weakestId ? "weakest" : null
  }));

  return { enriched, blendedRoas, avgCtr, avgCvr };
}

function channelDiagnosis(ch, analysis) {
  const notes = [];
  const { stats } = ch;
  if (stats.roas != null && analysis.blendedRoas != null) {
    if (ch.flag === "weakest" && stats.roas < analysis.blendedRoas * 0.85) {
      notes.push(`ROAS (${stats.roas.toFixed(1)}×) is well below the ${analysis.blendedRoas.toFixed(1)}× blended across entered channels.`);
    }
    if (ch.flag === "strongest" && stats.roas > analysis.blendedRoas * 1.15) {
      notes.push(`ROAS (${stats.roas.toFixed(1)}×) is well above the ${analysis.blendedRoas.toFixed(1)}× blended across entered channels.`);
    }
  }
  if (stats.ctr != null && analysis.avgCtr) {
    const rel = stats.ctr / analysis.avgCtr;
    if (rel < 0.7) notes.push(`CTR (${stats.ctr.toFixed(2)}%) is below this period's channel average (${analysis.avgCtr.toFixed(2)}%) — reach isn't converting into clicks as well as your other channels.`);
    else if (rel > 1.3) notes.push(`CTR (${stats.ctr.toFixed(2)}%) is above this period's channel average (${analysis.avgCtr.toFixed(2)}%).`);
  }
  if (stats.cvr != null && analysis.avgCvr) {
    const rel = stats.cvr / analysis.avgCvr;
    if (rel < 0.7) notes.push(`Conversion rate (${stats.cvr.toFixed(2)}%) is below this period's channel average (${analysis.avgCvr.toFixed(2)}%) — clicks aren't converting as well here.`);
    else if (rel > 1.3) notes.push(`Conversion rate (${stats.cvr.toFixed(2)}%) is above this period's channel average (${analysis.avgCvr.toFixed(2)}%).`);
  }
  return notes;
}

function buildChannelRecommendations(analysis) {
  const recs = [];
  const weakest = analysis.enriched.find(c => c.flag === "weakest");
  const strongest = analysis.enriched.find(c => c.flag === "strongest");
  if (weakest) {
    recs.push(`${weakest.name} has the lowest ROAS (${weakest.stats.roas.toFixed(1)}×) of the channels entered this period. Before shifting more budget here, check whether the CTR/CVR columns above point to a targeting, creative, or landing-page issue.`);
  }
  if (strongest && strongest.id !== weakest?.id) {
    recs.push(`${strongest.name} has the highest ROAS (${strongest.stats.roas.toFixed(1)}×). If there's budget to test incrementally, this is the most natural candidate — though only a real incrementality test can confirm returns hold at a larger spend.`);
  }
  if (!weakest && !strongest) {
    recs.push("Add at least two channels for this period to compare performance and surface a reallocation candidate.");
  }
  return recs;
}

function blankChannelDraft() {
  return { name: "", spend: "", revenue: "", impressions: "", clicks: "", conversions: "" };
}
function channelToDraft(ch) {
  return {
    name: ch.name ?? "", spend: ch.spend ?? "", revenue: ch.revenue ?? "",
    impressions: ch.impressions ?? "", clicks: ch.clicks ?? "", conversions: ch.conversions ?? ""
  };
}
function draftToChannel(draft, existingId) {
  const errors = [];
  if (!draft.name.trim()) errors.push("Channel name is required.");
  const spend = Number(draft.spend);
  const revenue = Number(draft.revenue);
  if (!Number.isFinite(spend) || spend <= 0) errors.push("Spend must be a positive number.");
  if (!Number.isFinite(revenue)) errors.push("Revenue must be a number.");
  const optNum = (v) => v === "" ? null : Number(v);
  const impressions = optNum(draft.impressions), clicks = optNum(draft.clicks), conversions = optNum(draft.conversions);
  if ([impressions, clicks, conversions].some(v => v != null && !Number.isFinite(v))) {
    errors.push("Impressions/clicks/conversions must be numbers if provided.");
  }
  if (errors.length) return { error: errors.join(" ") };
  return {
    channel: {
      id: existingId || `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: draft.name.trim(), spend, revenue, impressions, clicks, conversions
    }
  };
}

function ChannelForm({ initialChannel, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => initialChannel ? channelToDraft(initialChannel) : blankChannelDraft());
  const [error, setError] = useState(null);
  const set = (key) => (e) => setDraft(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = () => {
    const result = draftToChannel(draft, initialChannel?.id);
    if (result.error) { setError(result.error); return; }
    onSave(result.channel);
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 16, marginBottom: 14 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT, marginBottom: 10 }}>
        {initialChannel ? "Edit channel" : "Add a channel"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
        <LightField label="Channel name" required value={draft.name} onChange={set("name")} placeholder="e.g. Meta Ads" />
        <LightField label="Spend" required type="number" value={draft.spend} onChange={set("spend")} />
        <LightField label="Revenue" required type="number" value={draft.revenue} onChange={set("revenue")} />
        <LightField label="Impressions (optional)" type="number" value={draft.impressions} onChange={set("impressions")} />
        <LightField label="Clicks (optional)" type="number" value={draft.clicks} onChange={set("clicks")} />
        <LightField label="Conversions (optional)" type="number" value={draft.conversions} onChange={set("conversions")} />
      </div>
      {error && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: BRICK, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} style={btnPrimary}>{initialChannel ? "Save changes" : "Add channel"}</button>
        <button onClick={onCancel} style={btnSecondary}>Cancel</button>
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "6px 10px", fontFamily: "Inter, sans-serif", fontWeight: 600, color: MUTED_TEXT, fontSize: 11 };
const tdStyle = { padding: "8px 10px", fontFamily: "Inter, sans-serif", color: INK_TEXT, whiteSpace: "nowrap", fontSize: 12 };

function ChannelWhatIfSlider({ channel, contextNoun = "period" }) {
  const [hypSpend, setHypSpend] = useState(channel.spend);
  const stats = computeChannelStats(channel);
  const projectedRevenue = stats.roas != null ? hypSpend * stats.roas : null;
  const min = 0;
  const max = Math.max(1, Math.round(channel.spend * 2));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        <input type="range" min={min} max={max} step={1} value={hypSpend}
          onChange={e => setHypSpend(Number(e.target.value))}
          style={{ flex: 1, minWidth: 180, accentColor: BRICK }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: INK_TEXT, fontVariantNumeric: "tabular-nums" }}>
            {inrShort(hypSpend)}
          </span>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT }}>(actual: {inrShort(channel.spend)})</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>{channel.name}'s current ROAS</div>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: INK_TEXT }}>{stats.roas != null ? stats.roas.toFixed(2) + "×" : "—"}</div>
        </div>
        <div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>Projected revenue at this spend</div>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 600, color: INK_TEXT }}>{projectedRevenue != null ? inrShort(projectedRevenue) : "—"}</div>
        </div>
      </div>
      <div style={{
        background: `${AMBER}14`, border: `1px solid ${AMBER}55`, borderRadius: 6, padding: "10px 12px",
        fontFamily: "Inter, sans-serif", fontSize: 12, color: INK_TEXT, lineHeight: 1.6
      }}>
        This assumes {channel.name}'s current ROAS holds at the margin as spend changes — a constant-ROAS
        projection, not a fitted model{contextNoun === "period" ? ", and it's weaker evidence than the period-level what-if above, since it's based on one spend/revenue snapshot for this channel rather than an observed change over time" : ""}.
        It ignores diminishing returns entirely.
      </div>
    </div>
  );
}

function ChannelWhatIf({ channels, contextNoun = "period" }) {
  const eligible = channels.filter(c => c.stats.roas != null);
  const [selectedId, setSelectedId] = useState(eligible[0]?.id ?? null);
  if (!eligible.length) return null;
  const channel = eligible.find(c => c.id === selectedId) ?? eligible[0];

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT }}>
          What if spend on
        </div>
        <select value={channel.id} onChange={e => setSelectedId(e.target.value)}
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "4px 8px", background: "#fff" }}>
          {eligible.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT }}>changed?</div>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 14 }}>
        A reallocation what-if for one channel — see caveat below.
      </div>
      <ChannelWhatIfSlider key={channel.id} channel={channel} contextNoun={contextNoun} />
    </div>
  );
}

function ChannelSection({ channels, onAdd, onUpdate, onDelete, contextNoun = "period", readOnly = false }) {
  const [mode, setMode] = useState(null); // null | "add" | "edit"
  const [editId, setEditId] = useState(null);
  const analysis = useMemo(() => analyzeChannels(channels), [channels]);
  const editingChannel = mode === "edit" ? channels.find(c => c.id === editId) : null;

  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24, marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT }}>Channel breakdown</div>
        {!readOnly && <button onClick={() => { setMode("add"); setEditId(null); }} style={btnGhostSmall}>+ Add channel</button>}
      </div>

      {channels.length === 0 && mode === null && !readOnly && (
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, lineHeight: 1.6 }}>
          Optional — break this {contextNoun}'s spend down by channel (Meta, Google, YouTube, etc.) to see which
          channel is driving or dragging performance, with a diagnosis, recommendations, and a channel-level what-if.
        </div>
      )}

      {!readOnly && mode === "add" && <ChannelForm onSave={(ch) => { onAdd(ch); setMode(null); }} onCancel={() => setMode(null)} />}
      {!readOnly && mode === "edit" && editingChannel && <ChannelForm initialChannel={editingChannel} onSave={(ch) => { onUpdate(ch); setMode(null); }} onCancel={() => setMode(null)} />}

      {channels.length > 0 && (
        <>
          <div style={{ overflowX: "auto", marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${PAPER_LINE}` }}>
                  <th style={thStyle}>Channel</th>
                  <th style={thStyle}>Spend</th>
                  <th style={thStyle}>Revenue</th>
                  <th style={thStyle}>ROAS</th>
                  <th style={thStyle}>CTR</th>
                  <th style={thStyle}>CVR</th>
                  <th style={thStyle}>CPA</th>
                  {!readOnly && <th style={thStyle}></th>}
                </tr>
              </thead>
              <tbody>
                {analysis.enriched.map(ch => (
                  <tr key={ch.id} style={{ borderBottom: `1px solid ${PAPER_LINE}` }}>
                    <td style={tdStyle}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Dot verdict={ch.flag === "weakest" ? "Red" : ch.flag === "strongest" ? "Green" : "Yellow"} size={8} />
                        {ch.name}
                      </span>
                    </td>
                    <td style={tdStyle}>{inrShort(ch.spend)}</td>
                    <td style={tdStyle}>{inrShort(ch.revenue)}</td>
                    <td style={tdStyle}>{ch.stats.roas != null ? ch.stats.roas.toFixed(1) + "×" : "—"}</td>
                    <td style={tdStyle}>{ch.stats.ctr != null ? ch.stats.ctr.toFixed(2) + "%" : "—"}</td>
                    <td style={tdStyle}>{ch.stats.cvr != null ? ch.stats.cvr.toFixed(2) + "%" : "—"}</td>
                    <td style={tdStyle}>{ch.stats.cpa != null ? inr(ch.stats.cpa, { maximumFractionDigits: 2 }) : "—"}</td>
                    {!readOnly && (
                      <td style={tdStyle}>
                        <button onClick={() => { setMode("edit"); setEditId(ch.id); }} style={{ ...btnGhostSmall, marginRight: 6 }}>Edit</button>
                        <button onClick={() => onDelete(ch.id)} style={{ ...btnGhostSmall, color: BRICK, borderColor: `${BRICK}55` }}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analysis.blendedRoas != null && (
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 14 }}>
              Blended ROAS across entered channels: <strong style={{ color: INK_TEXT }}>{analysis.blendedRoas.toFixed(1)}×</strong>
            </div>
          )}

          {analysis.enriched.filter(ch => ch.flag).map(ch => {
            const notes = channelDiagnosis(ch, analysis);
            if (!notes.length) return null;
            return (
              <div key={ch.id} style={{
                fontFamily: "Inter, sans-serif", fontSize: 12, color: INK_TEXT, marginBottom: 8, padding: "8px 12px",
                background: ch.flag === "weakest" ? `${BRICK}12` : `${MOSS}12`, borderRadius: 6, lineHeight: 1.6
              }}>
                <strong>{ch.name}:</strong> {notes.join(" ")}
              </div>
            );
          })}

          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: MUTED_TEXT, marginBottom: 8, letterSpacing: "0.02em" }}>
              RECOMMENDATIONS
            </div>
            {buildChannelRecommendations(analysis).map((text, i) => (
              <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, marginBottom: 6, lineHeight: 1.6 }}>· {text}</div>
            ))}
          </div>

          <ChannelWhatIf channels={analysis.enriched} contextNoun={contextNoun} />
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
  function handleAddChannel(quarterId, channel) {
    setQuarters(prev => prev.map(q => q.id === quarterId ? { ...q, channels: [...(q.channels || []), channel] } : q));
  }
  function handleUpdateChannel(quarterId, channel) {
    setQuarters(prev => prev.map(q => q.id === quarterId
      ? { ...q, channels: (q.channels || []).map(c => c.id === channel.id ? channel : c) }
      : q));
  }
  function handleDeleteChannel(quarterId, channelId) {
    if (!window.confirm("Remove this channel? This can't be undone.")) return;
    setQuarters(prev => prev.map(q => q.id === quarterId
      ? { ...q, channels: (q.channels || []).filter(c => c.id !== channelId) }
      : q));
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12, marginTop: 16 }}>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>Ad spend</div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT }}>{inrShort(selected.adSpend)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>Revenue</div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT }}>{inrShort(selected.revenue)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT, marginBottom: 4 }}>ROAS</div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT }}>{(selected.revenue / selected.adSpend).toFixed(2)}×</div>
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

          {/* Channel breakdown — optional drill-down: which channel is driving or dragging this period */}
          {selected && (
            <ChannelSection
              key={selected.id}
              channels={selected.channels || []}
              onAdd={(ch) => handleAddChannel(selected.id, ch)}
              onUpdate={(ch) => handleUpdateChannel(selected.id, ch)}
              onDelete={(id) => handleDeleteChannel(selected.id, id)}
            />
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
  const [exampleKey, setExampleKey] = useState(FUNNEL_EXAMPLES[0].key);

  function loadExample() {
    const ex = FUNNEL_EXAMPLES.find(e => e.key === exampleKey) || FUNNEL_EXAMPLES[0];
    if ((campaignName.trim() || description.trim()) && !window.confirm(`Load the "${ex.label}" example? This replaces your current funnel inputs.`)) return;
    setCampaignName(ex.data.campaignName);
    setDescription(ex.data.description);
    setA(ex.data.assumptions);
    setGrossMarginIsReal(ex.data.grossMarginIsReal);
    setGrossMarginNote(ex.data.grossMarginNote);
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <select value={exampleKey} onChange={e => setExampleKey(e.target.value)}
          style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: ON_DARK, background: SLATE, border: `1px solid ${SLATE_LINE}`, borderRadius: 6, padding: "8px 10px" }}>
          {FUNNEL_EXAMPLES.map(ex => <option key={ex.key} value={ex.key}>{ex.label}</option>)}
        </select>
        <button onClick={loadExample} style={btnSecondaryDark}>Load example</button>
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

/* ---------- Campaign Evaluator tab — single-campaign form -> scored report ----------
   Design rule carried over from the rest of this app: the 0-100 score and Green/Yellow/Red
   verdict are computed ONLY from dimensions where the user set their own target (ROAS, max
   CPA, target CTR, target conversion rate). No target set anywhere = no score shown, rather
   than falling back to an invented "industry standard" threshold. */

const INDUSTRY_OPTIONS = ["Beauty & Personal Care", "Fashion & Apparel", "Food & Beverage", "Electronics", "Technology / SaaS", "Travel", "Financial Services", "Education", "Healthcare", "Other"];
const OBJECTIVE_OPTIONS = ["Sales / Revenue", "Lead Generation", "Brand Awareness", "Website Traffic", "Engagement", "App Installs"];
const OBJECTIVE_PRIMARY_METRICS = {
  "Sales / Revenue": ["revenue", "conversions"],
  "Lead Generation": ["leads", "conversions"],
  "Brand Awareness": ["reach", "impressions"],
  "Website Traffic": ["clicks", "impressions"],
  "Engagement": ["engagements"],
  "App Installs": ["conversions"]
};
const OUTCOME_FIELDS = [
  { key: "revenue", label: "Revenue generated (₹)" },
  { key: "impressions", label: "Impressions" },
  { key: "reach", label: "Reach" },
  { key: "clicks", label: "Clicks" },
  { key: "engagements", label: "Engagements" },
  { key: "conversions", label: "Conversions" },
  { key: "leads", label: "Leads" }
];

const BLANK_CAMPAIGN = {
  brandName: "", campaignName: "", industry: "", objective: "", durationDays: "", targetAudience: "",
  channels: [], otherExpenses: [],
  outcomes: { revenue: "", impressions: "", reach: "", clicks: "", engagements: "", conversions: "", leads: "" },
  targets: { targetRoas: "", maxCpa: "", targetCtr: "", targetConversionRate: "" }
};

/* Illustrative examples — seeded numbers for demo purposes, NOT any real company's disclosed
   data. Honasa doesn't disclose campaign- or channel-level spend/outcome figures anywhere this
   project could source (see the Modeled Funnel tab for the same caveat), and the other two
   brands here are entirely fictional. Three examples deliberately span the three verdict bands
   (Good / Needs Optimisation / Poor) so the scoring engine's full range is visible on load. */
const CAMPAIGN_EVALUATOR_EXAMPLE_BEAUTY = {
  brandName: "Honasa Consumer (illustrative)", campaignName: "Derma Co. — Summer Serum Launch",
  industry: "Beauty & Personal Care", objective: "Sales / Revenue", durationDays: "30",
  targetAudience: "Women 25–40, urban India",
  channels: [
    { id: "ex-b-meta", name: "Meta Ads", spend: 45000, revenue: 220000, impressions: 120000, clicks: 4200, conversions: 140 },
    { id: "ex-b-google", name: "Google Ads", spend: 30000, revenue: 130000, impressions: 70000, clicks: 1750, conversions: 80 },
    { id: "ex-b-youtube", name: "YouTube Ads", spend: 25000, revenue: 50000, impressions: 250000, clicks: 1750, conversions: 32 }
  ],
  otherExpenses: [
    { id: "ex-b-creative", name: "Creative Production", amount: 12000 },
    { id: "ex-b-agency", name: "Agency Fees", amount: 8000 }
  ],
  outcomes: { revenue: 400000, impressions: 440000, reach: 300000, clicks: 7700, engagements: 20000, conversions: 252, leads: "" },
  targets: { targetRoas: 3, maxCpa: 500, targetCtr: 3, targetConversionRate: 3 }
};

const CAMPAIGN_EVALUATOR_EXAMPLE_SAAS = {
  brandName: "CloudSuite (illustrative)", campaignName: "Q3 Enterprise Lead Gen",
  industry: "Technology / SaaS", objective: "Lead Generation", durationDays: "45",
  targetAudience: "IT directors at mid-market enterprises",
  channels: [
    { id: "ex-s-google", name: "Google Search Ads", spend: 80000, revenue: 180000, impressions: 50000, clicks: 3000, conversions: 45 },
    { id: "ex-s-linkedin", name: "LinkedIn Ads", spend: 100000, revenue: 140000, impressions: 40000, clicks: 800, conversions: 25 },
    { id: "ex-s-meta", name: "Meta Ads", spend: 40000, revenue: 30000, impressions: 150000, clicks: 3000, conversions: 8 }
  ],
  otherExpenses: [
    { id: "ex-s-agency", name: "Agency Fees", amount: 15000 },
    { id: "ex-s-landing", name: "Landing Page Development", amount: 10000 }
  ],
  outcomes: { revenue: 350000, impressions: 240000, reach: 200000, clicks: 6800, engagements: 5000, conversions: 78, leads: 78 },
  targets: { targetRoas: 2, maxCpa: 3500, targetCtr: 2, targetConversionRate: 1 }
};

const CAMPAIGN_EVALUATOR_EXAMPLE_FASHION = {
  brandName: "Threadline (illustrative)", campaignName: "Flash Sale — Monsoon Collection",
  industry: "Fashion & Apparel", objective: "Sales / Revenue", durationDays: "14",
  targetAudience: "Women 18–30, tier-2 cities",
  channels: [
    { id: "ex-f-meta", name: "Meta Ads", spend: 70000, revenue: 35000, impressions: 800000, clicks: 8500, conversions: 90 },
    { id: "ex-f-google", name: "Google Shopping", spend: 50000, revenue: 15000, impressions: 200000, clicks: 4000, conversions: 40 },
    { id: "ex-f-influencer", name: "Influencer Marketing", spend: 30000, revenue: 5000, impressions: 500000, clicks: 2500, conversions: 20 }
  ],
  otherExpenses: [
    { id: "ex-f-creative", name: "Creative Production", amount: 8000 },
    { id: "ex-f-discount", name: "Discount / Promo Subsidy", amount: 15000 }
  ],
  outcomes: { revenue: 55000, impressions: 1500000, reach: 900000, clicks: 15000, engagements: 30000, conversions: 150, leads: "" },
  targets: { targetRoas: 3, maxCpa: 300, targetCtr: 2, targetConversionRate: 2.5 }
};

const CAMPAIGN_EVALUATOR_EXAMPLES = [
  { key: "beauty", label: "D2C beauty — Serum launch (Good Investment)", data: CAMPAIGN_EVALUATOR_EXAMPLE_BEAUTY },
  { key: "saas", label: "B2B SaaS — Enterprise lead gen (Good, mixed dimensions)", data: CAMPAIGN_EVALUATOR_EXAMPLE_SAAS },
  { key: "fashion", label: "Fashion flash sale — Poor Investment", data: CAMPAIGN_EVALUATOR_EXAMPLE_FASHION }
];

function computeCampaignMetrics(c) {
  const mediaSpend = c.channels.reduce((s, ch) => s + (Number(ch.spend) || 0), 0);
  const otherCosts = c.otherExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCost = mediaSpend + otherCosts;
  const revenue = toNumOrNull(c.outcomes.revenue);
  const impressions = toNumOrNull(c.outcomes.impressions);
  const reach = toNumOrNull(c.outcomes.reach);
  const clicks = toNumOrNull(c.outcomes.clicks);
  const engagements = toNumOrNull(c.outcomes.engagements);
  const conversions = toNumOrNull(c.outcomes.conversions);
  const leads = toNumOrNull(c.outcomes.leads);

  const roas = (revenue != null && mediaSpend > 0) ? revenue / mediaSpend : null;
  const profit = (revenue != null) ? revenue - totalCost : null;
  const roi = (profit != null && totalCost > 0) ? (profit / totalCost) * 100 : null;
  const ctr = (clicks != null && impressions > 0) ? (clicks / impressions) * 100 : null;
  const conversionRate = (conversions != null && clicks > 0) ? (conversions / clicks) * 100 : null;
  const cpa = (conversions != null && conversions > 0 && mediaSpend > 0) ? mediaSpend / conversions : null;
  const cpc = (clicks != null && clicks > 0 && mediaSpend > 0) ? mediaSpend / clicks : null;
  const engagementRate = (engagements != null && impressions > 0) ? (engagements / impressions) * 100 : null;
  const cpl = (leads != null && leads > 0 && mediaSpend > 0) ? mediaSpend / leads : null;

  return { mediaSpend, otherCosts, totalCost, revenue, profit, roi, roas, ctr, conversionRate, cpa, cpc, engagementRate, cpl, impressions, reach, clicks, engagements, conversions, leads };
}

function evaluateCampaign(campaign, metrics) {
  const targetRoas = toNumOrNull(campaign.targets.targetRoas);
  const maxCpa = toNumOrNull(campaign.targets.maxCpa);
  const targetCtr = toNumOrNull(campaign.targets.targetCtr);
  const targetConvRate = toNumOrNull(campaign.targets.targetConversionRate);

  function dimension(name, actual, target, higherIsBetter, fmt) {
    if (actual == null) return { name, score: null, status: "Not evaluated", detail: `Not enough outcome data entered to evaluate ${name.toLowerCase()}.` };
    if (target == null) return { name, score: null, status: "Not evaluated", detail: `${name}: ${fmt(actual)}. Set a target above to evaluate this dimension.` };
    const score = Math.max(0, higherIsBetter ? (actual / target) * 100 : (target / actual) * 100);
    const meets = higherIsBetter ? actual >= target : actual <= target;
    const status = score >= 100 ? "Strong" : score >= 70 ? "Watch" : "Weak";
    const detail = `${fmt(actual)} ${meets ? "meets or exceeds" : "falls short of"} your target of ${fmt(target)}.`;
    return { name, score, status, detail };
  }

  const fmtX = (v) => v.toFixed(2) + "×";
  const fmtRs = (v) => inr(v, { maximumFractionDigits: 2 });
  const fmtPct = (v) => v.toFixed(2) + "%";

  const dims = [
    dimension("Financial Efficiency", metrics.roas, targetRoas, true, fmtX),
    dimension("Cost Efficiency", metrics.cpa, maxCpa, false, fmtRs),
    dimension("Audience Response", metrics.ctr, targetCtr, true, fmtPct),
    dimension("Conversion Efficiency", metrics.conversionRate, targetConvRate, true, fmtPct)
  ];

  const evaluated = dims.filter(d => d.score != null);
  const overallScore = evaluated.length ? Math.round(evaluated.reduce((s, d) => s + Math.min(d.score, 100), 0) / evaluated.length) : null;
  const verdict = overallScore == null ? null : overallScore >= 75 ? "Green" : overallScore >= 45 ? "Yellow" : "Red";
  const verdictLabel = verdict === "Green" ? "Good Ad Investment" : verdict === "Yellow" ? "Needs Optimisation" : verdict === "Red" ? "Poor Ad Investment" : null;

  return { dims, overallScore, verdict, verdictLabel, evaluatedCount: evaluated.length };
}

function channelConcentrationNote(channels) {
  const totalSpend = channels.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  if (!totalSpend || channels.length < 2) return null;
  const top = [...channels].sort((a, b) => b.spend - a.spend)[0];
  const share = (top.spend / totalSpend) * 100;
  if (share > 60) return `${top.name} accounts for ${share.toFixed(0)}% of total ad spend, increasing channel-concentration risk.`;
  return null;
}

function buildCampaignRecommendations(evaluation, channelAnalysis, concentrationNote) {
  const recs = [];
  evaluation.dims.filter(d => d.status === "Weak").forEach(d => recs.push(`${d.name} needs attention: ${d.detail}`));
  recs.push(...buildChannelRecommendations(channelAnalysis));
  if (concentrationNote) recs.push(concentrationNote);
  if (!recs.length) {
    recs.push(evaluation.evaluatedCount === 0
      ? "Set at least one target above (ROAS, max CPA, CTR, or conversion rate) to get a scored evaluation and tailored recommendations."
      : "No specific concerns flagged — performance is meeting or exceeding the targets you set.");
  }
  return recs;
}

function campaignSummary(evaluation, channelAnalysis) {
  if (evaluation.overallScore == null) {
    return "Set at least one target (ROAS, max CPA, CTR, or conversion rate) above to get a scored verdict and summary.";
  }
  const strong = evaluation.dims.filter(d => d.status === "Strong").map(d => d.name);
  const weak = evaluation.dims.filter(d => d.status === "Weak").map(d => d.name);
  let s = `This campaign scored ${evaluation.overallScore}/100 across the ${evaluation.evaluatedCount} dimension${evaluation.evaluatedCount === 1 ? "" : "s"} you set targets for — a "${evaluation.verdictLabel}" verdict.`;
  if (strong.length) s += ` ${strong.join(" and ")} ${strong.length > 1 ? "are" : "is"} meeting or exceeding target.`;
  if (weak.length) s += ` ${weak.join(" and ")} ${weak.length > 1 ? "need" : "needs"} attention.`;
  const weakestCh = channelAnalysis.enriched.find(c => c.flag === "weakest");
  const strongestCh = channelAnalysis.enriched.find(c => c.flag === "strongest");
  if (weakestCh && strongestCh) s += ` Among channels, ${strongestCh.name} is the strongest performer and ${weakestCh.name} the weakest — worth considering for reallocation.`;
  return s;
}

function LightSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: MUTED_TEXT }}>{label}</span>
      <select value={value} onChange={onChange}
        style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, border: `1px solid ${PAPER_LINE}`, borderRadius: 6, padding: "8px 10px", background: "#fff" }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SectionCard({ title, note, children }) {
  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 20, marginBottom: 18 }}>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: note ? 6 : 14 }}>{title}</div>
      {note && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 14, lineHeight: 1.6 }}>{note}</div>}
      {children}
    </div>
  );
}

function MetricCard({ title, rows }) {
  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 18 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: MUTED_TEXT, marginBottom: 12, letterSpacing: "0.02em" }}>{title.toUpperCase()}</div>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${PAPER_LINE}`, fontFamily: "Inter, sans-serif", fontSize: 13 }}>
          <span style={{ color: MUTED_TEXT }}>{label}</span>
          <span style={{ color: INK_TEXT, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{val}</span>
        </div>
      ))}
    </div>
  );
}

function DimensionCard({ dim }) {
  const color = dim.status === "Strong" ? MOSS : dim.status === "Weak" ? BRICK : dim.status === "Watch" ? AMBER : MUTED_TEXT;
  return (
    <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: INK_TEXT }}>{dim.name}</div>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color, border: `1px solid ${color}55`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>{dim.status}</span>
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, lineHeight: 1.6 }}>{dim.detail}</div>
    </div>
  );
}

function TwoBarCompare({ items }) {
  const max = Math.max(...items.map(i => i.value || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map(i => (
        <div key={i.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 4 }}>
            <span>{i.label}</span><span style={{ fontWeight: 600, color: INK_TEXT }}>{inrShort(i.value)}</span>
          </div>
          <div style={{ height: 22, borderRadius: 4, background: i.color, width: `${Math.max(4, (i.value / max) * 100)}%`, transition: "width 0.15s" }} />
        </div>
      ))}
    </div>
  );
}

function ExpenseBifurcation({ channels, otherExpenses }) {
  const rows = [
    ...channels.map(c => ({ label: c.name, value: Number(c.spend) || 0 })),
    ...otherExpenses.map(e => ({ label: e.name, value: e.amount }))
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>No spend entered yet.</div>;
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(r => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 4 }}>
            <span>{r.label}</span><span>{((r.value / total) * 100).toFixed(0)}% · {inrShort(r.value)}</span>
          </div>
          <div style={{ height: 10, borderRadius: 4, background: PAPER_LINE, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(r.value / total) * 100}%`, background: AMBER }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OutcomeFunnelBars({ impressions, clicks, conversions, revenue }) {
  const stages = [
    { name: "Impressions", value: impressions },
    { name: "Clicks", value: clicks },
    { name: "Conversions", value: conversions }
  ].filter(s => s.value != null && s.value > 0);
  if (stages.length < 2) {
    return <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>Enter at least impressions and clicks (or clicks and conversions) to see the funnel.</div>;
  }
  const max = stages[0].value || 1;
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {stages.map(s => (
          <div key={s.name} style={{
            width: `${Math.max(12, (s.value / max) * 100)}%`, background: "#fff", border: `1px solid ${PAPER_LINE}`,
            borderRadius: 6, padding: "10px 14px", display: "flex", justifyContent: "space-between", minWidth: 160
          }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT }}>{s.name}</span>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT }}>{Math.round(s.value).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
      {revenue != null && (
        <div style={{ marginTop: 8, fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>
          → generating <strong style={{ color: INK_TEXT }}>{inrShort(revenue)}</strong> in revenue
        </div>
      )}
    </div>
  );
}

function CampaignForm({ campaign, setCampaign, onAnalyse, onLoadExample }) {
  const [exampleKey, setExampleKey] = useState(CAMPAIGN_EVALUATOR_EXAMPLES[0].key);
  const set = (key) => (e) => setCampaign(prev => ({ ...prev, [key]: e.target.value }));
  const setOutcome = (key) => (e) => setCampaign(prev => ({ ...prev, outcomes: { ...prev.outcomes, [key]: e.target.value } }));
  const setTarget = (key) => (e) => setCampaign(prev => ({ ...prev, targets: { ...prev.targets, [key]: e.target.value } }));

  function handleAddChannel(ch) { setCampaign(prev => ({ ...prev, channels: [...prev.channels, ch] })); }
  function handleUpdateChannel(ch) { setCampaign(prev => ({ ...prev, channels: prev.channels.map(c => c.id === ch.id ? ch : c) })); }
  function handleDeleteChannel(id) {
    if (!window.confirm("Remove this channel? This can't be undone.")) return;
    setCampaign(prev => ({ ...prev, channels: prev.channels.filter(c => c.id !== id) }));
  }

  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  function handleAddExpense() {
    const amt = Number(expenseAmount);
    if (!expenseName.trim() || !Number.isFinite(amt) || amt <= 0) return;
    setCampaign(prev => ({ ...prev, otherExpenses: [...prev.otherExpenses, { id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: expenseName.trim(), amount: amt }] }));
    setExpenseName(""); setExpenseAmount("");
  }
  function handleDeleteExpense(id) {
    setCampaign(prev => ({ ...prev, otherExpenses: prev.otherExpenses.filter(e => e.id !== id) }));
  }

  const primaryMetrics = OBJECTIVE_PRIMARY_METRICS[campaign.objective] || [];

  return (
    <div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, marginBottom: 20, maxWidth: 640, lineHeight: 1.6 }}>
        Enter one campaign's details, spend, and outcomes below, then click <strong>Analyse Campaign Performance</strong>
        for a scored verdict, a diagnosis of what's working and what isn't, and recommendations.
      </div>

      <SectionCard title="Campaign details">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <LightField label="Brand name" value={campaign.brandName} onChange={set("brandName")} />
          <LightField label="Campaign name" value={campaign.campaignName} onChange={set("campaignName")} />
          <LightSelect label="Industry" value={campaign.industry} onChange={set("industry")} options={INDUSTRY_OPTIONS} />
          <LightSelect label="Campaign objective" value={campaign.objective} onChange={set("objective")} options={OBJECTIVE_OPTIONS} />
          <LightField label="Campaign duration (days)" type="number" value={campaign.durationDays} onChange={set("durationDays")} />
          <LightField label="Target audience (optional)" value={campaign.targetAudience} onChange={set("targetAudience")} placeholder="e.g. Women 25–40, urban India" />
        </div>
      </SectionCard>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 6 }}>Ad spend by channel</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginBottom: 10, lineHeight: 1.6 }}>
          Each channel can optionally include the revenue and conversions it drove, so per-channel efficiency can be
          judged later. Costs that aren't tied to a channel (creative, agency, tools) go in "Other campaign costs" below.
        </div>
        <ChannelSection channels={campaign.channels} onAdd={handleAddChannel} onUpdate={handleUpdateChannel} onDelete={handleDeleteChannel} contextNoun="campaign" />
      </div>

      <SectionCard title="Other campaign costs (optional)" note="Creative production, agency fees, tools — costs that support the campaign but aren't tied to a specific channel's outcomes.">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input placeholder="e.g. Creative production" value={expenseName} onChange={e => setExpenseName(e.target.value)} style={{ ...lightInputStyle, flex: 2, minWidth: 160 }} />
          <input placeholder="Amount" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} style={{ ...lightInputStyle, flex: 1, minWidth: 100 }} />
          <button onClick={handleAddExpense} style={btnSecondary}>+ Add</button>
        </div>
        {campaign.otherExpenses.length > 0 && (
          <div>
            {campaign.otherExpenses.map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${PAPER_LINE}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT }}>
                <span>{e.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {inrShort(e.amount)}
                  <button onClick={() => handleDeleteExpense(e.id)} style={{ ...btnGhostSmall, color: BRICK, borderColor: `${BRICK}55` }}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Campaign outcomes" note="All optional — fill in whichever you have. Fields marked ★ are the primary metrics for the objective you selected above.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {OUTCOME_FIELDS.map(f => (
            <LightField key={f.key} label={f.label + (primaryMetrics.includes(f.key) ? " ★" : "")} type="number"
              value={campaign.outcomes[f.key]} onChange={setOutcome(f.key)} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Targets (optional, but recommended)" note='Without a target, "good" vs "bad" has no fixed reference point — the scored verdict on the next screen only covers dimensions where you set one here.'>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <LightField label="Target ROAS (×)" type="number" value={campaign.targets.targetRoas} onChange={setTarget("targetRoas")} placeholder="e.g. 3" />
          <LightField label="Maximum CPA (₹)" type="number" value={campaign.targets.maxCpa} onChange={setTarget("maxCpa")} placeholder="e.g. 500" />
          <LightField label="Target CTR (%)" type="number" value={campaign.targets.targetCtr} onChange={setTarget("targetCtr")} placeholder="e.g. 2" />
          <LightField label="Target conversion rate (%)" type="number" value={campaign.targets.targetConversionRate} onChange={setTarget("targetConversionRate")} placeholder="e.g. 4" />
        </div>
      </SectionCard>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={onAnalyse} style={{ ...btnPrimary, fontSize: 14, padding: "12px 22px" }}>Analyse Campaign Performance</button>
        <select value={exampleKey} onChange={e => setExampleKey(e.target.value)} style={lightInputStyle}>
          {CAMPAIGN_EVALUATOR_EXAMPLES.map(ex => <option key={ex.key} value={ex.key}>{ex.label}</option>)}
        </select>
        <button onClick={() => onLoadExample(exampleKey)} style={btnSecondary}>Load example</button>
      </div>
    </div>
  );
}

function CampaignReport({ campaign, onEdit, onReset }) {
  const metrics = useMemo(() => computeCampaignMetrics(campaign), [campaign]);
  const evaluation = useMemo(() => evaluateCampaign(campaign, metrics), [campaign, metrics]);
  const channelAnalysis = useMemo(() => analyzeChannels(campaign.channels), [campaign.channels]);
  const concentrationNote = channelConcentrationNote(campaign.channels);
  const recommendations = buildCampaignRecommendations(evaluation, channelAnalysis, concentrationNote);
  const summary = campaignSummary(evaluation, channelAnalysis);

  const strongDims = evaluation.dims.filter(d => d.status === "Strong");
  const weakDims = evaluation.dims.filter(d => d.status === "Weak" || d.status === "Watch");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
        <div>
          {(campaign.brandName || campaign.campaignName) && (
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 600, color: INK_TEXT }}>
              {[campaign.brandName, campaign.campaignName].filter(Boolean).join(" — ")}
            </div>
          )}
          {campaign.objective && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT }}>{campaign.objective}{campaign.durationDays ? ` · ${campaign.durationDays} days` : ""}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={btnSecondary}>← Edit inputs</button>
          <button onClick={onReset} style={btnDanger}>Start over</button>
        </div>
      </div>

      {/* 1. Overall verdict */}
      <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 28, marginBottom: 20, textAlign: "center" }}>
        {evaluation.overallScore != null ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Dot verdict={evaluation.verdict} size={14} />
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: VERDICT_COLOR[evaluation.verdict] }}>{evaluation.verdictLabel}</div>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: MUTED_TEXT, marginTop: 8 }}>
              Campaign Performance Score: <strong style={{ color: INK_TEXT }}>{evaluation.overallScore}/100</strong> (across {evaluation.evaluatedCount} target{evaluation.evaluatedCount === 1 ? "" : "s"} you set)
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 700, color: INK_TEXT }}>No score yet</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: MUTED_TEXT, marginTop: 6 }}>
              Go back and set at least one target (ROAS, max CPA, CTR, or conversion rate) to get a scored verdict.
            </div>
          </>
        )}
      </div>

      {/* 2. Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 22 }}>
        <MetricCard title="Financial performance" rows={[
          ["Total ad spend", inrShort(metrics.mediaSpend)],
          ["Total campaign cost", inrShort(metrics.totalCost)],
          ["Revenue generated", metrics.revenue != null ? inrShort(metrics.revenue) : "—"],
          ["Profit contribution", metrics.profit != null ? inrShort(metrics.profit) : "—"],
          ["ROAS", metrics.roas != null ? metrics.roas.toFixed(2) + "×" : "—"],
          ["ROI", metrics.roi != null ? metrics.roi.toFixed(0) + "%" : "—"]
        ]} />
        <MetricCard title="Marketing performance" rows={[
          ["CTR", metrics.ctr != null ? metrics.ctr.toFixed(2) + "%" : "—"],
          ["Conversion rate", metrics.conversionRate != null ? metrics.conversionRate.toFixed(2) + "%" : "—"],
          ["CPA", metrics.cpa != null ? inr(metrics.cpa, { maximumFractionDigits: 2 }) : "—"],
          ["CPC", metrics.cpc != null ? inr(metrics.cpc, { maximumFractionDigits: 2 }) : "—"],
          ["Engagement rate", metrics.engagementRate != null ? metrics.engagementRate.toFixed(2) + "%" : "—"],
          ["Cost per lead", metrics.cpl != null ? inr(metrics.cpl, { maximumFractionDigits: 2 }) : "—"]
        ]} />
      </div>

      {/* 3. Visual breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 22 }}>
        <SectionCard title="Spend vs. revenue">
          <TwoBarCompare items={[
            { label: "Total ad spend", value: metrics.mediaSpend, color: `${INK_TEXT}55` },
            ...(metrics.revenue != null ? [{ label: "Revenue generated", value: metrics.revenue, color: MOSS }] : [])
          ]} />
        </SectionCard>
        <SectionCard title="Expense bifurcation">
          <ExpenseBifurcation channels={campaign.channels} otherExpenses={campaign.otherExpenses} />
        </SectionCard>
        <SectionCard title="Outcome funnel">
          <OutcomeFunnelBars impressions={metrics.impressions} clicks={metrics.clicks} conversions={metrics.conversions} revenue={metrics.revenue} />
        </SectionCard>
      </div>

      {/* 4. Performance evaluation engine */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: MUTED_TEXT, marginBottom: 10, letterSpacing: "0.02em" }}>PERFORMANCE EVALUATION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {evaluation.dims.map(d => <DimensionCard key={d.name} dim={d} />)}
        </div>
      </div>

      {/* 5. Why section */}
      {(strongDims.length > 0 || weakDims.length > 0 || concentrationNote) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginTop: 20 }}>
          {strongDims.length > 0 && (
            <SectionCard title="What's working">
              {strongDims.map(d => (
                <div key={d.name} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, marginBottom: 8, lineHeight: 1.6 }}>
                  <span style={{ color: MOSS }}>✓</span> <strong>{d.name}.</strong> {d.detail}
                </div>
              ))}
            </SectionCard>
          )}
          {(weakDims.length > 0 || concentrationNote) && (
            <SectionCard title="What needs attention">
              {weakDims.map(d => (
                <div key={d.name} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, marginBottom: 8, lineHeight: 1.6 }}>
                  <span style={{ color: AMBER }}>⚠</span> <strong>{d.name}.</strong> {d.detail}
                </div>
              ))}
              {concentrationNote && (
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, lineHeight: 1.6 }}>
                  <span style={{ color: AMBER }}>⚠</span> {concentrationNote}
                </div>
              )}
            </SectionCard>
          )}
        </div>
      )}

      {/* 6. Expense quality analysis */}
      <div style={{ marginTop: 4 }}>
        {campaign.channels.length > 0 ? (
          <ChannelSection channels={campaign.channels} contextNoun="campaign" readOnly onAdd={() => {}} onUpdate={() => {}} onDelete={() => {}} />
        ) : (
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: MUTED_TEXT, marginTop: 22 }}>
            No channel breakdown entered — go back and add channels to see per-channel efficiency.
          </div>
        )}
      </div>

      {campaign.otherExpenses.length > 0 && (
        <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24, marginTop: 18 }}>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 12 }}>Other campaign costs</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${PAPER_LINE}` }}>
                  <th style={thStyle}>Cost</th><th style={thStyle}>Amount</th><th style={thStyle}>Share of total cost</th><th style={thStyle}>Assessment</th>
                </tr>
              </thead>
              <tbody>
                {campaign.otherExpenses.map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${PAPER_LINE}` }}>
                    <td style={tdStyle}>{e.name}</td>
                    <td style={tdStyle}>{inrShort(e.amount)}</td>
                    <td style={tdStyle}>{metrics.totalCost > 0 ? ((e.amount / metrics.totalCost) * 100).toFixed(0) + "%" : "—"}</td>
                    <td style={tdStyle}><span style={{ color: MUTED_TEXT }}>Support cost — not directly attributable</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Recommendations */}
      <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24, marginTop: 18 }}>
        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 12 }}>Recommendations</div>
        {recommendations.map((text, i) => (
          <div key={i} style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, marginBottom: 8, lineHeight: 1.6 }}>· {text}</div>
        ))}
      </div>

      {/* 8. Final summary */}
      <div style={{ background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 8, padding: 24, marginTop: 18, marginBottom: 4 }}>
        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 600, color: INK_TEXT, marginBottom: 10 }}>Campaign performance summary</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: INK_TEXT, lineHeight: 1.7 }}>{summary}</div>
      </div>
    </div>
  );
}

function CampaignEvaluator() {
  const [campaign, setCampaign] = useState(() => loadJSON(LS_KEYS.evaluatorCampaign, BLANK_CAMPAIGN));
  const [showResults, setShowResults] = useState(() => loadJSON(LS_KEYS.evaluatorShowResults, false));

  useEffect(() => { saveJSON(LS_KEYS.evaluatorCampaign, campaign); }, [campaign]);
  useEffect(() => { saveJSON(LS_KEYS.evaluatorShowResults, showResults); }, [showResults]);

  function handleLoadExample(key) {
    const ex = CAMPAIGN_EVALUATOR_EXAMPLES.find(e => e.key === key) || CAMPAIGN_EVALUATOR_EXAMPLES[0];
    if ((campaign.brandName || campaign.campaignName || campaign.channels.length) && !window.confirm(`Load the "${ex.label}" example? This replaces your current inputs.`)) return;
    setCampaign(ex.data);
    setShowResults(false);
  }
  function handleReset() {
    if (!window.confirm("Clear this campaign and start over?")) return;
    setCampaign(BLANK_CAMPAIGN);
    setShowResults(false);
  }

  if (!showResults) {
    return <CampaignForm campaign={campaign} setCampaign={setCampaign} onAnalyse={() => setShowResults(true)} onLoadExample={handleLoadExample} />;
  }
  return <CampaignReport campaign={campaign} onEdit={() => setShowResults(false)} onReset={handleReset} />;
}

/* ---------- Ambient three.js background ----------
   A quiet, low-opacity drifting point field behind the content — decorative only. It never
   intercepts clicks (pointer-events: none), stays out of the way of reading tables and forms
   (very low particle count + opacity), retints instantly when the theme (light/dark tab)
   changes, and turns itself off for prefers-reduced-motion or if WebGL isn't available. */
function AmbientBackground({ dark }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null); // holds live three.js objects across renders, outside React state

  // Mount once: build the scene, start the render loop, tear down on unmount.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return undefined; // WebGL unavailable — skip the background entirely, no error shown to the user
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.z = 70;

    const isNarrow = window.innerWidth < 700;
    const count = isNarrow ? 140 : 320;
    const positions = new Float32Array(count * 3);
    // Keep the z-spread modest relative to the camera's distance (70) — a wide spread lets some
    // points land very close to the camera, where perspective blows their on-screen size up into
    // oversized squares that collide with text (most visible on narrow/mobile viewports).
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 170;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: isNarrow ? 0.8 : 1.2, transparent: true, opacity: 0.4, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    let mouseX = 0, mouseY = 0;
    function onMouseMove(e) {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;
    }
    if (!reduceMotion) window.addEventListener("mousemove", onMouseMove);

    function resize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      camera.aspect = w / (h || 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = null;
    function animate() {
      if (!reduceMotion) {
        points.rotation.y += 0.0007;
        points.rotation.x += 0.00025;
        camera.position.x += (mouseX * 10 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 10 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    animate();

    stateRef.current = { material };

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // Retint on theme change without rebuilding the whole scene.
  useEffect(() => {
    if (stateRef.current) stateRef.current.material.color.set(dark ? 0x5e7a90 : 0xc9a24b);
  }, [dark]);

  return (
    <div ref={mountRef} aria-hidden="true" style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden"
    }} />
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [tab, setTab] = useState("real");
  const isDark = tab === "modeled";

  return (
    <div style={{
      position: "relative", minHeight: "100%", background: isDark ? INK : "#FBF9F4", transition: "background 0.2s",
      padding: "32px 28px", boxSizing: "border-box", fontFamily: "Inter, sans-serif"
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');
      input[type="range"] { cursor: pointer; }
      input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { opacity: 0.6; }`}</style>

      <AmbientBackground dark={isDark} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: "'Source Serif 4', serif", fontSize: 30, fontWeight: 700,
            color: isDark ? ON_DARK : INK_TEXT, letterSpacing: "-0.01em"
          }}>Ad-Spend vs. Outcome Tracker</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: isDark ? ON_DARK_MUTED : MUTED_TEXT, marginTop: 4 }}>
            AMS Capstone · Topic 6 — enter your own ad spend and revenue data, or load the Honasa Consumer example
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${isDark ? SLATE_LINE : PAPER_LINE}`, marginBottom: 28, flexWrap: "wrap" }}>
          {[["real", "Real Ledger"], ["evaluator", "Campaign Evaluator"], ["modeled", "Modeled Funnel"]].map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: "none", border: "none", cursor: "pointer", padding: "0 0 12px 0",
              fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600,
              color: tab === id ? (isDark ? ON_DARK : INK_TEXT) : (isDark ? ON_DARK_MUTED : MUTED_TEXT),
              borderBottom: tab === id ? `2px solid ${isDark ? ON_DARK : INK_TEXT}` : "2px solid transparent",
              marginBottom: -1
            }}>{name}</button>
          ))}
        </div>

        {tab === "real" && <RealLedger />}
        {tab === "evaluator" && <CampaignEvaluator />}
        {tab === "modeled" && <ModeledFunnel />}
      </div>
    </div>
  );
}
