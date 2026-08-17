/*
 * Iteration engine — re-iterates a post in real-time until it hits A grade.
 *
 * This is the "senior copywriter who won't let you ship garbage" engine.
 * It:
 *   1. Generates a post
 *   2. Assesses it honestly
 *   3. If it's below B grade, identifies the problems
 *   4. Rewrites it to fix those specific problems
 *   5. Re-assesses
 *   6. Repeats until A grade or max iterations
 *
 * The key insight: it doesn't just "improve" blindly. It targets the SPECIFIC
 * failure modes the honest feedback identified. If the problem is "no proof",
 * it adds proof. If the problem is "hook too long", it shortens the hook.
 * If the problem is "no tension", it adds tension.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { check, fixSlop } = require("./qualityChecker");
const { assess, detectFailureModes } = require("./honestFeedback");
const { findAngles, mapTopicToDomain, INSIGHT_DATABASE } = require("./angleFinder");
const { parse: parseIdea } = require("./ideaParser");
const { transformToVoice } = require("./copywriter");
const { extractFacts, craftPost } = require("./factExtractor");

const MAX_ITERATIONS = 8;
const TARGET_GRADE = "A";
const TARGET_REAL_SCORE = 6; // real algorithm score target

// ---------------------------------------------------------------------------
// Main: iterate a post until it hits the target
// ---------------------------------------------------------------------------

/**
 * Iterate a post until it hits A grade or max iterations.
 *
 * @param {string} draft - The initial draft post
 * @param {string} topic - The topic (for domain context)
 * @param {Object} [opts] - { voiceProfile, phraseBank, maxIterations, targetGrade }
 * @returns {Object} { final, finalScore, finalGrade, iterations, converged, assessment }
 */
function iterate(draft, topic, opts = {}) {
  const { voiceProfile = null, phraseBank = null, maxIterations = MAX_ITERATIONS, targetGrade = TARGET_GRADE } = opts;

  if (!draft) return { error: "no draft provided" };

  // Strategy: generate MULTIPLE variations of the draft, score them all,
  // and pick the best one. This is more reliable than randomly mutating.
  const variations = generateVariations(draft, topic, { voiceProfile, phraseBank });

  // Score all variations + the original draft
  const allCandidates = [draft, ...variations].map(post => {
    const score = scorePost(post);
    const quality = check(post);
    const failures = detectFailureModes(post, score, quality);
    return {
      post,
      score: score.score,
      grade: score.grade,
      realScore: score.signalModel.realScore,
      qualityScore: quality.score,
      failures,
      scoreObj: score,
      qualityObj: quality,
    };
  });

  // Sort by composite score (which includes authenticity penalty)
  // NOT by realScore alone — realScore is the raw signal model which rewards
  // CTAs and share cues, but doesn't account for formulaic/AI-sounding patterns.
  // Using the composite score ensures the authenticity dimension is considered.
  allCandidates.sort((a, b) => (b.score + b.qualityScore * 0.05) - (a.score + a.qualityScore * 0.05));

  // Pick the best
  let best = allCandidates[0];

  const iterations = [{
    iteration: 0,
    post: draft,
    grade: scorePost(draft).grade,
    score: scorePost(draft).score,
    realScore: scorePost(draft).signalModel.realScore,
    qualityScore: check(draft).score,
    failures: detectFailureModes(draft, scorePost(draft), check(draft)).map(f => f.type),
    changes: ["initial draft"],
  }];

  // Log the variation selection
  iterations.push({
    iteration: 1,
    post: best.post,
    grade: best.grade,
    score: best.score,
    realScore: best.realScore,
    qualityScore: best.qualityScore,
    failures: best.failures.map(f => f.type),
    changes: [`selected best of ${allCandidates.length} variations`],
  });

  // Now iterate on the best variation
  let current = best.post;
  let currentScore = best.scoreObj;
  let currentQuality = best.qualityObj;
  let currentFailures = best.failures;

  let bestPost = current;
  let bestScoreObj = currentScore;
  let bestQualityObj = currentQuality;

  for (let i = 2; i <= maxIterations; i++) {
    const fixes = [];
    const candidate = applyFixes(current, topic, currentFailures, fixes, { voiceProfile, phraseBank });
    const candidateScore = scorePost(candidate);
    const candidateQuality = check(candidate);
    const candidateFailures = detectFailureModes(candidate, candidateScore, candidateQuality);

    const candidateCombined = candidateScore.signalModel.realScore + candidateQuality.score * 0.1;
    const bestCombined = bestScoreObj.signalModel.realScore + bestQualityObj.score * 0.1;

    if (candidateCombined >= bestCombined) {
      bestPost = candidate;
      bestScoreObj = candidateScore;
      bestQualityObj = candidateQuality;
    } else {
      iterations.push({
        iteration: i,
        post: candidate,
        grade: candidateScore.grade,
        score: candidateScore.score,
        realScore: candidateScore.signalModel.realScore,
        qualityScore: candidateQuality.score,
        failures: candidateFailures.map(f => f.type),
        changes: fixes.concat(["reverted — score decreased"]),
      });
      break;
    }

    current = candidate;
    currentScore = candidateScore;
    currentQuality = candidateQuality;
    currentFailures = candidateFailures;

    iterations.push({
      iteration: i,
      post: current,
      grade: currentScore.grade,
      score: currentScore.score,
      realScore: currentScore.signalModel.realScore,
      qualityScore: currentQuality.score,
      failures: currentFailures.map(f => f.type),
      changes: fixes,
    });

    if (meetsTarget(currentScore, currentQuality, targetGrade)) {
      return buildResult(current, currentScore, currentQuality, iterations, true);
    }

    if (currentFailures.length === 0) {
      return buildResult(current, currentScore, currentQuality, iterations, true);
    }
  }

  return buildResult(bestPost, bestScoreObj, bestQualityObj, iterations, meetsTarget(bestScoreObj, bestQualityObj, targetGrade));
}

// ---------------------------------------------------------------------------
// Generate multiple variations of a draft — try different CTAs, tensions, etc.
// ---------------------------------------------------------------------------

function generateVariations(draft, topic, opts = {}) {
  const { voiceProfile, phraseBank } = opts;
  const variations = [];

  // CLEAN VERSION: the draft with all formulaic elements stripped.
  // This is the "human" version — no CTA, no share cue, no tension line.
  // Real viral tweets (levelsio, Jake, arra) have NONE of these.
  let cleanDraft = draft;
  // Strip all formulaic lines
  cleanDraft = cleanDraft.replace(/\n(what's.*\?|where am I wrong\?|what would you add.*\?|does this match.*\?|what's your version.*\?|agree or disagree\?|change my mind\.|this is the hill.*\.|nobody can convince me.*\.|prove me wrong\.|fight me.*\.|try this.*\.|screenshot this.*\.|send this.*\.|bookmark this\.|save this\.|pass this.*\.|if this helped.*\.|if this was useful.*\.|most people get this wrong\.|the opposite is actually true\.|nobody wants to admit this\.|nobody wants to hear this\.|unpopular opinion:|here'?s the truth:|this is the problem\.)$/i, "").trim();
  // Also strip standalone formulaic lines
  cleanDraft = cleanDraft.split("\n").filter(line => {
    const trimmed = line.trim().toLowerCase();
    return !["save this.", "send this to someone who needs it.", "bookmark this.", "screenshot this for later.", "pass this to someone building something.", "most people get this wrong.", "the opposite is actually true.", "nobody wants to admit this.", "nobody wants to hear this.", "unpopular opinion:", "here's the truth:", "this is the problem.", "i learned this the hard way.", "the math is simple. nobody does it.", "the science backs this up.", "every founder i know says the same thing.", "i wish i'd known this 5 years ago.", "this took me 3 years to figure out."].includes(trimmed);
  }).join("\n").trim();
  // The clean version is always a candidate
  variations.push(cleanDraft);

  // Variation 1: clean + different CTAs (but only ONE CTA, not stacked)
  const ctas = [
    null, // no CTA — the clean version (already added above, but keep for scoring)
    "what's the part you disagree with?",
    "where am I wrong?",
    "what would you add to this?",
    "change my mind.",
    "screenshot this in 6 months.",
  ];

  for (const cta of ctas) {
    if (!cta) continue; // null already added as cleanDraft
    let v = cleanDraft;
    v = v + "\n" + cta;
    variations.push(v);
  }

  // Variation 2: add tension lines (but only to the clean version, not stacked)
  const tensions = [
    "most people get this wrong.",
    "the opposite is actually true.",
    null,
  ];

  for (const tension of tensions) {
    if (!tension) continue;
    const lines = cleanDraft.split("\n").filter(Boolean);
    if (lines.length >= 2) {
      const v = lines[0] + "\n\n" + tension + "\n\n" + lines.slice(1).join("\n\n");
      variations.push(v);
    }
  }

  // Variation 3: add share cues (but only ONE, not stacked with CTA)
  const shareCues = ["save this.", "send this to someone who needs it.", null];
  for (const cue of shareCues) {
    if (!cue) continue;
    const lines = cleanDraft.split("\n").filter(Boolean);
    if (lines.length >= 2) {
      const lastIdx = lines.length - 1;
      lines.splice(lastIdx, 0, cue);
      variations.push(lines.join("\n"));
    }
  }

  // Apply voice transformation if profile provided
  if (voiceProfile) {
    return variations.map(v => transformToVoice(v, voiceProfile, phraseBank));
  }

  return variations;
}

// ---------------------------------------------------------------------------
// Check if a post meets the target
// ---------------------------------------------------------------------------

function meetsTarget(score, quality, targetGrade) {
  // A grade: score >= 85 AND quality >= 70 AND realScore >= 6
  if (targetGrade === "A") {
    return score.grade.startsWith("A") && quality.score >= 70 && score.signalModel.realScore >= TARGET_REAL_SCORE;
  }
  // B grade: score >= 70 AND quality >= 60
  if (targetGrade === "B") {
    return (score.grade.startsWith("A") || score.grade.startsWith("B")) && quality.score >= 60;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Apply fixes — target specific failure modes
// ---------------------------------------------------------------------------

function applyFixes(post, topic, failures, changes, opts = {}) {
  let result = post;
  const { voiceProfile, phraseBank } = opts;

  // Extract the user's facts so we can preserve them
  const parsed = parseIdea(topic);
  const facts = extractFacts(parsed.insight || topic);
  const hasUserFacts = facts.hasFacts;

  // Sort failures by severity — fix critical ones first
  const sorted = [...failures].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  });

  for (const failure of sorted) {
    // Skip fixes that would add generic filler if the user already has good facts
    // BUT still allow tension — tension is always good
    if (hasUserFacts && (failure.type === "no_story" || failure.type === "not_shareworthy")) {
      // The user's facts ARE the story/share-worthy content. Don't add filler.
      continue;
    }

    switch (failure.type) {
      case "ad_like":
        result = fixAdLike(result, topic);
        changes.push("converted ad-like claim into a story with proof");
        break;

      case "vague":
        if (hasUserFacts) {
          // Don't add generic specifics if the user already has real facts
          continue;
        }
        // Don't add specifics to stories — they already have specifics
        if (/\b(i |my |me )\b/i.test(result) && /\b(spent|tried|tested|built|shipped|launched|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained)\b/i.test(result)) {
          continue;
        }
        result = addSpecificity(result, topic);
        changes.push("added specific numbers/details");
        break;

      case "slop":
        result = fixSlop(result);
        changes.push("replaced generic phrases with specific claims");
        break;

      case "no_story":
        result = addPersonalFrame(result, topic);
        changes.push("framed as personal experience");
        break;

      case "long_hook":
        result = shortenHook(result);
        changes.push("shortened the hook to 4-6 words");
        break;

      case "no_tension":
        result = addTension(result);
        changes.push("added tension/contrast");
        break;

      case "link_in_body":
        result = result.replace(/https?:\/\/\S+/g, "");
        changes.push("removed link from body");
        break;

      case "weak_opener":
        result = fixWeakOpener(result, topic);
        changes.push("replaced weak opener with a strong hook");
        break;

      case "negative_score":
        result = fullRewrite(result, topic);
        changes.push("complete rewrite — original had negative algorithm score");
        break;

      case "not_shareworthy":
        result = addShareableInsight(result, topic);
        changes.push("added a shareable insight");
        break;
    }
  }

  // Apply voice transformation if profile provided
  if (voiceProfile) {
    result = transformToVoice(result, voiceProfile, phraseBank);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Specific fix functions
// ---------------------------------------------------------------------------

function fixAdLike(post, topic) {
  // "X is changing the world" → "I tested X. Here's what happened."
  // BUT preserve the user's actual facts — don't replace them with generic claims.

  // First, try to extract facts from the original topic/input
  const parsed = parseIdea(topic);
  const facts = extractFacts(parsed.insight || topic);

  if (facts.hasFacts) {
    // The user has real facts — craft a post from them
    return craftPost(facts, parsed.insight || topic);
  }

  // No facts — convert the ad-like claim into a story frame
  const lines = post.split("\n").filter(Boolean);
  const firstLine = lines[0];

  // Extract the product/concept from the claim
  const conceptMatch = firstLine.match(/(\w[\w\s]+?)\s+(is changing|is revolutionizing|is disrupting|is transforming|is killing)/i);
  if (conceptMatch) {
    const concept = conceptMatch[1].trim();
    return `I tested ${concept}.\n\nHere's what actually happened:\n\nthe results surprised me.`;
  }

  // Generic: add a personal frame
  return addPersonalFrame(post, topic);
}

function addSpecificity(post, topic) {
  const { domain } = mapTopicToDomain(topic);
  const specifics = {
    saas: ["this cost me $12k in lost MRR.", "my churn dropped 40%.", "I tracked this for 90 days."],
    marketing: ["this doubled my CTR in 2 weeks.", "I A/B tested this across 10k visitors.", "I spent $5k to learn this."],
    ai: ["this cut my workflow from 3 hours to 20 minutes.", "I tested this across 100 prompts.", "I use this every day. it saves me 2 hours."],
    fitness: ["I tracked this for 6 months.", "this added 8lbs of muscle in 12 weeks.", "my recovery time dropped 50%."],
    money: ["this saved me $400/month.", "this was a $50k mistake.", "I tracked every dollar for a year."],
    productivity: ["this saved me 3 hours a day.", "my output went up 2x.", "I tracked my time for 30 days."],
    content: ["this thread got 10x the engagement.", "my follower growth went up 3x.", "I tested this across 200 posts."],
    career: ["my salary went up 120%.", "this was a $50k mistake.", "I learned this the hard way."],
    coding: ["this saved me 2 weeks of debugging.", "performance went up 5x.", "this bug cost me 3 days."],
    design: ["this doubled my conversion rate.", "this cut my bounce rate by 30%.", "I A/B tested this across 5k visitors."],
    general: ["I learned this the hard way.", "this took me 3 years to figure out.", "I wish I'd known this 5 years ago."],
  };

  const list = specifics[domain] || specifics.general;

  // Try ALL specifics and pick the best-scoring one
  let bestPost = post;
  let bestScore = scorePost(post).signalModel?.realScore || 0;

  for (const specific of list) {
    const lines = post.split("\n").filter(Boolean);
    const lastIdx = lines.length - 1;
    if (/\?/.test(lines[lastIdx])) {
      lines.splice(lastIdx, 0, specific);
    } else {
      lines.push(specific);
    }
    const candidate = lines.join("\n");
    const score = scorePost(candidate).signalModel?.realScore || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidate;
    }
  }

  return bestPost;
}

function addPersonalFrame(post, topic) {
  // "X is good" → "I learned this the hard way.\n\nX is good"
  // BUT don't add it if:
  // 1. The post already has "I" in it (it's already personal)
  // 2. The post is an opinion claim (the opinion IS the personal frame)
  if (/\b(i |my |me |i'm|i've)\b/i.test(post)) return post;

  // Don't add "I learned this the hard way" to opinion claims
  // "AI is going to replace junior developers" is an opinion — adding "I learned this the hard way" makes it incoherent
  if (/\b(is going to|is bad|is good|is overrated|is underrated|is wrong|is right|is a myth|is a lie|is a trap|is dead|is killing|will replace|won't|can't)\b/i.test(post)) {
    return post;
  }

  const firstLine = post.split("\n")[0];

  // If it's a claim about something, frame it as personal experience
  if (/^[A-Z]/.test(firstLine) && !/\b(i |my |me )\b/i.test(firstLine)) {
    return "I learned this the hard way.\n\n" + post;
  }

  return post;
}

function shortenHook(post) {
  const lines = post.split("\n");
  const hook = lines[0];
  const words = hook.split(/\s+/);

  if (words.length > 6) {
    // Don't split mid-sentence — that creates incoherent fragments.
    // Instead, try ALL shortened versions and pick the best-scoring one.
    
    // Option 1: Keep the full sentence but move it to a second line
    // and add a short punchy hook above it
    const punchyHooks = [
      "this is the problem.",
      "nobody wants to hear this.",
      "unpopular opinion:",
      "here's the truth:",
    ];

    let bestPost = post;
    let bestScore = scorePost(post).signalModel?.realScore || 0;

    for (const punchy of punchyHooks) {
      const candidate = lines.slice();
      candidate[0] = punchy;
      candidate.splice(1, 0, hook);
      const candidatePost = candidate.join("\n");
      const score = scorePost(candidatePost).signalModel?.realScore || 0;
      if (score > bestScore) {
        bestScore = score;
        bestPost = candidatePost;
      }
    }

    return bestPost;
  }

  return post;
}

function addTension(post) {
  // Don't add tension if the post already has a compelling structure
  const lines = post.split("\n").filter(Boolean);
  if (lines.length >= 3) return post; // already has enough structure

  // Try ALL tension lines and pick the best-scoring one
  const tensionLines = [
    "most people get this wrong.",
    "the opposite is actually true.",
    "nobody wants to admit this.",
  ];

  let bestPost = post;
  let bestScore = scorePost(post).signalModel?.realScore || 0;

  for (const tension of tensionLines) {
    const candidate = lines.slice();
    candidate.splice(1, 0, tension);
    const candidatePost = candidate.join("\n");
    const score = scorePost(candidatePost).signalModel?.realScore || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidatePost;
    }
  }

  return bestPost;
}

function fixWeakOpener(post, topic) {
  const lines = post.split("\n").filter(Boolean);
  // Try ALL strong openers and pick the best-scoring one
  const strongOpeners = [
    "here's what nobody tells you:",
    "the truth about " + (topic || "this") + ":",
    "I learned this the hard way.",
    "stop doing this.",
  ];

  let bestPost = post;
  let bestScore = scorePost(post).signalModel?.realScore || 0;

  for (const opener of strongOpeners) {
    const candidate = lines.slice();
    candidate[0] = opener;
    const candidatePost = candidate.join("\n");
    const score = scorePost(candidatePost).signalModel?.realScore || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidatePost;
    }
  }

  return bestPost;
}

function fullRewrite(post, topic) {
  // The post is so bad it needs a complete rewrite.
  // But DON'T mangle the user's idea. Preserve it and reframe it.
  const parsed = parseIdea(topic);
  const userIdea = parsed.insight || topic;
  const facts = extractFacts(userIdea);

  // If the user has facts, craft a post from them
  if (facts.hasFacts) {
    return craftPost(facts, userIdea);
  }

  // Extract the core concept without butchering it
  // "AI is going to replace junior developers" → keep it, just add a follow-up
  const cleaned = userIdea.replace(/^(my idea (of|for) a tweet\s*|i think (that\s*)?|i feel like\s*|i believe (that\s*)?)/i, "").trim();

  // Turn it into a structured post: hook + tension + insight
  // DON'T change the user's words — just structure them
  return `${capitalizeFirst(cleaned)}\n\nhere's why most people get this wrong:\n\nthey focus on the wrong thing.`;
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function addShareableInsight(post, topic) {
  const lines = post.split("\n").filter(Boolean);
  if (lines.length >= 3) return post; // already has enough structure

  // Try ALL insights and pick the best-scoring one
  const insights = [
    "this is the part nobody talks about.",
    "the secret is simpler than you think.",
    "most people miss this entirely.",
  ];

  let bestPost = post;
  let bestScore = scorePost(post).signalModel?.realScore || 0;

  for (const insight of insights) {
    const candidate = lines.slice();
    candidate.splice(1, 0, insight);
    const candidatePost = candidate.join("\n");
    const score = scorePost(candidatePost).signalModel?.realScore || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidatePost;
    }
  }

  return bestPost;
}

// ---------------------------------------------------------------------------
// Build the result object
// ---------------------------------------------------------------------------

function buildResult(post, score, quality, iterations, converged) {
  const assessment = assess(post);
  return {
    original: iterations[0].post,
    originalGrade: iterations[0].grade,
    originalScore: iterations[0].score,
    originalRealScore: iterations[0].realScore,
    final: post,
    finalScore: score.score,
    finalGrade: score.grade,
    finalRealScore: score.signalModel.realScore,
    finalQualityScore: quality.score,
    iterations,
    iterationCount: iterations.length - 1,
    converged,
    assessment,
    topSignals: score.signalModel.topPositive?.slice(0, 5).map(s => `${s.signal} (+${s.contribution})`) || [],
  };
}

// ---------------------------------------------------------------------------
// Format for display
// ---------------------------------------------------------------------------

function formatIteration(result) {
  const lines = [];
  lines.push("=== ITERATION ENGINE ===");
  lines.push();
  lines.push(`Iterations: ${result.iterationCount}/${MAX_ITERATIONS}`);
  lines.push(`Converged: ${result.converged ? "YES" : "NO"}`);
  lines.push();
  lines.push(`ORIGINAL: [${result.originalGrade}] Score: ${result.originalScore} | Real: ${result.originalRealScore}`);
  lines.push("```");
  lines.push(result.original);
  lines.push("```");
  lines.push();

  for (const iter of result.iterations.slice(1)) {
    lines.push(`ITERATION ${iter.iteration}: [${iter.grade}] Score: ${iter.score} | Real: ${iter.realScore} | Quality: ${iter.qualityScore}`);
    lines.push(`Changes: ${iter.changes.join(", ")}`);
    if (iter.failures.length) {
      lines.push(`Remaining issues: ${iter.failures.join(", ")}`);
    } else {
      lines.push("Remaining issues: none");
    }
    lines.push("```");
    lines.push(iter.post);
    lines.push("```");
    lines.push();
  }

  lines.push(`FINAL: [${result.finalGrade}] Score: ${result.finalScore} | Real: ${result.finalRealScore} | Quality: ${result.finalQualityScore}/100`);
  lines.push("```");
  lines.push(result.final);
  lines.push("```");
  lines.push();

  if (result.assessment) {
    lines.push(`VERDICT: ${result.assessment.verdict}`);
    if (result.assessment.strengths.length) {
      lines.push("STRENGTHS:");
      for (const s of result.assessment.strengths) lines.push(`  + ${s}`);
    }
    if (result.assessment.failures.length) {
      lines.push("REMAINING ISSUES:");
      for (const f of result.assessment.failures) {
        lines.push(`  [${f.severity.toUpperCase()}] ${f.message}`);
        lines.push(`    FIX: ${f.fix}`);
      }
    }
  }

  return lines.join("\n");
}

module.exports = {
  iterate,
  applyFixes,
  meetsTarget,
  formatIteration,
  MAX_ITERATIONS,
  TARGET_GRADE,
};
