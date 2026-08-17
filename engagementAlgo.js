/*
 * X / Twitter Engagement Algorithm — 2026 edition (JavaScript port).
 *
 * Pure scoring engine built from X's open-sourced ranking weights + 2026
 * engagement research. No external dependencies.
 *
 * The X For-You algorithm is a weighted sum of predicted engagement
 * probabilities. The dominant signal is a *reply that the author replies
 * back to* (+75 = 150x a like). So an "engaging" post maximizes the
 * probability of a reply chain while avoiding negative signals (external
 * links, all-caps, self-promotional openers) that demote a post before it
 * gets a chance.
 *
 * See reference/engagement_algo.py for the original + RESEARCH.md for citations.
 */

"use strict";

const { predictSignals } = require("./signalModel");

// ---------------------------------------------------------------------------
// Reference constants
// ---------------------------------------------------------------------------
const ALGO_WEIGHTS = {
  // REAL xai-org/x-algorithm weights (param.rs, sync 2026-08-12)
  share_via_copy_link: 20.0,   // 40× a like — KING signal (off-platform share)
  reply: 5.0,                  // 10× — ReplyWeight
  share_via_dm: 5.0,           // 10× — ShareViaDmWeight
  quote: 5.0,                  // 10× — QuoteWeight
  follow_author: 4.0,           // 8× — FollowAuthorWeight
  share: 2.0,                  // 4× — ShareWeight
  retweet: 1.0,                // 2× — RetweetWeight
  favorite: 0.5,               // 1× — FavoriteWeight (baseline)
  click: 0.4,                  // 0.8× — ClickWeight
  open_link: 0.2,              // 0.4× — OpenLinkWeight
  photo_expand: 0.05,          // 0.1× — PhotoExpandWeight
  video_open: 0.05,            // 0.1× — VideoOpenWeight
  vqv: 0.05,                   // 0.1× — VqvWeight
  cont_dwell_time: 0.004,      // 0.008× — ContDwellTimeWeight
  profile_click: 0.0,          // 0× — ProfileClickWeight (ZERO!)
  dwell: 0.0,                  // 0× — DwellWeight (ZERO!)
  // Negative
  report: -234.0,              // -468× — ReportWeight (nuclear)
  mute_author: -58.8,          // -117.6× — MuteAuthorWeight (worse than block!)
  not_interested: -43.2,       // -86.4× — NotInterestedWeight
  block_author: -31.2,         // -62.4× — BlockAuthorWeight
  not_dwelled: -0.02,          // -0.04× — NotDwelledWeight (tiny)
  // Bidirectional follow boost (adds to reply for mutuals)
  bidirectional_follow_reply_boost: 15.0,
};

const LENGTH_SWEET = [71, 100];
const LENGTH_STRONG = [100, 200];
const LENGTH_OK = [200, 280];
const LENGTH_LONG = [280, 4000];

const FIRST_LINE_WORD_SWEET = [4, 6];
const FIRST_LINE_CHAR_BONUS_UNDER = 40;

const WEAK_OPENERS = [
  "excited to share", "thrilled to announce", "we just launched",
  "happy to share", "proud to announce", "i am excited", "i'm excited",
  "delighted to share", "pleased to announce", "just shipped",
  "big news", "here is my", "here's my", "wanted to share",
  "i wanted to share", "thought i'd share", "thought i would share",
  "a quick thread", "let me share", "let's talk about",
  // Generic motivation / vague claims
  "feeling incredibly grateful", "feeling grateful", "feeling blessed",
  "never give up", "keep building", "keep shipping", "keep believing",
  "ai is going to change", "ai is going to revolutionize",
  "i just built something amazing", "i just built something incredible",
  "this is going to be big", "this is going to disrupt",
  "today i woke up", "today was a good day",
  "here are 5 tips", "here are 3 tips", "here are some tips",
  "hope this helps", "if you're not using",
  "after months of building", "after 3 months", "after months of hard work",
];

// [name, regex, baseScore]
const HOOK_FORMULAS = [
  ["contrarian", /\b(most people|everyone|they say|conventional|nobody|you've been told|you have been told)\b/i, 95],
  ["specific_number", /\b\d[\d,.]*\s?(%|k|m|x|hours?|days?|weeks?|months?|years?|minutes?|times?|people|users?|customers?|dollars?|\$|€|£)\b/i, 90],
  ["confession", /\b(i (almost|used to|was wrong|failed|hate|regret|wish i|mistake)|i was completely wrong|i was wrong)\b/i, 92],
  ["i_did_x_without_y", /\bwithout (a|any|the|writing|spending|raising|hiring|paying)\b/i, 88],
  ["you_dont_need", /\byou don't need|you do not need\b/i, 86],
  ["if_i_had_to_start_over", /\bif i had to (start|grow|do|build) (over|again|from zero)\b/i, 87],
  ["n_things_i_learned", /\b\d+ (things|lessons|ways|tips|mistakes) i\b/i, 84],
  ["cost_reveal", /\$[\d,]+/, 85],
  ["bold_prediction", /\b(in \d{4}|by next|will (be|replace|kill|die|win)|the end of|within \d)\b/i, 83],
  ["before_after", /\b(before|after|i used to|now i|then i|used to|now)\b/i, 78],
  ["open_loop", /\b(nobody told me|the one thing|the truth about|what nobody|here's what|here is what|this changed)\b/i, 88],
];

const URL_RE = /https?:\/\/\S+|www\.\S+|\S+\.(com|net|org|io|co|app|space|xyz|ai|dev)\b/i;
const URL_RE_GLOBAL = /https?:\/\/\S+|www\.\S+|\S+\.(com|net|org|io|co|app|space|xyz|ai|dev)\b/gi;
const WORD_RE = /[\w’']+/g;

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
function splitFirstLine(text) {
  const byNewline = text.split("\n")[0].trim();
  const m = byNewline.match(/[.!?](\s|$)/);
  if (m && m.index > 0) {
    const candidate = byNewline.slice(0, m.index).trim();
    if (candidate.length >= 3) return candidate;
  }
  return byNewline;
}

function wordCount(s) {
  const m = s.match(WORD_RE);
  return m ? m.length : 0;
}

function hasExternalLink(text) {
  const links = text.match(URL_RE_GLOBAL) || [];
  return [links.length > 0, links];
}

function allCapsRatio(text) {
  const letters = [...text].filter((c) => /[a-zA-Z]/.test(c));
  if (!letters.length) return 0.0;
  const upper = letters.filter((c) => c === c.toUpperCase()).length;
  return upper / letters.length;
}

function detectHooks(firstLine) {
  const found = [];
  for (const [name, pattern] of HOOK_FORMULAS) {
    if (pattern.test(firstLine)) found.push(name);
  }
  return found;
}

function analyze(text) {
  text = text.trim();
  const firstLine = splitFirstLine(text);
  const [hasLink, links] = hasExternalLink(text);
  const caps = allCapsRatio(text);
  const hasBreaks = text.includes("\n");
  const endsQ = text.trimEnd().endsWith("?");
  const opener = firstLine.toLowerCase().slice(0, 40);
  const hooks = detectHooks(firstLine).length ? detectHooks(firstLine) : detectHooks(text.slice(0, 120));
  const hasMedia = /\b(video|image|gif|clip|watch this|screenshot)\b/i.test(text);
  const isThread = /\b(\d+\/\d+|thread|🧵|a thread)\b/i.test(text) || (text.match(/\n\n/g) || []).length >= 3;
  const hasNumber = /\b\d[\d,.]*\b/.test(text);
  const hasReplyInvite = /\b(what'?s|do you|what do you|agree|disagree|tell me|reply with|drop your|your turn|thoughts\?)\b/i.test(text);
  return {
    text,
    charCount: text.length,
    wordCount: wordCount(text),
    firstLine,
    firstLineWords: wordCount(firstLine),
    firstLineChars: firstLine.length,
    hasExternalLink: hasLink,
    links,
    allCapsRatio: caps,
    hasLineBreaks: hasBreaks,
    endsWithQuestion: endsQ,
    opener,
    detectedHooks: hooks,
    hasMediaMention: hasMedia,
    isThread,
    hasNumber,
    hasReplyInvite,
  };
}

// ---------------------------------------------------------------------------
// Scoring dimensions
// ---------------------------------------------------------------------------
function scoreHook(a) {
  let s = 30.0;
  let note = "";

  // CASUAL ONE-LINER EXCEPTION: Real viral tweets (arra, Lego Kingo, Jake) are often
  // 15-30 word casual one-liners with no hook formula. Don't penalize them for length.
  // "Men used to go to war and now they sell b2b SaaS" = 11 words, no hook, 100k+ likes.
  // "i KNOW SaaS stands for software as a service but..." = 24 words, no hook, 10k+ likes.
  const isCasualOneLiner = !a.hasLineBreaks && a.charCount <= 200 && a.wordCount <= 35
    && a.text.charAt(0) === a.text.charAt(0).toLowerCase() && /[a-z]/.test(a.text.charAt(0));

  if (isCasualOneLiner) {
    // Casual one-liners don't need the 4-6 word hook — the whole tweet IS the hook.
    // Give them a decent score as long as they're not too long.
    if (a.wordCount <= 20) {
      s += 40;
      note = `casual one-liner (${a.wordCount} words) — the whole tweet is the hook`;
    } else if (a.wordCount <= 30) {
      s += 30;
      note = `casual one-liner (${a.wordCount} words) — relatable humor drives engagement`;
    } else {
      s += 15;
      note = `casual one-liner (${a.wordCount} words) — a bit long but authentic`;
    }
    // Casual one-liners with humor/relatability get a bonus
    if (/\b(know|but|every|nobody|always|never|keep|still|just|literally|actually)\b/i.test(a.text)) {
      s += 15;
      note += "; relatable/humorous tone";
    }
  } else if (a.firstLineWords >= FIRST_LINE_WORD_SWEET[0] && a.firstLineWords <= FIRST_LINE_WORD_SWEET[1]) {
    s += 35;
    note = `first line ${a.firstLineWords} words (sweet spot 4-6)`;
  } else if (a.firstLineWords <= 10) {
    s += 18;
    note = `first line ${a.firstLineWords} words (ok, aim 4-6)`;
  } else {
    // FOUNDER STORY EXCEPTION: Founder story hooks are naturally 10-15 words
    // because they contain a full narrative arc (who + what + result).
    // "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months" = 14 words
    // Don't penalize them — the specificity IS the hook.
    const hasFounderHook = /\b(bootstrapped|sold it for|raised \$|built.*in \d+|went from \$0|had \d+ paying|turned down \$|spent \$\d+k)/i.test(a.firstLine);
    if (hasFounderHook && a.firstLineWords <= 20) {
      s += 25;
      note = `founder story hook (${a.firstLineWords} words) — the specificity IS the hook`;
    } else {
      note = `first line ${a.firstLineWords} words (too long — cut to 4-6)`;
    }
  }
  if (a.firstLineChars <= FIRST_LINE_CHAR_BONUS_UNDER) s += 15;
  else if (a.firstLineChars <= 60) s += 6;
  if (a.detectedHooks.length) {
    s += 20;
    note += `; hook: ${a.detectedHooks.join(", ")}`;
  } else {
    note += "; no recognized hook formula";
  }

  // 2026: penalize boring/generic openers that wouldn't stop the scroll
  const fl = a.firstLine.toLowerCase();
  const boringOpeners = [
    "the new year", "today i worked", "today i started", "just hit a big",
    "here are ", "here is ", "so today", "this week i", "this month i",
    "i am excited", "excited to share", "i am happy", "i am proud",
    "i wanted to share", "just wanted to", "i think this",
  ];
  if (boringOpeners.some((op) => fl.startsWith(op))) {
    s -= 30;
    note += "; BORING OPENER — first 2 words don't stop the scroll";
  }
  // 2026: bonus for scroll-stopping openers
  const strongOpeners = [
    /^(i quit|i failed|i made \$|i built|i shipped|i killed|claude just|ai just)/i,
    /^(waiting room|plastic chairs|bad coffee|i met him|the kinda)/i,
    /^(everyone'?s arguing|everyone'?s talking|most (people|creators|apps))/i,
    /^(hey codex|hey claude|hey gpt)/i,
    /^(a cat|a dog|a baby|a kid)/i,
    /^(my app crossed|my saas crossed|my product crossed)/i,
    /^(found a guy|stumbled|came across)/i,
    /^(here'?s a 16|here'?s a \d+)/i,
    /^(today was my last)/i,
    /^(this guy doesn'?t)/i, // RUX blueprint opener
    /^(2026 was|2025 was|2024 was)/i, // year reflection opener
    /^(it worked|shipped it)/i, // punchy short openers
    /^(i wrote a guide)/i, // lead-gen DM bait opener
    /^(alright,? it'?s finally)/i, // giveaway opener
    /^(why do |why does |why are |why is |why don'?t )/i, // question hooks
    /^(how do |how does |what if |what happens when)/i, // question hooks
    /^(men used to|people used to|our ancestors)/i, // Jake-style absurd contrast
    /^(founder:|me:|investor:|ceo:)/i, // George Pu-style dialogue
  ];
  if (strongOpeners.some((re) => re.test(a.firstLine))) {
    s += 30; // strong opener bonus — overrides the long-line penalty
    note += "; STRONG OPENER — first 2 words stop the scroll";
  }

  // Question hooks (first line is a question) get a bonus — they create curiosity
  // But questions at the END of a post (without a recognized hook) get penalized
  if (a.endsWithQuestion && !a.detectedHooks.length && !a.firstLine.endsWith("?")) {
    s -= 10;
    note += "; ends on a question (statements outperform 7x)";
  }
  return [Math.min(100, Math.max(0, s)), note];
}

function scoreLength(a) {
  const n = a.charCount;
  if (n >= LENGTH_SWEET[0] && n <= LENGTH_SWEET[1]) return [100, `${n} chars (sweet spot 71-100)`];
  if (n > LENGTH_STRONG[0] && n <= LENGTH_STRONG[1]) return [88, `${n} chars (strong 100-200)`];
  if (n < LENGTH_SWEET[0]) {
    if (n < 50) return [45, `${n} chars (too thin — add a specific detail)`];
    return [70, `${n} chars (a bit short — aim 71-100)`];
  }
  if (n > LENGTH_OK[0] && n <= LENGTH_OK[1]) {
    // FOUNDER STORIES in the 200-280 range are well-formatted narratives
    const isFounderStory = /\b(built|mrr|arr|churn|profitable|users|customers|bootstrapped|sold|raised|pivoted|niched)/i.test(a.text);
    if (isFounderStory && a.hasLineBreaks) return [78, `${n} chars (founder story — well-formatted narrative)`];
    return [65, `${n} chars (dense — can you cut the first sentence?)`];
  }
  // Long-form posts (200-500) can work well with line breaks and viral format
  // FOUNDER STORIES are naturally 200-400 chars — don't penalize them.
  if (n > LENGTH_LONG[0] && n <= 500) {
    const isFounderStory = /\b(bootstrapped|sold it for|raised \$|built.*in \d+|went from \$0|had \d+ paying|turned down \$|spent \$\d+k|mrr|arr|churn)/i.test(a.text);
    if (isFounderStory && a.hasLineBreaks) return [80, `${n} chars (founder story — well-formatted with breaks)`];
    if (a.hasLineBreaks) return [68, `${n} chars (long but well-formatted with breaks)`];
    return [55, `${n} chars (long post — only works if every word earns space)`];
  }
  if (n > 500 && n <= 1000) return [50, `${n} chars (very long — only works with exceptional formatting)`];
  return [40, `${n} chars (very long — consider a thread)`];
}

function scoreReplyPotential(a) {
  let s = 40.0;
  const notes = [];
  const opinionated = ["contrarian", "confession", "bold_prediction", "you_dont_need"];
  if (a.detectedHooks.length && a.detectedHooks.some((h) => opinionated.includes(h))) {
    s += 30;
    notes.push("opinionated take invites replies");
  }
  if (a.hasReplyInvite) {
    s += 15;
    notes.push("explicit reply invitation");
  }
  if (a.detectedHooks.includes("open_loop")) {
    s += 10;
    notes.push("open loop drives conversation clicks");
  }
  if (a.hasNumber) s += 5;
  if (a.charCount <= 200) s += 5;
  // 2026: credibility line boosts reply potential
  if (/\b(i'?ve done|i'?ve helped|i'?ve worked with|for \d+\+|years? of)\b/i.test(a.text)) {
    s += 10;
    notes.push("credibility line builds trust → more replies");
  }

  // HUMOR/RELATABILITY drives replies — real viral tweets (arra, Jake, levelsio)
  // get tons of replies because people relate and want to add their own take.
  // This is NOT a CTA — it's organic engagement from relatable content.
  const isCasualOneLiner = !a.hasLineBreaks && a.charCount <= 200 && a.wordCount <= 35
    && a.text.charAt(0) === a.text.charAt(0).toLowerCase() && /[a-z]/.test(a.text.charAt(0));
  if (isCasualOneLiner) {
    s += 25;
    notes.push("casual relatable post — people reply to add their own experience");
  }

  // Humor signals — absurd comparisons, self-deprecation, relatable frustrations
  const hasHumor = /\b(know|but|every|nobody|always|never|keep|still|just|literally|actually|used to|annoying|worst part|hate|kills me)\b/i.test(a.text);
  const hasAbsurdity = /\b(war|youtube poop|jalebi|saas|b2b|literally|actually|just|only|still)\b/i.test(a.text);
  if (hasHumor && a.charCount < 200) {
    s += 15;
    notes.push("humor/relatability drives organic replies");
  }

  // FOUNDER STORIES — "I built a SaaS...", "2 unemployed friends bootstrapped..."
  // These drive replies because people want to know: what was the product?
  // How did you get users? What would you do differently? The curiosity drives engagement.
  const hasFounderStory = /\b(i built|i raised|i turned down|i spent.*on ads|i had \d+ paying|i went from \$0|bootstrapped|sold it for|\d+ (unemployed|friends|months|days|weeks|years))\b/i.test(a.text);
  const hasSpecificOutcome = /\$[\dkm]+|\d+k?\s*(mrr|arr|revenue|users|customers|months|days)/i.test(a.text);
  if (hasFounderStory && hasSpecificOutcome) {
    s += 30;
    notes.push("founder story with specific numbers — curiosity drives replies (what was the product?)");
  }

  // Relatable frustrations (levelsio-style) drive replies
  if (/\b(annoying|worst part|hate|frustrating|kills me|biggest pain|most annoying)\b/i.test(a.text)) {
    s += 20;
    notes.push("relatable frustration — people reply to commiserate");
  }

  // ABSURD CONTRAST — Jake-style: "Men used to go to war and now they sell b2b SaaS"
  // These are short, punchy, and get 100k+ likes. The humor IS the reply trigger.
  const hasAbsurdContrast = /\b(used to\b.+\bnow (they|we)\b|men used to|people used to|our ancestors)/i.test(a.text);
  if (hasAbsurdContrast && a.wordCount <= 20) {
    s += 35;
    notes.push("absurd historical contrast — massive reply/quote-tweet driver (Jake-style)");
  }

  // DIALOGUE FORMAT — George Pu-style: "Founder: '...' Me: ..."
  // The dialogue creates tension and invites people to take a side.
  if (/^\w+:\s*["'].*["']\s*\n\s*\n\s*Me:/i.test(a.text)) {
    s += 30;
    notes.push("dialogue format — creates tension, drives replies and quote-tweets (George Pu-style)");
  }

  if (!notes.length) notes.push("neutral — nothing provokes a reply");
  return [Math.min(100, s), notes.join("; ")];
}

function scoreLinkPenalty(a) {
  if (a.hasExternalLink) {
    return [25, `external link detected ${a.links.slice(0, 2)} — X demotes link posts; put link in reply`];
  }
  return [100, "no external link in post body"];
}

function scoreFormatting(a) {
  let s = 70.0;
  const notes = [];
  if (a.allCapsRatio > 0.45) {
    s -= 35;
    notes.push("too much ALL-CAPS — algorithm pushes down");
  } else if (a.allCapsRatio > 0.3) {
    s -= 15;
    notes.push("moderate caps — tone it down");
  }

  // CASUAL POST BONUS: Short, conversational, no-line-break posts get a bonus
  // because real viral tweets (arra, Lego Kingo, etc.) are often one casual sentence.
  // The algorithm penalizes "no line breaks" but real engagement data shows
  // casual one-liners go viral. Don't force structure onto every post.
  const isCasual = a.charCount <= 200 && !a.hasLineBreaks && a.wordCount <= 30;
  const isLowercaseCasual = isCasual && a.text.charAt(0) === a.text.charAt(0).toLowerCase() && a.allCapsRatio < 0.1;

  if (isLowercaseCasual) {
    s += 25;
    notes.push("casual lowercase one-liner — authentic, relatable, high viral potential");
  } else if (isCasual) {
    s += 10;
    notes.push("short casual post — authentic voice drives engagement");
  } else if (a.hasLineBreaks) {
    s += 20;
    notes.push("line breaks improve scanability");
  } else {
    notes.push("no line breaks — break into 2-3 short lines OR keep it as a casual one-liner");
  }
  return [Math.min(100, Math.max(0, s)), notes.join("; ")];
}

function scoreSpecificity(a) {
  if (a.hasNumber) return [90, "contains a number — specific beats clever"];
  // Check for other forms of specificity: named entities, specific tools, specific products
  const hasNamedEntity = /\b(notion|figma|stripe|vercel|linear|react|next\.js|typescript|javascript|python|github|autoeditor|chatgpt|openai|elon|twitter|youtube|reddit)\b/i.test(a.text);
  const hasSpecificClaim = /\b(i (keep seeing|just don't|spent|tried|built|shipped|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained))\b/i.test(a.text);
  if (hasNamedEntity) return [82, "names a specific entity — concrete beats abstract"];
  if (hasSpecificClaim) return [75, "personal specific claim — authentic voice drives replies"];
  return [55, "no numbers — add a specific figure (time, %, $, count) or name a specific tool/person"];
}

function scoreOpener(a) {
  for (const w of WEAK_OPENERS) {
    if (a.opener.startsWith(w) || a.opener === w) {
      return [20, `weak opener '${w}' — leads with you, not the reader; rewrite the first line`];
    }
  }
  // Bonus for question hooks — they create curiosity and drive replies
  if (a.opener.endsWith("?") && a.firstLineWords <= 10) {
    return [95, "question hook — creates curiosity and drives replies"];
  }
  return [90, "opener is not a known weak/self-promotional pattern"];
}

function scoreFocus(a) {
  const sentences = a.text.split(/[.!?]+/).filter((s) => s.trim());
  if (sentences.length <= 3 && a.charCount <= 280) return [90, "tight, single idea"];
  if (a.charCount <= 400) return [70, "mostly focused"];
  return [50, "risks doing too much — one idea per post"];
}

function scoreMedia(a) {
  if (a.hasMediaMention) return [85, "media referenced — video watched >50% gets a boost"];
  if (a.isThread) return [80, "thread format — drives saves & follows"];
  return [65, "text-only — consider native video or image (media converts harder)"];
}

// Authenticity scoring — penalizes formulaic AI-generated patterns.
// Real viral tweets (arra, Lego Kingo, levelsio, Tibo) NEVER have:
// - "send this to someone who needs it"
// - "what's your version of this?"
// - "nobody wants to hear this."
// - Multiple share cues + CTAs stacked together
// This dimension rewards posts that sound HUMAN and penalizes posts that sound AI-generated.
function scoreAuthenticity(a) {
  let s = 80.0;
  const notes = [];
  const text = a.text;

  // FORMULAIC PHRASES — each one is a sign of AI-generated content
  const formulaicPhrases = [
    "send this to someone who needs it",
    "what's your version of this",
    "what's the part you disagree with",
    "where am i wrong",
    "nobody wants to hear this",
    "save this.",
    "bookmark this.",
    "screenshot this for later",
    "pass this to someone",
    "if this was useful, send it",
    "what would you add to this",
    "does this match your experience",
    "has this happened to you",
    "what would you have done differently",
    "i learned this the hard way",
    "the math is simple. nobody does it",
    "the science backs this up",
    "every founder i know says the same thing",
    "nobody talks about this. everyone should",
  ];

  let formulaicCount = 0;
  for (const phrase of formulaicPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      formulaicCount++;
    }
  }

  // PENALIZE: Each formulaic phrase reduces authenticity
  // 0 phrases = perfect, 1 = penalty, 2+ = heavy penalty, 3+ = devastating
  if (formulaicCount === 0) {
    s += 20;
    notes.push("no formulaic phrases — sounds human");
  } else if (formulaicCount === 1) {
    s -= 15;
    notes.push("1 formulaic phrase — AI-sounding");
  } else if (formulaicCount === 2) {
    s -= 35;
    notes.push("2 formulaic phrases — obviously AI-generated");
  } else if (formulaicCount >= 3) {
    s -= 60;
    notes.push(`${formulaicCount} formulaic phrases — readers will instantly spot this as AI`);
  }

  // BONUS: Casual lowercase posts sound more human (like arra, Lego Kingo)
  const isLowercaseStart = text.charAt(0) === text.charAt(0).toLowerCase() && /[a-z]/.test(text.charAt(0));
  if (isLowercaseStart && a.charCount < 200) {
    s += 10;
    notes.push("casual lowercase — authentic voice");
  }

  // BONUS: Posts with NO CTA and NO share cue sound more authentic
  const hasAnyCTA = /\b(what'?s your|where am i wrong|change my mind|fight me|prove me wrong|screenshot this in|what would you add|does this match|has this happened|what would you have done)\b/i.test(text);
  const hasAnyShareCue = /\b(save this|send this|bookmark this|screenshot this|pass this|forward this)\b/i.test(text);
  if (!hasAnyCTA && !hasAnyShareCue) {
    s += 15;
    notes.push("no CTA/share cue — content speaks for itself (like real viral tweets)");
  } else if (hasAnyCTA && hasAnyShareCue) {
    s -= 15;
    notes.push("both CTA + share cue — over-optimized, screams AI");
  }

  // PENALIZE: "nobody wants to hear this" as an opener — it's the #1 AI tell
  if (/^nobody wants to hear this/i.test(text)) {
    s -= 15;
    notes.push("'nobody wants to hear this' opener — #1 AI-generated tell");
  }

  // PENALIZE: Stacked generic lines (save this + send this + what's your version)
  const stackCount = (text.match(/save this|send this|what's your version|what's the part|where am i wrong/gi) || []).length;
  if (stackCount >= 2) {
    s -= 20;
    notes.push(`${stackCount} stacked generic lines — formulaic`);
  }

  return [Math.min(100, Math.max(0, s)), notes.join("; ")];
}

// Viral format detection — checks if the post matches a real viral template
// from the research (Nevo, Leo, ChatCSV, RalphBlaster, Fieldy, etc).
// This is the key 2026 upgrade: posts matching proven formats score higher.
let _viralTemplates = null;
function _getViralTemplates() {
  if (!_viralTemplates) {
    try { _viralTemplates = require("./viralTemplates"); } catch { _viralTemplates = null; }
  }
  return _viralTemplates;
}

function scoreViralFormat(a) {
  const vt = _getViralTemplates();
  if (!vt) return [70, "viral format detection unavailable"];
  const match = vt.detectFormat(a.text);
  if (!match || match.confidence < 0.3) {
    return [45, "no proven viral format detected — rewrite into a known template (contrarian take, MRR reveal, demo+absurd, failure list)"];
  }
  const { template, confidence } = match;
  const score = 50 + confidence * 50; // 0.3→65, 0.5→75, 0.8→90, 1.0→100
  const note = `matches "${template.name}" format (${Math.round(confidence * 100)}% confidence)`;
  return [Math.min(100, score), note];
}

// Signal-model dimension — uses the 22-signal Phoenix model to predict
// actual engagement probabilities (likes, replies, dwell, bookmarks, etc).
// This is the "does the algo actually push this?" check.
function scoreSignalModel(a) {
  try {
    const pred = predictSignals(a);
    // Use the normalized score from the signal model (0-100)
    const s = pred.normalizedScore;
    const top = pred.topPositive.slice(0, 2).map((t) => `${t.signal} ${(t.probability * 100).toFixed(0)}%`).join(", ");
    const neg = pred.topNegative.length ? ` | risks: ${pred.topNegative.map((t) => t.signal).join(", ")}` : "";
    return [s, `predicted: ${top}${neg}`];
  } catch {
    return [70, "signal model unavailable"];
  }
}

const DIMENSION_WEIGHTS = [
  ["hook", 0.15, scoreHook],
  ["authenticity", 0.14, scoreAuthenticity],
  ["reply_potential", 0.12, scoreReplyPotential],
  ["viral_format", 0.10, scoreViralFormat],
  ["signal_model", 0.10, scoreSignalModel],
  ["length", 0.07, scoreLength],
  ["link_penalty", 0.07, scoreLinkPenalty],
  ["opener", 0.06, scoreOpener],
  ["formatting", 0.05, scoreFormatting],
  ["specificity", 0.05, scoreSpecificity],
  ["focus", 0.05, scoreFocus],
  ["media", 0.04, scoreMedia],
];

function gradeFromScore(score) {
  if (score >= 92) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 62) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
}

function verdict(score, a) {
  if (a.hasExternalLink) return "Link in the body is killing this before it starts — move it to a reply.";
  if (score >= 85) return "This is built to be replied to. Post it Tue-Thu 8-11am ET.";
  if (score >= 70) return "Solid bones. Tighten the hook and it competes.";
  if (score >= 55) return "Readable but scroll-pastable. The first line isn't earning line two.";
  return "The algorithm will read this as 'no one cares' within an hour. Rewrite the hook.";
}

function scorePost(text) {
  const a = analyze(text);
  const breakdown = [];
  const problems = [];
  const strengths = [];
  const signals = [];

  for (const [dim, weight, scorer] of DIMENSION_WEIGHTS) {
    const [s, note] = scorer(a);
    breakdown.push({ dimension: dim, score: Math.round(s * 10) / 10, weight, note });
    if (s < 50) problems.push(`[${dim}] ${note}`);
    else if (s >= 85) strengths.push(`[${dim}] ${note}`);
  }

  const dimensionScore = breakdown.reduce((acc, b) => acc + b.score * b.weight, 0);

  // The signal_model dimension already blends the 22-signal Phoenix model into
  // the composite. We also expose the full model in the return for the API/UI.
  const signalModel = predictSignals(a);
  const composite = dimensionScore;

  if (a.hasExternalLink) signals.push("move the link to the first reply — keep the post body link-free");
  if (!a.detectedHooks.length && a.charCount > 80) signals.push("rewrite line 1 as a contrarian claim or a specific number (4-6 words)");
  if (a.firstLineWords > 6 && a.charCount > 100) signals.push("cut the first line to 4-6 words (or keep it as a casual one-liner)");
  if (!a.hasNumber && !/\b(notion|figma|stripe|vercel|linear|react|typescript|python|github|autoeditor)\b/i.test(a.text)) signals.push("add one oddly-specific number (%, $, count, or time) OR name a specific tool");
  if (!a.hasLineBreaks && a.charCount > 200) signals.push("break into 2-3 short lines with blank lines between (or shorten to a casual one-liner)");
  if (!a.hasReplyInvite && a.charCount < 280 && a.charCount > 100) signals.push("end with a reply trigger ('agree or disagree?', 'what's your take?') — or keep it as a bold statement with no CTA");
  if (WEAK_OPENERS.some((w) => a.opener.includes(w))) signals.push("kill the self-promotional opener — lead with the reader's tension");
  if (a.allCapsRatio > 0.3) signals.push("drop the all-caps — algorithm penalizes it");
  if (!a.hasMediaMention && !a.isThread) signals.push("attach native video or image — media converts harder");
  if (!a.isThread && a.charCount > 280) signals.push("split into a thread — long single posts stall");

  // viral format recommendation
  const vt = _getViralTemplates();
  if (vt) {
    const match = vt.detectFormat(a.text);
    if (!match || match.confidence < 0.5) {
      const rec = vt.recommendFormat(a.text);
      if (rec) signals.push(`rewrite as "${rec.name}" format — ${rec.why.slice(0, 60)}`);
    }
  }

  // Signal-model-driven signals (from the REAL xai-org/x-algorithm layer)
  const topNeg = signalModel.topNegative[0];
  if (topNeg && topNeg.contribution < -5.0) {
    if (topNeg.signal === "not_dwelled") signals.push("hook is too weak — the algo predicts high not-dwelled rate (scroll-past)");
    if (topNeg.signal === "not_interested") signals.push("engagement bait / self-promo detected — triggers 'not interested' (-86x)");
    if (topNeg.signal === "mute_author") signals.push("content feels spammy/repetitive — triggers mute (-117x, worse than block!)");
    if (topNeg.signal === "report") signals.push("content may trigger reports (-468x — nuclear)");
  }
  // share_via_copy_link is the KING signal (20.0 = 40× a like)
  const copyLinkSig = signalModel.signals.find((s) => s.signal === "share_via_copy_link");
  if (copyLinkSig && copyLinkSig.probability < 0.1) {
    signals.push("make it share-worthy off-platform — share_via_copy_link is the #1 signal (40× a like)");
  }
  const bookmarkSig = signalModel.signals.find((s) => s.signal === "bookmark");
  if (bookmarkSig && bookmarkSig.probability < 0.15 && a.charCount > 100) {
    signals.push("make it save-worthy — add a numbered list or actionable framework to trigger bookmarks");
  }
  const followSig = signalModel.signals.find((s) => s.signal === "follow_author");
  if (followSig && followSig.probability < 0.1 && a.isThread) {
    signals.push("add a 'I post about X — follow for more' line to convert thread readers to followers (8×)");
  }
  const replySig = signalModel.signals.find((s) => s.signal === "reply");
  if (replySig && replySig.probability < 0.15) {
    signals.push("end with a reply trigger — replies are 10× a like, and reply chains unlock the +15× mutual boost");
  }
  const quoteSig = signalModel.signals.find((s) => s.signal === "quote");
  if (quoteSig && quoteSig.probability < 0.1) {
    signals.push("make it quotable — quote-tweets are 10× a like (contrarian takes, hot opinions)");
  }

  return {
    score: Math.round(composite * 10) / 10,
    grade: gradeFromScore(composite),
    breakdown,
    problems,
    strengths,
    signalsToAdd: signals,
    analysis: a,
    verdict: verdict(composite, a),
    // New: REAL 22-signal Phoenix model with official xai-org/x-algorithm weights
    signalModel: {
      signals: signalModel.signals,
      positiveSum: signalModel.positiveSum,
      negativeSum: signalModel.negativeSum,
      algoScore: signalModel.algoScore,
      normalizedScore: signalModel.normalizedScore,
      realScore: signalModel.realScore,
      topPositive: signalModel.topPositive,
      topNegative: signalModel.topNegative,
      predictedEngagementRate: signalModel.predictedEngagementRate,
      engagementTier: signalModel.engagementTier,
      engagementBenchmarks: signalModel.engagementBenchmarks,
      predictedDwellSeconds: signalModel.predictedDwellSeconds,
      isThreadRecommended: signalModel.isThreadRecommended,
      goldenHour: signalModel.goldenHour,
    },
    dimensionScore: Math.round(dimensionScore * 10) / 10,
  };
}

function comparePosts(aText, bText) {
  const ra = scorePost(aText);
  const rb = scorePost(bText);
  let winner, margin;
  if (ra.score > rb.score) { winner = "A"; margin = Math.round((ra.score - rb.score) * 10) / 10; }
  else if (rb.score > ra.score) { winner = "B"; margin = Math.round((rb.score - ra.score) * 10) / 10; }
  else { winner = "tie"; margin = 0.0; }
  return {
    a: ra,
    b: rb,
    winner,
    margin,
    summary: winner !== "tie" ? `Post ${winner} wins by ${margin} pts` : "Dead tie — both need work.",
  };
}

module.exports = {
  scorePost, comparePosts, analyze,
  ALGO_WEIGHTS, DIMENSION_WEIGHTS, HOOK_FORMULAS, WEAK_OPENERS,
  URL_RE, URL_RE_GLOBAL, WORD_RE, gradeFromScore,
};
