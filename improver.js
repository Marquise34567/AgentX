/*
 * Post improver / iteration engine (JavaScript port).
 *
 * Takes a draft X post and rewrites it by applying the signals & cues the
 * scoring engine flagged, generating multiple candidate variants per round,
 * scoring each, and keeping the best. Iterates until the post reaches an A
 * grade (>= 85) or hits a max iteration cap.
 *
 * Rule-based (no external LLM) so it runs anywhere and is deterministic.
 */

"use strict";

const { scorePost, URL_RE, URL_RE_GLOBAL, WORD_RE, WEAK_OPENERS } = require("./engagementAlgo");
const { recommendFormat, detectFormat, transformToFormat, TEMPLATES } = require("./viralTemplates");
const { smartRewrite } = require("./smartRewriter");

const TARGET_SCORE = 85.0; // A grade
const MAX_ITERATIONS = 8;

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------
function stripLinks(text) {
  const links = text.match(URL_RE_GLOBAL) || [];
  let cleaned = text.replace(URL_RE_GLOBAL, "");
  // Remove orphaned "Sign up at", "Check it out at", "Link in bio", etc. left behind
  cleaned = cleaned.replace(/\b(sign up|check it out|link in bio|try it|get it)\s*(at|on)?\s*$/im, "");
  cleaned = cleaned.replace(/\b(sign up|check it out|try it|get it)\s+at\s*$/im, "");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");
  cleaned = cleaned.replace(/\s+\./g, ".");
  cleaned = cleaned.replace(/\.\s+\s+/g, ". ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  cleaned = cleaned.replace(/\s+([,.;:!?)])/g, "$1");
  // Clean up any trailing "at" or orphaned prepositions
  cleaned = cleaned.replace(/\s+at\s*$/i, "").trim();
  return [cleaned.trim(), links];
}

function killWeakOpener(text) {
  const lines = text.split("\n");
  const firstLine = lines[0];
  const low = firstLine.toLowerCase().trim();
  for (const w of WEAK_OPENERS) {
    if (low.startsWith(w)) {
      let rest = firstLine.slice(w.length);
      rest = rest.replace(/^[,:\-\s]+/, "").trim();
      if (!rest) rest = lines.slice(1).join("\n");
      const tail = lines.slice(1).join("\n");
      const neu = tail ? rest + "\n" + tail : rest;
      return [neu.trim(), true];
    }
  }
  return [text, false];
}

// Rewrite a boring first line into a scroll-stopping hook
function rewriteWeakHook(text) {
  const lines = text.split("\n");
  const firstLine = lines[0].trim();
  const low = firstLine.toLowerCase();

  // List of boring/generic openers that don't stop the scroll
  const boringOpeners = [
    /^the new year/i,
    /^today i (worked|started|began|woke)/i,
    /^just hit a big milestone/i,
    /^here are \d+ (thoughts|things|tips)/i,
    /^here is (what|how)/i,
    /^i (just |am |am, )?(launched|sharing|excited)/i,
    /^excited to/i,
    /^so (today|this week)/i,
    /^this (week|month) i/i,
    /^feeling (incredibly )?grateful/i,
    /^never give up/i,
    /^keep (building|shipping|believing)/i,
    /^ai is going to/i,
    /^i just built something/i,
    /^if you'?re not using/i,
    /^hope this helps/i,
  ];

  const isBoring = boringOpeners.some((re) => re.test(firstLine));
  if (!isBoring) return [text, false];

  // Extract the most interesting fact from the post
  const allText = text.toLowerCase();
  const tail = lines.slice(1).join("\n").trim();

  // Generate a stronger hook based on content
  let newHook = "";
  if (/\$[\d,]+/.test(text)) {
    const moneyMatch = text.match(/\$(\d[\d,.]*[km]?)/i);
    const money = moneyMatch ? "$" + moneyMatch[1] : "";
    newHook = `${money} and counting.`;
  } else if (/\b(built|shipped|launched|created|product|tool|app)\b/.test(allText)) {
    // Find what was built — look for "built a X" or "launched X"
    const productMatch = text.match(/\b(?:built|launched|shipped|created)\s+(?:a\s+|an\s+|the\s+)?(\w+)/i);
    const productWord = productMatch && productMatch[1] && !/^(new|our|my|this|that|it|product|tool|app|feature|thing)$/i.test(productMatch[1]) ? productMatch[1] : null;
    if (productWord) {
      newHook = `I built a ${productWord}. It's absurd.`;
    } else {
      newHook = `shipped it. it's absurd.`;
    }
  } else if (/\b(failed|mistake|wrong)\b/.test(allText)) {
    newHook = `I got it wrong.`;
  } else if (/\b(plan|planning|track|task|productive)\b/.test(allText)) {
    newHook = `2026 was the year I stopped guessing.`;
  } else if (/\b(milestone|grateful|thankful|support|blessed)\b/.test(allText)) {
    // Vague milestone — extract any number
    const numMatch = text.match(/\$(\d[\d,.]*[km]?)/i);
    if (numMatch) {
      newHook = `$${numMatch[1]} MRR. here's what actually drove it.`;
    } else {
      newHook = `it worked. here's what I did differently.`;
    }
  } else if (/^(never give up|keep building|keep shipping|keep believing)/i.test(firstLine)) {
    newHook = `most people quit right before it works.`;
  } else if (/^feeling (incredibly )?grateful/i.test(firstLine)) {
    newHook = `gratitude is overrated.`;
  } else if (/^ai is going to/i.test(firstLine)) {
    newHook = `AI isn't going to replace you. someone using AI will.`;
  } else if (/^if you'?re not using/i.test(firstLine)) {
    newHook = `you're already behind.`;
  } else if (/^i just built something/i.test(firstLine)) {
    newHook = `I built something I can't stop using.`;
  } else if (tail) {
    // Use the second line if it's more interesting
    const secondLine = tail.split("\n")[0].trim();
    if (secondLine && secondLine.length > 10 && secondLine.length < 80) {
      newHook = secondLine;
    }
  }

  if (!newHook) return [text, false];
  const newTail = newHook === tail.split("\n")[0]?.trim() ? tail.split("\n").slice(1).join("\n").trim() : tail;
  const result = newTail ? newHook + "\n\n" + newTail : newHook;
  return [result, true];
}

function shortenFirstLine(text) {
  const lines = text.split("\n");
  const first = lines[0].trim();
  const wc = (first.match(WORD_RE) || []).length;
  if (wc <= 6) return [text, false];
  // try splitting on a separator — keep the head as the hook
  for (const sep of [":", "—", "-", ",", ";"]) {
    const idx = first.indexOf(sep);
    if (idx > 0) {
      const head = first.slice(0, idx).trim();
      const headWc = (head.match(WORD_RE) || []).length;
      if (headWc >= 3 && headWc <= 6) {
        const restBody = first.slice(idx + 1).trim();
        const body = [restBody, ...lines.slice(1)].filter((x) => x).join("\n");
        return [(head + "\n" + body).trim(), true];
      }
    }
  }
  // fallback: split on sentence boundary (first period/question/exclamation)
  const sentenceMatch = first.match(/^(.{10,80}?[.!?])\s+(.*)/);
  if (sentenceMatch) {
    const head = sentenceMatch[1].trim();
    const rest = sentenceMatch[2].trim();
    const headWc = (head.match(WORD_RE) || []).length;
    if (headWc >= 3 && headWc <= 8) {
      const body = [rest, ...lines.slice(1)].filter((x) => x).join("\n");
      return [(head + "\n" + body).trim(), true];
    }
  }
  // last resort: don't mangle — just return as-is (better than breaking mid-word)
  return [text, false];
}

function addLineBreaks(text) {
  if (text.includes("\n\n")) return [text, false];
  // Only add breaks if there are clear sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return [text, false];
  // Each sentence gets its own line — don't merge them
  return [sentences.join("\n\n"), true];
}

function addReplyTrigger(text) {
  if (text.trimEnd().endsWith("?")) return [text, false];
  const triggers = [
    "\n\nAgree or disagree?",
    "\n\nWhat's your take?",
    "\n\nReply with yours.",
    "\n\nCurious if you'd go further.",
  ];
  let best = text, bestScore = -1, chosen = false;
  for (const t of triggers) {
    const cand = text + t;
    const r = scorePost(cand);
    if (r.score > bestScore) { bestScore = r.score; best = cand; chosen = true; }
  }
  return [best, chosen];
}

function addSpecificity(text) {
  // Skip if the text already has a number (including $Xk, $X,XXX patterns)
  // The old regex \b\d[\d,.]*\b missed $44k because 'k' is a word char.
  // Now we also check for $-prefixed numbers and numbers followed by k/m suffixes.
  if (/\b\d[\d,.]*\b/.test(text) || /\$\d/.test(text) || /\b\d[\d,.]*[km]\b/i.test(text)) return [text, false];
  // Don't replace "month/week/year" if it's part of a "/month" rate expression
  if (/\$[\d,.]+[km]?\/(month|week|year|day)/i.test(text)) return [text, false];
  const swaps = [
    [/\ba few\b/i, "3"],
    [/\bseveral\b/i, "5"],
    [/\bmany\b/i, "7"],
    [/\bsome\b/i, "4"],
    // Only replace time words when preceded by a vague quantifier
    // "a few months" → "3 months", but "This week" stays "This week"
    [/\ba few (months?|weeks?|years?|days?|hours?)\b/i, "3 $1"],
    [/\bseveral (months?|weeks?|years?|days?|hours?)\b/i, "5 $1"],
    // Don't replace standalone "month/week/year" — too aggressive
  ];
  let out = text, changed = false;
  for (const [pat, rep] of swaps) {
    if (pat.test(out)) { out = out.replace(pat, rep); changed = true; break; }
  }
  return [out, changed];
}

function stripTrailingUrlOnly(text) {
  // Remove URL-only lines but preserve paragraph structure (empty lines between paragraphs)
  const lines = text.split("\n");
  const filtered = lines.filter((l) => {
    if (!l.trim()) return true; // keep empty lines (paragraph breaks)
    return !new RegExp(`^${URL_RE.source}$`, "i").test(l.trim());
  });
  // Clean up trailing empty lines
  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Candidate generation
// ---------------------------------------------------------------------------
function generateCandidates(text, linkAlreadyStripped) {
  const candidates = [];
  const [baseRaw, links] = linkAlreadyStripped ? [text, []] : stripLinks(text);
  const base = baseRaw;

  if (!linkAlreadyStripped && links.length) {
    candidates.push([stripTrailingUrlOnly(text), ["removed external link from body"]]);
  }

  // V1: kill opener + shorten + line breaks
  {
    let v = base, ch = [];
    let r;
    [v, r] = killWeakOpener(v); if (r) ch.push("removed self-promotional opener");
    [v, r] = shortenFirstLine(v); if (r) ch.push("cut first line to 4-6 words");
    [v, r] = addLineBreaks(v); if (r) ch.push("added line breaks");
    candidates.push([v, ch]);
  }
  // V1b: rewrite weak hook + breaks + reply trigger
  {
    let v = base, ch = [];
    let r;
    [v, r] = rewriteWeakHook(v); if (r) ch.push("rewrote weak hook into scroll-stopper");
    [v, r] = addLineBreaks(v); if (r) ch.push("added line breaks");
    [v, r] = addReplyTrigger(v); if (r) ch.push("added a reply trigger");
    [v, r] = addSpecificity(v); if (r) ch.push("added specificity");
    candidates.push([v, ch]);
  }
  // V2: specificity + shorten + breaks + reply trigger
  {
    let v = base, ch = [];
    let r;
    [v, r] = addSpecificity(v); if (r) ch.push("made a vague quantifier specific");
    [v, r] = shortenFirstLine(v); if (r) ch.push("cut first line to 4-6 words");
    [v, r] = addLineBreaks(v); if (r) ch.push("added line breaks");
    [v, r] = addReplyTrigger(v); if (r) ch.push("added a reply trigger");
    candidates.push([v, ch]);
  }
  // V3: full stack
  {
    let v = base, ch = [];
    let r;
    [v, r] = killWeakOpener(v); if (r) ch.push("removed self-promotional opener");
    [v, r] = shortenFirstLine(v); if (r) ch.push("cut first line to 4-6 words");
    [v, r] = addSpecificity(v); if (r) ch.push("made a vague quantifier specific");
    [v, r] = addLineBreaks(v); if (r) ch.push("added line breaks");
    [v, r] = addReplyTrigger(v); if (r) ch.push("added a reply trigger");
    candidates.push([v, ch]);
  }
  // V4: hook-first (opener + shorten + specificity + breaks)
  {
    let v = base, ch = [];
    let r;
    [v, r] = killWeakOpener(v); if (r) ch.push("removed self-promotional opener");
    [v, r] = shortenFirstLine(v); if (r) ch.push("cut first line to 4-6 words");
    [v, r] = addSpecificity(v); if (r) ch.push("made a vague quantifier specific");
    [v, r] = addLineBreaks(v); if (r) ch.push("added line breaks");
    candidates.push([v, ch]);
  }

  // V5-V7: transform into proven viral formats
  const currentMatch = detectFormat(base);
  const recommended = recommendFormat(base);
  const currentResult = scorePost(base);
  // Skip ALL format transforms if the post already matches a viral format
  // at decent confidence AND has a good score — don't mangle good posts.
  // BUT: if the current score is below 76, still try transforms even if
  // already matching a format (the post might match but score poorly).
  const alreadyGood = currentMatch && currentMatch.confidence >= 0.5 && currentResult.score >= 78;

  // V5: transform into the recommended viral format (the BEST semantic fit)
  if (recommended && !alreadyGood) {
    try {
      const transformed = transformToFormat(base, recommended.id);
      if (transformed && transformed.trim() && transformed.trim() !== base.trim()) {
        candidates.push([transformed, [`rewrote as "${recommended.name}" format`]]);
      }
    } catch {}
  }

  // V6: try other formats — BUT only formats that actually DETECT well on this text
  // This prevents MRR milestone from eating posts that aren't about revenue
  if (!alreadyGood) {
    const allFormats = [];
    for (const tpl of TEMPLATES) {
      if (recommended && tpl.id === recommended.id) continue;
      try {
        const conf = tpl.detect(base);
        // Require HIGH confidence (0.5+) to try a format — prevents generic
        // formats like MRR milestone from being applied to non-revenue posts
        if (conf >= 0.5) allFormats.push({ tpl, conf });
      } catch {}
    }
    allFormats.sort((a, b) => b.conf - a.conf);
    for (const { tpl } of allFormats.slice(0, 3)) {
      try {
        const transformed = transformToFormat(base, tpl.id);
        if (transformed && transformed.trim() && transformed.trim() !== base.trim()) {
          candidates.push([transformed, [`rewrote as "${tpl.name}" format`]]);
        }
      } catch {}
    }
  }

  // Quality gate — reject candidates that look broken/garbled
  function looksBroken(text) {
    // double space inside a line (mangled join) — but not newlines
    for (const line of text.split("\n")) {
      if (/\w\s{2,}\w/.test(line)) return true;
    }
    // mid-word break: lowercase word directly followed by uppercase word on SAME line
    // e.g. "app Added" = broken, but "now I" = fine (common sentence start)
    const lines = text.split("\n");
    for (const line of lines) {
      // check for lowercase word + space + Capital that isn't a pronoun/common starter
      const m = line.match(/\b([a-z]\w+)\s+([A-Z][a-z]+)/);
      if (m) {
        const starters = ["i", "i'm", "i'll", "i've", "i'd", "it", "it's", "we", "they", "you", "he", "she", "here", "there", "this", "that", "these", "those", "everyone", "nobody", "most", "many", "some", "all", "every", "my", "our", "your", "their", "his", "her", "its", "the", "a", "an", "but", "and", "or", "so", "because", "when", "if", "then", "now", "here", "just", "still", "even", "also", "not", "no", "yes", "oh", "wow", "hey", "look", "listen", "stop", "don", "won", "can", "will", "was", "is", "are", "was", "were", "been", "being", "have", "has", "had", "do", "does", "did", "make", "made", "get", "got", "take", "took", "want", "need", "like", "love", "hate", "feel", "think", "know", "see", "look", "come", "go", "try", "tried", "start", "started", "build", "built", "ship", "shipped", "launch", "launched", "use", "used", "create", "created", "post", "posted", "share", "shared", "reply", "replied", "agree", "disagree"];
        if (!starters.includes(m[1].toLowerCase())) return true;
      }
    }
    // too many words crammed into one line (>25 words in a single line)
    for (const line of text.split("\n")) {
      if ((line.match(WORD_RE) || []).length > 25) return true;
    }
    // placeholder text that wasn't filled in
    if (/\$X|\[X\]|\[product\]|\[subject\]/i.test(text)) return true;
    return false;
  }

  // de-dup + quality gate
  const seen = new Set();
  const unique = [];
  for (const [cand, ch] of candidates) {
    const key = cand.trim();
    if (key && !seen.has(key) && !looksBroken(key)) { seen.add(key); unique.push([cand, ch]); }
  }
  return [unique, links];
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
function improvePost(text, target = TARGET_SCORE, maxIter = MAX_ITERATIONS) {
  const original = text.trim();
  const origResult = scorePost(original);

  // ── Stage 1: Smart Rewrite (analyzer + rewriter pipeline) ──
  // This is the primary pipeline. It analyzes the post's DNA and crafts
  // a unique rewrite — no fixed templates, no MRR cancer.
  try {
    const smart = smartRewrite(original, target, 3);
    if (smart.final && smart.finalScore > origResult.score) {
      // If smart rewrite already hits target, return it
      if (smart.finalScore >= target) {
        const linkReply = smart.linkReply ? "Link for the first reply 👇\n" + smart.linkReply : "";
        const timing = "Post Tue–Thu 8–11am ET (Wed 9am ET is the single best slot). The first 30–60 min of replies/reposts decide whether the algo pushes you to a broader audience.";
        return {
          original,
          originalScore: Math.round(origResult.score * 10) / 10,
          originalGrade: origResult.grade,
          final: smart.final,
          finalScore: Math.round(smart.finalScore * 10) / 10,
          finalGrade: smart.finalGrade,
          iterations: smart.iterations.map((it) => ({
            iteration: it.iteration,
            candidate: it.candidate,
            score: Math.round(it.score * 10) / 10,
            grade: it.grade,
            changes: it.changes,
          })),
          linkReply,
          timingAdvice: timing,
          converged: true,
        };
      }
      // If smart rewrite is better but not at target, continue iterating
      // with the old pipeline starting from the smart rewrite
      var smartResult = smart;
    }
  } catch (e) {
    // Smart rewrite failed — fall through to old pipeline
  }

  // ── Stage 2: Legacy pipeline (fallback / refinement) ──
  let current = smartResult ? smartResult.final : original;
  let currentScore = smartResult ? smartResult.finalScore : origResult.score;
  let currentGrade = smartResult ? smartResult.finalGrade : origResult.grade;
  const iterations = [];
  let strippedLinks = [];
  let linkStripped = false;
  let converged = false;

  iterations.push({ iteration: 0, candidate: original, score: Math.round(origResult.score * 10) / 10, grade: origResult.grade, changes: [smartResult ? "smart rewrite → legacy refinement" : "original draft"] });

  if (smartResult) {
    iterations.push({ iteration: 0.5, candidate: smartResult.final, score: Math.round(smartResult.finalScore * 10) / 10, grade: smartResult.finalGrade, changes: ["smart rewrite via post analyzer"] });
    if (smartResult.linkReply) strippedLinks = [smartResult.linkReply];
  }

  for (let i = 1; i <= maxIter; i++) {
    if (currentScore >= target) { converged = true; break; }

    const [cands, links] = generateCandidates(current, linkStripped);
    if (links.length && !strippedLinks.length) { strippedLinks = links; linkStripped = true; }

    if (!cands.length) break;

    let bestCand = current, bestChanges = [], bestScore = currentScore, bestGrade = currentGrade;
    for (const [cand, changes] of cands) {
      const r = scorePost(cand);
      if (r.score > bestScore) {
        bestCand = cand; bestChanges = changes; bestScore = r.score; bestGrade = r.grade;
      }
    }

    if (bestCand === current && bestScore <= currentScore) break;

    current = bestCand; currentScore = bestScore; currentGrade = bestGrade;
    iterations.push({ iteration: i, candidate: current, score: Math.round(currentScore * 10) / 10, grade: currentGrade, changes: bestChanges });
  }

  const linkReply = strippedLinks.length ? "Link for the first reply 👇\n" + strippedLinks.join("\n") : "";
  const timing = "Post Tue–Thu 8–11am ET (Wed 9am ET is the single best slot). The first 30–60 min of replies/reposts decide whether the algo pushes you to a broader audience.";

  return {
    original,
    originalScore: Math.round(origResult.score * 10) / 10,
    originalGrade: origResult.grade,
    final: current,
    finalScore: Math.round(currentScore * 10) / 10,
    finalGrade: currentGrade,
    iterations,
    linkReply,
    timingAdvice: timing,
    converged: converged || currentScore >= target,
  };
}

module.exports = { improvePost, TARGET_SCORE, MAX_ITERATIONS };
