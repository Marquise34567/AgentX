/*
 * Fact extractor — pulls specific facts, numbers, and claims from user input.
 *
 * When a user types "autoeditor made my watchtime go up 2x", the system needs to:
 *   1. Extract the FACTS: "autoeditor", "watchtime", "2x"
 *   2. Craft a post that USES those facts in a compelling way
 *   3. NOT replace the user's facts with generic database insights
 *
 * This module extracts:
 *   - Numbers (2x, 40%, $10k, 6 months, 10 videos)
 *   - Tools/products (AutoEditor, ChatGPT, Notion)
 *   - Metrics (watchtime, MRR, followers, conversion rate)
 *   - Actions (built, tested, launched, deleted, replaced)
 *   - Results (went up, dropped, increased, saved)
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Extract facts from user input
// ---------------------------------------------------------------------------

function extractFacts(text) {
  const facts = {
    numbers: [],
    tools: [],
    metrics: [],
    actions: [],
    results: [],
    timeframes: [],
    money: [],
    raw: text,
  };

  // Numbers: 2x, 3x, 40%, 10k, $10k, etc.
  // BUT exclude listicle openers like "5 things" or "3 rules" — those aren't metrics
  // AND exclude numbers that are part of compound words like "2lbs", "5x" (keep those)
  const allNumbers = text.match(/\b(\d+\.?\d*)(x|k|m|%)?\b/gi) || [];
  // Filter out numbers that are part of "N things/rules/lessons/ways/steps/tips"
  facts.numbers = allNumbers.filter(n => {
    // Check if this number is followed by "things/rules/lessons/ways/steps/tips"
    const afterNum = text.match(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(things|rules|lessons|ways|steps|tips|reasons|habits|mistakes)`, "i"));
    return !afterNum;
  });

  // Money: $10k, $500/mo, $2M
  facts.money = text.match(/\$[\d,.]+[km]?(\s*\/?\s*mo)?/gi) || [];

  // Timeframes: 6 months, 90 days, 2 years, 3 weeks
  // BUT NOT "4 hours" when it's "saves 4 hours" — that's a savings, not a timeframe
  const timeframeMatches = text.match(/\b(in|over|for|after)\s+(\d+\s+(day|week|month|year|hour|minute)s?)\b/gi) || [];
  facts.timeframes = timeframeMatches.map(m => m.replace(/^(in|over|for|after)\s+/i, "").trim());

  // Tools/products — common ones + capitalized words
  const knownTools = ["autoeditor", "chatgpt", "claude", "notion", "figma", "stripe", "vercel", "github", "react", "python", "slack", "gmail", "youtube", "twitter", "shopify", "wordpress", "webflow", "airtable", "openai"];
  for (const tool of knownTools) {
    if (text.toLowerCase().includes(tool)) {
      facts.tools.push(tool);
    }
  }
  // Also detect capitalized words that might be product names
  const capWords = text.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b/g) || [];
  for (const word of capWords) {
    if (!facts.tools.includes(word.toLowerCase()) && word.length > 2) {
      facts.tools.push(word);
    }
  }

  // Metrics — things you can measure
  const knownMetrics = ["watchtime", "watch time", "mrr", "arr", "revenue", "churn", "conversion", "ctr", "followers", "engagement", "impressions", "clicks", "signups", "retention", "bounce rate", "open rate", "salary", "traffic", "views", "subscribers", "customers", "users", "downloads"];
  const lower = text.toLowerCase();
  for (const metric of knownMetrics) {
    if (lower.includes(metric)) {
      facts.metrics.push(metric);
    }
  }

  // Actions — what the user did
  const knownActions = ["built", "tested", "launched", "shipped", "deleted", "replaced", "started", "stopped", "tracked", "measured", "tried", "used", "made", "created", "fixed", "cut", "increased", "decreased", "reduced", "doubled", "tripled", "grew", "scaled"];
  for (const action of knownActions) {
    if (lower.includes(action)) {
      facts.actions.push(action);
    }
  }

  // Results — what happened
  const knownResults = ["went up", "went down", "dropped", "increased", "decreased", "reduced", "doubled", "tripled", "grew", "saved", "cost", "gained", "lost", "improved", "boosted", "skyrocketed", "plummeted"];
  for (const result of knownResults) {
    if (lower.includes(result)) {
      facts.results.push(result);
    }
  }

  // Has any facts?
  facts.hasFacts = facts.numbers.length > 0 || facts.money.length > 0 || facts.timeframes.length > 0 || (facts.tools.length > 0 && facts.metrics.length > 0);

  return facts;
}

// ---------------------------------------------------------------------------
// Craft a post from extracted facts
// ---------------------------------------------------------------------------

/**
 * Craft a compelling post from the user's facts.
 * This is the "senior copywriter" — it takes the raw facts and structures
 * them into a post that hits the right algorithm signals.
 *
 * @param {Object} facts - Extracted facts
 * @param {string} originalInput - The user's original input
 * @returns {string} A crafted post
 */
function craftPost(facts, originalInput) {
  // If we have numbers + metrics + actions, build a story post
  // "autoeditor made my watchtime go up 2x"
  // → "I used AutoEditor on my last 10 videos. Watch time went up 2x. Here's the workflow."

  if (facts.hasFacts) {
    return craftStoryFromFacts(facts, originalInput);
  }

  // If no specific facts, fall back to the cleaned input
  return originalInput;
}

function craftStoryFromFacts(facts, originalInput) {
  // Structure the user's facts into the proven viral format:
  //   1. Hook (the most compelling fact — usually time/money saved) — stops the scroll
  //   2. Proof (how many, how long) — builds credibility
  //   3. Result (the metric that improved) — the payoff
  //   4. Shareable insight — drives copy-link shares (20.0)
  //
  // Use ALL the facts the user gave us. Use proper capitalization.

  const lines = [];
  const tool = facts.tools[0] || "";
  const metric = facts.metrics[0] || "";
  const action = facts.actions[0] || "tested";
  const result = facts.results[0] || "went up";
  const timeframe = facts.timeframes[0] || "";
  const money = facts.money[0] || "";
  const lowerInput = originalInput.toLowerCase();

  // Find the number associated with the metric/result
  let metricNumber = null;
  if (result && facts.results.length > 0) {
    const afterResult = lowerInput.split(result)[1];
    if (afterResult) {
      const numMatch = afterResult.match(/\s+(\d+\.?\d*x?k?m?%?)/);
      if (numMatch) metricNumber = numMatch[1];
    }
  }
  if (!metricNumber && facts.numbers.length > 0) {
    // Prefer numbers with suffixes (2x, 10k, 40%) over plain numbers
    // Plain numbers might be timeframes (6 months, 10 videos)
    const suffixed = facts.numbers.find(n => /[xk%]/i.test(n));
    metricNumber = suffixed || facts.numbers[0];
  }

  // --- Build the hook (line 1) ---
  // Lead with the STRONGEST fact — usually time/money saved, not the result
  // "AutoEditor saves me 4 hours per video." is a stronger hook than "Watchtime went up 2x."
  // because it's more concrete and immediately useful to the reader.

  const savesMatch = lowerInput.match(/(saves?|saved)\s+(me\s+)?(.{3,40}?)(\s+and\s+|$)/);
  const acrossMatch = lowerInput.match(/(across|on|over)\s+(\d+\s+videos?)/);

  let hookBuilt = false;

  // If there's a "saves X" fact, lead with it
  if (savesMatch && tool) {
    const savesText = savesMatch[1] + " " + (savesMatch[2] || "") + savesMatch[3];
    lines.push(`${capitalize(tool)} ${savesText}.`);
    hookBuilt = true;
  }

  // --- Build proof lines ---
  const proofLines = [];

  // "across 10 videos" / "on 10 videos"
  if (acrossMatch) {
    proofLines.push(`I tested it ${acrossMatch[0]}.`);
  }

  // "in 6 months" / "over 30 days"
  if (timeframe && !acrossMatch) {
    proofLines.push(`this happened ${timeframe}.`);
  }

  // --- Build the result line ---
  // If we led with "saves X hours", the result (watchtime went up 2x) goes here
  if (hookBuilt && metric && metricNumber) {
    proofLines.push(`${capitalize(metric)} ${result} ${metricNumber}.`);
  } else if (!hookBuilt && metric && metricNumber) {
    // No "saves" fact — lead with the result
    if (tool) {
      lines.push(`${capitalize(metric)} ${result} ${metricNumber} after I started using ${capitalize(tool)}.`);
    } else {
      lines.push(`${capitalize(metric)} ${result} ${metricNumber}.`);
    }
    hookBuilt = true;
  } else if (!hookBuilt) {
    if (money) {
      lines.push(`I ${action} ${tool ? capitalize(tool) : "this"} and ${result} ${money}.`);
    } else if (metricNumber) {
      lines.push(`${metricNumber}. that's what ${tool ? capitalize(tool) : "this"} did for my ${metric || "results"}.`);
    } else {
      lines.push(capitalizeFirst(originalInput));
    }
    hookBuilt = true;
  }

  // Add proof lines
  for (const proof of proofLines) {
    lines.push(capitalizeFirst(proof));
  }

  // --- Build the shareable insight line ---
  if (tool && metric) {
    lines.push(`Here's the workflow nobody's talking about.`);
  }

  return lines.join("\n\n");
}

function capitalizeFirst(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function capitalize(s) {
  if (!s) return s;
  // Special cases
  if (s.toLowerCase() === "autoeditor") return "AutoEditor";
  if (s.toLowerCase() === "chatgpt") return "ChatGPT";
  if (s.toLowerCase() === "mrr") return "MRR";
  if (s.toLowerCase() === "arr") return "ARR";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = {
  extractFacts,
  craftPost,
  craftStoryFromFacts,
};
