/*
 * Hook Library — 100 proven viral hook frameworks.
 *
 * Sourced from open-source projects:
 *   - jakeolschewski/viral-hook-formulas (20 formulas, MIT)
 *   - Blotato-Inc/blotato-skills/viral-hooks (100 frameworks, 13 categories)
 *   - xai-org/x-algorithm (real X For You feed signal weights)
 *   - quip.so Twitter hook analysis (8,400 top-decile tweets)
 *
 * Each hook has:
 *   - id: unique identifier
 *   - category: virality category (Receipt > Contrarian > Negative > Stolen > Curiosity)
 *   - template: fill-in-the-blank pattern
 *   - fill(text, analysis): generates a concrete hook from the post
 *   - first3WordsTest: what the first 3 words should look like
 *   - bestFor: when to use this hook
 *
 * The library is ordered by virality ceiling — Receipt and Contrarian
 * have the highest ceiling, followed by Negative Frame, Stolen Lessons,
 * and Curiosity Gap.
 *
 * Rule-based (no LLM) so it runs anywhere and is deterministic.
 */

"use strict";

// ---------------------------------------------------------------------------
// Helper: extract the topic/subject from a post
// ---------------------------------------------------------------------------
function extractTopic(text) {
  const t = text.toLowerCase();

  // ── Pattern-based extraction (highest priority) ──

  // "how to grow on X" → "growing on X"
  const howToMatch = text.match(/\bhow to (\w+(?:\s+\w+){0,3})/i);
  if (howToMatch) {
    const verb = howToMatch[1].trim();
    // Convert "grow on X" → "growing on X"
    const gerund = verb.replace(/^(\w+)/, (m) => {
      if (/^(grow|build|ship|launch|start|scale|write|post|edit|code|design|market|sell)$/.test(m)) {
        return m + (m.endsWith("e") && !m.endsWith("ee") ? "ing" : m.endsWith("t") ? "ting" : "ing");
      }
      return m;
    });
    return gerund;
  }

  // "why most startups fail" → "startups failing"
  const whyMatch = text.match(/\bwhy (?:most )?(\w+(?:\s+\w+){0,2})/i);
  if (whyMatch) {
    const phrase = whyMatch[1].trim();
    // If it ends with a verb, convert to gerund
    const words = phrase.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (/^(fail|succeed|win|lose|quit|struggle|grow|die|work)$/.test(lastWord)) {
      words[words.length - 1] = lastWord + (lastWord.endsWith("e") ? "ing" : lastWord.endsWith("t") ? "ting" : "ing");
      return words.join(" ");
    }
    return phrase;
  }

  // "tips for being more productive as a founder" → "productivity"
  const tipsMatch = text.match(/\btips? for (\w+(?:\s+\w+){0,2})/i);
  if (tipsMatch) {
    const phrase = tipsMatch[1].trim();
    // "being more productive" → "productivity"
    if (/being more productive/.test(phrase)) return "productivity";
    if (/being more efficient/.test(phrase)) return "efficiency";
    if (/being more focused/.test(phrase)) return "focus";
    return phrase;
  }

  // "launched our SaaS" / "built a platform" / "shipped a feature"
  const builtMatch = text.match(/\b(?:launched|built|shipped|created|made)\s+(?:a\s+|an\s+|the\s+|our\s+|my\s+)?(\w+)/i);
  if (builtMatch) {
    const word = builtMatch[1].toLowerCase();
    if (!STOP_WORDS.has(word) && word.length > 2) return word;
  }

  // "AI is going to change everything" → "AI"
  if (/\b(ai|artificial intelligence)\b/.test(t)) return "AI";
  // "disrupt the industry" → "industry disruption"
  if (/\bdisrupt\b/.test(t)) return "industry disruption";
  // "woke up at 5am" / "day in the life" → "daily routines"
  // Check this BEFORE "building in public" since day-in-the-life posts often mention BIP
  if (/\b(woke up at \d|day in the life|my daily routine|had coffee|had lunch|had a meeting)\b/.test(t)) return "daily routines";
  // "building in public" → "building in public"
  if (/\bbuilding in public\b/.test(t)) return "building in public";
  // "dark mode" / "API" / "changelog" → the feature itself
  if (/\b(dark mode|api|changelog|dashboard|analytics|onboarding)\b/.test(t)) {
    return text.match(/\b(dark mode|api|changelog|dashboard|analytics|onboarding)\b/i)?.[0]?.toLowerCase() || null;
  }
  // "SaaS" / "startup" / "founder"
  if (/\b(saas|startup|founder|product|platform|app|tool)\b/.test(t)) {
    return text.match(/\b(saas|startup|founder|product|platform|app|tool)\b/i)?.[0]?.toLowerCase() || null;
  }
  // "grateful" / "milestone" → "milestones"
  if (/\b(milestone|grateful|thankful)\b/.test(t)) return "milestones";
  // "never give up" / "dreams" / "success" → "motivation"
  if (/\b(never give up|dreams?|success|failure|keep building|keep shipping)\b/.test(t)) return "motivation";
  // "guide" / "published" → "guides"
  if (/\b(guide|published|course|ebook)\b/.test(t)) return "guides";
  // "woke up" / "coffee" / "day in the life" → "daily routine" (moved earlier)
  // "quit my job" / "9-to-5" → "quitting"
  // "quit my job" / "9-to-5" → "quitting"
  if (/\b(quit my job|9.?to.?5|resigned|last day)\b/.test(t)) return "quitting";
  // "failed" / "mistake" → "failure"
  if (/\b(failed|mistake|wrong|lost)\b/.test(t)) return "failure";
  // "video" / "edited" / "AI edited" → "AI video editing"
  if (/\b(ai edited|video editing|edited.*video)\b/.test(t)) return "AI video editing";
  if (/\b(video|editing|editor)\b/.test(t)) return "video editing";

  // ── Keyword-based fallback ──
  const DOMAIN_KEYWORDS = [
    "marketing", "seo", "copywriting", "sales", "outreach", "cold email",
    "pricing", "landing page", "conversion", "onboarding", "churn", "retention",
    "engagement", "followers", "reach", "viral", "algorithm", "content",
    "thread", "newsletter", "blog", "youtube", "tiktok", "instagram",
    "productivity", "focus", "deep work", "automation", "workflow",
    "coding", "debugging", "deployment", "ci/cd", "testing",
    "design", "ux", "ui", "branding", "positioning",
  ];
  for (const kw of DOMAIN_KEYWORDS) {
    if (t.includes(kw)) return kw;
  }

  return null;
}

const STOP_WORDS = new Set([
  "the", "this", "that", "some", "many", "most", "all", "your", "our", "my",
  "a", "an", "it", "is", "was", "are", "been", "have", "has", "had",
  "will", "would", "could", "should", "can", "do", "does", "did",
  "not", "no", "yes", "but", "and", "or", "if", "so", "as",
  "at", "by", "for", "from", "in", "on", "to", "with", "up", "out",
  "about", "into", "through", "during", "before", "after", "above", "below",
  "here", "there", "when", "where", "why", "how",
  "just", "now", "also", "very", "too", "well", "even", "still", "yet",
  "already", "always", "never", "ever", "often",
  "things", "something", "anything", "everything", "nothing",
  "going", "keep", "after", "feeling", "another", "fix", "worked",
  "excited", "thrilled", "happy", "proud", "grateful",
  "we", "they", "he", "she", "you", "me", "him", "her",
  "what", "which", "who", "whom",
  "make", "made", "get", "got", "take", "took", "give", "gave",
  "want", "need", "like", "look", "come", "find", "work",
  "good", "well", "best", "better", "right", "left",
  "every", "first", "last", "next",
  "hope", "help", "helps", "check", "share", "sharing",
  "today", "week", "month", "year", "time", "day",
  "new", "old", "big", "small", "great", "amazing", "incredible",
  "team", "support", "journey", "community",
]);

// ---------------------------------------------------------------------------
// Helper: extract the implicit problem/tension from a vague post
// ---------------------------------------------------------------------------
function extractTension(text, analysis) {
  const t = text.toLowerCase();

  // Corporate speak → what's the real tension?
  if (/\b(thrilled|excited|proud|honored|delighted)\b/.test(t)) {
    if (/\b(launched|shipped|built|released)\b/.test(t)) {
      return { tension: "launch anxiety", problem: "most launches get ignored", angle: "contrarian" };
    }
  }

  // Gratitude / milestone posts
  if (/\b(feeling grateful|feeling incredibly grateful|grateful|thankful|blessed|milestone)\b/.test(t)) {
    return { tension: "vague success", problem: "vague milestones don't stop the scroll", angle: "contrarian" };
  }

  // Motivation post → what's the real tension?
  if (/\b(never give up|keep building|keep shipping|keep believing|dreams|success|failure)\b/.test(t)) {
    return { tension: "motivation fatigue", problem: "motivation posts get scrolled past", angle: "contrarian" };
  }

  // AI hype → what's the real tension?
  if (/\b(ai is going to|ai will|ai is going to change|ai is going to revolutionize)\b/.test(t)) {
    return { tension: "AI anxiety", problem: "vague AI claims don't help anyone", angle: "contrarian" };
  }

  // "Here are N tips" → what's the real tension?
  if (/\b(here are \d+ tips|here are some tips)\b/.test(t)) {
    const topic = extractTopic(text);
    return { tension: "generic advice", problem: `generic ${topic || "productivity"} tips don't work`, angle: "contrarian" };
  }

  // Changelog → what's the real tension?
  if (/\b(shipped|dark mode|api|bug fix|updated|docs|changelog)\b/.test(t) && t.length < 200) {
    return { tension: "changelog fatigue", problem: "changelogs get scrolled past — show the impact instead", angle: "receipt" };
  }

  // "Day in the life" → what's the real tension?
  // Check this BEFORE "vague product claim" since routine posts often say "amazing"
  if (/\b(woke up at \d|day in the life|had coffee|had lunch|had a meeting|daily routine)\b/.test(t)) {
    return { tension: "boring routine", problem: "nobody cares about your daily routine", angle: "story" };
  }

  // "I just built something" → what's the real tension?
  if (/\b(i just built something|i built something|disrupt|amazing|incredible)\b/.test(t)) {
    return { tension: "vague product claim", problem: "vague claims don't stop the scroll", angle: "curiosity" };
  }

  // "Building in public" → what's the real tension?
  if (/\b(building in public|build in public|bip|shipping|momentum)\b/.test(t)) {
    return { tension: "BIP fatigue", problem: "building in public posts are everywhere — show the result instead", angle: "receipt" };
  }

  // "Excited to share guide" → what's the real tension?
  if (/\b(excited to share|just published|new guide|free guide|like and retweet)\b/.test(t)) {
    return { tension: "lead gen bait", problem: "lead gen bait gets scrolled past", angle: "curiosity" };
  }

  // "After months of building" → what's the real tension?
  if (/\b(after \d+ months|after months of)\b/.test(t)) {
    return { tension: "time investment", problem: "time spent building isn't interesting — the result is", angle: "receipt" };
  }

  // "If you're not using" → what's the real tension?
  if (/\b(if you'?re not using|already behind)\b/.test(t)) {
    return { tension: "FOMO", problem: "FOMO posts feel manipulative", angle: "contrarian" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// The 100 Hook Library
// Ordered by virality ceiling (highest first)
// ---------------------------------------------------------------------------

const HOOK_LIBRARY = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. THE RECEIPT (proof, numbers, results) — HIGHEST CEILING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "receipt_tested",
    category: "receipt",
    template: "I tested [N] [things]. Only [smaller N] worked.",
    bestFor: "When you ran an experiment with specific results",
    fill(text, analysis) {
      // Only fire if the post actually mentions testing/experimenting
      if (!/\b(tested|tried|experimented|ran|audited|analyzed)\b/i.test(text)) return null;
      const counts = analysis.mustPreserve.counts;
      if (counts.length > 0) {
        const n = counts[0].match(/\d+/)?.[0];
        return `I tested ${n} things. Only 3 worked.`;
      }
      return null;
    },
  },
  {
    id: "receipt_did_for_time",
    category: "receipt",
    template: "I [did specific thing] for [time period]. Here's what happened.",
    bestFor: "When you did something consistently for a period",
    fill(text, analysis) {
      const times = analysis.mustPreserve.timePeriods;
      // Only fire if there's a real action verb AND a time period that's a duration (not "3 months of building")
      if (times.length > 0 && /\b(i|we)\b/i.test(text)) {
        const action = text.match(/\b(built|shipped|launched|tested|tried|ran|posted|wrote)\b/i)?.[0]?.toLowerCase();
        // Don't fire if the time period is part of "X months of building" — that's a launch, not an experiment
        if (action && !/\b\d+ months? of building\b/i.test(text)) {
          return `I ${action} for ${times[0]}. here's what happened.`;
        }
      }
      return null;
    },
  },
  {
    id: "receipt_accomplishment",
    category: "receipt",
    template: "[Big accomplishment] — here are [N] lessons.",
    bestFor: "When you achieved something specific",
    fill(text, analysis) {
      // Only fire if there's actual money or a real accomplishment claim
      if (analysis.mustPreserve.money.length > 0) {
        return `${analysis.mustPreserve.money[0]}. here are 3 lessons.`;
      }
      // Don't fabricate accomplishments from time periods
      return null;
    },
  },
  {
    id: "receipt_audited",
    category: "receipt",
    template: "I audited [N] [things]. Here are [N] tips to [outcome].",
    bestFor: "When you analyzed multiple examples",
    fill(text, analysis) {
      // Only fire if the post actually mentions auditing/analyzing
      if (!/\b(audited|analyzed|studied|reviewed|looked at)\b/i.test(text)) return null;
      const counts = analysis.mustPreserve.counts;
      if (counts.length > 0) {
        const n = counts[0].match(/\d+/)?.[0];
        return `I audited ${n} posts. Here are 3 things that actually work.`;
      }
      return null;
    },
  },
  {
    id: "receipt_went_from",
    category: "receipt",
    template: "How I went from [past situation] to [result] in [time].",
    bestFor: "When you have a before/after transformation",
    fill(text, analysis) {
      if (analysis.mustPreserve.money.length > 0 && analysis.mustPreserve.timePeriods.length > 0) {
        return `how I went from $0 to ${analysis.mustPreserve.money[0]} in ${analysis.mustPreserve.timePeriods[0]}.`;
      }
      return null;
    },
  },
  {
    id: "receipt_proof",
    category: "receipt",
    template: "Here's proof that [claim everyone doubts].",
    bestFor: "When you have evidence for a surprising claim",
    fill(text, analysis) {
      if (analysis.mustPreserve.timePeriods.length >= 2) {
        return `here's proof that it works.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CONTRARIAN / MYTH-BUSTER — HIGHEST CEILING, POLARIZING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "contrarian_most_think",
    category: "contrarian",
    template: "Most people think [common belief]. Here's why they're wrong.",
    bestFor: "When you challenge a common belief",
    fill(text, analysis) {
      const tension = extractTension(text, analysis);
      if (tension && tension.angle === "contrarian") {
        const topic = extractTopic(text);
        // Use topic only if it's a meaningful concept, not a feature
        if (topic && topic.length > 3 && !/^(dashboard|api|dark mode|fix|saas|platform|app|tool|feature|changelog|docs|onboarding|analytics)$/i.test(topic)) {
          return `most people think ${topic} is the answer. it's not.`;
        }
        // Fall back to tension-based contrarian
        if (tension.tension === "motivation fatigue") return `most people quit right before it works.`;
        if (tension.tension === "AI anxiety") return `AI isn't going to replace you. someone using AI will.`;
        if (tension.tension === "FOMO") return `FOMO marketing doesn't work anymore.`;
        if (tension.tension === "vague success") return `gratitude is overrated.`;
        if (tension.tension === "launch anxiety") return `most launches get ignored. here's why.`;
        if (tension.tension === "BIP fatigue") return `building in public is overrated.`;
        if (tension.tension === "changelog fatigue") return `changelogs don't get read. here's what does.`;
        if (tension.tension === "lead gen bait") return `lead gen bait doesn't work anymore.`;
        if (tension.tension === "generic advice") return `productivity tips are overrated.`;
        if (tension.tension === "boring routine") return `nobody cares about your daily routine.`;
        if (tension.tension === "vague product claim") return `vague claims don't stop the scroll.`;
        if (tension.tension === "time investment") return `nobody cares how long you spent building.`;
        return null; // don't produce generic "most people are doing this wrong"
      }
      return null;
    },
  },
  {
    id: "contrarian_dead",
    category: "contrarian",
    template: "[Common practice] is dead. Stop doing it for [outcome].",
    bestFor: "When a common practice no longer works",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(posting daily|hashtag|seo|cold email|ads|blogging|newsletter)\b/.test(t)) {
        const practice = text.match(/\b(posting daily|hashtag\w*|seo|cold email\w*|ads|blogging|newsletter\w*)\b/i)?.[0]?.toLowerCase();
        if (practice) return `${practice} is dead. here's what replaced it.`;
      }
      return null;
    },
  },
  {
    id: "contrarian_overrated",
    category: "contrarian",
    template: "[Topic] is overrated.",
    bestFor: "When you have a strong opinion against a popular thing",
    fill(text, analysis) {
      const topic = extractTopic(text);
      // Only call things overrated when it makes sense — abstract concepts, not features
      if (topic && /\b(motivation|productivity|building in public|daily routines|gratitude|milestones|guides|quitting|failure)\b/.test(topic)) {
        return `${topic} is overrated.`;
      }
      return null;
    },
  },
  {
    id: "contrarian_unpopular",
    category: "contrarian",
    template: "Unpopular opinion: [contrarian take].",
    bestFor: "When you have a genuinely unpopular opinion",
    fill(text, analysis) {
      const tension = extractTension(text, analysis);
      if (tension && tension.angle === "contrarian") {
        const topic = extractTopic(text);
        if (topic && /\b(motivation|productivity|building in public|daily routines|gratitude|milestones|guides|quitting|failure)\b/.test(topic)) {
          return `unpopular opinion: ${topic} is overrated.`;
        }
      }
      return null;
    },
  },
  {
    id: "contrarian_everything_wrong",
    category: "contrarian",
    template: "Everything you know about [subject] is wrong.",
    bestFor: "When you can challenge an entire field's assumptions",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(marketing|seo|copywriting|sales|pricing|engagement|content|growing on x|video editing|productivity)\b/.test(topic)) {
        return `everything you know about ${topic} is wrong.`;
      }
      return null;
    },
  },
  {
    id: "contrarian_quit_result",
    category: "contrarian",
    template: "I quit [thing everyone does] and [positive result].",
    bestFor: "When you stopped doing something common and got better results",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(quit|stopped|gave up)\b/.test(t)) {
        const quitWhat = text.match(/\b(?:quit|stopped|gave up)\s+(\w+)/i)?.[1]?.toLowerCase();
        if (quitWhat) return `I quit ${quitWhat}. my engagement doubled.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. NEGATIVE FRAME / MISTAKE CALLOUT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "negative_mistakes",
    category: "negative",
    template: "[N] mistakes you're making with [task].",
    bestFor: "When you can point out common mistakes",
    fill(text, analysis) {
      const topic = extractTopic(text);
      // Only use this hook if the topic is a meaningful activity/area
      if (topic && /\b(marketing|seo|copywriting|sales|outreach|pricing|onboarding|churn|retention|engagement|content|thread|newsletter|productivity|focus|automation|workflow|coding|design|positioning|growing on x|video editing|building in public)\b/.test(topic)) {
        return `3 mistakes you're making with ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "negative_stop",
    category: "negative",
    template: "Stop doing [common action] right now.",
    bestFor: "When a common action is harmful",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(posting daily|posting every day|building in public|cold email|hashtag)\b/.test(t)) {
        const action = text.match(/\b(posting daily|posting every day|building in public|cold email\w*|hashtag\w*)\b/i)?.[0]?.toLowerCase();
        if (action) return `stop ${action}. here's what actually works.`;
      }
      return null;
    },
  },
  {
    id: "negative_dont",
    category: "negative",
    template: "Don't [common action] until you [prerequisite].",
    bestFor: "When there's a prerequisite people skip",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(launch|start|build|ship|post|write|scale|hire|raise)\b/.test(topic)) {
        return `don't ${topic} until you read this.`;
      }
      return null;
    },
  },
  {
    id: "negative_failing",
    category: "negative",
    template: "Here's why you're failing at [task].",
    bestFor: "When you can diagnose why people fail",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(marketing|seo|copywriting|sales|outreach|pricing|onboarding|churn|retention|engagement|content|growing on x|video editing|building in public)\b/.test(topic)) {
        return `here's why you're failing at ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "negative_same_mistake",
    category: "negative",
    template: "Don't make the same mistake I did with [thing].",
    bestFor: "When you made a mistake others can learn from",
    fill(text, analysis) {
      if (analysis.emotion === "vulnerability" || /\b(failed|mistake|wrong|lost)\b/i.test(text)) {
        const topic = extractTopic(text);
        if (topic) return `don't make the same mistake I did with ${topic}.`;
        return `don't make the same mistake I did.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. STOLEN LESSONS / STEAL THIS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "stolen_copied",
    category: "stolen",
    template: "I copied [specific thing]. Here's what happened.",
    bestFor: "When you copied a tactic from someone",
    fill(text, analysis) {
      if (/\b(copied|stole|borrowed|reverse.?engineer)\b/i.test(text)) {
        return `I copied their exact system. here's what happened.`;
      }
      return null;
    },
  },
  {
    id: "stolen_famous",
    category: "stolen",
    template: "[Famous person] makes [money] a month. We're about to steal it.",
    bestFor: "When you analyzed a successful person's system",
    fill(text, analysis) {
      if (analysis.mustPreserve.money.length > 0 && /\b(guy|he|she|they|this)\b/i.test(text)) {
        return `this guy makes ${analysis.mustPreserve.money[0]}/month. we're about to steal his system.`;
      }
      return null;
    },
  },
  {
    id: "stolen_doesnt_tell",
    category: "stolen",
    template: "Here's what [celebrity/influencer] doesn't tell you about [topic].",
    bestFor: "When you have insider knowledge",
    fill(text, analysis) {
      const topic = extractTopic(text);
      // Only use for specific actionable topics
      if (topic && /\b(growing on x|video editing|pricing|onboarding|churn|retention|engagement|conversion|copywriting|outreach|startups failing|marketing|seo|sales)\b/.test(topic)) {
        return `here's what nobody tells you about ${topic}.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CURIOSITY GAP / OPEN LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "curiosity_illegal",
    category: "curiosity",
    template: "[N] things that feel illegal to know.",
    bestFor: "When you have surprising insider knowledge",
    fill(text, analysis) {
      return `3 things that feel illegal to know.`;
    },
  },
  {
    id: "curiosity_nobody_tells",
    category: "curiosity",
    template: "Here's what nobody tells you about [topic].",
    bestFor: "When you have counterintuitive knowledge",
    fill(text, analysis) {
      const topic = extractTopic(text);
      // Only use this for specific actionable topics — not features, not abstract concepts
      if (topic && /\b(growing on x|video editing|pricing|onboarding|churn|retention|engagement|conversion|copywriting|outreach|startups failing)\b/.test(topic)) {
        return `here's what nobody tells you about ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_hidden_truth_topic",
    category: "curiosity",
    template: "Here's the hidden truth about [topic].",
    bestFor: "When you uncovered something non-obvious about a specific topic",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(AI|marketing|seo|sales|pricing|engagement|content|productivity|building in public|startup|industry disruption)\b/.test(topic)) {
        return `here's the hidden truth about ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_wish_knew_before",
    category: "curiosity",
    template: "Here's what I wish I knew before I started [topic].",
    bestFor: "When you have lessons from starting something",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(growing on x|video editing|building in public|startup|quitting|industry disruption)\b/.test(topic)) {
        return `here's what I wish I knew before I started ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_cant_believe",
    category: "curiosity",
    template: "I can't believe no one told me this.",
    bestFor: "When you discovered something surprising",
    fill(text, analysis) {
      if (analysis.emotion === "shock" || analysis.emotion === "triumph") {
        return `I can't believe no one told me this.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_hidden_truth",
    category: "curiosity",
    template: "Here's the hidden truth about [situation].",
    bestFor: "When you uncovered something non-obvious",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(AI|marketing|seo|sales|pricing|engagement|content|productivity|building in public|startup|industry disruption)\b/.test(topic)) {
        return `here's the hidden truth about ${topic}.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_wish_knew",
    category: "curiosity",
    template: "Here's what I wish I knew before I started.",
    bestFor: "When you have lessons from experience",
    fill(text, analysis) {
      // Only fire if there's actual content/lessons to share
      if (/\b(started|began|launched|built)\b/i.test(text) && analysis.tension !== "time investment" && analysis.tension !== "launch anxiety") {
        return `here's what I wish I knew before I started.`;
      }
      return null;
    },
  },
  {
    id: "curiosity_happened_when",
    category: "curiosity",
    template: "Here's what happened when I tried [action].",
    bestFor: "When you tried something and got surprising results",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic) return `here's what happened when I tried ${topic}.`;
      return null;
    },
  },
  {
    id: "curiosity_not_talking",
    category: "curiosity",
    template: "I can't believe more people aren't talking about this.",
    bestFor: "When you found something undervalued",
    fill(text, analysis) {
      if (analysis.primaryType === "contrarian_take" || analysis.primaryType === "absurd_niche") {
        return `I can't believe more people aren't talking about this.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. LISTICLE / NUMBER HOOK
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "listicle_wish_knew",
    category: "listicle",
    template: "[N] things about [niche] I wish I knew earlier.",
    bestFor: "When you have lessons from experience",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(marketing|seo|copywriting|sales|pricing|engagement|content|growing on x|video editing|productivity|building in public|saas|startup|founder)\b/.test(topic)) {
        return `3 things about ${topic} I wish I knew earlier.`;
      }
      return null;
    },
  },
  {
    id: "listicle_tools",
    category: "listicle",
    template: "[N] [niche] tools that save you hundreds of hours.",
    bestFor: "When you have a tools list",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic && /\b(marketing|seo|copywriting|sales|video editing|automation|workflow|coding|design)\b/.test(topic)) {
        return `3 ${topic} tools that save you hundreds of hours.`;
      }
      return null;
    },
  },
  {
    id: "listicle_skip",
    category: "listicle",
    template: "[N] things I learned from this (most people skip #[N]).",
    bestFor: "When you have lessons with a key insight",
    fill(text, analysis) {
      // Only use this if the post actually has lessons/content — not for launches or changelogs
      if (analysis.tension === "launch anxiety" || analysis.tension === "changelog fatigue") return null;
      if (/\b(learned|lessons|tips|things|mistakes)\b/i.test(text) || (analysis.mustPreserve.counts.length > 0 && /\b(tips|things|ways|steps)\b/i.test(text))) {
        const num = analysis.mustPreserve.counts[0]?.match(/\d+/)?.[0] || "5";
        return `${num} things I learned from this (most people skip #4)`;
      }
      return null;
    },
  },
  {
    id: "listicle_stop_doing",
    category: "listicle",
    template: "[N] things you need to stop doing right now.",
    bestFor: "When you have common mistakes to flag",
    fill(text, analysis) {
      return `3 things you need to stop doing right now.`;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SECRET / INSIDER
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "secret_industry",
    category: "secret",
    template: "[Industry] does not want you to know this secret.",
    bestFor: "When you have insider industry knowledge",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(saas|startup|marketing|seo|ads|agency)\b/.test(t)) {
        const industry = text.match(/\b(saas|startup|marketing|seo|ads|agency)\b/i)?.[0]?.toLowerCase();
        if (industry) return `the ${industry} industry doesn't want you to know this.`;
      }
      return null;
    },
  },
  {
    id: "secret_learned_hard",
    category: "secret",
    template: "Here's a secret I learned the hard way.",
    bestFor: "When you learned from failure",
    fill(text, analysis) {
      if (analysis.emotion === "vulnerability" || /\b(failed|mistake|wrong|lost)\b/i.test(text)) {
        return `here's a secret I learned the hard way.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. AUDIENCE CALLOUT / PATTERN INTERRUPT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "audience_stop_scrolling",
    category: "audience",
    template: "[Specific group], stop scrolling.",
    bestFor: "When you're speaking to a specific niche",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(founders?|developers?|creators?|marketers?|designers?|indie)\b/.test(t)) {
        const group = text.match(/\b(founders?|developers?|creators?|marketers?|designers?|indie hackers?)\b/i)?.[0]?.toLowerCase();
        if (group) return `${group}, stop scrolling.`;
      }
      return null;
    },
  },
  {
    id: "audience_99_percent",
    category: "audience",
    template: "99% of [audience] don't understand this.",
    bestFor: "When you have a insight most people miss",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(founders?|developers?|creators?|marketers?)\b/.test(t)) {
        const group = text.match(/\b(founders?|developers?|creators?|marketers?)\b/i)?.[0]?.toLowerCase();
        if (group) return `99% of ${group} don't understand this.`;
      }
      return null;
    },
  },
  {
    id: "audience_will_never_admit",
    category: "audience",
    template: "[Target audience] will never admit these secrets.",
    bestFor: "When you have secrets from a specific group",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(founders?|developers?|creators?|marketers?|agencies?)\b/.test(t)) {
        const group = text.match(/\b(founders?|developers?|creators?|marketers?|agencies?)\b/i)?.[0]?.toLowerCase();
        if (group) return `${group} will never admit these 3 things.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. QUESTION HOOK
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "question_did_you_know",
    category: "question",
    template: "Did you know [shocking statistic]?",
    bestFor: "When you have a surprising stat",
    fill(text, analysis) {
      if (analysis.mustPreserve.percents.length > 0) {
        return `did you know ${analysis.mustPreserve.percents[0]} of people quit before this?`;
      }
      return null;
    },
  },
  {
    id: "question_still",
    category: "question",
    template: "Are you still [common action]?",
    bestFor: "When a common action is outdated",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(posting|building|writing|using|doing)\b/.test(t)) {
        const action = text.match(/\b(posting|building|writing|using|doing)\b/i)?.[0]?.toLowerCase();
        if (action) return `are you still ${action} the old way?`;
      }
      return null;
    },
  },
  {
    id: "question_ever_wonder",
    category: "question",
    template: "Ever wonder why [pain point] keeps happening?",
    bestFor: "When you can diagnose a recurring problem",
    fill(text, analysis) {
      const topic = extractTopic(text);
      // Only fire for topics where failure is a known pattern, and only if the post isn't about a launch/success
      if (topic && /\b(marketing|seo|copywriting|sales|pricing|engagement|content|growing on x|video editing|productivity|building in public|startups failing)\b/.test(topic)) {
        if (!/\b(launched|shipped|built|finally|success|milestone)\b/i.test(text)) {
          return `ever wonder why ${topic} keeps failing?`;
        }
      }
      return null;
    },
  },
  {
    id: "question_why",
    category: "question",
    template: "Why do [X] still [Y]?",
    bestFor: "When there's a persistent problem nobody fixed",
    fill(text, analysis) {
      const t = text.toLowerCase();
      // "I spent months figuring out why X" → "why do X"
      const whyMatch = text.match(/figuring out why (.+?)(?:\.|$)/i) || text.match(/why (.+?)(?:\.|$)/i);
      if (whyMatch) {
        let q = whyMatch[1].trim().replace(/\.$/, "");
        if (!/^(why|how|what|when|where|who)/i.test(q)) q = "why do " + q;
        if (!q.endsWith("?")) q += "?";
        return q;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. TRANSFORMATION / BEFORE-AFTER / STORY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "story_before_after",
    category: "story",
    template: "[Time/place], I [unexpected situation]. [Cliffhanger].",
    bestFor: "When you have a personal story with a turning point",
    fill(text, analysis) {
      if (analysis.emotion === "vulnerability") {
        if (/\b(quit|left|failed|lost|broke)\b/i.test(text)) {
          return `3 months ago, I was ready to quit.`;
        }
      }
      return null;
    },
  },
  {
    id: "story_stripe",
    category: "story",
    template: "Last [time], I got a [notification] that changed everything.",
    bestFor: "When you had a moment that changed everything",
    fill(text, analysis) {
      if (analysis.mustPreserve.money.length > 0) {
        return `last month, I got a Stripe notification that changed everything.`;
      }
      return null;
    },
  },
  {
    id: "story_in_medias_res",
    category: "story",
    template: "I was about to [action] when I noticed [something].",
    bestFor: "When you had a near-miss or discovery moment",
    fill(text, analysis) {
      if (/\b(about to|almost|was going to)\b/i.test(text)) {
        return `I was about to give up when I noticed something.`;
      }
      return null;
    },
  },
  {
    id: "story_debt_to_success",
    category: "story",
    template: "Three months ago, I was [bad situation]. Today I [good situation].",
    bestFor: "When you have a clear before/after",
    fill(text, analysis) {
      if (analysis.mustPreserve.money.length > 0 && analysis.emotion === "triumph") {
        return `3 months ago, I was at $0. today I hit ${analysis.mustPreserve.money[0]}.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. CONFESSION / VULNERABLE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "confession_wrong",
    category: "confession",
    template: "I was wrong about [topic].",
    bestFor: "When you changed your mind",
    fill(text, analysis) {
      if (analysis.emotion === "vulnerability" || /\b(wrong|mistake|failed)\b/i.test(text)) {
        const topic = extractTopic(text);
        if (topic) return `I was wrong about ${topic}.`;
        return `I was wrong.`;
      }
      return null;
    },
  },
  {
    id: "confession_hate",
    category: "confession",
    template: "I hate [common thing everyone loves].",
    bestFor: "When you have a genuinely unpopular preference",
    fill(text, analysis) {
      if (analysis.primaryType === "contrarian_take" || analysis.tension === "BIP fatigue") {
        const topic = extractTopic(text);
        // Only hate on abstract concepts, not features
        if (topic && /\b(building in public|productivity|motivation|daily routines|gratitude|milestones|guides|quitting|failure|morning routines|cold email|hashtag|seo)\b/.test(topic)) {
          return `I hate ${topic}.`;
        }
      }
      return null;
    },
  },
  {
    id: "confession_almost_quit",
    category: "confession",
    template: "I almost quit [time period] ago.",
    bestFor: "When you nearly gave up",
    fill(text, analysis) {
      if (analysis.emotion === "vulnerability") {
        const times = analysis.mustPreserve.timePeriods;
        if (times.length > 0) return `I almost quit ${times[0]} ago.`;
        return `I almost quit.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. PATTERN INTERRUPT / STOP-SCROLL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "interrupt_stop",
    category: "interrupt",
    template: "Stop scrolling. [Unexpected statement].",
    bestFor: "When you need to force attention",
    fill(text, analysis) {
      const tension = extractTension(text, analysis);
      if (tension && tension.problem) {
        return `stop scrolling. ${tension.problem}.`;
      }
      return null;
    },
  },
  {
    id: "interrupt_wait",
    category: "interrupt",
    template: "Wait. Before you [action], you need to hear this.",
    bestFor: "When you have a warning before an action",
    fill(text, analysis) {
      const t = text.toLowerCase();
      if (/\b(launch|post|ship|build|start)\b/.test(t)) {
        const action = text.match(/\b(launch|post|ship|build|start)\b/i)?.[0]?.toLowerCase();
        if (action) return `wait. before you ${action}, you need to hear this.`;
      }
      return null;
    },
  },
  {
    id: "interrupt_dont_skip",
    category: "interrupt",
    template: "Don't skip this. [Important statement].",
    bestFor: "When you have critical information",
    fill(text, analysis) {
      const tension = extractTension(text, analysis);
      if (tension) {
        return `don't skip this. ${tension.problem}.`;
      }
      return null;
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. SPEED / EFFORTLESS / FUTURE PACING
  // ═══════════════════════════════════════════════════════════════════════════
  // (moved below)

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. TENSION-DERIVED HOOKS — for vague posts with no facts
  // These fire when the post has no concrete facts to build from.
  // They use the implicit tension/problem detected by extractTension().
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "tension_motivation",
    category: "contrarian",
    template: "most people quit right before it works.",
    bestFor: "Vague motivation posts",
    fill(text, analysis) {
      if (analysis.tension === "motivation fatigue") {
        return `most people quit right before it works.`;
      }
      return null;
    },
  },
  {
    id: "tension_gratitude",
    category: "contrarian",
    template: "gratitude is overrated.",
    bestFor: "Vague gratitude/milestone posts",
    fill(text, analysis) {
      if (analysis.tension === "vague success") {
        return `gratitude is overrated.`;
      }
      return null;
    },
  },
  {
    id: "tension_ai",
    category: "contrarian",
    template: "AI isn't going to replace you. someone using AI will.",
    bestFor: "Vague AI hype posts",
    fill(text, analysis) {
      if (analysis.tension === "AI anxiety") {
        return `AI isn't going to replace you. someone using AI will.`;
      }
      return null;
    },
  },
  {
    id: "tension_fomo",
    category: "contrarian",
    template: "FOMO marketing doesn't work anymore.",
    bestFor: "FOMO posts",
    fill(text, analysis) {
      if (analysis.tension === "FOMO") {
        return `FOMO marketing doesn't work anymore.`;
      }
      return null;
    },
  },
  {
    id: "tension_bip",
    category: "contrarian",
    template: "building in public is overrated.",
    bestFor: "Building in public posts",
    fill(text, analysis) {
      if (analysis.tension === "BIP fatigue") {
        return `building in public is overrated.`;
      }
      return null;
    },
  },
  {
    id: "tension_lead_gen",
    category: "curiosity",
    template: "here's what actually works on X.",
    bestFor: "Lead gen bait posts",
    fill(text, analysis) {
      if (analysis.tension === "lead gen bait") {
        return `here's what actually works on X.`;
      }
      return null;
    },
  },
  {
    id: "tension_routine",
    category: "story",
    template: "I woke up at 5am today. here's what nobody tells you about routines.",
    bestFor: "Day-in-the-life posts",
    fill(text, analysis) {
      if (analysis.tension === "boring routine") {
        return `I woke up at 5am today. here's what nobody tells you about routines.`;
      }
      return null;
    },
  },
  {
    id: "tension_vague_product",
    category: "curiosity",
    template: "I built something I can't stop using.",
    bestFor: "Vague product claim posts",
    fill(text, analysis) {
      if (analysis.tension === "vague product claim") {
        return `I built something I can't stop using.`;
      }
      return null;
    },
  },
  {
    id: "tension_time_investment",
    category: "receipt",
    template: "[N] months. 1 product. it's live.",
    bestFor: "After months of building posts",
    fill(text, analysis) {
      if (analysis.tension === "time investment") {
        const monthsMatch = text.match(/after (\d+) months?/i);
        const months = monthsMatch ? monthsMatch[1] : "3";
        return `${months} months. 1 product. it's live.`;
      }
      return null;
    },
  },
  {
    id: "tension_changelog",
    category: "receipt",
    template: "we shipped this week.",
    bestFor: "Changelog posts",
    fill(text, analysis) {
      if (analysis.tension === "changelog fatigue" && analysis.tension !== "launch anxiety") {
        // If it's a v2.0 launch with features, use a different hook
        if (/v\d\.\d/.test(text)) return null;
        return `we shipped this week.`;
      }
      return null;
    },
  },
  {
    id: "tension_launch",
    category: "contrarian",
    template: "most launches get ignored. here's why.",
    bestFor: "Corporate launch posts",
    fill(text, analysis) {
      if (analysis.tension === "launch anxiety") {
        // v2.0 launches get a different hook
        if (/v\d\.\d/.test(text)) return `v2 launches don't get attention. v1 problems do.`;
        return `most launches get ignored. here's why.`;
      }
      return null;
    },
  },
  {
    id: "tension_generic_advice",
    category: "contrarian",
    template: "productivity tips are overrated.",
    bestFor: "Generic advice posts",
    fill(text, analysis) {
      if (analysis.tension === "generic advice") {
        const topic = extractTopic(text);
        if (topic && topic !== "tips") return `${topic} is overrated.`;
        return `productivity tips are overrated.`;
      }
      return null;
    },
  },
  {
    id: "speed_time",
    category: "speed",
    template: "edited this entire [N] minute [thing] in just [N] minutes.",
    bestFor: "When you have a time compression result",
    fill(text, analysis) {
      const times = analysis.mustPreserve.timePeriods;
      if (times.length >= 2) {
        const actionMatch = text.match(/(edited|built|shipped|wrote|created|made)\s+(?:this|a|an|the)?\s*(?:entire|whole)?\s*(\d+\s*(?:minute|hour|day|week)\w*)\s+(\w+)?\s+in\s+(?:just\s+)?(\d+\s*(?:minute|hour|day|second)\w*)/i);
        if (actionMatch) {
          return `${actionMatch[1].toLowerCase()} this entire ${actionMatch[2]} in just ${actionMatch[4]}.`;
        }
      }
      return null;
    },
  },
  {
    id: "speed_hours_saved",
    category: "speed",
    template: "[N] hours saved per week after [action].",
    bestFor: "When you saved time with a tool/method",
    fill(text, analysis) {
      if (analysis.mustPreserve.timePeriods.length > 0 && /\b(saved|cut|reduced|faster)\b/i.test(text)) {
        return `7 hours saved per week. here's how.`;
      }
      return null;
    },
  },
  {
    id: "future_pacing",
    category: "speed",
    template: "In [time frame], you'll wish you started [action] today.",
    bestFor: "When you want to create urgency",
    fill(text, analysis) {
      const topic = extractTopic(text);
      if (topic) return `in 12 months, you'll wish you started ${topic} today.`;
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Main function: generate hooks from the library for a given post
// ---------------------------------------------------------------------------
function generateHooks(text, analysis) {
  const hooks = [];

  for (const hookDef of HOOK_LIBRARY) {
    try {
      const hook = hookDef.fill(text, analysis);
      if (hook && hook.length >= 5 && hook.length <= 120) {
        // Skip duplicates
        if (hooks.some((h) => h.hook === hook)) continue;
        // Run the first-3-words test
        const first3 = hook.split(/\s+/).slice(0, 3).join(" ");
        const passesTest = !/^(here'?s what|hope this|just wanted|i am|we are|this is)/i.test(first3);
        hooks.push({
          hook,
          category: hookDef.category,
          id: hookDef.id,
          first3Words: first3,
          passesTest,
        });
      }
    } catch {}
  }

  // Sort by category virality ceiling
  const categoryOrder = ["receipt", "contrarian", "negative", "stolen", "curiosity", "listicle", "secret", "audience", "question", "story", "confession", "interrupt", "speed"];
  hooks.sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return ai - bi;
  });

  return hooks;
}

module.exports = {
  HOOK_LIBRARY,
  generateHooks,
  extractTopic,
  extractTension,
};
