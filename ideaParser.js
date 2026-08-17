/*
 * Idea parser — understands any input and extracts its core meaning.
 *
 * The user might type:
 *   - A short topic: "building a SaaS"
 *   - A full idea: "most founders waste time building features nobody asks for"
 *   - A rough draft: "I think the problem with most startups is they don't talk to users enough and just build in a vacuum"
 *   - A vague thought: "want to post about how I quit my job to go indie"
 *   - A question: "why do most newsletters fail?"
 *
 * This parser:
 *   1. Detects the input type (topic, idea, draft, question, story)
 *   2. Extracts the core insight/claim
 *   3. Maps it to a domain using semantic matching (not just keywords)
 *   4. Returns a structured idea that the content engine can use
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const { DOMAIN_KEYWORDS, INSIGHT_DATABASE, mapTopicToDomain } = require("./angleFinder");

// ---------------------------------------------------------------------------
// Input type detection
// ---------------------------------------------------------------------------

function detectInputType(input) {
  const text = input.trim();
  const words = text.split(/\s+/).length;
  const lower = text.toLowerCase();

  // Problem list — multi-line input where each line is a pain point or feature description.
  // e.g., "Spending hours manually watching raw footage...\nStarting every video from a blank timeline..."
  // These are lists of problems a product fixes, features, or pain points.
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 5);
  if (lines.length >= 3) {
    // Check if lines look like a list of problems/features (not a story or paragraph)
    // Heuristics: each line is a standalone phrase, starts with common problem patterns
    const problemPatterns = /\b(spending|starting|having|needing|wanting|paying|delaying|turning|manually|not knowing|inconsistent|reformatting|long pauses|slow openings|talking.head|growing folder|creating captions|finding possible|spending creative|every video|every recording)\b/i;
    const featurePatterns = /\b(allows you to|lets you|automatically|generates|creates|finds|trims|removes|detects|extracts|converts|transforms|edits|cuts|syncs|exports)\b/i;
    const matchingLines = lines.filter(l => problemPatterns.test(l) || featurePatterns.test(l)).length;
    // If most lines match problem/feature patterns, it's a list
    if (matchingLines >= Math.ceil(lines.length * 0.5)) {
      return "problem_list";
    }
    // Also detect bullet-style lists (lines starting with -, *, •, or numbers)
    const bulletLines = lines.filter(l => /^[-*•]|\d+\.\s/.test(l)).length;
    if (bulletLines >= 2 && lines.length >= 3) {
      return "problem_list";
    }
  }

  // Question — starts with why/how/what/should/is/are/can/do
  if (/^(why|how|what|should|is|are|can|do|does|will|would|could)\b/i.test(text) && text.includes("?")) {
    return "question";
  }

  // Outreach/partnership/offer — user is describing a deal, pitch, or partnership
  // This must be checked BEFORE the story/draft checks because outreach messages
  // often start with "I" and contain verbs, but they're NOT stories — they're offers.
  if (/\b(outreach|reach out|partnership|affiliate|collab|collaboration|deal|offer|free subscription|free access|in return|wanted to ask|interested in giving|allowing me|give me your|give you|pitch|cold dm|cold email|partnership offer)\b/i.test(lower)) {
    return "outreach";
  }

  // Story/personal — starts with I/my/we and has verbs
  // BUT: only classify as story if it has numbers or a real narrative arc.
  // "I started a tea business" is a topic description, not a story.
  // "I spent 18 months building X and made $50k" is a real story.
  if (/^(i |my |we |i'm|i've|i'll)/i.test(text) && /\b(was|did|built|shipped|launched|failed|quit|started|learned|realized|spent|made|lost|gained|tried|tested|tracked|replaced|deleted|raised|bootstrapped|opened|founded|created|released|published|posted|finished|completed|began|joined|hired|enrolled|signed up)\b/i.test(lower)) {
    // Confession/vulnerability patterns — "I made $0", "I failed", "I lost everything"
    // These should be ideas (generateTopicPosts handles confession context), NOT stories.
    if (/\b(failed|made \$?0|made 0|lost everything|lost it all|went bankrupt|had to close|shut it down|gave up|was wrong|wasted|screwed up|messed up|blew it)\b/i.test(lower)) {
      return "idea";
    }
    // Has numbers AND a real narrative arc (contrast/outcome words) → real story with results
    // "I spent 18 months building X and made $50k" is a story. "I made 0" is not.
    if (/\d/.test(text) && /\b(then|but|so|because|after|before|when|while|until|eventually|finally|and|or)\b/i.test(lower)) return "story";
    // Has narrative arc words (contrast, outcome) → real story
    if (/\b(then|but|so|because|after|before|when|while|until|eventually|finally)\b/i.test(lower)) return "story";
    // Otherwise it's a topic/idea description like "I started a tea business"
    // → treat as idea so generateTopicPosts handles it
    return "idea";
  }

  // Story REQUEST — user is asking for a story format, not giving a topic
  // "saas founder story" / "founder journey" / "story about building a SaaS"
  if (/\b(founder story|founder journey|startup story|saas story|entrepreneur story|build.*story|story about|tell.*story|my journey|the journey)\b/i.test(lower)) {
    return "story_request";
  }

  // Rough draft — long (50+ words) or has multiple sentences
  if (words > 40 || (text.match(/[.!?]/g) || []).length >= 3) {
    return "draft";
  }

  // Idea/claim — a full sentence with a point of view (10+ words, has a verb)
  if (words >= 8 && /\b(is|are|was|were|do|does|don't|doesn't|should|need|want|must|can't|won't|never|always|most|nobody|everyone|the problem|the secret|the truth|the key|the real|the best|the worst)\b/i.test(lower)) {
    return "idea";
  }

  // Short topic — 1-5 words, no sentence structure
  // BUT if it contains an opinion word (overrated, bad, good, dead, etc.), treat it as an idea
  if (words <= 6) {
    if (/\b(overrated|underrated|bad|good|dead|rigged|wrong|right|scam|myth|trap|broken|best|worst|better|worse|greater|greatest|goat|destroying|killing|ruining|saving|changing|revolutionizing|overhyped|underrated)\b/i.test(lower)) {
      return "idea";
    }
    // If it has "is" + a comparison/opinion, it's an idea not a topic
    if (/\bis\b/i.test(lower) && /\b(better|worse|than|the|over|king|goat|destroying|killing|ruining|saving|changing)\b/i.test(lower)) {
      return "idea";
    }
    return "topic";
  }

  // Default: treat as idea
  return "idea";
}

// ---------------------------------------------------------------------------
// Core insight extraction — pull the main point out of any text
// ---------------------------------------------------------------------------

function extractInsight(text) {
  const type = detectInputType(text);
  const lower = text.toLowerCase().trim();

  switch (type) {
    case "topic":
      // Short topic — just return it, the angleFinder will handle domain mapping
      return { type, topic: text.trim(), insight: null, domain: mapTopicToDomain(text).domain };

    case "story_request":
      // User is asking for a founder story — generate one
      // The contentEngine will use the founderStoryGenerator to create a realistic narrative
      return { type: "story_request", topic: text.trim(), insight: null, domain: mapTopicToDomain(text).domain };

    case "question":
      // Question — extract the subject and flip it into a claim
      return extractInsightFromQuestion(text);

    case "story":
      // Personal story — clean it up and use it directly
      return extractInsightFromStory(text);

    case "draft":
      // Rough draft — extract the strongest sentence
      return extractInsightFromDraft(text);

    case "outreach":
      // Outreach/partnership/offer — extract the structured deal
      return extractInsightFromOutreach(text);

    case "problem_list":
      // Multi-line list of problems/pain points/features — extract individual items
      return extractInsightFromProblemList(text);

    case "idea":
      // Full idea — use it directly, just clean it up
      return extractInsightFromIdea(text);

    default:
      return { type: "idea", topic: text.trim(), insight: cleanText(text), domain: mapTopicToDomain(text).domain };
  }
}

function extractInsightFromQuestion(text) {
  // "Why do most newsletters fail?" → "Most newsletters fail because..."
  // "How do I grow on X?" → "The way to grow on X is..."
  const lower = text.toLowerCase();

  // Remove the question word and question mark
  let subject = text.replace(/^(why|how|what|should|is|are|can|do|does|will|would|could)\s+/i, "").replace(/\?$/, "").trim();

  // Detect the domain from the subject
  const domain = mapTopicToDomain(subject).domain;

  // Turn the question into a contrarian claim
  let insight;
  if (/^why do/i.test(lower)) {
    // "Why do most newsletters fail?" → "Most newsletters fail because of one reason nobody talks about."
    // Strip the leading "do" and trailing verb, then reconstruct
    const cleaned = subject.replace(/^do\s+/i, "").replace(/\s+(fail|succeed|suck|win|lose|quit|struggle)\s*$/i, "").trim();
    const verb = subject.match(/\s+(fail|succeed|suck|win|lose|quit|struggle)\s*$/i)?.[1] || "fail";
    insight = cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + " " + verb + " because of one reason nobody talks about.";
  } else if (/^how do/i.test(lower) || /^how can/i.test(lower)) {
    // "How do I grow on X?" → "Most people approach growing on X the wrong way."
    // Strip "do I" or "can I" and rephrase
    const action = subject.replace(/^do\s+i\s+/i, "").replace(/^can\s+i\s+/i, "").replace(/^i\s+/i, "").trim();
    insight = "Most people approach " + action + " the wrong way. Here's what actually works.";
  } else if (/^should/i.test(lower)) {
    // "Should I quit my job?" → "Most people who ask 'should I quit my job' already know the answer."
    insight = "Most people who ask '" + text.replace(/\?$/, "") + "' already know the answer.";
  } else if (/^is |^are /i.test(lower)) {
    // "Is AI going to replace developers?" → "AI isn't going to replace developers. But it'll replace the ones who don't use it."
    insight = subject.charAt(0).toUpperCase() + subject.slice(1) + " — the answer is the opposite of what most people think.";
  } else {
    insight = subject.charAt(0).toUpperCase() + subject.slice(1) + ". The answer is simpler than you think.";
  }

  return { type: "question", topic: subject, insight, domain, originalQuestion: text };
}

function extractInsightFromStory(text) {
  // "I spent 18 months building features nobody asked for" → use it directly
  const cleaned = cleanText(text);

  // If it's already a good insight (has a number, a contrast, or a lesson), use it
  if (/\d/.test(cleaned) || /\b(but|then|so|because|instead|wrong|right|learned|realized|changed|fixed)\b/i.test(cleaned)) {
    return { type: "story", topic: extractTopicFromStory(cleaned), insight: cleaned, domain: mapTopicToDomain(cleaned).domain };
  }

  // Otherwise, it's a vague story idea — turn it into a specific claim
  // "how I quit my job to go indie" → "I quit my job to go indie. Here's what happened."
  const insight = cleaned.replace(/^how\s+/i, "") + ". Here's what happened next.";

  return { type: "story", topic: extractTopicFromStory(cleaned), insight, domain: mapTopicToDomain(cleaned).domain };
}

function extractInsightFromDraft(text) {
  // Long draft — find the strongest sentence (the one with the most specificity)
  const sentences = splitSentences(text);
  if (!sentences.length) return { type: "draft", topic: text.slice(0, 50), insight: cleanText(text), domain: mapTopicToDomain(text).domain };

  // Score each sentence for specificity and tension
  const scored = sentences.map(s => ({
    sentence: s.trim(),
    score: scoreSentence(s),
  }));
  scored.sort((a, b) => b.score - a.score);

  // The strongest sentence becomes the hook; the rest becomes the body
  const hook = scored[0].sentence;
  const rest = sentences.filter(s => s.trim() !== hook).join(" ");

  const insight = rest ? hook + " " + rest : hook;

  return {
    type: "draft",
    topic: extractTopicFromStory(text),
    insight: cleanText(insight),
    hook: cleanText(hook),
    domain: mapTopicToDomain(text).domain,
  };
}

function extractInsightFromIdea(text) {
  // Full idea — clean it up and use it directly
  const cleaned = cleanText(text);
  return {
    type: "idea",
    topic: extractTopicFromStory(cleaned),
    insight: cleaned,
    domain: mapTopicToDomain(cleaned).domain,
  };
}

function extractInsightFromProblemList(text) {
  // Multi-line list of problems/pain points/features a product fixes.
  // Extract individual items and return them as a structured list.
  const lines = text.split(/\n+/)
    .map(l => l.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(l => l.length > 5);

  // Detect the domain from the combined text
  const domain = mapTopicToDomain(lines.join(" ")).domain;

  // Detect if this is about a specific product (look for product name patterns)
  // or just a general list of problems
  const hasProduct = /\b(autoeditor|auto editor|premiere|final cut|davinci|capcut|descript|opus|submagic|vrew|wisecut)\b/i.test(text);

  // Extract a summary topic from the first few lines
  const summaryTopic = lines.slice(0, 2).join(" ").slice(0, 80);

  return {
    type: "problem_list",
    topic: summaryTopic,
    insight: null,
    domain,
    problems: lines,
    hasProduct,
    originalInput: text,
  };
}

function extractInsightFromOutreach(text) {
  // Outreach/partnership/offer message — extract the structured deal elements
  // and return them so the content engine can generate tweets that attract
  // the target audience to the offer.
  const lower = text.toLowerCase();

  // Extract audience (who you're reaching out to)
  let audience = null;
  const audienceMatch = text.match(/(?:your|you're|you are)\s+(?:a|an)\s+([^,.!?]+)/i);
  if (audienceMatch) audience = audienceMatch[1].trim().replace(/\s+/g, " ");

  // Extract the product/tool
  let product = null;
  if (/retention editing software/i.test(text)) product = "retention editing software";
  else if (/retention software/i.test(text)) product = "retention software";
  else if (/editing software/i.test(text)) product = "editing software";
  else if (/my (?:tool|app|software|product|service)/i.test(text)) {
    const m = text.match(/my (tool|app|software|product|service)/i);
    product = m ? m[0] : "my tool";
  }

  // Extract the offer/mechanics
  let mechanics = [];
  if (/raw footage/i.test(text)) mechanics.push("give me raw footage");
  if (/retention editing software/i.test(text) || /put it thru/i.test(text) || /run it through/i.test(text)) {
    mechanics.push("I run it through my retention editing software");
  }
  if (/react/i.test(text)) mechanics.push("you react to the result");

  // Extract the incentive
  let incentive = null;
  if (/affiliate program/i.test(text)) incentive = "affiliate program";
  if (/free subscription/i.test(text)) incentive = (incentive ? incentive + " + " : "") + "free subscription";
  if (!incentive && /free/i.test(text)) incentive = "free access";

  // Build a clean topic description
  let topicDesc = "";
  if (audience) topicDesc = audience;
  else if (product) topicDesc = product;
  else topicDesc = text.slice(0, 60).replace(/[.!?]+$/, "");

  // Build the insight — a structured description the content engine can use
  const insightParts = [];
  if (audience) insightParts.push(`Outreach to ${audience}`);
  if (product) insightParts.push(`Product: ${product}`);
  if (mechanics.length) insightParts.push(`Deal: ${mechanics.join(" → ")}`);
  if (incentive) insightParts.push(`Incentive: ${incentive}`);

  const insight = insightParts.join(". ") + ".";

  // Detect domain
  let domain = "saas";
  if (/\b(edit|editor|footage|retention|video)\b/i.test(lower)) domain = "editing";
  else if (/\b(affiliate|partnership|outreach|deal)\b/i.test(lower)) domain = "sales";

  return {
    type: "outreach",
    topic: topicDesc,
    insight,
    audience,
    product,
    mechanics,
    incentive,
    domain,
    originalInput: text,
  };
}

// ---------------------------------------------------------------------------
// Semantic domain matching — better than keyword matching
// ---------------------------------------------------------------------------

function semanticDomainMatch(text) {
  const lower = text.toLowerCase();
  const scores = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Longer keywords are more specific → higher score
        scores[domain] += kw.length > 6 ? 3 : kw.length > 3 ? 2 : 1;
      }
    }
  }

  // Also check for semantic concepts that map to domains
  const conceptMap = {
    saas: ["churn", "mrr", "customers", "pricing", "subscription", "onboarding", "feature", "product", "users", "signups", "conversion", "trial", "freemium", "paying"],
    marketing: ["traffic", "visitors", "clicks", "impressions", "ctr", "seo", "google", "ads", "campaign", "email list", "open rate", "newsletter", "funnel", "brand"],
    ai: ["gpt", "llm", "prompt", "chatbot", "automation", "ai", "machine learning", "model", "training", "fine-tuning", "embedding", "rag", "agent"],
    fitness: ["workout", "gym", "muscle", "weight", "fat", "cardio", "lift", "protein", "calories", "diet", "sleep", "recovery", "training", "strength"],
    money: ["invest", "stock", "stock market", "crypto", "bitcoin", "portfolio", "dollar", "saving", "retirement", "index fund", "trading", "wealth", "passive income", "real estate", "rigged", "wall street"],
    productivity: ["focus", "time", "task", "procrastination", "habit", "routine", "deep work", "distraction", "email", "slack", "notion", "calendar", "priority"],
    content: ["post", "tweet", "thread", "viral", "audience", "followers", "engagement", "content", "youtube", "podcast", "blog", "creator", "algorithm"],
    career: ["job", "salary", "interview", "resume", "promotion", "boss", "coworker", "remote", "freelance", "consulting", "linkedin", "offer", "negotiate"],
    coding: ["code", "bug", "function", "refactor", "debug", "test", "typescript", "javascript", "python", "api", "database", "deploy", "server", "framework"],
    design: ["design", "ui", "ux", "figma", "color", "layout", "typography", "whitespace", "button", "form", "landing page", "mobile", "responsive"],
  };

  for (const [domain, concepts] of Object.entries(conceptMap)) {
    if (!scores[domain]) scores[domain] = 0;
    for (const concept of concepts) {
      if (lower.includes(concept)) {
        scores[domain] += concept.length > 6 ? 3 : 2;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return { domain: "general", allDomains: [], scores };
  return {
    domain: sorted[0][0],
    allDomains: sorted.filter(s => s[1] > 0).map(s => s[0]),
    scores,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    // Strip "my idea of a tweet" / "my idea for a tweet" / "tweet about"
    .replace(/^my idea (of|for) a tweet\s*/i, "")
    .replace(/^my idea (of|for) a post\s*/i, "")
    .replace(/^my idea\s*/i, "")
    .replace(/^a tweet about\s*/i, "")
    .replace(/^a post about\s*/i, "")
    .replace(/^tweet about\s*/i, "")
    .replace(/^post about\s*/i, "")
    // Strip "i want to post about" / "i want to talk about" / etc
    .replace(/^i want to (post about|talk about|share|say)\s*/i, "")
    .replace(/^i want to\s*/i, "")
    .replace(/^i'd like to (post about|talk about|share)\s*/i, "")
    .replace(/^i think (that\s*)?/i, "")
    .replace(/^i feel like\s*/i, "")
    .replace(/^i believe (that\s*)?/i, "")
    .replace(/^let me (tell you about|share)\s*/i, "")
    .replace(/^here's (what|a|my)\s*/i, "")
    .replace(/^so ,?\s*/i, "")
    .replace(/^basically,?\s*/i, "")
    .replace(/^honestly,?\s*/i, "")
    .replace(/^the idea (is|that)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return (text.match(/[^.!?]+[.!?]*/g) || []).map(s => s.trim()).filter(Boolean);
}

function scoreSentence(s) {
  let score = 0;
  const lower = s.toLowerCase();
  // Numbers boost
  if (/\d/.test(s)) score += 15;
  // Money boosts
  if (/\$|\bmrr\b|\barr\b|\brevenue\b|\bsalary\b/i.test(s)) score += 12;
  // Contrarian words boost
  if (/\b(not|isn't|don't|doesn't|but|instead|wrong|nobody|most|never|always)\b/i.test(lower)) score += 10;
  // Personal experience boosts
  if (/\b(i |my |me )\b/i.test(lower)) score += 8;
  // Specific tools boost
  if (/\b(notion|figma|stripe|chatgpt|claude|react|python|slack|gmail)\b/i.test(lower)) score += 8;
  // Shorter sentences make better hooks
  const words = s.split(/\s+/).length;
  if (words <= 12) score += 5;
  if (words > 25) score -= 5;
  return score;
}

function extractTopicFromStory(text) {
  // Extract the most meaningful 2-3 words from the text
  const lower = text.toLowerCase();
  const words = lower.match(/[\w']+/g) || [];

  // Remove stop words
  const stop = new Set(["i", "my", "me", "we", "our", "us", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "can", "to", "of", "in", "on", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below", "from", "up", "down", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "s", "t", "just", "but", "and", "or", "if", "as", "it", "its", "that", "this", "these", "those", "what", "which", "who", "whom", "whose", "they", "them", "their", "he", "she", "his", "her", "him", "you", "your", "yours"]);

  const contentWords = words.filter(w => !stop.has(w) && w.length > 2);

  // Take the first 3-4 content words as the topic
  return contentWords.slice(0, 4).join(" ") || text.slice(0, 30);
}

// ---------------------------------------------------------------------------
// Main: parse any input and return a structured idea
// ---------------------------------------------------------------------------

/**
 * Parse any input and extract its core meaning.
 *
 * @param {string} input - Any user input (topic, idea, draft, question, story)
 * @returns {Object} { type, topic, insight, domain, originalInput }
 */
function parse(input) {
  if (!input || !input.trim()) return { type: "empty", topic: null, insight: null, domain: "general" };

  const result = extractInsight(input);
  result.originalInput = input;

  // Use semantic domain matching for better accuracy
  // BUT: for outreach type, trust the outreach-specific domain detection
  // (semantic matcher might override with a wrong domain like "saas")
  if (result.type !== "outreach") {
    const semantic = semanticDomainMatch(input);
    if (semantic.domain !== "general") {
      result.domain = semantic.domain;
      result.allDomains = semantic.allDomains;
    }
  }

  return result;
}

module.exports = {
  parse,
  detectInputType,
  extractInsight,
  semanticDomainMatch,
  cleanText,
  scoreSentence,
};
