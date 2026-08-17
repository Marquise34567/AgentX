/*
 * Voice profile — fingerprints an author's writing style from sample posts.
 *
 * Extracts statistical + stylistic features that define how someone writes:
 * sentence length, punctuation habits, emoji usage, hook patterns,
 * vocabulary richness, formatting preferences, tone markers.
 *
 * The profile is consumed by aiRewriter.js to produce rewrites that sound
 * like the author, not a template. This is the key differentiator vs. every
 * rule-based rewriter on the market.
 *
 * No external dependencies. Pure text analysis.
 */

"use strict";

const { analyze, HOOK_FORMULAS, WEAK_OPENERS } = require("./engagementAlgo");

// ---------------------------------------------------------------------------
// Profile extraction
// ---------------------------------------------------------------------------
function extractProfile(posts) {
  if (!posts || !posts.length) return null;

  const samples = posts.map((p) => String(p).trim()).filter(Boolean);
  if (!samples.length) return null;

  const analyses = samples.map(analyze);
  const allText = samples.join("\n\n");

  const profile = {
    sampleCount: samples.length,
    // Length distribution
    avgChars: avg(analyses.map((a) => a.charCount)),
    medianChars: median(analyses.map((a) => a.charCount)),
    charRange: [Math.min(...analyses.map((a) => a.charCount)), Math.max(...analyses.map((a) => a.charCount))],
    avgWords: avg(analyses.map((a) => a.wordCount)),
    avgFirstLineWords: avg(analyses.map((a) => a.firstLineWords)),
    avgFirstLineChars: avg(analyses.map((a) => a.firstLineChars)),
    // Formatting
    lineBreakUsage: analyses.filter((a) => a.hasLineBreaks).length / samples.length,
    avgParaCount: avg(analyses.map((a) => (a.text.match(/\n\n/g) || []).length + 1)),
    // Punctuation habits
    questionRate: analyses.filter((a) => a.endsWithQuestion).length / samples.length,
    avgQuestionsPerPost: avg(analyses.map((a) => (a.text.match(/\?/g) || []).length)),
    exclamationRate: (allText.match(/!/g) || []).length / samples.length,
    ellipsisUsage: (allText.match(/\.\.\./g) || []).length / samples.length,
    emDashUsage: (allText.match(/—/g) || []).length / samples.length,
    colonUsage: (allText.match(/:/g) || []).length / samples.length,
    // Caps
    avgCapsRatio: avg(analyses.map((a) => a.allCapsRatio)),
    // Hooks the author favors
    hookFrequency: countHooks(analyses),
    favoriteHooks: topN(countHooks(analyses), 3),
    // Openers to avoid (if author uses weak openers, note it)
    usesWeakOpeners: analyses.filter((a) => WEAK_OPENERS.some((w) => a.opener.includes(w))).length / samples.length,
    // Emoji
    emojiUsage: countEmojis(allText) / samples.length,
    emojiRate: countEmojis(allText) / Math.max(1, allText.length / 100),
    favoriteEmojis: topN(countEmojisByType(allText), 3),
    // Vocabulary
    vocabRichness: typeTokenRatio(allText),
    avgWordLength: avgWordLen(allText),
    // Specificity
    numberUsage: analyses.filter((a) => a.hasNumber).length / samples.length,
    // Reply invitations
    replyInviteRate: analyses.filter((a) => a.hasReplyInvite).length / samples.length,
    // Links
    linkUsage: analyses.filter((a) => a.hasExternalLink).length / samples.length,
    // Media mentions
    mediaMentionRate: analyses.filter((a) => a.hasMediaMention).length / samples.length,
    // Thread rate
    threadRate: analyses.filter((a) => a.isThread).length / samples.length,
    // Tone markers
    contrarianRate: analyses.filter((a) => a.detectedHooks.includes("contrarian")).length / samples.length,
    confessionRate: analyses.filter((a) => a.detectedHooks.includes("confession")).length / samples.length,
    personalStoryRate: analyses.filter((a) => /\b(i (was|used to|learned|realized|discovered|built|shipped|failed|tried|started)|my (first|last|biggest|worst|best))\b/i.test(a.text)).length / samples.length,
    // Signature phrases (n-grams that appear frequently)
    signaturePhrases: extractSignaturePhrases(samples),
    // First-person usage
    firstPersonRate: (allText.match(/\b(i|i'm|i've|i'll|my|me|myself)\b/gi) || []).length / Math.max(1, allText.split(/\s+/).length),
    // Second-person usage (addressing the reader)
    secondPersonRate: (allText.match(/\b(you|you're|you've|your|yourself)\b/gi) || []).length / Math.max(1, allText.split(/\s+/).length),
  };

  // Generate a human-readable voice description for the AI prompt
  profile.description = describeVoice(profile);

  return profile;
}

// ---------------------------------------------------------------------------
// Voice description — natural language summary for the LLM prompt
// ---------------------------------------------------------------------------
function describeVoice(p) {
  const parts = [];

  // Length
  if (p.avgChars < 100) parts.push("writes short, punchy posts (avg " + Math.round(p.avgChars) + " chars)");
  else if (p.avgChars > 250) parts.push("writes long-form posts (avg " + Math.round(p.avgChars) + " chars)");
  else parts.push("writes medium-length posts (avg " + Math.round(p.avgChars) + " chars)");

  // First line
  if (p.avgFirstLineWords <= 6) parts.push("uses short openers (" + Math.round(p.avgFirstLineWords) + " words on first line)");
  else parts.push("uses longer openers (" + Math.round(p.avgFirstLineWords) + " words on first line)");

  // Formatting
  if (p.lineBreakUsage > 0.6) parts.push("heavily uses line breaks and white space");
  else if (p.lineBreakUsage < 0.2) parts.push("rarely uses line breaks — writes in blocks");

  // Punctuation
  if (p.emDashUsage > 0.3) parts.push("frequently uses em-dashes (—)");
  if (p.colonUsage > 0.3) parts.push("uses colons to set up points");
  if (p.ellipsisUsage > 0.2) parts.push("uses ellipses (...) for pauses");
  if (p.exclamationRate > 0.5) parts.push("uses exclamation marks freely");
  if (p.questionRate > 0.4) parts.push("often ends with a question");

  // Hooks
  if (p.favoriteHooks.length) {
    parts.push("favors these hook types: " + p.favoriteHooks.map((h) => h[0].replace(/_/g, " ")).join(", "));
  }

  // Tone
  if (p.contrarianRate > 0.3) parts.push("frequently takes contrarian positions");
  if (p.confessionRate > 0.2) parts.push("uses confession/vulnerability as a hook");
  if (p.personalStoryRate > 0.4) parts.push("writes from personal experience");
  if (p.firstPersonRate > 0.06) parts.push("writes in first person heavily");
  if (p.secondPersonRate > 0.04) parts.push("directly addresses the reader ('you')");

  // Emoji
  if (p.emojiUsage > 0.5) parts.push("uses emoji frequently (" + (p.favoriteEmojis.length ? p.favoriteEmojis.map((e) => e[0]).join(" ") : "") + ")");
  else if (p.emojiUsage < 0.1) parts.push("rarely or never uses emoji");

  // Specificity
  if (p.numberUsage > 0.5) parts.push("frequently includes specific numbers");
  else if (p.numberUsage < 0.2) parts.push("rarely uses specific numbers");

  // Reply engagement
  if (p.replyInviteRate > 0.3) parts.push("actively invites replies");
  else if (p.replyInviteRate < 0.1) parts.push("rarely explicitly invites replies");

  // Signature phrases
  if (p.signaturePhrases.length) {
    parts.push("signature phrases: " + p.signaturePhrases.slice(0, 3).map((ph) => '"' + ph + '"').join(", "));
  }

  return parts.join("; ") + ".";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countHooks(analyses) {
  const counts = {};
  for (const a of analyses) {
    for (const h of a.detectedHooks) {
      counts[h] = (counts[h] || 0) + 1;
    }
  }
  return counts;
}

function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function countEmojis(text) {
  // Basic emoji detection — covers most common ranges
  const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  return (text.match(emojiRe) || []).length;
}

function countEmojisByType(text) {
  const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
  const counts = {};
  const matches = text.match(emojiRe) || [];
  for (const e of matches) counts[e] = (counts[e] || 0) + 1;
  return counts;
}

function typeTokenRatio(text) {
  const words = (text.toLowerCase().match(/[\w']+/g) || []);
  if (!words.length) return 0;
  const unique = new Set(words);
  return unique.size / words.length;
}

function avgWordLen(text) {
  const words = text.match(/[a-zA-Z]+/g) || [];
  if (!words.length) return 0;
  return avg(words.map((w) => w.length));
}

function extractSignaturePhrases(posts) {
  // Find 2-4 word n-grams that appear in multiple posts
  const ngramCounts = {};
  for (const post of posts) {
    const words = (post.toLowerCase().match(/[\w']+/g) || []);
    const seen = new Set();
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(" ");
        if (ngram.length < 8) continue;
        if (!seen.has(ngram)) {
          seen.add(ngram);
          ngramCounts[ngram] = (ngramCounts[ngram] || 0) + 1;
        }
      }
    }
  }
  // Phrases that appear in at least 2 posts (or 30% of posts if fewer samples)
  const threshold = Math.max(2, Math.ceil(posts.length * 0.3));
  return Object.entries(ngramCounts)
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase);
}

// ---------------------------------------------------------------------------
// Save / load profile (for persistence between sessions)
// ---------------------------------------------------------------------------
function serialize(profile) {
  return JSON.stringify(profile, null, 2);
}

function deserialize(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

module.exports = {
  extractProfile,
  describeVoice,
  serialize,
  deserialize,
};
