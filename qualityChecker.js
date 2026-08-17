/*
 * Quality checker — catches generic/slop writing and forces rewrites.
 *
 * A senior copywriter would never ship:
 *   - "the fundamentals matter more than the framework"
 *   - "consistency is key"
 *   - "done > perfect"
 *   - "it's not about X, it's about Y"
 *
 * These are platitudes. They sound smart but say nothing.
 * This module detects them and returns a quality score + specific fixes.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Slop database — phrases that sound smart but say nothing
// ---------------------------------------------------------------------------

const SLOP_PHRASES = [
  // Generic platitudes
  "fundamentals matter",
  "fundamentals beat",
  "fundamentals are",
  "consistency is key",
  "consistency >",
  "consistency beats",
  "done > perfect",
  "done is better",
  "ship and iterate",
  "the boring work",
  "the boring part",
  "just keep moving",
  "just keep showing",
  "momentum > motivation",
  "momentum beats",
  "show up daily",
  "show up every",
  "ship publicly",
  "iterate fast",
  "the real skill",
  "the real leverage",
  "the real work",
  "nail the basics",
  "nail the fundamentals",
  "fix the basics",
  "master the basics",
  "back to basics",
  "the basics matter",
  "the basics are",

  // AI-slop phrases
  "in today's",
  "in the world of",
  "it's not about",
  "it is not about",
  "the key is",
  "the secret is",
  "the truth is",
  "at the end of the day",
  "when it comes to",
  "let that sink in",
  "the reality is",
  "the fact is",
  "here's the thing",
  "here is the thing",
  "what most people",
  "what nobody tells you",
  "what they don't tell you",
  "the biggest mistake",
  "one simple trick",
  "game changer",
  "game-changing",
  "next level",
  "take it to the next",
  "level up your",
  "unlock your",
  "supercharge your",
  "revolutionize",
  "disruptive",
  "paradigm shift",
  "think outside the box",
  "circle back",
  "deep dive",
  "low-hanging fruit",
  "move the needle",
  "synergy",
  "holistic approach",
  "best practices",
  "actionable insights",
  "value add",
  "value proposition",
  "thought leader",
  "subject matter expert",

  // Vague filler
  "the most important thing",
  "the number one",
  "you need to work hard",
  "hard work beats",
  "talent is overrated",
  "never give up",
  "grind never stops",
  "trust the process",
  "enjoy the journey",
  "embrace the grind",
  "rise and grind",
  "hustle culture",
  "the grind",
  "put in the work",
  "put in the reps",
  "do the work",
  "the work speaks",
  "let your work speak",

  // Generic listicle filler
  "your first 100",
  "tuition not failure",
  "80% psychology",
  "20% tactics",
  "the fundamentals",
  "the framework",
  "the system",
  "the process",
  "the journey",
  "the hustle",
];

// Phrases that are GOOD — specific, concrete, opinionated
const GOOD_PATTERNS = [
  // Specific numbers
  /\$\d+/,
  /\d+%/,
  /\d+k/,
  /\d+x\b/i,
  /\d+ months/,
  /\d+ days/,
  /\d+ hours/,
  /\d+ years/,
  /\d+ minutes/,

  // Specific tools/products
  /\b(notion|figma|stripe|vercel|github|chatgpt|claude|react|python|javascript|slack|gmail|google sheets|excel|airtable)\b/i,

  // Contrarian structure
  /\bisn't a .* problem.*it's a/i,
  /\bdon't need.*you need/i,
  /\bstopped .* and/i,
  /\bdeleted .* and/i,

  // Personal experience
  /\bi (spent|tracked|tried|tested|built|shipped|launched|failed|quit|raised|made|lost|gained|replaced)\b/i,

  // Specific actions
  /\b(cut|delete|remove|replace|stop|start|change|fix|index|refactor|rewrite)\b/i,
];

// ---------------------------------------------------------------------------
// Quality check — returns a score + list of problems
// ---------------------------------------------------------------------------

/**
 * Check a post for quality issues.
 *
 * @param {string} post - The post text
 * @returns {{ score: number, issues: string[], goodParts: string[], isSlop: boolean }}
 */
function check(post) {
  if (!post) return { score: 0, issues: ["empty post"], goodParts: [], isSlop: true };

  const text = post.toLowerCase();
  const issues = [];
  const goodParts = [];
  let score = 50; // start at neutral

  // 1. Check for slop phrases
  let slopCount = 0;
  for (const phrase of SLOP_PHRASES) {
    if (text.includes(phrase)) {
      slopCount++;
      issues.push(`slop: "${phrase}" — replace with something specific`);
      score -= 10;
    }
  }

  // 2. Check for good patterns
  for (const pattern of GOOD_PATTERNS) {
    if (pattern.test(post)) {
      const match = post.match(pattern);
      if (match) {
        goodParts.push(`good: "${match[0]}" — specific and concrete`);
        score += 8;
      }
    }
  }

  // 3. Check for vagueness — words that sound smart but mean nothing
  const vagueWords = ["fundamentals", "basics", "journey", "process", "system", "framework", "strategy", "mindset", "grind", "hustle", "growth", "success", "value", "impact"];
  let vagueCount = 0;
  for (const word of vagueWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = post.match(regex);
    if (matches) {
      vagueCount += matches.length;
    }
  }
  if (vagueCount > 2) {
    issues.push(`too many vague words (${vagueCount}): fundamentals, basics, journey, etc. — replace with concrete details`);
    score -= vagueCount * 3;
  }

  // 4. Check for specificity — does the post contain concrete details?
  const hasNumber = /\d/.test(post);
  const hasSpecificTool = /\b(notion|figma|stripe|vercel|github|chatgpt|claude|react|python|slack|gmail|google sheets|excel|airtable|shopify|wordpress|webflow)\b/i.test(post);
  const hasSpecificAction = /\b(deleted|cut|removed|replaced|stopped|started|changed|fixed|indexed|refactored|rewrote|raised|bootstrapped|launched|shipped)\b/i.test(post);
  const hasMoney = /\$|\bmrr\b|\barr\b|\brevenue\b|\bprofit\b|\bsalary\b/i.test(post);
  const hasTimeframe = /\b\d+ (day|week|month|year|hour|minute)/i.test(post);

  let specificityScore = 0;
  if (hasNumber) specificityScore += 15;
  if (hasSpecificTool) specificityScore += 10;
  if (hasSpecificAction) specificityScore += 10;
  if (hasMoney) specificityScore += 10;
  if (hasTimeframe) specificityScore += 10;

  if (specificityScore < 15) {
    issues.push("not specific enough — add a concrete number, tool, timeframe, or dollar amount");
    score -= 15;
  } else {
    score += specificityScore;
  }

  // 5. Check hook quality — first line should be 4-6 words, under 40 chars
  const firstLine = post.split("\n")[0];
  const firstLineWords = firstLine.split(/\s+/).length;
  const firstLineChars = firstLine.length;

  if (firstLineWords > 10) {
    issues.push(`hook is too long (${firstLineWords} words) — cut to 4-6 words`);
    score -= 8;
  }
  if (firstLineChars > 80) {
    issues.push(`hook is too long (${firstLineChars} chars) — cut to under 40 chars for +46% engagement`);
    score -= 5;
  }

  // 6. Check for weak openers
  const weakOpeners = ["excited to share", "thrilled to announce", "happy to share", "we just launched", "i'm excited", "today i want to", "i wanted to share", "let me tell you about", "here are some thoughts", "thoughts on"];
  for (const weak of weakOpeners) {
    if (text.startsWith(weak)) {
      issues.push(`weak opener: "${weak}" — start with a contrarian claim or specific number instead`);
      score -= 15;
    }
  }

  // 7. Check for links in body (algorithm penalty)
  if (/https?:\/\//i.test(post)) {
    issues.push("link in body — X demotes this. Move to first reply.");
    score -= 20;
  }

  // 8. Check for reply trigger (reply = 5.0 + 15.0 mutual boost)
  const hasReplyTrigger = /\?/.test(post) || /\b(agree|disagree|thoughts|take|opinion|what's your|change my mind)\b/i.test(post);
  if (!hasReplyTrigger) {
    issues.push("no reply trigger — add a question or 'agree or disagree?' to capture the reply signal (5.0 + 15.0 mutual boost)");
    score -= 8;
  }

  // 9. Check for share cue (share_via_copy_link = 20.0 — KING signal)
  const hasShareCue = /\b(save this|send this|share this|bookmark|forward|copy|pass this)\b/i.test(post);
  if (!hasShareCue) {
    // Only flag for listicle/educational posts, not confessions
    if (/\b(\d|things|rules|lessons|ways|steps|how to)\b/i.test(post)) {
      issues.push("no share cue — add 'save this' or 'send this to someone who needs it' to capture copy-link shares (20.0 — KING signal)");
      score -= 8;
    }
  }

  // 10. Check for all-caps (algorithm penalty)
  const capsRatio = (post.match(/[A-Z]/g) || []).length / Math.max(1, post.length);
  if (capsRatio > 0.3 && post.length > 50) {
    issues.push("too much all-caps — X demotes this. Use caps for one word max.");
    score -= 10;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    issues,
    goodParts,
    isSlop: slopCount > 2 || score < 30,
    specificityScore,
    slopCount,
    vagueCount,
  };
}

// ---------------------------------------------------------------------------
// Fix slop — replace generic phrases with specific alternatives
// ---------------------------------------------------------------------------

const SLOP_FIXES = {
  "fundamentals matter": "the first 5 minutes of your onboarding matter",
  "fundamentals beat": "a 60-second demo beats a 10-page landing page",
  "the boring work": "answering support tickets within 5 minutes",
  "done > perfect": "shipped today beats perfect next month",
  "ship and iterate": "ship the ugly version, fix it based on real complaints",
  "consistency is key": "showing up 4x a week for 6 months beats 7x a week for 2 weeks",
  "momentum > motivation": "one action today beats 10 plans for tomorrow",
  "show up daily": "show up 4x a week — that's enough if you don't quit",
  "the real skill": "the skill that actually matters: saying no to features",
  "the real leverage": "the leverage is in the thing you're avoiding",
  "nail the basics": "fix your onboarding flow. that's the basics.",
  "your first 100": "your first 10 paying customers who aren't your friends",
  "tuition not failure": "data on what doesn't work, not failure",
  "80% psychology": "80% of churn happens in the first 7 days",
  "20% tactics": "20% is the actual product",
};

function fixSlop(post) {
  let fixed = post;
  for (const [slop, fix] of Object.entries(SLOP_FIXES)) {
    const regex = new RegExp(slop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    fixed = fixed.replace(regex, fix);
  }
  return fixed;
}

module.exports = {
  check,
  fixSlop,
  SLOP_PHRASES,
  GOOD_PATTERNS,
  SLOP_FIXES,
};
