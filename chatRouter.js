/*
 * Chat router — parses a user message from the webapp chatbox and decides
 * what the engagement engine should do: score a post, improve it, compare
 * two posts, or answer a question about the 2026 X algorithm.
 *
 * Intent detection is keyword + structure based (no LLM needed). The
 * returned payload is what the frontend renders as the assistant reply.
 */

"use strict";

const { scorePost, comparePosts } = require("./engagementAlgo");
const { improvePost } = require("./improver");
const { detectFormat, recommendFormat } = require("./viralTemplates");
const { generateSelfReplyPackage } = require("./selfReplyEngine");
const { getStats, summarizeCalibration } = require("./analytics");
const { sprint } = require("./sprinter");
const { runAutopilot, formatAutopilotResult } = require("./autopilot");

const HELP_TEXT = `I grade & rewrite X posts on the 2026 algo — now with 22-signal Phoenix scoring, self-reply generation, voice-calibrated AI rewrites, and analytics calibration.

**Core:**
• **Paste a post** → grade + auto-rewrite to A
• **"compare A vs B"** (or --- between) → head-to-head
• **"improve: …"** / **"score: …"** → explicit
• **"best: …"** → only shows the single best rewrite (A-grade only, no noise)

**New — sprinter (post generator):**
• **"sprint: <topic>"** → generate scroll-stopping posts from a topic, optimized for the real X algorithm
• Uses the official xai-org/x-algorithm weights — share_via_copy_link (40x), reply (10x), quote (10x)

**New — autopilot (post for you):**
• **"autopilot: <topic>"** → generate + polish + schedule posts at the best times via Postiz
• Requires POSTIZ_API_KEY + voice profile for full effect
• Senior copywriter level — writes in YOUR voice, not generic AI slop

**New — marketing agent (analyze your startup):**
• **"market: <url>"** → scrapes your website and generates a full marketing strategy
• Analyzes: outcomes, problems, audience, best channels (X, Reddit, etc.)
• Generates: specific post ideas + actual posts for X and Reddit

**New — engagement engine:**
• **"self-reply: …"** → generate a self-reply + reply-chain plan (captures the +75 reply-author-reply-back signal)
• **"analytics"** → see your calibration stats + score→performance correlation
• **"calibrate"** → same as analytics

**AI rewrites (BYOK):**
• Set \`OPENAI_API_KEY\` env var, then use **"rewrite: …"** for voice-calibrated AI rewrites
• Upload sample posts via the **/api/voice-profile** endpoint to calibrate your voice

**FAQ:**
• Ask "what makes a post viral" / "best time to post" / "how does the algo work"

Reply chains = +75 (150× a like). Links, all-caps, weak openers get demoted.`;

const ALGO_FAQ = {
  "how does the algo work": `Weighted sum of predicted engagement probabilities. 2026 weights:

• Reply → author replies back: **+75** (150× a like) — dominant
• Reply +13.5 · Profile visit +12 · Conv click +11 · Dwell 2min +10
• Repost +1 · Like +0.5 · Bookmark: high
• Video >50% watched: boost · Premium: ~10× reach

**Negative:** links in body, all-caps, "Excited to share" openers.

First 30–60 min of replies/reposts decide broader distribution.`,

  "best time to post": `**Tue–Thu 8–11 AM ET. Wed 9 AM = peak.**

• Tue 9 AM = #1 · Wed = strongest day (+17%)
• Lunch 12–1 PM, evenings 5–6 PM for threads
• Worst: weekends, 6–11 PM

Real decider = first 30–60 min engagement velocity.`,

  "what makes a post viral": `Trigger a **reply chain** (+75, 150× a like):

1. Hook in 4–6 words (<40 chars = +46%). Statements > questions 7×.
2. One opinionated idea — contrarian, confession, or specific number.
3. 71–100 chars sweet spot.
4. No link in body — put it in the first reply.
5. Line breaks + native video if possible.
6. Post Tue–Thu ~9 AM ET.

Scroll-pastable = algo reads "no one cares" → dies in hours.`,

  "how long should a post be": `**71–100 chars** = sweet spot.

• 71–100: highest engagement
• 100–200: best engagement rate (1.09%)
• 141–280: slides
• 280+: only if every word earns it
• <50: too thin

Over 140? Cut the first sentence. 280 is a max, not a target.`,
};

function findFaq(query) {
  const q = query.toLowerCase();
  const keys = Object.keys(ALGO_FAQ);
  // exact-ish match
  for (const k of keys) if (q.includes(k)) return ALGO_FAQ[k];
  // keyword match
  if (/(algorithm|algo|how.*work|for.?you|ranking|weights)/.test(q) && !/time|long|length|viral|engag/.test(q)) return ALGO_FAQ["how does the algo work"];
  if (/(best time|when.*post|timing|what time|post.*time)/.test(q)) return ALGO_FAQ["best time to post"];
  if (/(viral|blow up|go viral|reach|impression|push|broad.*audience)/.test(q)) return ALGO_FAQ["what makes a post viral"];
  if (/(how long|length|charact|short|280|word count|too long)/.test(q)) return ALGO_FAQ["how long should a post be"];
  return null;
}

function splitCompare(text) {
  // try " vs " or " vs. " or " --- " or line of ---
  if (/\bvs?\.?\b/i.test(text) && text.split(/\bvs?\.?\b/i).length === 2) {
    const parts = text.split(/\bvs?\.?\b/i).map((s) => s.trim());
    if (parts[0] && parts[1]) return parts;
  }
  if (/\n-{3,}\n|\n={3,}\n/.test(text)) {
    const parts = text.split(/\n[-=]{3,}\n/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) return parts;
  }
  if (/\nvs\n/i.test(text)) {
    const parts = text.split(/\nvs\n/i).map((s) => s.trim());
    if (parts.length === 2) return parts;
  }
  return null;
}

function gradeEmoji(grade) {
  const map = { "A+": "🚀", A: "🔥", "B+": "👍", B: "🙂", "C+": "😐", C: "😬", D: "⚠️", F: "💀" };
  return map[grade] || "";
}

function formatScoreCard(r, label) {
  const lines = [];
  lines.push(`**${label || "Post"} — ${gradeEmoji(r.grade)} ${r.grade} · ${r.score}/100**`);
  lines.push(`> ${r.verdict}`);

  // Signal predictions (22-signal Phoenix model)
  if (r.signalModel && r.signalModel.topPositive) {
    const tp = r.signalModel.topPositive.slice(0, 4);
    if (tp.length) {
      lines.push("");
      lines.push("**Predicted signals:**");
      for (const s of tp) {
        const pct = Math.round(s.probability * 100);
        lines.push(`- ${s.signal}: ${pct}% (${s.multiplier.toFixed(0)}×) → +${s.contribution}`);
      }
    }
    if (r.signalModel.topNegative && r.signalModel.topNegative.length) {
      for (const s of r.signalModel.topNegative.slice(0, 1)) {
        const pct = Math.round(s.probability * 100);
        lines.push(`- ${s.signal}: ${pct}% (${s.multiplier.toFixed(0)}×) → ${s.contribution}`);
      }
    }
  }

  if (r.problems.length) {
    lines.push("");
    for (const p of r.problems.slice(0, 2)) lines.push(`❌ ${p}`);
  }
  if (r.signalsToAdd.length) {
    lines.push("");
    for (const s of r.signalsToAdd.slice(0, 3)) lines.push(`💡 ${s}`);
  }
  return lines.join("\n");
}

function formatImprove(res) {
  const lines = [];
  lines.push(`**Rewritten → ${gradeEmoji(res.finalGrade)} ${res.finalGrade} · ${res.finalScore}/100**  (was ${res.originalGrade}/${res.originalScore})`);
  lines.push("");
  lines.push("```");
  lines.push(res.final);
  lines.push("```");
  if (res.linkReply) {
    lines.push("");
    lines.push("Reply with:");
    lines.push("```");
    lines.push(res.linkReply);
    lines.push("```");
  }
  lines.push("");
  lines.push(`⏰ ${res.timingAdvice}`);
  return lines.join("\n");
}

function formatCompare(cmp) {
  const lines = [];
  lines.push(`**${cmp.summary}**`);
  lines.push("");
  lines.push(`A: ${gradeEmoji(cmp.a.grade)} ${cmp.a.grade} · ${cmp.a.score}/100 — ${cmp.a.verdict}`);
  lines.push(`B: ${gradeEmoji(cmp.b.grade)} ${cmp.b.grade} · ${cmp.b.score}/100 — ${cmp.b.verdict}`);
  return lines.join("\n");
}

function formatSelfReply(pkg) {
  const lines = [];
  lines.push(`**Self-reply generated — ${pkg.angle} angle**`);
  lines.push(`> ${pkg.signalNote}`);
  lines.push("");
  lines.push("**Post this as a reply immediately after:**");
  lines.push("```");
  lines.push(pkg.selfReply);
  lines.push("```");
  lines.push(`*Self-reply score: ${gradeEmoji(pkg.selfReplyGrade)} ${pkg.selfReplyGrade} · ${pkg.selfReplyScore}/100 · strategy: ${pkg.selfReplyStrategy}*`);
  if (pkg.alternatives.length) {
    lines.push("");
    lines.push("**Alternatives:**");
    for (const alt of pkg.alternatives.slice(0, 2)) {
      lines.push(`> ${alt.text.split("\n")[0]}... *(score: ${alt.score}, ${alt.strategy})*`);
    }
  }
  lines.push("");
  lines.push("**Reply-chain plan (first 30-60 min):**");
  for (const step of pkg.replyChainPlan.steps) {
    lines.push(`- **${step.when}**: ${step.action} — ${step.why}`);
  }
  lines.push("");
  lines.push("**Don't:**");
  for (const d of pkg.replyChainPlan.dont) {
    lines.push(`- ${d}`);
  }
  return lines.join("\n");
}

function formatBest(res) {
  const lines = [];
  const score = res.finalScore;
  const grade = res.finalGrade;
  const isA = grade.startsWith("A");

  if (isA) {
    lines.push(`**Best rewrite — ${gradeEmoji(grade)} ${grade} · ${score}/100**`);
    lines.push("");
    lines.push("```");
    lines.push(res.final);
    lines.push("```");
    if (res.linkReply) {
      lines.push("");
      lines.push("**Reply with:**");
      lines.push("```");
      lines.push(res.linkReply);
      lines.push("```");
    }
  } else {
    // Not A-grade — show what's needed
    lines.push(`**Best effort: ${gradeEmoji(grade)} ${grade} · ${score}/100** — not A-grade yet`);
    lines.push("");
    lines.push("```");
    lines.push(res.final);
    lines.push("```");
    lines.push("");
    const gap = 85 - score;
    lines.push(`> Needs **${gap.toFixed(0)} more points** to reach A (85+).`);
    // Show the weakest dimension
    const r = scorePost(res.final);
    const dims = r.breakdown.slice().sort((a, b) => a.score - b.score);
    const weakest = dims[0];
    if (weakest && weakest.score < 70) {
      lines.push(`> Weakest dimension: **${weakest.dimension}** (${weakest.score.toFixed(0)}/100) — ${weakest.note}`);
    }
  }
  return lines.join("\n");
}

function formatAnalytics(stats) {
  const lines = [];
  if (!stats.totalPosts) {
    lines.push("**No analytics data yet.**");
    lines.push("");
    lines.push("Upload your X Analytics CSV via the API to calibrate AgentX to your audience:");
    lines.push("```");
    lines.push('POST /api/analytics/ingest  { csv: "<your X Analytics CSV text>" }');
    lines.push("```");
    lines.push("");
    lines.push("Download it from X Premium → Analytics → Export.");
    return lines.join("\n");
  }
  lines.push(`**Analytics — ${stats.totalPosts} posts calibrated**`);
  if (stats.calibration) {
    lines.push(`> ${stats.calibration.summary}`);
  }
  lines.push("");
  lines.push(`**Tracking:** ${stats.tracking.tracked} posts tracked · ${stats.tracking.withRealMetrics || 0} with real metrics`);
  if (stats.tracking.message) {
    lines.push(`> ${stats.tracking.message}`);
  }
  if (stats.history && stats.history.length) {
    lines.push("");
    lines.push("**Ingest history:**");
    for (const h of stats.history.slice(-3)) {
      lines.push(`- ${h.ingestedAt.slice(0, 10)}: ${h.postCount} posts, avg score ${Math.round(h.avgAgentXScore)}, avg engagement ${Math.round(h.avgRealEngagement)}`);
    }
  }
  return lines.join("\n");
}

function formatSprint(result) {
  const lines = [];
  lines.push(`**Sprint — ${result.posts.length} posts generated for "${result.topic}"**`);
  lines.push(`> Algorithm: ${typeof result.algorithm === "string" ? result.algorithm : result.algorithm?.source || "xai-org/x-algorithm"}`);
  if (result.method) lines.push(`> Method: ${result.method}`);
  if (result.niche) lines.push(`> Detected niche: ${result.niche} · Intent: ${result.goal || "general"}`);
  lines.push(`> Top signal: share_via_copy_link (40x a like) — make people copy your link off-platform`);
  lines.push("");

  result.posts.forEach((c, i) => {
    lines.push(`--- **POST ${i + 1}** ${gradeEmoji(c.grade)} ${c.grade} · Real Score: ${c.realScore} ---`);
    lines.push(`*Archetype: ${c.archetype} — ${c.archetypeWhy}*`);
    lines.push(`*Engagement tier: ${c.engagementTier} | Predicted dwell: ${c.predictedDwellSeconds}s*`);
    if (c.iterationCount > 0) {
      lines.push(`*Iteration: ${c.iterationCount} rounds | Original: ${c.originalGrade} → Final: ${c.grade}${c.converged ? " (converged)" : " (best effort)"}*`);
    }
    lines.push("");
    lines.push("```");
    lines.push(c.post);
    lines.push("```");
    if (c.topSignals.length) {
      lines.push(`*Top signals: ${c.topSignals.join(", ")}*`);
    }
    if (c.assessment && c.assessment.failures && c.assessment.failures.length) {
      lines.push(`*Issues: ${c.assessment.failures.map(f => f.message).join(" | ")}*`);
    }
    lines.push("");
  });

  // If the best post is below B, show what details would help
  if (result.needsMoreDetails && result.needsMoreDetails.length) {
    lines.push("--- **WANT A HIGHER GRADE?** ---");
    lines.push("*This post needs more material to reach B/A grade. Add these details:*");
    for (const s of result.needsMoreDetails) {
      lines.push(`• ${s}`);
    }
    lines.push("");
    lines.push("*Type your updated idea with more details and I'll re-generate.*");
  }

  return lines.join("\n");
}

async function route(message) {
  const msg = message.trim();
  if (!msg) return { type: "help", markdown: HELP_TEXT };

  const low = msg.toLowerCase();

  if (/^(help|hi|hey|hello|what can you do|commands)/.test(low) && msg.length < 30) {
    return { type: "help", markdown: HELP_TEXT };
  }

  const faq = findFaq(low);
  if (faq && !/(score|improve|compare|grade|sprint|autopilot|market|self-reply)/.test(low)) {
    // only treat as FAQ if it's a short question-like query, not a topic description
    if (msg.length < 80 && /\b(how|what|when|why|which|best|long|should|does|can)\b/i.test(msg)) return { type: "faq", markdown: faq };
  }

  // explicit commands
  if (low.startsWith("improve:") || low.startsWith("improve :")) {
    const post = msg.replace(/^improve\s*:\s*/i, "");
    if (!post) return { type: "error", markdown: "Paste a post after `improve:`" };
    const res = improvePost(post);
    return { type: "improve", markdown: formatImprove(res), data: res };
  }
  if (low.startsWith("score:") || low.startsWith("grade:")) {
    const post = msg.replace(/^(score|grade)\s*:\s*/i, "");
    if (!post) return { type: "error", markdown: "Paste a post after `score:`" };
    const r = scorePost(post);
    return { type: "score", markdown: formatScoreCard(r, "Post"), data: r };
  }
  if (low.startsWith("self-reply:") || low.startsWith("self reply:") || low.startsWith("selfreply:")) {
    const post = msg.replace(/^self.?reply\s*:\s*/i, "");
    if (!post) return { type: "error", markdown: "Paste a post after `self-reply:`" };
    const pkg = generateSelfReplyPackage(post);
    return { type: "self-reply", markdown: formatSelfReply(pkg), data: pkg };
  }
  if (low.startsWith("best:") || low.startsWith("best :") || low.startsWith("top:") || low.startsWith("top :")) {
    const post = msg.replace(/^(best|top)\s*:\s*/i, "");
    if (!post) return { type: "error", markdown: "Paste a post after `best:`" };
    const res = improvePost(post, 95, 12); // push harder: target 95, up to 12 iterations
    return { type: "best", markdown: formatBest(res), data: res };
  }
  if (low === "analytics" || low === "calibrate" || low === "stats") {
    const stats = getStats();
    return { type: "analytics", markdown: formatAnalytics(stats), data: stats };
  }
  if (low.startsWith("sprint:") || low.startsWith("sprint :")) {
    const topic = msg.replace(/^sprint\s*:\s*/i, "");
    if (!topic) return { type: "error", markdown: "Provide a topic after `sprint:` (e.g., `sprint: building SaaS`)" };
    const result = await sprint({ topic, count: 6 });
    if (result.error) return { type: "error", markdown: result.error };
    return { type: "sprint", markdown: formatSprint(result), data: result };
  }
  if (low.startsWith("autopilot:") || low.startsWith("autopilot :")) {
    const topic = msg.replace(/^autopilot\s*:\s*/i, "");
    if (!topic) return { type: "error", markdown: "Provide a topic after `autopilot:` (e.g., `autopilot: building SaaS`)" };
    const result = await runAutopilot({ topic, dryRun: true, count: 3 });
    if (result.error) return { type: "error", markdown: result.error };
    return { type: "autopilot", markdown: formatAutopilotResult(result), data: result };
  }
  if (low.startsWith("market:") || low.startsWith("market :") || low.startsWith("marketing:") || low.startsWith("marketing :")) {
    const url = msg.replace(/^market(?:ing)?\s*:\s*/i, "").trim();
    if (!url) return { type: "error", markdown: "Provide a URL after `market:` (e.g., `market: myapp.com`)" };
    const { analyze, formatStrategy } = require("./marketingAgent");
    const strategy = await analyze(url);
    if (strategy.error) return { type: "error", markdown: `Error analyzing ${url}: ${strategy.error}` };
    return { type: "marketing", markdown: formatStrategy(strategy), data: strategy };
  }

  // compare detection
  const parts = splitCompare(msg);
  if (parts) {
    const cmp = comparePosts(parts[0], parts[1]);
    return { type: "compare", markdown: formatCompare(cmp), data: cmp };
  }

  // DEFAULT: treat as a topic → generate 5 tweets from it.
  // The user wants to type ANY topic/idea/phrase and get tweets generated.
  // To grade a tweet instead, use "score: <post>" or "improve: <post>".
  const result = await sprint({ topic: msg, count: 5 });
  if (result.error) return { type: "error", markdown: result.error };
  return { type: "sprint", markdown: formatSprint(result), data: result };
}

// ---------------------------------------------------------------------------
// Detect whether a message is a topic/idea to generate tweets from,
// vs a tweet draft to grade. This is the key fix — previously, pasting a
// topic like "hey I saw that your a pro editor..." would get graded as a
// tweet instead of generating tweets from it.
// ---------------------------------------------------------------------------
function looksLikeTopicNotTweet(msg) {
  const lower = msg.toLowerCase().trim();
  const words = msg.split(/\s+/).length;

  // 1. Outreach/partnership/offer language → always a topic
  if (/\b(outreach|reach out|partnership|affiliate|collab|collaboration|deal|offer|free subscription|free access|in return|wanted to ask|interested in|giving me|allowing me)\b/i.test(lower)) {
    return true;
  }

  // 2. "building a X" / "making a X" / "starting a X" / "launching a X" → topic
  if (/^(building|making|starting|launching|creating|developing|growing|scaling)\s+(a|an|the|my)\s+/i.test(msg)) {
    return true;
  }

  // 3. "X for Y" pattern (e.g., "fitness app for busy professionals") → topic
  if (/\bfor\s+(busy|beginners|professionals|creators|founders|students|teams|small business|freelancers|editors|developers)\b/i.test(lower) && words <= 12) {
    return true;
  }

  // 4. Short phrase that's clearly a topic, not a tweet (no sentence structure, no opinion)
  if (words <= 8 && !/[.!?]$/.test(msg) && !/\b(is|are|was|were|don't|doesn't|should|need|want|must|can't|won't|never|always|nobody|everyone)\b/i.test(lower)) {
    if (/\b(app|tool|software|startup|business|product|service|platform|strategy|tips|guide|ideas|course|newsletter|podcast|channel|brand|website|blog|saas|ai|crypto|fitness|editing|marketing|sales|coding|design)\b/i.test(lower)) {
      return true;
    }
  }

  // 5. Messages that ask a question about how to do something → topic
  if (/\b(how do i|how to|what should i|best way to|how can i|should i)\b/i.test(lower) && msg.length > 30) {
    return true;
  }

  // 6. Messages with "I want to" / "I'm looking for" / "I need" + a description → topic
  if (/\b(i want to|i'm looking for|i am looking for|i need|i'm trying to|i am trying to|looking for)\b/i.test(lower) && msg.length > 50) {
    return true;
  }

  // 7. Messages that describe a product/idea with features → topic
  if (/\b(my product|my app|my tool|my software|my service|my business|i built|i made|i created|i launched)\b/i.test(lower) && msg.length > 80) {
    return true;
  }

  // 8. Very long messages (>200 chars) that describe a situation → likely a topic
  if (msg.length > 200 && !/^(just|so|btw|ngl|tbh|i |my |the |this )/i.test(msg.slice(0, 20))) {
    const lineCount = msg.split("\n").length;
    if (lineCount <= 3 && msg.length < 400) return false;
    return true;
  }

  // 9. Messages with multiple sentences that describe a scenario → topic
  const sentences = msg.split(/[.!?]/).filter(s => s.trim().length > 10);
  if (sentences.length >= 4 && msg.length > 150) {
    const avgSentenceLen = msg.length / sentences.length;
    if (avgSentenceLen > 40) return true;
  }

  return false;
}

module.exports = { route, HELP_TEXT, ALGO_FAQ };
