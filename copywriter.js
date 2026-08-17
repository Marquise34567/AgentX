/*
 * Copywriter — voice-aware senior copywriter engine. NO LLMs, NO third-party APIs.
 *
 * This is a pure-rule "style transfer" engine that takes a draft post and
 * rewrites it in the author's voice using:
 *
 *   1. Stylometric profiling (from voiceProfile.js)
 *      - sentence length, punctuation habits, emoji usage, hook style
 *      - first-person vs second-person, contrarian rate, confession rate
 *      - signature phrases (n-grams the author actually uses)
 *
 *   2. N-gram phrase bank (learned from the author's sample posts)
 *      - bigrams and trigrams the author favors
 *      - transition words they use between ideas
 *      - sentence frames they reuse
 *
 *   3. Voice transformation rules
 *      - adjust punctuation to match the author's habits
 *      - inject signature phrases where natural
 *      - match sentence length distribution
 *      - apply the author's hook style
 *      - use their emoji patterns
 *
 *   4. Engagement optimization (from the real X algorithm)
 *      - optimize for share_via_copy_link (40x a like — KING signal)
 *      - add reply triggers (5x + 15x mutual boost)
 *      - make it quotable (quote = 5x)
 *      - make it DM-worthy (share_via_dm = 5x)
 *      - avoid link-in-body, all-caps, weak openers
 *
 * The result: posts that sound like YOU wrote them, not like a template
 * or a generic AI. Senior copywriter level — because it's calibrated to
 * YOUR actual writing patterns, not a one-size-fits-all model.
 *
 * Inspired by:
 *   - stylometric-transfer (ngpepin) — explicit style fingerprints
 *   - unslop stylometry (mohamedabdallah-14) — deterministic style signals
 *   - PseudoWriter (KpihX) — n-gram style capture
 *   - voice-layer (ymeiri) — local voice profiles
 *
 * Zero dependencies. Pure JavaScript. Runs anywhere.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { improvePost } = require("./improver");
const { analyze } = require("./postAnalyzer");
const { generateHooks, extractTension, extractTopic } = require("./hookLibrary");

// ---------------------------------------------------------------------------
// N-gram phrase bank — learns the author's word sequences
// ---------------------------------------------------------------------------

function buildPhraseBank(posts) {
  if (!posts || !posts.length) return { bigrams: {}, trigrams: {}, frames: [], transitions: [] };

  const bigrams = {};
  const trigrams = {};
  const transitions = new Set();
  const frames = new Set();

  // Common transition words to learn
  const transitionRe = /\b(but|and|so|then|here's|the thing is|what most|nobody|everyone|the real|the truth|the key|the catch|the problem|the fix|the lesson|the takeaway|the insight|the reality|the secret|the mistake|the shift|the moment|the turning point|the breakthrough|the breakdown|the breakdown|the wake-up|the realization|the discovery|the pattern|the difference|the lesson here|the hard part|the easy part|the first step|the last step|the next step)\b/gi;

  for (const post of posts) {
    const text = String(post).trim();
    if (!text) continue;

    // Tokenize for n-grams (keep contractions, drop punctuation)
    const words = text.toLowerCase().match(/[\w']+/g) || [];

    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bg = words[i] + " " + words[i + 1];
      bigrams[bg] = (bigrams[bg] || 0) + 1;
    }

    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const tg = words[i] + " " + words[i + 1] + " " + words[i + 2];
      trigrams[tg] = (trigrams[tg] || 0) + 1;
    }

    // Transitions
    let m;
    while ((m = transitionRe.exec(text)) !== null) {
      transitions.add(m[0].toLowerCase());
    }

    // Sentence frames — patterns like "I [verb] [object]" or "The [noun] is [adj]"
    const sentences = text.split(/[.!?]/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 120);
    for (const sent of sentences) {
      // Extract the frame: replace content words with slots
      const frame = sent
        .replace(/\b\d+\b/g, "[NUM]")
        .replace(/\b[\w']{6,}\b/g, (w) => {
          // Keep short function words, replace long content words
          if (/^(the|and|but|for|not|you|are|was|this|that|with|from|have|they|will|what|when|then|here|just|like|don|doesn|isn|wasn|couldn|wouldn|shouldn|haven|hasn|ain|won|can|can$t|won$t)/i.test(w)) return w;
          return "[X]";
        });
      if (frame.split("[X]").length >= 2) {
        frames.add(frame);
      }
    }
  }

  // Sort by frequency and keep top entries
  // Lower threshold when we have few samples (still filters out single-occurrence noise)
  const minCount = posts.length > 20 ? 2 : 1;
  const topBigrams = Object.entries(bigrams)
    .filter(([w, c]) => c >= minCount && !isStopBigram(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([w]) => w);

  const topTrigrams = Object.entries(trigrams)
    .filter(([w, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  return {
    bigrams: topBigrams,
    trigrams: topTrigrams,
    frames: [...frames].slice(0, 20),
    transitions: [...transitions],
  };
}

function isStopBigram(bg) {
  const stop = ["i am", "i was", "it is", "it was", "this is", "that is", "there is", "there are",
    "in the", "of the", "to the", "on the", "for the", "with the", "at the", "by the",
    "and the", "but the", "or the", "to a", "in a", "on a", "for a", "with a",
    "i have", "you have", "we have", "they have", "i will", "you will", "we will",
    "i can", "you can", "we can", "i need", "you need", "we need"];
  return stop.includes(bg);
}

// ---------------------------------------------------------------------------
// Voice transformation — applies the author's style to a draft
// ---------------------------------------------------------------------------

function transformToVoice(text, profile, phraseBank) {
  if (!profile) return text;

  let result = text;

  // 1. Punctuation adjustments
  result = adjustPunctuation(result, profile);

  // 2. Sentence length adjustment
  result = adjustSentenceLength(result, profile);

  // 3. Inject signature phrases where natural
  if (profile.signaturePhrases?.length) {
    result = injectSignaturePhrases(result, profile.signaturePhrases);
  }

  // 4. Emoji adjustment
  result = adjustEmoji(result, profile);

  // 5. Pronoun adjustment (first-person vs second-person)
  result = adjustPronouns(result, profile);

  // 6. Capitalization style
  result = adjustCapitalization(result, profile);

  return result;
}

function adjustPunctuation(text, profile) {
  let result = text;

  // Em-dashes
  if (profile.emDashUsage > 0.3) {
    // Replace " - " with "—"
    result = result.replace(/\s+-\s+/g, "—");
    // Replace some commas with em-dashes for dramatic pauses
    if (profile.emDashUsage > 0.5) {
      result = result.replace(/, here's/g, "—here's");
      result = result.replace(/, the/g, "—the");
    }
  } else if (profile.emDashUsage < 0.05) {
    // Remove em-dashes, replace with commas
    result = result.replace(/—/g, ",");
  }

  // Ellipses
  if (profile.ellipsisUsage > 0.2) {
    // Add ellipses to some sentence ends
    result = result.replace(/\.\n/g, "...\n");
  } else if (profile.ellipsisUsage < 0.05) {
    result = result.replace(/\.\.\./g, ".");
  }

  // Colons
  if (profile.colonUsage > 0.3) {
    // The author likes colons — add before lists
    result = result.replace(/^here is/gim, "here's:");
    result = result.replace(/^here are/gim, "here are:");
  }

  // Exclamation marks
  if (profile.exclamationRate < 0.1) {
    // Author doesn't use exclamations — tone them down
    result = result.replace(/!/g, ".");
  } else if (profile.exclamationRate > 0.5) {
    // Author uses exclamations freely — add some energy
    result = result.replace(/^what a /gim, "what a ");
  }

  // Questions
  if (profile.questionRate > 0.4) {
    // Author ends with questions — ensure there's one
    if (!/\?/.test(result)) {
      result = addReplyTrigger(result, profile);
    }
  }

  return result;
}

function adjustSentenceLength(text, profile) {
  const targetAvg = profile.avgWords ? profile.avgWords / (text.split("\n").filter(Boolean).length) : 0;
  let result = text;
  // If author writes short sentences, split long ones
  if (profile.avgChars < 120) {
    // Split sentences longer than ~15 words at natural break points
    const lines = result.split("\n");
    const newLines = [];
    for (const line of lines) {
      const words = line.split(/\s+/);
      if (words.length > 18 && profile.lineBreakUsage > 0.5) {
        // Split at a midpoint
        const mid = Math.floor(words.length / 2);
        newLines.push(words.slice(0, mid).join(" "));
        newLines.push(words.slice(mid).join(" "));
      } else {
        newLines.push(line);
      }
    }
    result = newLines.join("\n");
  }
  return result;
}

function injectSignaturePhrases(text, phrases) {
  if (!phrases || !phrases.length) return text;
  // Only inject if the phrase isn't already there
  for (const phrase of phrases.slice(0, 2)) {
    if (phrase.length < 3) continue;
    if (text.toLowerCase().includes(phrase.toLowerCase())) continue;
    // Try to inject naturally at a sentence boundary
    const lines = text.split("\n");
    if (lines.length >= 2 && Math.random() < 0.3) {
      // Insert after the first line as a transition
      const insertIdx = 1;
      lines.splice(insertIdx, 0, phrase);
      return lines.join("\n");
    }
  }
  return text;
}

function adjustEmoji(text, profile) {
  if (profile.emojiUsage < 0.1) {
    // Remove emoji if author doesn't use them
    const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;
    return text.replace(emojiRe, "");
  }
  if (profile.emojiUsage > 0.5 && profile.favoriteEmojis?.length) {
    // Author uses emoji — add their favorites if none present
    const emojiRe = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u;
    if (!emojiRe.test(text) && Math.random() < 0.4) {
      const emoji = profile.favoriteEmojis[0][0];
      // Add at the end or after the hook
      const lines = text.split("\n");
      if (lines.length > 1) {
        lines[0] = lines[0].replace(/[.]$/, "") + " " + emoji;
      } else {
        text += " " + emoji;
      }
      return lines.join("\n");
    }
  }
  return text;
}

function adjustPronouns(text, profile) {
  // If author is heavily first-person, lean into "I" framing
  // If author is heavily second-person, lean into "you" framing
  if (profile.secondPersonRate > 0.04 && profile.firstPersonRate < 0.04) {
    // Convert some "I" to "you" where it makes sense
    text = text.replace(/\bi (was|used to|learned|realized|discovered|found|noticed)\b/gi, "you $1");
    text = text.replace(/\bmy (first|last|biggest|worst|best|hardest)\b/gi, "your $1");
  }
  return text;
}

function adjustCapitalization(text, profile) {
  // Some authors write in lowercase — match that
  if (profile.avgCapsRatio < 0.05) {
    // Lowercase everything except proper nouns and I
    text = text.replace(/([.!?]\s+)([A-Z])/g, (m, p1, p2) => p1 + p2.toLowerCase());
    text = text.replace(/^([A-Z])/gm, (m, c) => c.toLowerCase());
    // Keep "I" capitalized
    text = text.replace(/\bi\b/g, "I");
    // Keep proper nouns (basic heuristic: words that are always capitalized)
    text = text.replace(/\b(x|ai|saas|api|crm|seo)\b/gi, (m) => m.toUpperCase() === m ? m : m.charAt(0).toUpperCase() + m.slice(1));
  }
  return text;
}

function addReplyTrigger(text, profile) {
  // Add a reply trigger that matches the author's style
  const triggers = profile.questionRate > 0.3
    ? ["agree or disagree?", "what's your take?", "change my mind.", "what would you add?"]
    : ["curious what you think.", "thoughts?", "what's your experience?"];

  // Pick based on voice — if author uses questions, use a question
  const trigger = triggers[Math.floor(Math.random() * triggers.length)];
  const lines = text.split("\n").filter(Boolean);
  // Add after the last content line
  lines.push(trigger);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Senior copywriter — generates a polished post from a draft
// ---------------------------------------------------------------------------

/**
 * Rewrite a draft post in the author's voice, optimized for the real X algorithm.
 *
 * @param {string} draft - The draft post to rewrite
 * @param {Object} [voiceProfile] - Voice profile from voiceProfile.js
 * @param {Object} [phraseBank] - N-gram phrase bank from buildPhraseBank()
 * @param {Object} [opts] - Options
 * @returns {Object} { final, finalScore, finalGrade, method, iterations }
 */
function rewrite(draft, voiceProfile = null, phraseBank = null, opts = {}) {
  if (!draft) return { error: "no draft provided" };

  // Step 1: Run the rule-based improver to get a strong base
  const improved = improvePost(draft, 85, 6);
  let current = improved.final;
  let currentScore = improved.finalScore;
  let currentGrade = improved.finalGrade;

  const iterations = [{
    iteration: 0,
    candidate: draft,
    score: improved.originalScore,
    grade: improved.originalGrade,
    changes: ["original draft"],
  }, {
    iteration: 1,
    candidate: current,
    score: currentScore,
    grade: currentGrade,
    changes: ["rule-based improvement"],
  }];

  // Step 2: Apply voice transformation
  if (voiceProfile) {
    const voiceTransformed = transformToVoice(current, voiceProfile, phraseBank);
    const vtScore = scorePost(voiceTransformed);

    // Only keep the voice transformation if it doesn't hurt the score too much
    // (voice matching is worth a few points of algorithm score)
    if (vtScore.score >= currentScore - 5) {
      current = voiceTransformed;
      currentScore = vtScore.score;
      currentGrade = vtScore.grade;
      iterations.push({
        iteration: 2,
        candidate: current,
        score: currentScore,
        grade: currentGrade,
        changes: ["voice transformation (punctuation, pronouns, signature phrases)"],
      });
    }
  }

  // Step 3: Engagement optimization pass — add high-value signals
  const optimized = optimizeForAlgorithm(current, voiceProfile);
  const optScore = scorePost(optimized);
  if (optScore.score > currentScore) {
    current = optimized;
    currentScore = optScore.score;
    currentGrade = optScore.grade;
    iterations.push({
      iteration: 3,
      candidate: current,
      score: currentScore,
      grade: currentGrade,
      changes: ["algorithm optimization (reply trigger, share cue, quotability)"],
    });
  }

  // Step 4: Final voice polish — make sure it still sounds like the author
  if (voiceProfile) {
    const finalPolish = transformToVoice(current, voiceProfile, phraseBank);
    const fpScore = scorePost(finalPolish);
    if (fpScore.score >= currentScore - 3) {
      current = finalPolish;
      currentScore = fpScore.score;
      currentGrade = fpScore.grade;
      iterations.push({
        iteration: 4,
        candidate: current,
        score: currentScore,
        grade: currentGrade,
        changes: ["final voice polish"],
      });
    }
  }

  return {
    original: draft,
    originalScore: improved.originalScore,
    originalGrade: improved.originalGrade,
    final: current,
    finalScore: Math.round(currentScore * 10) / 10,
    finalGrade: currentGrade,
    iterations,
    converged: currentScore >= 85,
    method: voiceProfile
      ? "voice-calibrated copywriter (rule-based + stylometric + n-gram)"
      : "rule-based copywriter (no voice profile)",
    aiPowered: false,
    voiceActive: !!voiceProfile,
  };
}

// ---------------------------------------------------------------------------
// Algorithm optimization — adds high-value X algorithm signals
// ---------------------------------------------------------------------------

function optimizeForAlgorithm(text, profile) {
  let result = text;
  const score = scorePost(result);

  // 1. Add a reply trigger if missing (reply = 5.0, +15.0 mutual boost)
  if (!/\?/.test(result) && !/(agree|disagree|thoughts|take|opinion|comment)/i.test(result)) {
    result = addReplyTrigger(result, profile || {});
  }

  // 2. Add a share cue if missing (share_via_copy_link = 20.0, share_via_dm = 5.0)
  if (!/(save this|send this|share this|bookmark|forward|copy)/i.test(result)) {
    const shareCues = [
      "save this.",
      "send this to someone who needs it.",
      "bookmark this.",
    ];
    // Only add if the post is listicle/educational (not for confessions)
    if (/\b(\d|things|rules|lessons|mistakes|ways|steps)\b/i.test(result)) {
      const cue = shareCues[Math.floor(Math.random() * shareCues.length)];
      const lines = result.split("\n").filter(Boolean);
      // Add before the reply trigger
      const lastIdx = lines.length - 1;
      if (/\?/.test(lines[lastIdx])) {
        lines.splice(lastIdx, 0, cue);
      } else {
        lines.push(cue);
      }
      result = lines.join("\n");
    }
  }

  // 3. Make it quotable — ensure the hook is punchy (quote = 5.0)
  const firstLine = result.split("\n")[0];
  if (firstLine.length > 60 && firstLine.split(/\s+/).length > 10) {
    // Hook is too long — try to tighten it
    const words = firstLine.split(/\s+/);
    if (words.length > 8) {
      // Take the first 6-7 words and make them the hook
      const shortHook = words.slice(0, 6).join(" ").replace(/[,;]$/, ".");
      const rest = words.slice(6).join(" ");
      result = shortHook + "\n\n" + rest + result.substring(firstLine.length);
    }
  }

  // 4. Remove links from body (big penalty)
  result = result.replace(/https?:\/\/\S+/g, "");

  // 5. Remove weak openers
  result = result.replace(/^(excited to share|thrilled to announce|happy to share|we just launched|i'm excited to)/im, (m) => {
    const replacement = "here's what nobody tells you:";
    return replacement;
  });

  return result;
}

// ---------------------------------------------------------------------------
// Generate a post from a topic (not a rewrite — original generation in voice)
// ---------------------------------------------------------------------------

/**
 * Generate an original post about a topic in the author's voice.
 * Uses the sprinter for the base, then applies voice transformation.
 *
 * @param {string} topic - What to post about
 * @param {Object} [voiceProfile] - Voice profile
 * @param {Object} [phraseBank] - N-gram phrase bank
 * @param {Object} [opts] - { angle, archetype }
 * @returns {Object} { post, score, grade, hook, archetype }
 */
function generate(topic, voiceProfile = null, phraseBank = null, opts = {}) {
  // Use the sprinter to generate a base candidate
  const { sprint } = require("./sprinter");
  const result = sprint({ topic, angle: opts.angle, count: 4 });
  if (result.error || !result.posts?.length) return { error: result.error || "sprint failed" };

  // Take the top candidates and voice-transform each
  const candidates = result.posts.slice(0, 4).map(c => {
    let post = c.post;

    // Apply voice transformation
    if (voiceProfile) {
      post = transformToVoice(post, voiceProfile, phraseBank);
    }

    // Apply algorithm optimization
    post = optimizeForAlgorithm(post, voiceProfile);

    // Final voice polish
    if (voiceProfile) {
      post = transformToVoice(post, voiceProfile, phraseBank);
    }

    const score = scorePost(post);
    return {
      post,
      hook: post.split("\n")[0],
      archetype: c.archetype,
      score: score.score,
      grade: score.grade,
      realScore: score.signalModel?.realScore || 0,
      topSignals: score.signalModel?.topPositive?.map(s => `${s.signal} (+${s.contribution})`) || [],
    };
  });

  // Sort by real algorithm score
  candidates.sort((a, b) => b.realScore - a.realScore);

  return candidates[0] || null;
}

// ---------------------------------------------------------------------------
// Batch generate — multiple posts in voice
// ---------------------------------------------------------------------------

/**
 * Generate multiple posts about a topic in the author's voice.
 *
 * @param {string} topic
 * @param {number} count - How many posts
 * @param {Object} [voiceProfile]
 * @param {Object} [phraseBank]
 * @returns {Array} Array of post objects
 */
function generateBatch(topic, count = 3, voiceProfile = null, phraseBank = null) {
  // Use the content engine (senior copywriter) instead of the old sprinter
  const { generate } = require("./contentEngine");
  const candidates = generate(topic, { count: count * 2, voiceProfile, phraseBank });
  if (!candidates.length) return [];

  // The content engine already applies voice transformation + quality checking.
  // Just map to the expected output format.
  const posts = candidates.map(c => ({
    post: c.post,
    hook: c.hook,
    archetype: c.angleType, // "contrarian", "story", "data", "specific"
    angle: c.angle, // the actual insight
    angleReasoning: c.angleReasoning,
    domain: c.domain,
    score: c.score,
    grade: c.grade,
    realScore: c.realScore,
    engagementTier: c.engagementTier,
    predictedDwellSeconds: c.predictedDwellSeconds,
    topSignals: c.topSignals,
    qualityScore: c.qualityScore,
    qualityIssues: c.qualityIssues,
  }));

  // Sort by combined algorithm + quality score
  posts.sort((a, b) => {
    const aScore = a.realScore + a.qualityScore * 0.05;
    const bScore = b.realScore + b.qualityScore * 0.05;
    return bScore - aScore;
  });

  // Deduplicate by hook
  const seen = new Set();
  const unique = posts.filter(p => {
    const key = p.hook.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, count);
}

module.exports = {
  rewrite,
  generate,
  generateBatch,
  buildPhraseBank,
  transformToVoice,
  optimizeForAlgorithm,
};
