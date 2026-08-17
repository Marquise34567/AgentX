/*
 * Analytics closed-loop — ingest X Analytics CSV, calibrate scoring to the
 * user's actual audience, and track score→performance correlation over time.
 *
 * This is the feature nobody else has end-to-end:
 *   1. User downloads their X Analytics CSV (X Premium → Analytics → Export)
 *   2. AgentX parses it, scores every post with the engine
 *   3. Finds which scoring dimensions actually correlate with the user's
 *      real engagement (their audience may reward different things than the
 *      generic 2026 weights)
 *   4. Produces a calibration that adjusts future scores to THIS user's
 *      audience
 *   5. Tracks score→performance over time so the user can see if AgentX's
 *      rewrites are actually improving their results
 *
 * Storage: JSON file on disk (analytics_data.json). No database needed.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { scorePost, analyze } = require("./engagementAlgo");

const DATA_FILE = path.join(__dirname, "analytics_data.json");

// ---------------------------------------------------------------------------
// CSV parser (zero-dependency — handles quoted fields, commas in quotes)
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((f) => f.trim())) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((f) => f.trim())) rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// X Analytics CSV column detection (X changes column names between exports)
// ---------------------------------------------------------------------------
const COLUMN_ALIASES = {
  text: ["tweet text", "text", "post text", "tweet", "post", "content"],
  permalink: ["tweet permalink", "permalink", "tweet url", "url", "link"],
  views: ["tweet views", "views", "impressions", "tweet impressions"],
  likes: ["tweet likes", "likes", "favorites", "favs"],
  replies: ["tweet replies", "replies", "reply count"],
  retweets: ["tweet retweets", "retweets", "reposts", "tweet reposts"],
  bookmarks: ["tweet bookmarks", "bookmarks", "saves"],
  quotes: ["tweet quotes", "quotes", "quote tweets", "quote count"],
  engagementRate: ["tweet engagement rate", "engagement rate", "engagement"],
  date: ["tweet date", "date", "tweet created at", "created at", "time", "timestamp"],
};

function detectColumns(headerRow) {
  const headers = headerRow.map((h) => h.toLowerCase().trim());
  const mapping = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some((a) => headers[i] === a || headers[i].includes(a))) {
        mapping[field] = i;
        break;
      }
    }
  }
  return mapping;
}

function toNum(s) {
  if (s == null) return 0;
  const cleaned = String(s).replace(/[,;$%\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Ingest CSV → score every post → store
// ---------------------------------------------------------------------------
function ingestCSV(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) {
    return { error: "CSV has no data rows", ingested: 0 };
  }

  const mapping = detectColumns(rows[0]);
  if (mapping.text === undefined) {
    return { error: "Could not find tweet text column. Detected columns: " + JSON.stringify(mapping), ingested: 0 };
  }

  const posts = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const text = (row[mapping.text] || "").trim();
    if (!text) continue;

    const scored = scorePost(text);
    const metrics = {
      views: mapping.views !== undefined ? toNum(row[mapping.views]) : 0,
      likes: mapping.likes !== undefined ? toNum(row[mapping.likes]) : 0,
      replies: mapping.replies !== undefined ? toNum(row[mapping.replies]) : 0,
      retweets: mapping.retweets !== undefined ? toNum(row[mapping.retweets]) : 0,
      bookmarks: mapping.bookmarks !== undefined ? toNum(row[mapping.bookmarks]) : 0,
      quotes: mapping.quotes !== undefined ? toNum(row[mapping.quotes]) : 0,
      engagementRate: mapping.engagementRate !== undefined ? toNum(row[mapping.engagementRate]) : 0,
    };

    // Compute a real-world engagement score (weighted by algo signals)
    const realEngagement =
      metrics.replies * 13.5 +
      metrics.likes * 0.5 +
      metrics.retweets * 1.0 +
      metrics.bookmarks * 5.0 +
      metrics.quotes * 1.5 +
      metrics.replies * 75; // reply-author-reply-back proxy (we can't know if author replied back, but replies are the proxy)

    posts.push({
      text,
      permalink: mapping.permalink !== undefined ? row[mapping.permalink] : null,
      date: mapping.date !== undefined ? row[mapping.date] : null,
      metrics,
      realEngagement: Math.round(realEngagement),
      agentxScore: scored.score,
      agentxGrade: scored.grade,
      breakdown: scored.breakdown,
      signalModel: scored.signalModel,
    });
  }

  if (!posts.length) {
    return { error: "No valid posts found in CSV", ingested: 0 };
  }

  // Compute calibration
  const calibration = computeCalibration(posts);

  // Load existing data and merge
  const existing = loadData();
  const history = existing.history || [];
  history.push({
    ingestedAt: new Date().toISOString(),
    postCount: posts.length,
    avgRealEngagement: avg(posts.map((p) => p.realEngagement)),
    avgAgentXScore: avg(posts.map((p) => p.agentxScore)),
  });

  const data = {
    posts,
    calibration,
    history,
    lastIngest: new Date().toISOString(),
    totalPosts: posts.length,
  };

  saveData(data);

  return {
    ingested: posts.length,
    calibration,
    summary: summarizeCalibration(calibration),
    topPosts: posts.sort((a, b) => b.realEngagement - a.realEngagement).slice(0, 5).map((p) => ({
      text: p.text.slice(0, 80) + (p.text.length > 80 ? "..." : ""),
      agentxScore: p.agentxScore,
      realEngagement: p.realEngagement,
      replies: p.metrics.replies,
      likes: p.metrics.likes,
    })),
    history,
  };
}

// ---------------------------------------------------------------------------
// Calibration — find which dimensions correlate with real engagement
// ---------------------------------------------------------------------------
function computeCalibration(posts) {
  if (posts.length < 5) {
    return {
      available: false,
      reason: "Need at least 5 posts to calibrate. Import more data.",
      correlations: {},
      adjustments: {},
    };
  }

  // Compute Pearson correlation between each dimension score and real engagement
  const dimensions = posts[0].breakdown.map((b) => b.dimension);
  const correlations = {};

  for (const dim of dimensions) {
    const dimScores = posts.map((p) => {
      const b = p.breakdown.find((d) => d.dimension === dim);
      return b ? b.score : 0;
    });
    const realScores = posts.map((p) => p.realEngagement);
    correlations[dim] = Math.round(pearson(dimScores, realScores) * 1000) / 1000;
  }

  // Also correlate the overall AgentX score
  const overallCorr = pearson(
    posts.map((p) => p.agentxScore),
    posts.map((p) => p.realEngagement)
  );

  // Compute adjustments: dimensions that correlate strongly get boosted,
  // dimensions that don't correlate get slightly reduced
  const adjustments = {};
  for (const dim of dimensions) {
    const corr = correlations[dim];
    // Adjustment: +20% for strong positive corr (>0.3), -10% for negative
    if (corr > 0.3) adjustments[dim] = 1.2;
    else if (corr > 0.15) adjustments[dim] = 1.1;
    else if (corr < -0.1) adjustments[dim] = 0.9;
    else adjustments[dim] = 1.0;
  }

  // Find which hooks correlate with engagement
  const hookPerformance = {};
  for (const post of posts) {
    const a = analyze(post.text);
    for (const hook of a.detectedHooks) {
      if (!hookPerformance[hook]) hookPerformance[hook] = { count: 0, totalEngagement: 0 };
      hookPerformance[hook].count++;
      hookPerformance[hook].totalEngagement += post.realEngagement;
    }
  }
  const hookInsights = Object.entries(hookPerformance)
    .map(([hook, data]) => ({
      hook,
      count: data.count,
      avgEngagement: Math.round(data.totalEngagement / data.count),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Find which signal-model signals correlate
  const signalPerformance = {};
  for (const post of posts) {
    if (!post.signalModel) continue;
    for (const sig of post.signalModel.signals) {
      if (sig.negative) continue;
      if (!signalPerformance[sig.signal]) signalPerformance[sig.signal] = { count: 0, totalEngagement: 0 };
      signalPerformance[sig.signal].count++;
      signalPerformance[sig.signal].totalEngagement += post.realEngagement;
    }
  }
  const signalInsights = Object.entries(signalPerformance)
    .map(([sig, data]) => ({
      signal: sig,
      avgEngagement: Math.round(data.totalEngagement / data.count),
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  return {
    available: true,
    overallCorrelation: Math.round(overallCorr * 1000) / 1000,
    correlations,
    adjustments,
    hookInsights,
    signalInsights,
    sampleSize: posts.length,
  };
}

function summarizeCalibration(cal) {
  if (!cal.available) return cal.reason;
  const parts = [];
  parts.push(`Calibrated from ${cal.sampleSize} posts. AgentX score ↔ real engagement correlation: ${cal.overallCorrelation} (0=no relationship, 1=perfect).`);

  const strong = Object.entries(cal.correlations).filter(([_, c]) => c > 0.2).sort((a, b) => b[1] - a[1]);
  const weak = Object.entries(cal.correlations).filter(([_, c]) => c < 0).sort((a, b) => a[1] - b[1]);

  if (strong.length) parts.push("Your audience rewards: " + strong.map(([d, c]) => `${d} (r=${c})`).join(", "));
  if (weak.length) parts.push("Your audience ignores: " + weak.map(([d, c]) => `${d} (r=${c})`).join(", "));

  if (cal.hookInsights.length) {
    const best = cal.hookInsights[0];
    parts.push(`Best-performing hook for you: "${best.hook.replace(/_/g, " ")}" (avg engagement ${best.avgEngagement}).`);
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Apply calibration to a score result (adjusts dimension weights)
// ---------------------------------------------------------------------------
function applyCalibration(scoreResult, calibration) {
  if (!calibration || !calibration.available) return scoreResult;

  // Recompute the composite with adjusted weights
  let newComposite = 0;
  let totalWeight = 0;
  for (const b of scoreResult.breakdown) {
    const adj = calibration.adjustments[b.dimension] || 1.0;
    newComposite += b.score * b.weight * adj;
    totalWeight += b.weight * adj;
  }
  const calibratedScore = totalWeight > 0 ? newComposite / totalWeight : scoreResult.score;

  return {
    ...scoreResult,
    calibratedScore: Math.round(calibratedScore * 10) / 10,
    calibrationApplied: true,
  };
}

// ---------------------------------------------------------------------------
// Track a post over time (called when user posts something AgentX scored)
// ---------------------------------------------------------------------------
function trackPost(text, agentxScore, agentxGrade) {
  const data = loadData();
  const tracked = data.tracked || [];
  tracked.push({
    text,
    agentxScore,
    agentxGrade,
    postedAt: new Date().toISOString(),
    // User can later add real metrics via updateTrackedPost
    realMetrics: null,
  });
  data.tracked = tracked;
  saveData(data);
  return { tracked: tracked.length, post: tracked[tracked.length - 1] };
}

function updateTrackedPost(index, metrics) {
  const data = loadData();
  const tracked = data.tracked || [];
  if (index < 0 || index >= tracked.length) return { error: "invalid index" };
  tracked[index].realMetrics = metrics;
  tracked[index].updatedAt = new Date().toISOString();
  data.tracked = tracked;
  saveData(data);
  return { updated: tracked[index] };
}

function getTrackingStats() {
  const data = loadData();
  const tracked = data.tracked || [];
  if (!tracked.length) return { tracked: 0, message: "No tracked posts yet. Post something AgentX scored to start tracking." };

  const withMetrics = tracked.filter((t) => t.realMetrics);
  const stats = {
    tracked: tracked.length,
    withRealMetrics: withMetrics.length,
    avgAgentXScore: Math.round(avg(tracked.map((t) => t.agentxScore)) * 10) / 10,
  };

  if (withMetrics.length >= 3) {
    // Correlation between AgentX score and real engagement
    const scores = withMetrics.map((t) => t.agentxScore);
    const real = withMetrics.map((t) => {
      const m = t.realMetrics;
      return (m.replies || 0) * 13.5 + (m.likes || 0) * 0.5 + (m.retweets || 0) * 1.0 + (m.bookmarks || 0) * 5.0;
    });
    stats.scoreToPerformanceCorrelation = Math.round(pearson(scores, real) * 1000) / 1000;
    stats.message = `AgentX score → real engagement correlation: ${stats.scoreToPerformanceCorrelation}. ${stats.scoreToPerformanceCorrelation > 0.3 ? "AgentX is predicting your performance well." : "Weak correlation — your audience may differ from the generic 2026 weights. Import your full Analytics CSV to calibrate."}`;
  } else {
    stats.message = `${withMetrics.length}/3 posts with real metrics. Add real metrics to ${3 - withMetrics.length} more posts to see score→performance correlation.`;
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { posts: [], calibration: null, history: [], tracked: [], lastIngest: null, totalPosts: 0 };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function clearData() {
  try { fs.unlinkSync(DATA_FILE); } catch { /* ignore */ }
  return { cleared: true };
}

// ---------------------------------------------------------------------------
// Stats endpoint
// ---------------------------------------------------------------------------
function getStats() {
  const data = loadData();
  const tracking = getTrackingStats();
  return {
    totalPosts: data.totalPosts || 0,
    lastIngest: data.lastIngest,
    calibration: data.calibration ? {
      available: data.calibration.available,
      sampleSize: data.calibration.sampleSize,
      overallCorrelation: data.calibration.overallCorrelation,
      summary: summarizeCalibration(data.calibration),
    } : null,
    tracking,
    history: data.history || [],
  };
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------
function pearson(x, y) {
  const n = x.length;
  if (n < 2 || n !== y.length) return 0;
  const mx = avg(x);
  const my = avg(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

module.exports = {
  ingestCSV,
  parseCSV,
  detectColumns,
  computeCalibration,
  applyCalibration,
  summarizeCalibration,
  trackPost,
  updateTrackedPost,
  getTrackingStats,
  getStats,
  loadData,
  saveData,
  clearData,
};
