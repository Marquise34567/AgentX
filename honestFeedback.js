/*
 * Honest feedback — tells you when a post won't perform and why.
 *
 * A senior copywriter doesn't just hand you a draft and say "here."
 * They say: "This won't work. Here's why. Here's what would work instead."
 *
 * This module:
 *   1. Scores the post on the real X algorithm
 *   2. Checks for common failure modes (vague claims, no proof, ad-like, etc.)
 *   3. Gives honest feedback in plain English
 *   4. Suggests specific fixes
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { check } = require("./qualityChecker");
const { extractFacts } = require("./factExtractor");
const { parse: parseIdea } = require("./ideaParser");

// ---------------------------------------------------------------------------
// Failure mode detection — why would this post flop?
// ---------------------------------------------------------------------------

function detectFailureModes(post, score, quality) {
  const failures = [];
  const text = post.toLowerCase();
  const firstLine = post.split("\n")[0];

  // 1. Ad-like / product claim with no proof
  const adWords = /\b(changing|revolutionizing|disrupting|game.?changer|the future of|the best|world.?class|cutting.?edge|innovative|transformative)\b/i;
  const hasProof = /\b(i |my |me |we |tested|tracked|measured|data|results|numbers|\d+%|\d+x|\$\d|\d+k|\d+ hours|\d+ days|\d+ months)\b/i.test(post);
  if (adWords.test(firstLine) && !hasProof) {
    failures.push({
      type: "ad_like",
      severity: "critical",
      message: "This reads like an ad, not a post. People scroll past ads.",
      fix: "Add proof: a specific number, a personal result, or a concrete example. 'I tested X and got Y' beats 'X is changing the world.'",
    });
  }

  // 2. Vague claim — no specifics
  if (quality.specificityScore < 15) {
    failures.push({
      type: "vague",
      severity: "high",
      message: "No specific details. This could be about anything.",
      fix: "Add at least one: a number ($10k, 3x, 40%), a timeframe (6 months, 90 days), a tool name, or a concrete result.",
    });
  }

  // 3. Slop detected
  if (quality.isSlop) {
    failures.push({
      type: "slop",
      severity: "high",
      message: "Contains generic phrases that sound smart but say nothing.",
      fix: quality.issues.find(i => i.startsWith("slop"))?.replace("slop: ", "Replace '") || "Replace generic phrases with specific claims.",
    });
  }

  // 4. No story / no personal experience
  const hasStory = /\b(i |my |me )\b/i.test(post) && /\b(spent|tried|tested|built|shipped|launched|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained|discovered|noticed)\b/i.test(post);
  if (!hasStory && score.signalModel.realScore < 3) {
    failures.push({
      type: "no_story",
      severity: "medium",
      message: "No personal experience. Posts with 'I did X and Y happened' get 3x more replies.",
      fix: "Frame it as your experience: 'I tested X. Here's what happened.' instead of 'X is good.'",
    });
  }

  // 5. Hook is too long
  const firstLineWords = firstLine.split(/\s+/).length;
  if (firstLineWords > 10) {
    failures.push({
      type: "long_hook",
      severity: "medium",
      message: `Hook is ${firstLineWords} words. People decide in 1 second whether to stop scrolling.`,
      fix: "Cut the first line to 4-6 words. Move the rest to line 2.",
    });
  }

  // 6. No tension / no reason to keep reading
  const hasTension = /\b(but|however|except|wrong|nobody|most people|the problem|the catch|the truth|secretly|actually|real|isn't|don't|doesn't|never|always)\b/i.test(post);
  if (!hasTension) {
    failures.push({
      type: "no_tension",
      severity: "medium",
      message: "No tension. The reader's brain never goes 'wait, what?'",
      fix: "Add a contrast: 'X isn't about Y. It's about Z.' or 'Most people think X. They're wrong.'",
    });
  }

  // 7. Link in body
  if (/https?:\/\//i.test(post)) {
    failures.push({
      type: "link_in_body",
      severity: "high",
      message: "Link in the body. X's algorithm demotes this heavily.",
      fix: "Move the link to the first reply. Keep the body clean.",
    });
  }

  // 8. Weak opener
  const weakOpeners = ["excited to share", "thrilled to announce", "happy to share", "we just launched", "i'm excited", "today i want to", "i wanted to share", "let me tell you about", "here are some thoughts"];
  for (const weak of weakOpeners) {
    if (text.startsWith(weak)) {
      failures.push({
        type: "weak_opener",
        severity: "high",
        message: `"${weak}" — this is the most scrolled-past opener on X.`,
        fix: "Start with a contrarian claim, a specific number, or a surprising fact.",
      });
      break;
    }
  }

  // 9. Algorithm score is negative or very low
  if (score.signalModel.realScore < 0) {
    failures.push({
      type: "negative_score",
      severity: "critical",
      message: `Real algorithm score is ${score.signalModel.realScore} — negative. The algorithm would actively suppress this.`,
      fix: "This post needs a complete rewrite. Focus on what gets shared: insights, data, or stories.",
    });
  }

  // 10. No share-worthy insight (share_via_copy_link = 20.0, KING signal)
  const isShareWorthy = /\b(here's (the|how|what)|the (secret|truth|real|key)|nobody (talks|tells|knows)|most people don't|\d+ (things|rules|lessons|ways|mistakes)|how (i|to)|workflow|framework|system|checklist|breakdown)\b/i.test(post);
  if (!isShareWorthy && score.signalModel.realScore < 5) {
    failures.push({
      type: "not_shareworthy",
      severity: "medium",
      message: "Nothing worth copying/sharing. The #1 signal (copy-link share = 40x a like) requires an insight people want to save.",
      fix: "Add a teachable insight: 'Here's the workflow', 'The secret is', 'Nobody talks about', or a numbered list.",
    });
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Honest feedback — the full assessment
// ---------------------------------------------------------------------------

/**
 * Give honest feedback on a post.
 *
 * @param {string} post - The post to evaluate
 * @returns {Object} { grade, score, realScore, qualityScore, verdict, failures, strengths, recommendation }
 */
function assess(post) {
  if (!post) return { error: "no post provided" };

  const score = scorePost(post);
  const quality = check(post);
  const failures = detectFailureModes(post, score, quality);

  // Detect strengths
  const strengths = [];
  if (quality.specificityScore >= 25) strengths.push("specific — contains concrete numbers/details");
  if (/\b(i |my |me )\b/i.test(post) && /\b(spent|tried|tested|built|shipped|launched|failed|quit|started|learned)\b/i.test(post)) strengths.push("personal story — drives replies + follows");
  if (/\?/.test(post)) strengths.push("has a reply trigger — captures the reply signal (5.0 + 15.0 mutual boost)");
  if (/\b(save|send|share|bookmark)\b/i.test(post)) strengths.push("has a share cue — captures copy-link shares (20.0)");
  if (post.split("\n")[0].split(/\s+/).length <= 6) strengths.push("short, punchy hook — stops the scroll");
  if (/\b(but|nobody|most people|wrong|isn't|don't)\b/i.test(post)) strengths.push("has tension — creates curiosity");

  // Overall verdict
  let verdict;
  let recommendation;
  const realScore = score.signalModel.realScore;
  const grade = score.grade;

  if (grade.startsWith("A") && realScore > 5) {
    verdict = "STRONG — this would likely get good engagement.";
    recommendation = "Post it. This hits the right signals.";
  } else if (grade.startsWith("B") && realScore > 3) {
    verdict = "DECENT — could work, but has room for improvement.";
    recommendation = failures.length ? "Fix the issues below to push it to A-grade." : "Good to go, but consider the tweaks below.";
  } else if (grade.startsWith("C") && realScore > 0) {
    verdict = "WEAK — would get low engagement, especially early on.";
    recommendation = "Don't post this yet. Rewrite using the suggestions below.";
  } else {
    verdict = "FLOP — the algorithm would suppress this.";
    recommendation = "Complete rewrite needed. The issues below are critical.";
  }

  return {
    post,
    grade,
    score: score.score,
    realScore: Math.round(realScore * 100) / 100,
    qualityScore: quality.score,
    verdict,
    recommendation,
    failures,
    strengths,
    topSignals: score.signalModel.topPositive?.slice(0, 5).map(s => `${s.signal} (+${s.contribution})`) || [],
    engagementTier: score.signalModel.engagementTier,
    predictedDwellSeconds: score.signalModel.predictedDwellSeconds,
  };
}

// ---------------------------------------------------------------------------
// Format feedback for display
// ---------------------------------------------------------------------------

function formatAssessment(a) {
  if (a.error) return a.error;

  const lines = [];
  lines.push("=== HONEST FEEDBACK ===");
  lines.push();
  lines.push("POST:");
  lines.push("```");
  lines.push(a.post);
  lines.push("```");
  lines.push();
  lines.push(`Grade: ${a.grade} | Score: ${a.score} | Real: ${a.realScore} | Quality: ${a.qualityScore}/100`);
  lines.push(`Verdict: ${a.verdict}`);
  lines.push();

  if (a.strengths.length) {
    lines.push("STRENGTHS:");
    for (const s of a.strengths) lines.push(`  + ${s}`);
    lines.push();
  }

  if (a.failures.length) {
    lines.push("ISSUES:");
    for (const f of a.failures) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.message}`);
      lines.push(`    FIX: ${f.fix}`);
    }
    lines.push();
  }

  lines.push(`RECOMMENDATION: ${a.recommendation}`);

  return lines.join("\n");
}

module.exports = {
  assess,
  detectFailureModes,
  formatAssessment,
  suggestMissingDetails,
};

// ---------------------------------------------------------------------------
// Suggest what details the user should add to improve the post
// ---------------------------------------------------------------------------

/**
 * When a post can't reach B grade because it lacks facts, suggest what
 * the user should tell us to make it stronger.
 *
 * @param {string} input - The user's original input
 * @param {Object} assessment - The assessment of the current post
 * @returns {Array<string>} Suggestions for what details to add
 */
function suggestMissingDetails(input, assessment) {
  const facts = extractFacts(input);
  const suggestions = [];

  // If no numbers at all
  if (facts.numbers.length === 0 && facts.money.length === 0) {
    suggestions.push("How much? Add a specific number: '2x', '40%', '$10k', '4 hours saved'.");
  }

  // If only one number, suggest adding more proof
  if (facts.numbers.length === 1 && !facts.timeframes.length) {
    suggestions.push("How long did it take? Add a timeframe: 'in 6 months', 'across 10 videos', 'after 30 days'.");
  }

  // If no tool/product mentioned
  if (facts.tools.length === 0) {
    suggestions.push("What tool or method did you use? Name it specifically.");
  }

  // If no metric mentioned
  if (facts.metrics.length === 0) {
    suggestions.push("What metric improved? 'watch time', 'MRR', 'conversion rate', 'followers'.");
  }

  // If the post has no personal story
  if (!/\b(i |my |me )\b/i.test(input)) {
    suggestions.push("Make it personal: 'I tested X. Here's what happened.' beats 'X is good.'");
  }

  // If the post is an ad-like claim
  if (assessment.failures.some(f => f.type === "ad_like")) {
    suggestions.push("Add proof: what specific result did YOU get? Numbers beat adjectives.");
  }

  // If the post has no tension
  if (assessment.failures.some(f => f.type === "no_tension")) {
    suggestions.push("Add a surprise: what did you expect vs what actually happened?");
  }

  return suggestions;
}
