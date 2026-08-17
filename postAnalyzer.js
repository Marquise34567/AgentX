/*
 * Post Analyzer — the "lanoter" algo.
 *
 * Scans a draft X post and extracts its DNA: what kind of post it is,
 * what facts MUST be preserved, what's interesting, what's weak, and
 * what angle would make it stop the scroll.
 *
 * This is NOT a template fitter. It's a deep structural analysis that
 * feeds the smartRewriter so every rewrite is unique to the post.
 *
 * Rule-based (no LLM) so it runs anywhere and is deterministic.
 */

"use strict";

const { extractTension, extractTopic } = require("./hookLibrary");

// ---------------------------------------------------------------------------
// Fact extraction — things that MUST be preserved verbatim
// ---------------------------------------------------------------------------
function extractFacts(text) {
  const facts = {
    money: [],        // $44k, $6M, $10k
    percents: [],     // 70%, 20%
    timePeriods: [],  // 90 days, 48 hours, 12 months
    counts: [],       // 100+ startups, 3 startups, 4 bugs
    productNames: [], // Aligno, autoeditor, Claude
    urls: [],         // https://autoeditor.app
    properNouns: [],  // specific named things
    keyPhrases: [],   // domain-specific phrases that carry meaning
  };

  // Money: $44k, $6M, $10k, $44,000
  const moneyMatches = text.matchAll(/\$(\d[\d,.]*[kmKM]?)/g);
  for (const m of moneyMatches) facts.money.push("$" + m[1]);

  // Percentages
  const pctMatches = text.matchAll(/(\d+%)/g);
  for (const m of pctMatches) facts.percents.push(m[1]);

  // Time periods: 90 days, 48 hours, 12 months, 2 weeks, 5 minutes, 16 hours
  const timeMatches = text.matchAll(/(\d+)\s*(days?|hours?|minutes?|mins?|months?|weeks?|years?|seconds?|secs?)\b/gi);
  for (const m of timeMatches) facts.timePeriods.push(`${m[1]} ${m[2].toLowerCase()}`);

  // Counts: "100+ startups", "3 startups", "4 bugs"
  const countMatches = text.matchAll(/(\d+\+?)\s+(startups?|clients?|customers?|users?|bugs?|features?|videos?|posts?|companies?|apps?|tools?|hours?|days?|weeks?|months?|years?|replies?|bookmarks?|likes?|views?|impressions?|followers?)/gi);
  for (const m of countMatches) facts.counts.push(`${m[1]} ${m[2].toLowerCase()}`);

  // URLs
  const urlMatches = text.matchAll(/https?:\/\/\S+/g);
  for (const m of urlMatches) facts.urls.push(m[0]);

  // Product names — capitalized words that aren't sentence starts
  // Look for patterns like "Meet Aligno", "autoeditor.app", "Claude", "Framer"
  const productPatterns = [
    /\b(?:meet|called|named|introducing|presenting)\s+([A-Z][a-z]+)/g,
    /\b([A-Z][a-z]+)\s*[—–-]\s*(?:a|an|the)\s/g,  // "Aligno — a premium..."
    /\b([A-Z][a-z]+)\.app\b/g,
    /\b(Claude|GPT-?\d?|Copilot|Cursor|Codex|Gemini|Framer|Notion|Linear|Vercel)\b/g,
  ];
  for (const pat of productPatterns) {
    const matches = text.matchAll(pat);
    for (const m of matches) {
      const name = m[1] || m[0];
      if (name && !facts.productNames.includes(name)) facts.productNames.push(name);
    }
  }

  // Key phrases — domain-specific terms that carry meaning
  const keyPhrasePatterns = [
    /\b(dead air|pacing|hook|scroll.?past|watch time|retention|close rate|MRR|ARR|churn|NRR)\b/gi,
    /\b(reverse.?engineer|build in public|zero.?friction|open loop|curiosity gap)\b/gi,
    /\b(quit my job|9.?to.?5|side project|indie hacker|bootstrapped|self.?funded)\b/gi,
    /\b(AI agent|AI edited|AI tool|video editor|content repurposing)\b/gi,
  ];
  for (const pat of keyPhrasePatterns) {
    const matches = text.matchAll(pat);
    for (const m of matches) {
      const phrase = m[0].toLowerCase();
      if (!facts.keyPhrases.includes(phrase)) facts.keyPhrases.push(phrase);
    }
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Post type classification — what IS this post?
// ---------------------------------------------------------------------------
function classifyPostType(text, facts) {
  const t = text.toLowerCase();
  const types = [];

  // Reverse-engineered blueprint — check BEFORE revenue (more specific)
  if (/\b(reverse.?engineer|already (working|winning))\b/.test(t) && /\b(most (people|creators|founders) (start|begin))\b/.test(t)) {
    types.push({ type: "reverse_engineered", confidence: 0.9, reason: "reverse-engineers what's already working" });
  }
  // Product demo / launch
  if (/\b(built|launched|shipped|created|fixed|figured out|solved|demo|workflow|tool|app|product)\b/.test(t) && (facts.urls.length || /\b(video|minute|edited|workflow)\b/.test(t))) {
    types.push({ type: "product_demo", confidence: 0.8, reason: "describes building/fixing something + has demo evidence or URL" });
  }
  // Revenue / milestone — only if NOT reverse-engineered
  if (facts.money.length > 0 && /\b(mrr|arr|revenue|crossed|hit|reached|passed|milestone|per month|\/month|\/mo)\b/.test(t) && !/\b(reverse.?engineer)\b/.test(t)) {
    types.push({ type: "revenue_milestone", confidence: 0.9, reason: "has money + revenue language" });
  }
  // Personal story / vulnerability
  if (/\b(quit my job|last day|leaving my|i failed|i was|i met|waiting room|plastic chairs|car service|saved up|living off)\b/.test(t)) {
    types.push({ type: "personal_story", confidence: 0.8, reason: "first-person vulnerable narrative" });
  }
  // Contrarian take
  if (/\b(killing|dead|wrong|myth|bullshit|overrated|useless|nobody|most people|everyone.?s wrong)\b/.test(t)) {
    types.push({ type: "contrarian_take", confidence: 0.7, reason: "challenges conventional wisdom" });
  }
  // Failure reflection
  if (/\b(failed|mistake|wrong|lost|shut down|killed|destroyed|collapsed|blew up)\b/.test(t)) {
    types.push({ type: "failure_reflection", confidence: 0.7, reason: "reflects on failure or loss" });
  }
  // AI-related
  if (/\b(claude|gpt|ai|agent|copilot|cursor|codex|gemini|llm|model)\b/.test(t)) {
    types.push({ type: "ai_topic", confidence: 0.6, reason: "mentions AI tools or concepts" });
  }
  // Build in public
  if (/\b(shipped|built|fixed|pushed|added|deployed|day \d+|week \d+)\b/.test(t) && t.length < 300) {
    types.push({ type: "build_in_public", confidence: 0.5, reason: "short shipping update" });
  }
  // Lead gen / engagement bait
  if (/\b(like \+ reply|reply with|dm (it|you)|free (guide|template|checklist))\b/.test(t)) {
    types.push({ type: "lead_gen", confidence: 0.8, reason: "asks for engagement in exchange for free resource" });
  }
  // Giveaway
  if (/\b(giveaway|free for|24 hours|next 24|like.*repost.*comment|follow.*like)\b/.test(t)) {
    types.push({ type: "giveaway", confidence: 0.8, reason: "time-limited free offer requiring engagement" });
  }
  // Tutorial / educational
  if (/\b(how to|guide|tutorial|step.by.step|here.?s how|framework|method|system)\b/.test(t)) {
    types.push({ type: "educational", confidence: 0.6, reason: "teaches a method or framework" });
  }
  // Data drop
  if (facts.counts.length >= 2 || (facts.money.length && facts.percents.length)) {
    types.push({ type: "data_drop", confidence: 0.6, reason: "multiple specific numbers/data points" });
  }
  // Absurd / niche
  if (/\b(absurd|insane|crazy|wild|nuts|ridiculous|cat playing|embryo|brainrot|bullshit)\b/.test(t)) {
    types.push({ type: "absurd_niche", confidence: 0.6, reason: "absurd or unexpected juxtaposition" });
  }

  // Sort by confidence
  types.sort((a, b) => b.confidence - a.confidence);
  return types;
}

// ---------------------------------------------------------------------------
// Hook potential — what's the most interesting thing in this post?
// ---------------------------------------------------------------------------
function findHookPotential(text, facts, types) {
  const t = text.toLowerCase();
  const hooks = [];

  // Money is always interesting
  if (facts.money.length) {
    for (const m of facts.money) {
      hooks.push({ element: m, power: 90, angle: "money_reveal", reason: "specific money amount stops the scroll" });
    }
  }
  // Dramatic percentages
  if (facts.percents.length) {
    for (const p of facts.percents) {
      hooks.push({ element: p, power: 75, angle: "data_contrast", reason: "specific percentage implies a story" });
    }
  }
  // Time compression — "12 minute video in 5 minutes" is a great hook
  if (facts.timePeriods.length >= 2) {
    hooks.push({ element: facts.timePeriods.join(" → "), power: 80, angle: "time_compression", reason: "time contrast implies efficiency" });
  }
  // Dramatic verbs
  const dramaVerbs = text.match(/\b(killed|destroyed|quit|failed|cracked|figured out|stumbled|collapsed|blew up)\b/gi);
  if (dramaVerbs) {
    for (const v of dramaVerbs) {
      hooks.push({ element: v.toLowerCase(), power: 85, angle: "drama", reason: "dramatic verb creates tension" });
    }
  }
  // Contrarian claims
  if (/\b(overrated|useless|dead|killing|wrong|myth|nobody)\b/.test(t)) {
    const claimMatch = text.match(/(\w[\w\s]+(?:overrated|useless|dead|killing|wrong|myth))/i);
    if (claimMatch) hooks.push({ element: claimMatch[1].trim(), power: 80, angle: "contrarian", reason: "challenges belief → forces read" });
  }
  // Questions in the original
  const questions = text.match(/\b(why|how|what if|what happens when)\b[^?]*\?/gi);
  if (questions) {
    for (const q of questions) {
      hooks.push({ element: q.trim(), power: 70, angle: "curiosity_question", reason: "question creates open loop" });
    }
  }
  // Vulnerability
  if (/\b(quit|failed|lost|broke|saved up|living off|last day|i was scared|afraid)\b/.test(t)) {
    hooks.push({ element: "vulnerability", power: 85, angle: "vulnerability", reason: "raw honesty stops the scroll" });
  }
  // Absurd juxtaposition
  if (/\b(cat|embryo|brainrot|printing money|bullshit)\b/.test(t)) {
    hooks.push({ element: "absurdity", power: 80, angle: "absurd", reason: "unexpected pairing creates curiosity" });
  }
  // "I fixed it" / problem solved
  if (/\b(fixed|solved|figured out|cracked)\b/.test(t)) {
    hooks.push({ element: "problem_solved", power: 75, angle: "problem_solution", reason: "problem-solution arc creates curiosity" });
  }

  hooks.sort((a, b) => b.power - a.power);
  return hooks;
}

// ---------------------------------------------------------------------------
// Weakness detection — what's wrong with the current post?
// ---------------------------------------------------------------------------
function findWeaknesses(text, facts) {
  const t = text.toLowerCase();
  const weaknesses = [];

  // Weak opener
  const weakOpeners = [
    /^(excited|thrilled|happy|proud|honored|delighted)/i,
    /^(the new year|today i|this week i|this month i)/i,
    /^(here are|here is|here'?s a)/i,
    /^(i (just |am )?(launched|sharing|announcing|excited))/i,
    /^(so (today|this week|i))/i,
    /^(alright|okay|so)/i,
  ];
  if (weakOpeners.some((re) => re.test(text.trim()))) {
    weaknesses.push({ issue: "weak_opener", severity: "high", fix: "replace with a specific, curious, or contrarian first line" });
  }

  // Link in body
  if (facts.urls.length && /https?:\/\//.test(text)) {
    weaknesses.push({ issue: "link_in_body", severity: "high", fix: "move link to first reply — links in body kill reach" });
  }

  // Too long first line
  const firstLine = text.split("\n")[0].trim();
  const firstWordCount = (firstLine.match(/\S+/g) || []).length;
  if (firstWordCount > 12) {
    weaknesses.push({ issue: "long_first_line", severity: "medium", fix: `first line is ${firstWordCount} words — cut to a punchy 4-8 word hook` });
  }

  // No numbers / no specificity
  if (!facts.money.length && !facts.percents.length && !facts.counts.length && !facts.timePeriods.length) {
    weaknesses.push({ issue: "no_specifics", severity: "medium", fix: "add a specific number (time, %, $, count) — vague posts get scrolled past" });
  }

  // Wall of text (no line breaks)
  if (!text.includes("\n") && text.length > 120) {
    weaknesses.push({ issue: "wall_of_text", severity: "medium", fix: "add line breaks — scannable posts get more dwell time" });
  }

  // No reply trigger
  if (!/\?/.test(text) && !/\b(reply|comment|what'?s your|agree or|your take)\b/i.test(t)) {
    weaknesses.push({ issue: "no_reply_trigger", severity: "low", fix: "end with a question or opinion prompt to drive replies" });
  }

  // All caps shouting
  if (/[A-Z]{4,}/.test(text)) {
    weaknesses.push({ issue: "all_caps", severity: "medium", fix: "all-caps words look spammy — use italics or bold instead" });
  }

  // Self-promotional language
  if (/\b(excited to share|thrilled to announce|proud to|honored to|delighted to)\b/i.test(t)) {
    weaknesses.push({ issue: "self_promo", severity: "high", fix: "kill the corporate announcement language — speak like a human" });
  }

  return weaknesses;
}

// ---------------------------------------------------------------------------
// Strength detection — what's already good?
// ---------------------------------------------------------------------------
function findStrengths(text, facts) {
  const t = text.toLowerCase();
  const strengths = [];

  if (facts.money.length) strengths.push("has specific money amounts");
  if (facts.percents.length) strengths.push("has specific percentages");
  if (facts.timePeriods.length) strengths.push("has time-specific details");
  if (text.includes("\n")) strengths.push("has line breaks (scannable)");
  if (/\?/.test(text)) strengths.push("has a question (reply trigger)");
  if (/\b(reply|comment|agree|your take|what'?s your)\b/i.test(t)) strengths.push("has explicit reply invitation");
  if (text.length >= 71 && text.length <= 200) strengths.push("good length (71-200 chars)");
  if (/\b(failed|quit|lost|scared|afraid|vulnerable)\b/i.test(t)) strengths.push("has vulnerability (stops scroll)");
  if (/\b(overrated|useless|dead|wrong|killing|myth)\b/i.test(t)) strengths.push("has contrarian angle");
  if (facts.productNames.length) strengths.push("names specific products");

  return strengths;
}

// ---------------------------------------------------------------------------
// Emotional angle — what's the dominant emotion?
// ---------------------------------------------------------------------------
function detectEmotion(text) {
  const t = text.toLowerCase();
  const emotions = [];

  if (/\b(excited|thrilled|proud|happy|grateful|thankful|amazing|incredible)\b/.test(t)) emotions.push({ emotion: "pride", power: 0.3 });
  if (/\b(failed|quit|lost|scared|afraid|broke|alone|struggling)\b/.test(t)) emotions.push({ emotion: "vulnerability", power: 0.8 });
  if (/\b(frustrated|annoyed|sick of|tired of|hate|sucks)\b/.test(t)) emotions.push({ emotion: "frustration", power: 0.6 });
  if (/\b(killed|destroyed|collapsed|blew up|disaster)\b/.test(t)) emotions.push({ emotion: "drama", power: 0.7 });
  if (/\b(absurd|insane|crazy|wild|nuts|ridiculous)\b/.test(t)) emotions.push({ emotion: "shock", power: 0.6 });
  if (/\b(figured out|cracked|solved|fixed|finally)\b/.test(t)) emotions.push({ emotion: "triumph", power: 0.5 });
  if (/\b(curious|wondering|what if|why does)\b/.test(t)) emotions.push({ emotion: "curiosity", power: 0.5 });

  emotions.sort((a, b) => b.power - a.power);
  return emotions[0]?.emotion || "neutral";
}

// ---------------------------------------------------------------------------
// Dwell time potential — what makes someone keep reading?
// ---------------------------------------------------------------------------
function assessDwellPotential(text, facts, hooks) {
  const factors = [];
  let score = 50;

  // Line breaks = scannable = more dwell
  if (text.includes("\n")) { score += 10; factors.push("line breaks"); }
  // Multiple paragraphs = Show More click
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  if (paragraphs.length >= 3) { score += 10; factors.push("multiple paragraphs (Show More)"); }
  // Open loop / curiosity gap
  if (hooks.some((h) => h.angle === "curiosity_question" || h.angle === "problem_solution")) { score += 15; factors.push("open loop"); }
  // Specific numbers = reader slows down to process
  if (facts.money.length + facts.percents.length + facts.counts.length >= 2) { score += 10; factors.push("multiple data points"); }
  // Story arc
  if (paragraphs.length >= 2 && /\b(i|he|she|we|they)\b/i.test(text)) { score += 10; factors.push("narrative arc"); }
  // Short punchy lines
  const lines = text.split("\n").filter((l) => l.trim());
  const shortLines = lines.filter((l) => l.trim().length <= 50).length;
  if (shortLines >= 2) { score += 5; factors.push("punchy short lines"); }

  return { score: Math.min(100, score), factors };
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------
function analyze(text) {
  const facts = extractFacts(text);
  const types = classifyPostType(text, facts);
  const hooks = findHookPotential(text, facts, types);
  const weaknesses = findWeaknesses(text, facts);
  const strengths = findStrengths(text, facts);
  const emotion = detectEmotion(text);
  const dwell = assessDwellPotential(text, facts, hooks);
  const tension = extractTension(text, { mustPreserve: facts, primaryType: types[0]?.type || "general", emotion, hooks });
  const topic = extractTopic(text);

  // Determine the best angle for the rewrite
  const topType = types[0]?.type || "general";
  const topHook = hooks[0] || null;
  const topWeakness = weaknesses.find((w) => w.severity === "high") || weaknesses[0] || null;

  // Generate a unique rewrite strategy
  const strategy = {
    primaryType: topType,
    allTypes: types.map((t) => t.type),
    hookAngle: topHook?.angle || "curiosity",
    hookElement: topHook?.element || null,
    emotion,
    dwellScore: dwell.score,
    dwellFactors: dwell.factors,
    tension: tension?.tension || null,
    implicitProblem: tension?.problem || null,
    recommendedAngle: tension?.angle || "curiosity",
    topic,
    mustPreserve: {
      money: facts.money,
      percents: facts.percents,
      timePeriods: facts.timePeriods,
      counts: facts.counts,
      productNames: facts.productNames,
      urls: facts.urls,
      keyPhrases: facts.keyPhrases,
    },
    weaknesses,
    strengths,
    hooks,
    // What the rewriter should do
    instructions: [],
  };

  // Build specific instructions for the rewriter
  if (topWeakness) strategy.instructions.push(`FIX: ${topWeakness.fix}`);
  if (topHook) strategy.instructions.push(`LEAD WITH: ${topHook.element} (${topHook.angle} — ${topHook.reason})`);
  if (facts.urls.length) strategy.instructions.push(`PRESERVE: move URL to reply, don't include in body`);
  if (facts.money.length) strategy.instructions.push(`PRESERVE: keep ${facts.money.join(", ")} verbatim`);
  if (facts.percents.length) strategy.instructions.push(`PRESERVE: keep ${facts.percents.join(", ")} verbatim`);
  if (facts.timePeriods.length) strategy.instructions.push(`PRESERVE: keep ${facts.timePeriods.join(", ")} verbatim`);
  if (facts.productNames.length) strategy.instructions.push(`PRESERVE: keep product names ${facts.productNames.join(", ")}`);
  strategy.instructions.push(`EMOTION: lead with ${emotion}`);
  strategy.instructions.push(`DWELL: ${dwell.score}/100 — ${dwell.factors.join(", ") || "add line breaks and open loops"}`);

  return strategy;
}

module.exports = { analyze, extractFacts, classifyPostType, findHookPotential, findWeaknesses, findStrengths, detectEmotion, assessDwellPotential };
