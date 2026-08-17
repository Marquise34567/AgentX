/*
 * Autopilot — the senior copywriter agent. NO third-party LLMs, NO APIs.
 *
 * Give it a topic (or let it pick from your recent themes), and it:
 *   1. Sprints multiple post candidates (sprinter.js)
 *   2. Polishes the best ones in YOUR voice (copywriter.js + voiceProfile.js)
 *      — senior copywriter level using stylometric profiling + n-gram phrase banks
 *   3. Scores each on the real X algorithm (signalModel.js)
 *   4. Picks the best time to post (Postiz best-time research)
 *   5. Schedules them via Postiz (postiz.js)
 *
 * The result: posts that sound like you, score A-grade on the real X
 * algorithm, and go live at the times most likely to get engagement.
 *
 * Requirements:
 *   - POSTIZ_API_KEY env var (get from Postiz Settings) — for scheduling
 *   - Voice profile uploaded via /api/voice-profile (for voice matching)
 *   - At least one X integration connected in Postiz
 *
 * Without Postiz: still generates + polishes posts, just doesn't schedule.
 * No OpenAI key needed — the copywriter engine is 100% rule-based.
 */

"use strict";

const { sprint } = require("./sprinter");
const { scorePost } = require("./engagementAlgo");
const { rewrite, generateBatch, buildPhraseBank } = require("./copywriter");
const { nextBestTime, findIntegration, createPost, listIntegrations } = require("./postiz");

// ---------------------------------------------------------------------------
// Voice polishing — lightly applies the author's n-gram patterns to a
// content-engine-generated post WITHOUT rewriting it from scratch.
// The content engine already produces context-aware, on-topic posts; we just
// nudge the phrasing toward the author's voice if a profile is available.
// ---------------------------------------------------------------------------
function polishWithVoice(postText, voiceProfile, phraseBank) {
  if (!voiceProfile && !phraseBank) return postText;
  try {
    // Use the copywriter's rewrite for light voice transfer
    // rewrite() applies stylometric + n-gram adjustments without replacing content
    return rewrite(postText, voiceProfile, phraseBank) || postText;
  } catch {
    return postText;
  }
}

// ---------------------------------------------------------------------------
// Autopilot: generate + polish + schedule posts
// ---------------------------------------------------------------------------

/**
 * Run the autopilot.
 *
 * @param {Object} params
 * @param {string} params.topic - What to post about (e.g., "building SaaS", "AI tools")
 * @param {string} [params.angle] - Optional angle/take (e.g., "contrarian", "educational")
 * @param {number} [params.count=3] - How many posts to generate and schedule
 * @param {string} [params.platform="x"] - Which platform to post to
 * @param {Object} [params.voiceProfile] - Voice profile from voiceProfile.js
 * @param {Object} [params.samplePosts] - Sample posts for n-gram phrase bank
 * @param {string} [params.postizApiKey] - Postiz API key (or POSTIZ_API_KEY env)
 * @param {boolean} [params.dryRun=false] - If true, don't actually schedule (just show what would be posted)
 * @param {boolean} [params.includeSelfReply=true] - Generate a self-reply for each post
 * @returns {Promise<Object>} The autopilot result
 */
async function runAutopilot(params = {}) {
  const {
    topic,
    angle,
    count = 3,
    platform = "x",
    voiceProfile = null,
    samplePosts = null,
    postizApiKey,
    dryRun = false,
    includeSelfReply = true,
  } = params;

  if (!topic) return { error: "Provide a topic to autopilot" };

  const steps = [];

  // --- Step 1: Build n-gram phrase bank from sample posts ---
  let phraseBank = null;
  if (samplePosts?.length) {
    steps.push("learning your writing patterns (n-gram phrase bank)...");
    phraseBank = buildPhraseBank(samplePosts);
    steps.push(`learned ${phraseBank.bigrams.length} bigrams, ${phraseBank.trigrams.length} trigrams, ${phraseBank.frames.length} sentence frames`);
  }

  // --- Step 2: Generate posts via the content engine (context-aware) ---
  // The content engine classifies the topic (SaaS, restaurant, gym, habit,
  // career, content, confession, opinion, prediction, product, problem list)
  // and generates context-specific posts — NOT generic ML templates.
  steps.push("generating posts via content engine (context-aware)...");
  const sprintResult = await sprint({ topic, count });
  if (sprintResult.error || !sprintResult.posts?.length) {
    return { error: sprintResult.error || "failed to generate posts" };
  }
  let generated = sprintResult.posts;
  steps.push(`generated ${generated.length} context-aware posts, best grade: ${generated[0]?.grade}`);

  // --- Step 2b: Lightly polish in the author's voice (if profile available) ---
  if (voiceProfile || phraseBank) {
    steps.push("polishing in your voice (n-gram phrase bank)...");
    generated = generated.map(g => ({
      ...g,
      post: polishWithVoice(g.post, voiceProfile, phraseBank),
    }));
  }

  // --- Step 3: Build the polished post objects ---
  const polished = generated.map(g => ({
    final: g.post,
    hook: g.hook,
    archetype: g.archetype,
    score: g.score,
    grade: g.grade,
    realScore: g.realScore,
    engagementTier: g.engagementTier,
    predictedDwellSeconds: g.predictedDwellSeconds,
    topSignals: g.topSignals,
    polishMethod: voiceProfile
      ? "content-engine + voice-calibrated copywriter (stylometric + n-gram, no LLM)"
      : "content-engine (context-aware, no voice profile — upload samples to calibrate)",
    selfReply: null,
    scheduledAt: null,
    postizResult: null,
  }));

  // --- Step 3b: Extract self-replies ---
  for (const p of polished) {
    // The AI rewriter may have included a self-reply — extract it
    // For now, generate one via the self-reply engine if not provided
    try {
      const { generateSelfReplyPackage } = require("./selfReplyEngine");
      const srPkg = generateSelfReplyPackage(p.final);
      p.selfReply = srPkg.selfReply;
    } catch {
      p.selfReply = null;
    }
  }

  // --- Step 4: Calculate best posting times ---
  steps.push("calculating best posting times...");
  for (let i = 0; i < polished.length; i++) {
    const bestTime = nextBestTime(new Date(), i);
    polished[i].scheduledAt = bestTime.iso;
    polished[i].scheduledLabel = bestTime.label;
    polished[i].scheduledWeight = bestTime.weight;
  }
  steps.push(`scheduled for: ${polished.map(p => p.scheduledLabel).join(", ")}`);

  // --- Step 5: Schedule via Postiz (or dry run) ---
  if (dryRun) {
    steps.push("dry run — not scheduling (set dryRun=false to actually post)");
    return {
      topic,
      angle,
      dryRun: true,
      steps,
      posts: polished,
      voiceProfileActive: !!voiceProfile,
      algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
    };
  }

  // Try to schedule via Postiz
  const postizKey = postizApiKey || process.env.POSTIZ_API_KEY;
  if (!postizKey) {
    steps.push("no POSTIZ_API_KEY — posts generated but not scheduled");
    return {
      topic,
      angle,
      scheduled: false,
      reason: "no POSTIZ_API_KEY set",
      steps,
      posts: polished,
      voiceProfileActive: !!voiceProfile,
      algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
    };
  }

  try {
    steps.push("connecting to Postiz...");
    const postizOpts = { apiKey: postizKey };
    const integration = await findIntegration(platform, postizOpts);

    if (!integration) {
      steps.push(`no ${platform} integration found in Postiz — connect your account first`);
      return {
        topic,
        angle,
        scheduled: false,
        reason: `no ${platform} integration in Postiz`,
        steps,
        posts: polished,
        voiceProfileActive: !!voiceProfile,
        algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
      };
    }

    steps.push(`found ${platform} integration: ${integration.name} (@${integration.profile})`);

    // Schedule each post
    for (const p of polished) {
      try {
        const thread = p.selfReply ? [p.selfReply] : [];
        const result = await createPost({
          integrationId: integration.id,
          content: p.final,
          thread,
          type: "schedule",
          date: p.scheduledAt,
          platform,
        }, postizOpts);
        p.postizResult = result;
        p.scheduled = true;
      } catch (e) {
        p.postizResult = { error: e.message };
        p.scheduled = false;
      }
    }

    const scheduledCount = polished.filter(p => p.scheduled).length;
    steps.push(`scheduled ${scheduledCount}/${polished.length} posts via Postiz`);

    return {
      topic,
      angle,
      scheduled: true,
      scheduledCount,
      integration: { name: integration.name, profile: integration.profile, platform },
      steps,
      posts: polished,
      voiceProfileActive: !!voiceProfile,
      algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
    };
  } catch (e) {
    steps.push(`Postiz error: ${e.message}`);
    return {
      topic,
      angle,
      scheduled: false,
      reason: e.message,
      steps,
      posts: polished,
      voiceProfileActive: !!voiceProfile,
      algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
    };
  }
}

// ---------------------------------------------------------------------------
// Autopilot summary — human-readable printout
// ---------------------------------------------------------------------------

function formatAutopilotResult(result) {
  if (result.error) return result.error;

  const lines = [];
  lines.push("=== AGENTX AUTOPILOT ===");
  lines.push(`Topic: ${result.topic}`);
  if (result.angle) lines.push(`Angle: ${result.angle}`);
  lines.push(`Voice profile: ${result.voiceProfileActive ? "active" : "inactive"}`);
  lines.push(`Mode: ${result.dryRun ? "DRY RUN" : result.scheduled ? "SCHEDULED" : "NOT SCHEDULED"}`);
  if (result.reason) lines.push(`Reason: ${result.reason}`);
  if (result.integration) lines.push(`Account: @${result.integration.profile} (${result.integration.platform})`);
  lines.push("");

  if (result.steps.length) {
    lines.push("Steps:");
    for (const s of result.steps) lines.push(`  - ${s}`);
    lines.push("");
  }

  lines.push(`Posts: ${result.posts.length}`);
  lines.push("");

  result.posts.forEach((p, i) => {
    lines.push(`--- POST ${i + 1} [${p.grade}] Score: ${p.score} | Real: ${p.realScore} ---`);
    lines.push(`Archetype: ${p.archetype} | Engagement: ${p.engagementTier}`);
    lines.push(`Scheduled: ${p.scheduledLabel} (weight: ${p.scheduledWeight})`);
    lines.push(`Polish: ${p.polishMethod}`);
    if (p.scheduled) lines.push(`Postiz: scheduled ✓`);
    else if (p.postizResult?.error) lines.push(`Postiz: failed — ${p.postizResult.error}`);
    lines.push(`Top signals: ${p.topSignals.join(", ")}`);
    lines.push("");
    lines.push("POST:");
    lines.push("```");
    lines.push(p.final);
    lines.push("```");
    if (p.selfReply) {
      lines.push("");
      lines.push("SELF-REPLY (auto-scheduled as thread):");
      lines.push("```");
      lines.push(p.selfReply);
      lines.push("```");
    }
    lines.push("");
  });

  return lines.join("\n");
}

module.exports = {
  runAutopilot,
  formatAutopilotResult,
};
