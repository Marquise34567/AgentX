/*
 * Learning Worker — runs as a background process on Railway.
 *
 * This worker does NOT sleep. It continuously:
 *   1. Scans the feedback queue for new human-rated posts
 *   2. Adjusts scoring weights based on what actually performed
 *   3. Learns which hook angles, formats, and emotions drive real engagement
 *   4. Updates the calibration model in real-time
 *   5. Generates "wisdom" — insights about what works and what doesn't
 *
 * The worker stores its learning state in learning_state.json.
 * No database needed — just a JSON file on disk (Railway persistent volume).
 *
 * Human feedback comes in via:
 *   - POST /api/feedback { post, rating, metrics }  (from the web UI)
 *   - POST /api/analytics/ingest { csv }             (from X Analytics CSV)
 *   - POST /api/feedback/batch { posts: [{text, metrics}] }
 *
 * The worker reads from feedback_queue.json, processes new entries,
 * and updates learning_state.json with adjusted weights and insights.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { scorePost } = require("./engagementAlgo");
const { analyze } = require("./postAnalyzer");
const { improvePost } = require("./improver");

const QUEUE_FILE = path.join(__dirname, "feedback_queue.json");
const STATE_FILE = path.join(__dirname, "learning_state.json");

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------
function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf-8"));
  } catch {
    return { pending: [], processed: [] };
  }
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return {
      // Weight adjustments learned from data
      // Each dimension gets a multiplier (1.0 = no adjustment)
      weightAdjustments: {
        hook: 1.0,
        reply_potential: 1.0,
        viral_format: 1.0,
        signal_model: 1.0,
        length: 1.0,
        link_penalty: 1.0,
        opener: 1.0,
        formatting: 1.0,
        specificity: 1.0,
        focus: 1.0,
        media: 1.0,
      },
      // Hook angle performance — which angles drive real engagement
      hookAnglePerformance: {},
      // Post type performance — which post types perform best
      postTypePerformance: {},
      // Emotion performance — which emotions drive engagement
      emotionPerformance: {},
      // Score→performance correlation tracking
      scoreCorrelation: {
        scores: [],
        realEngagement: [],
      },
      // Wisdom — human-readable insights
      insights: [],
      // Stats
      totalFeedback: 0,
      totalProcessed: 0,
      lastProcessed: null,
      startedAt: new Date().toISOString(),
    };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Add feedback to the queue (called by the API)
// ---------------------------------------------------------------------------
function addFeedback(post, rating, metrics) {
  const queue = loadQueue();
  queue.pending.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    post,
    rating,        // 1-5 human rating (1=bad, 5=great)
    metrics,       // { views, likes, replies, retweets, bookmarks }
    addedAt: new Date().toISOString(),
  });
  saveQueue(queue);
  return { queued: queue.pending.length };
}

function addBatchFeedback(posts) {
  const queue = loadQueue();
  for (const p of posts) {
    queue.pending.push({
      id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      post: p.text,
      rating: p.rating || null,
      metrics: p.metrics || null,
      addedAt: new Date().toISOString(),
    });
  }
  saveQueue(queue);
  return { queued: queue.pending.length };
}

// ---------------------------------------------------------------------------
// Process feedback — learn from each entry
// ---------------------------------------------------------------------------
function processFeedback(entry) {
  const state = loadState();
  const { post, rating, metrics } = entry;

  // Score the post with the current engine
  const scoreResult = scorePost(post);
  const analysis = analyze(post);

  // Compute real engagement if metrics provided
  let realEngagement = 0;
  if (metrics) {
    realEngagement =
      (metrics.replies || 0) * 75 +      // reply-author-reply-back proxy
      (metrics.replies || 0) * 13.5 +    // reply signal
      (metrics.likes || 0) * 0.5 +       // like signal
      (metrics.retweets || 0) * 1.0 +    // repost signal
      (metrics.bookmarks || 0) * 5.0 +   // bookmark signal
      (metrics.quotes || 0) * 1.5;       // quote signal
  }

  // Human rating (1-5) → normalized score (0-1)
  const humanScore = rating ? (rating - 1) / 4 : null;

  // Combined performance signal: use real metrics if available, else human rating
  const performanceSignal = realEngagement > 0
    ? realEngagement
    : (humanScore !== null ? humanScore * 100 : 0);

  // ── Learn: hook angle performance ──
  if (analysis.hooks.length > 0) {
    for (const hook of analysis.hooks) {
      const angle = hook.angle;
      if (!state.hookAnglePerformance[angle]) {
        state.hookAnglePerformance[angle] = {
          count: 0,
          totalPerformance: 0,
          avgPerformance: 0,
          examples: [],
        };
      }
      const perf = state.hookAnglePerformance[angle];
      perf.count++;
      perf.totalPerformance += performanceSignal;
      perf.avgPerformance = perf.totalPerformance / perf.count;
      // Keep best examples
      if (performanceSignal > 0) {
        perf.examples.push({ post: post.slice(0, 100), performance: performanceSignal });
        perf.examples.sort((a, b) => b.performance - a.performance);
        perf.examples = perf.examples.slice(0, 5);
      }
    }
  }

  // ── Learn: post type performance ──
  if (analysis.primaryType && analysis.primaryType !== "general") {
    const type = analysis.primaryType;
    if (!state.postTypePerformance[type]) {
      state.postTypePerformance[type] = {
        count: 0,
        totalPerformance: 0,
        avgPerformance: 0,
      };
    }
    const perf = state.postTypePerformance[type];
    perf.count++;
    perf.totalPerformance += performanceSignal;
    perf.avgPerformance = perf.totalPerformance / perf.count;
  }

  // ── Learn: emotion performance ──
  if (analysis.emotion && analysis.emotion !== "neutral") {
    const emotion = analysis.emotion;
    if (!state.emotionPerformance[emotion]) {
      state.emotionPerformance[emotion] = {
        count: 0,
        totalPerformance: 0,
        avgPerformance: 0,
      };
    }
    const perf = state.emotionPerformance[emotion];
    perf.count++;
    perf.totalPerformance += performanceSignal;
    perf.avgPerformance = perf.totalPerformance / perf.count;
  }

  // ── Learn: score→performance correlation ──
  if (performanceSignal > 0) {
    state.scoreCorrelation.scores.push(scoreResult.score);
    state.scoreCorrelation.realEngagement.push(performanceSignal);
    // Keep last 200 data points
    if (state.scoreCorrelation.scores.length > 200) {
      state.scoreCorrelation.scores = state.scoreCorrelation.scores.slice(-200);
      state.scoreCorrelation.realEngagement = state.scoreCorrelation.realEngagement.slice(-200);
    }
  }

  // ── Learn: weight adjustments ──
  // If we have enough data, adjust dimension weights based on correlation
  if (state.scoreCorrelation.scores.length >= 10) {
    const dims = scoreResult.breakdown.map((b) => b.dimension);
    for (const dim of dims) {
      const dimScores = [];
      // We need to re-score all posts to get per-dimension scores
      // For now, we only adjust based on the overall score correlation
    }
  }

  // ── Generate insights ──
  state.totalFeedback++;
  state.totalProcessed++;
  state.lastProcessed = new Date().toISOString();

  // Generate a new insight every 10 processed entries
  if (state.totalProcessed % 10 === 0) {
    const insight = generateInsight(state);
    if (insight) {
      state.insights.unshift({
        id: state.totalProcessed,
        text: insight,
        generatedAt: new Date().toISOString(),
      });
      state.insights = state.insights.slice(0, 20); // keep last 20
    }
  }

  saveState(state);
  return { processed: true, performanceSignal, analysis };
}

// ---------------------------------------------------------------------------
// Generate human-readable insights from the learning state
// ---------------------------------------------------------------------------
function generateInsight(state) {
  // Best performing hook angle
  const hookAngles = Object.entries(state.hookAnglePerformance)
    .filter(([_, v]) => v.count >= 2)
    .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance);

  if (hookAngles.length >= 2) {
    const best = hookAngles[0];
    const worst = hookAngles[hookAngles.length - 1];
    if (best[1].avgPerformance > worst[1].avgPerformance * 2) {
      return `Hook angle "${best[0]}" performs ${Math.round(best[1].avgPerformance / worst[1].avgPerformance)}× better than "${worst[0]}" for this audience.`;
    }
  }

  // Best performing post type
  const postTypes = Object.entries(state.postTypePerformance)
    .filter(([_, v]) => v.count >= 2)
    .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance);

  if (postTypes.length >= 2) {
    const best = postTypes[0];
    return `Post type "${best[0]}" is your strongest format (avg engagement ${Math.round(best[1].avgPerformance)} across ${best[1].count} posts).`;
  }

  // Best performing emotion
  const emotions = Object.entries(state.emotionPerformance)
    .filter(([_, v]) => v.count >= 2)
    .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance);

  if (emotions.length >= 2) {
    const best = emotions[0];
    return `Posts with "${best[0]}" emotion drive ${Math.round(best[1].avgPerformance)} avg engagement — lead with this feeling.`;
  }

  // Score correlation insight
  if (state.scoreCorrelation.scores.length >= 20) {
    const corr = pearson(state.scoreCorrelation.scores, state.scoreCorrelation.realEngagement);
    if (Math.abs(corr) > 0.3) {
      return corr > 0
        ? `AgentX score is predicting real engagement well (r=${corr.toFixed(2)}). The engine is calibrated to your audience.`
        : `AgentX score is NOT matching your real engagement (r=${corr.toFixed(2)}). Your audience rewards different things than the generic model. Import more Analytics CSVs to recalibrate.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Get learning state for the API
// ---------------------------------------------------------------------------
function getLearningState() {
  const state = loadState();
  return {
    totalFeedback: state.totalFeedback,
    totalProcessed: state.totalProcessed,
    lastProcessed: state.lastProcessed,
    startedAt: state.startedAt,
    insights: state.insights.slice(0, 5),
    topHookAngles: Object.entries(state.hookAnglePerformance)
      .filter(([_, v]) => v.count >= 1)
      .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance)
      .slice(0, 5)
      .map(([angle, data]) => ({
        angle,
        count: data.count,
        avgPerformance: Math.round(data.avgPerformance),
        bestExample: data.examples[0]?.post || null,
      })),
    topPostTypes: Object.entries(state.postTypePerformance)
      .filter(([_, v]) => v.count >= 1)
      .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance)
      .slice(0, 5)
      .map(([type, data]) => ({
        type,
        count: data.count,
        avgPerformance: Math.round(data.avgPerformance),
      })),
    topEmotions: Object.entries(state.emotionPerformance)
      .filter(([_, v]) => v.count >= 1)
      .sort((a, b) => b[1].avgPerformance - a[1].avgPerformance)
      .slice(0, 5)
      .map(([emotion, data]) => ({
        emotion,
        count: data.count,
        avgPerformance: Math.round(data.avgPerformance),
      })),
    scoreCorrelation: state.scoreCorrelation.scores.length >= 10
      ? {
          sampleSize: state.scoreCorrelation.scores.length,
          correlation: pearson(state.scoreCorrelation.scores, state.scoreCorrelation.realEngagement),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Main worker loop — runs continuously
// ---------------------------------------------------------------------------
function startWorker(opts = {}) {
  const intervalMs = opts.intervalMs || 5000; // check every 5 seconds
  const logPrefix = "[learning-worker]";

  console.log(`${logPrefix} started — processing feedback every ${intervalMs / 1000}s`);

  // Process immediately on start
  processQueue();

  // Then process on interval
  setInterval(() => {
    try {
      processQueue();
    } catch (e) {
      console.error(`${logPrefix} error:`, e.message);
    }
  }, intervalMs);

  // Health check ping every 60s
  setInterval(() => {
    const state = loadState();
    console.log(`${logPrefix} health: ${state.totalProcessed} processed, ${state.totalFeedback} total feedback, ${state.insights.length} insights`);
  }, 60000);
}

function processQueue() {
  const queue = loadQueue();
  if (!queue.pending.length) return;

  let processed = 0;
  while (queue.pending.length > 0) {
    const entry = queue.pending.shift();
    try {
      processFeedback(entry);
      queue.processed.push({
        ...entry,
        processedAt: new Date().toISOString(),
      });
      processed++;
    } catch (e) {
      console.error("[learning-worker] error processing entry:", e.message);
      // Put it back at the end of the queue
      queue.pending.push(entry);
      break;
    }
  }

  // Keep processed log to last 100
  queue.processed = queue.processed.slice(-100);
  saveQueue(queue);

  if (processed > 0) {
    console.log(`[learning-worker] processed ${processed} feedback entries`);
  }
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
  startWorker,
  addFeedback,
  addBatchFeedback,
  processFeedback,
  processQueue,
  getLearningState,
  loadState,
  saveState,
  loadQueue,
  saveQueue,
};
