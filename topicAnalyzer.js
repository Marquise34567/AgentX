/*
 * Topic analyzer — deep topic understanding.
 *
 * Extracts the MEANING from any input so the content engine can generate
 * posts that are actually about the topic, not generic templates.
 *
 * For "I built a cheaper way for founders to record their founder demos":
 *   - subject: "a cheaper way to record founder demos"
 *   - audience: "founders"
 *   - action: "record founder demos"
 *   - benefit: "cheaper"
 *   - outcome: "save money on demo recording"
 *   - type: "product_announcement"
 *
 * This is what makes AgentX understand what a topic is about 10x better.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const { matchAudience, getAudience, AUDIENCES } = require("./audienceDatabase");
const { understandProduct } = require("./contextClues");

// ---------------------------------------------------------------------------
// Product/tool database — when someone types just a product name, we need to
// know what it is and what it does so we can generate relevant posts.
// ---------------------------------------------------------------------------
const PRODUCT_DATABASE = {
  // Video editing tools
  autoeditor: { name: "AutoEditor", audience: "videoEditors", action: "remove silence from videos", benefit: "saves hours of manual editing", comparative: "faster", category: "video editing tool" },
  descript: { name: "Descript", audience: "videoEditors", action: "edit video by editing text", benefit: "edit video like a doc", comparative: "easier", category: "video editing tool" },
  premiere: { name: "Premiere Pro", audience: "videoEditors", action: "edit videos professionally", benefit: "professional editing", comparative: "better", category: "video editing tool" },
  davinci: { name: "DaVinci Resolve", audience: "videoEditors", action: "color grade and edit videos", benefit: "professional color grading", comparative: "better", category: "video editing tool" },
  "final cut": { name: "Final Cut Pro", audience: "videoEditors", action: "edit videos on Mac", benefit: "fast Mac editing", comparative: "faster", category: "video editing tool" },
  capcut: { name: "CapCut", audience: "videoEditors", action: "edit short-form videos", benefit: "free and easy editing", comparative: "easier", category: "video editing tool" },

  // SaaS / founder tools
  stripe: { name: "Stripe", audience: "saasFounders", action: "accept payments online", benefit: "easy payment processing", comparative: "easier", category: "payment platform" },
  supabase: { name: "Supabase", audience: "softwareDevelopers", action: "build backends without managing infrastructure", benefit: "fast backend development", comparative: "faster", category: "backend platform" },
  vercel: { name: "Vercel", audience: "softwareDevelopers", action: "deploy web apps instantly", benefit: "zero-config deployments", comparative: "faster", category: "hosting platform" },
  notion: { name: "Notion", audience: "founders", action: "organize everything in one place", benefit: "all-in-one workspace", comparative: "simpler", category: "productivity tool" },
  linear: { name: "Linear", audience: "softwareDevelopers", action: "track issues and manage projects", benefit: "fast issue tracking", comparative: "faster", category: "project management" },
  figma: { name: "Figma", audience: "designers", action: "design interfaces collaboratively", benefit: "real-time collaboration", comparative: "easier", category: "design tool" },
  cursor: { name: "Cursor", audience: "softwareDevelopers", action: "write code with AI assistance", benefit: "AI-powered coding", comparative: "faster", category: "code editor" },

  // Creator tools
  "tube buddy": { name: "TubeBuddy", audience: "youTubers", action: "optimize YouTube channels", benefit: "better YouTube SEO", comparative: "better", category: "YouTube tool" },
    vidiq: { name: "VidIQ", audience: "youTubers", action: "grow YouTube channels with data", benefit: "data-driven growth", comparative: "better", category: "YouTube tool" },

  // Marketing tools
  ahrefs: { name: "Ahrefs", audience: "marketers", action: "do SEO research and backlink analysis", benefit: "better SEO insights", comparative: "better", category: "SEO tool" },
  semrush: { name: "SEMrush", audience: "marketers", action: "do keyword research and competitive analysis", benefit: "competitive intelligence", comparative: "better", category: "marketing tool" },

  // E-commerce
  shopify: { name: "Shopify", audience: "ecommerceOwners", action: "sell products online", benefit: "easy online store", comparative: "easier", category: "e-commerce platform" },

  // Newsletter
  substack: { name: "Substack", audience: "newsletterWriters", action: "publish and monetize a newsletter", benefit: "easy newsletter monetization", comparative: "easier", category: "newsletter platform" },
  beehiiv: { name: "Beehiiv", audience: "newsletterWriters", action: "grow and monetize a newsletter", benefit: "better growth tools", comparative: "better", category: "newsletter platform" },

  // No-code
  bubble: { name: "Bubble", audience: "noCodeBuilders", action: "build web apps without code", benefit: "no-code app building", comparative: "easier", category: "no-code platform" },
  webflow: { name: "Webflow", audience: "noCodeBuilders", action: "design and launch websites visually", benefit: "visual web design", comparative: "easier", category: "no-code platform" },

  // Fitness
  myfitnesspal: { name: "MyFitnessPal", audience: "fitnessCoaches", action: "track calories and macros", benefit: "easy nutrition tracking", comparative: "easier", category: "fitness app" },

  // Podcast
  riverside: { name: "Riverside", audience: "podcasters", action: "record high-quality podcast interviews remotely", benefit: "studio-quality remote recording", comparative: "better", category: "podcast tool" },

  // Sales
  outreach: { name: "Outreach", audience: "salesPros", action: "automate sales sequences and cadences", benefit: "automated sales outreach", comparative: "faster", category: "sales tool" },
  apollo: { name: "Apollo", audience: "salesPros", action: "find and reach prospects", benefit: "prospecting at scale", comparative: "faster", category: "sales tool" },
};

// ---------------------------------------------------------------------------
// Main entry point — analyze any topic and extract its meaning
// ---------------------------------------------------------------------------
function analyzeTopic(input) {
  const text = input.trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const result = {
    raw: text,
    lower,
    type: "statement",
    subject: text,
    audience: null,        // extracted from text (e.g., "founders")
    audienceProfile: null, // matched audience profile from the database
    action: null,
    actionGerund: null,
    benefit: null,
    outcome: null,
    entity: null,          // the product/thing being discussed
    comparative: null,     // cheaper, faster, easier, better, simpler
    numbers: [],
    keywords: [],
  };

  // Extract numbers
  result.numbers = (text.match(/\$?\d+(?:\.\d+)?%?/g) || []).map(n => n.replace(/%/g, ""));

  // --- Detect product/tool name (single word or short phrase that matches a known product) ---
  // When someone types "autoeditor" or "descript" or "stripe", we know what it is
  const productKey = lower.replace(/[^a-z\s]/g, "").trim();
  if (PRODUCT_DATABASE[productKey]) {
    const product = PRODUCT_DATABASE[productKey];
    result.type = "product_mention";
    result.entity = product.name;
    result.subject = product.name;
    result.action = product.action;
    result.actionGerund = toGerund(product.action);
    result.benefit = product.benefit;
    result.comparative = product.comparative;
    result.outcome = product.benefit;
    // Look up the audience display name from the database
    const audProfile = getAudience(product.audience);
    if (audProfile) {
      result.audience = audProfile.name;
      result.audienceSingular = singularize(audProfile.name);
    } else {
      result.audience = product.audience;
    }
    result.keywords = extractKeywords(product.action + " " + product.benefit);
    return finalizeAnalysis(result);
  }
  // Also check if any product name is contained in the input
  for (const [key, product] of Object.entries(PRODUCT_DATABASE)) {
    if (key.length > 4 && lower.includes(key)) {
      result.entity = product.name;
      if (!result.audience) {
        const audProfile = getAudience(product.audience);
        result.audience = audProfile ? audProfile.name : product.audience;
      }
      if (!result.action) {
        result.action = product.action;
        result.actionGerund = toGerund(product.action);
      }
      if (!result.benefit) result.benefit = product.benefit;
      if (!result.comparative) result.comparative = product.comparative;
    }
  }

  // --- Context-clue engine: if no known product matched, try to understand
  // the input by decomposing it into morphemes and inferring what it does.
  // This lets AgentX understand products it has never seen before.
  if (!result.action && !result.entity) {
    const understood = understandProduct(text);
    if (understood && understood.action) {
      result.type = "product_mention";
      result.entity = understood.entity || text;
      result.subject = understood.entity || text;
      result.action = understood.action;
      result.actionGerund = toGerund(understood.action);
      result.benefit = understood.benefit;
      result.comparative = understood.comparative || "better";
      result.outcome = understood.benefit;
      if (understood.audience) {
        const audProfile = getAudience(understood.audience);
        if (audProfile) {
          result.audience = audProfile.name;
          result.audienceSingular = singularize(audProfile.name);
        } else {
          result.audience = understood.audience;
        }
      }
      result.keywords = extractKeywords(understood.action + " " + (understood.benefit || ""));
      return finalizeAnalysis(result);
    }
  }

  // --- Detect product announcement ---
  // "I built a cheaper way for founders to record their founder demos"
  // "I made a tool that helps creators edit faster"
  // "I created an app that automates invoice generation"
  // BUT NOT: "I built a saas the other night" (that's a personal milestone, not a product announcement)
  // A real product announcement has a product DESCRIPTION after the verb:
  //   - "a tool that helps..." / "an app that..." / "a cheaper way to..."
  //   - "a platform for..." / "a service that..."
  // A personal statement just has a noun + casual context:
  //   - "a saas the other night" / "an app yesterday" / "a tool last week"
  const productMatch = lower.match(/\bi\s+(?:built|made|created|developed|shipped|launched|designed)\s+(?:a|an)?\s*(.+)/i);
  if (productMatch) {
    const rest = productMatch[1].trim();
    // Check if this is a real product announcement (has a description) or just a personal statement
    const hasProductDescription = /\b(?:that|which|for|to|way|approach|method|tool|alternative|solution|platform|app|service|system)\b/i.test(rest);
    const hasCasualTimePhrase = /\b(?:the other day|the other night|yesterday|last week|last night|last month|last year|a few days ago|a while ago|recently|tonight|today|this morning|this week|this month)\b/i.test(rest);
    const isShortPersonalStatement = rest.split(/\s+/).length <= 4 && !hasProductDescription;

    if (hasProductDescription && !hasCasualTimePhrase) {
      // This is a real product announcement — proceed with product analysis
      result.type = "product_announcement";

      // Extract comparative adjective (cheaper, faster, easier, simpler, better)
      const compMatch = rest.match(/\b(cheaper|faster|easier|simpler|better|free|affordable|smarter|quicker|cleaner|lighter|smaller|bigger|more\s+\w+)\s+(?:way|approach|method|tool|alternative|solution|platform|app)\b/i);
      if (compMatch) {
        result.comparative = compMatch[1];
      }

      // Extract audience: "for founders to..." / "for creators who..." / "for teams that..."
      const audienceMatch = rest.match(/\bfor\s+(\w+(?:\s+\w+){0,2})\s+(?:to|who|that|which)\b/i);
      if (audienceMatch) {
        // Keep the original form (plural or singular) — the hooks will handle grammar
        result.audience = audienceMatch[1].trim();
        result.audienceSingular = singularize(result.audience);
      }

      // Extract action: "to record their founder demos" / "to edit faster"
      const actionMatch = rest.match(/\bto\s+(.+?)(?:\.|$)/i);
      if (actionMatch) {
        let act = actionMatch[1].trim();
        // Clean up possessives from action
        act = act.replace(/\b(?:their|your|his|her|its)\s+/gi, "");
        // Turn "record founder demos" into a gerund for natural phrasing
        result.action = act;
        result.actionGerund = toGerund(act);
      }

      // Build the subject — what was built
      result.subject = rest;
      result.entity = rest;

      // Build the outcome based on comparative + action
      if (result.comparative && result.action) {
        result.outcome = buildOutcome(result.comparative, result.action, result.audience);
      } else if (result.action) {
        result.outcome = result.action;
      } else {
        result.outcome = rest;
      }

      // Extract keywords
      result.keywords = extractKeywords(rest);
      return finalizeAnalysis(result);
    }
    // If it's NOT a real product announcement (just a personal statement like
    // "i built a saas the other night"), fall through to milestone detection below.
  }

  // --- Detect "X gives you Y" / "X helps you Z" product descriptions ---
  const productDescMatch = lower.match(
    /^(.+?)\s+(?:gives|helps|lets|makes|enables|allows)\s+(?:you\s+)?(?:to\s+)?(.+)/i
  );
  if (productDescMatch) {
    result.type = "product_description";
    result.entity = productDescMatch[1].trim();
    result.action = productDescMatch[2].trim();
    result.subject = text;
    result.outcome = result.action;
    result.keywords = extractKeywords(text);
    return finalizeAnalysis(result);
  }

  // --- Detect "a SaaS that does Y" / "an app that does Y" ---
  const saasMatch = lower.match(/^(?:a|an)\s+(saas|app|tool|platform|service|product)\s+that\s+(.+)/i);
  if (saasMatch) {
    result.type = "product_description";
    result.entity = saasMatch[1];
    result.action = saasMatch[2].trim();
    result.subject = text;
    result.outcome = result.action;
    result.keywords = extractKeywords(text);
    return finalizeAnalysis(result);
  }

  // --- Detect milestone: "I started X", "I launched X", "I built X", "I made X" ---
  // This catches personal statements like "i built a saas the other night"
  // that are NOT product announcements (no product description, just a personal action)
  const milestoneMatch = lower.match(
    /\bi\s+(started|launched|opened|began|kicked off|rolled out|released|published|built|made|created|developed|shipped|designed)\s+(?:a|an|the)?\s*(.+)/i
  );
  if (milestoneMatch) {
    result.type = "milestone";
    result.action = milestoneMatch[1];
    // Clean up the subject — remove trailing time phrases like "the other night"
    let subjectRaw = milestoneMatch[2].trim();
    // Strip casual time phrases from the subject
    subjectRaw = subjectRaw.replace(/\s+(?:the other day|the other night|yesterday|last week|last night|last month|last year|a few days ago|a while ago|recently|tonight|today|this morning|this week|this month)$/i, "");
    // Strip leading articles
    subjectRaw = subjectRaw.replace(/^(?:a|an|the)\s+/i, "");
    result.subject = subjectRaw;
    result.entity = subjectRaw;
    result.keywords = extractKeywords(subjectRaw);
    // Try to match audience from the subject (e.g., "saas" → SaaS founders)
    const subjectLower = subjectRaw.toLowerCase();
    if (/\bsaas\b/i.test(subjectLower)) {
      const audProfile = getAudience("saasFounders");
      if (audProfile) {
        result.audience = audProfile.name;
        result.audienceProfile = audProfile;
      }
    } else if (/\b(app|application|software|tool|platform)\b/i.test(subjectLower)) {
      const audProfile = getAudience("softwareDevelopers");
      if (audProfile) {
        result.audience = audProfile.name;
        result.audienceProfile = audProfile;
      }
    }
    return finalizeAnalysis(result);
  }

  // --- Detect opinion: "X is better than Y", "X is overrated" ---
  const opinionMatch = lower.match(/^(.+?)\s+(?:is|are)\s+(better than|worse than|overrated|underrated|the best|the worst|the greatest|dead|dying|overhyped)\s*(.*)/i);
  if (opinionMatch) {
    result.type = "opinion";
    result.subject = opinionMatch[1].trim();
    result.entity = result.subject;
    result.comparative = opinionMatch[2];
    if (opinionMatch[3]) result.audience = opinionMatch[3].trim();
    result.keywords = extractKeywords(text);
    return finalizeAnalysis(result);
  }

  // --- Detect prediction: "X will Y" ---
  const predictionMatch = lower.match(/^(.+?)\s+will\s+(.+)/i);
  if (predictionMatch) {
    result.type = "prediction";
    result.subject = predictionMatch[1].trim();
    result.action = predictionMatch[2].trim();
    result.outcome = result.action;
    result.keywords = extractKeywords(text);
    return finalizeAnalysis(result);
  }

  // --- Detect confession: "I failed at X", "I made $0" ---
  const confessionMatch = lower.match(/\bi\s+(failed|lost|wasted|was wrong|made \$?0|made zero|struggled|gave up|regret|screwed up|messed up|blew it)\b/i);
  if (confessionMatch) {
    result.type = "confession";
    result.subject = text;
    result.keywords = extractKeywords(text);
    return finalizeAnalysis(result);
  }

  // --- Default: extract keywords from the whole text ---
  result.keywords = extractKeywords(text);
  return finalizeAnalysis(result);
}

// ---------------------------------------------------------------------------
// Finalize analysis — match audience from the database and clean up
// ---------------------------------------------------------------------------
function finalizeAnalysis(result) {
  // Match audience from the database (29 communities, 1000+ variations)
  const matchedAudience = matchAudience(result.raw);
  if (matchedAudience) {
    result.audienceProfile = matchedAudience;
    // If we didn't extract an audience from text, use the matched one
    if (!result.audience) {
      result.audience = matchedAudience.name;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Grammar helpers
// ---------------------------------------------------------------------------
function singularize(word) {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("ses")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
  return word;
}

function toGerund(action) {
  // "record founder demos" → "recording founder demos"
  // "edit faster" → "editing faster"
  // "built" → "building" (irregular)
  const words = action.split(/\s+/);
  if (words.length === 0) return action;
  const first = words[0];

  // Irregular verbs — past tense → gerund
  const irregulars = {
    built: "building", made: "making", created: "creating", developed: "developing",
    shipped: "shipping", launched: "launching", designed: "designing",
    started: "starting", opened: "opening", began: "beginning",
    released: "releasing", published: "publishing",
    failed: "failing", lost: "losing", wasted: "wasting",
    sold: "selling", spent: "spending", tried: "trying",
    learned: "learning", found: "finding", got: "getting",
    quit: "quitting", hit: "hitting", reached: "reaching",
    grew: "growing", deleted: "deleting", completed: "completing",
  };
  if (irregulars[first.toLowerCase()]) {
    const gerund = irregulars[first.toLowerCase()];
    return gerund + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
  }

  let gerund;
  if (first.endsWith("e") && !first.endsWith("ee") && !/(ie|oe|ye)$/.test(first)) {
    gerund = first.slice(0, -1) + "ing";
  } else if (/[aeiou]p$/.test(first) || /[^aeiou][aeiou][^aeiou]$/.test(first)) {
    // CVC pattern — double the last consonant (run→running, sit→sitting)
    // But be conservative — only double short words AND only for 1-syllable words
    // "edit" → "editing" (not "editting"), "run" → "running", "sit" → "sitting"
    const doubles = ["run", "sit", "cut", "put", "hit", "fit", "get", "let", "set", "win", "spin", "stop", "plan", "drop", "shop", "clip", "snap", "step", "map", "tip", "top", "pop", "mop", "hop", "log", "blog", "flag", "tag", "dig", "beg", "jam", "slam", "swap", "pat", "bat", "rat", "chat", "flat", "grin", "shut", "slit", "split"];
    if (doubles.includes(first)) gerund = first + first.slice(-1) + "ing";
    else gerund = first + "ing";
  } else {
    gerund = first + "ing";
  }
  return gerund + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
}

// Convert past tense verbs to base form: "built" → "build", "made" → "make"
function toBaseForm(verb) {
  const irregulars = {
    built: "build", made: "make", created: "create", developed: "develop",
    shipped: "ship", launched: "launch", designed: "design",
    started: "start", opened: "open", began: "begin",
    released: "release", published: "publish",
    failed: "fail", lost: "lose", wasted: "waste",
    sold: "sell", spent: "spend", tried: "try",
    learned: "learn", found: "find", got: "get",
    quit: "quit", hit: "hit", reached: "reach",
    grew: "grow", deleted: "delete", completed: "complete",
  };
  return irregulars[verb.toLowerCase()] || verb;
}

// ---------------------------------------------------------------------------
// Build an outcome phrase from comparative + action + audience
// ---------------------------------------------------------------------------
function buildOutcome(comparative, action, audience) {
  const comp = comparative.toLowerCase();
  const outcomes = {
    cheaper: `save money on ${action}`,
    faster: `do ${action} in less time`,
    easier: `do ${action} without the headache`,
    simpler: `do ${action} without the complexity`,
    better: `get better results from ${action}`,
    free: `do ${action} for free`,
    affordable: `do ${action} without breaking the bank`,
    smarter: `do ${action} the smart way`,
    quicker: `do ${action} in half the time`,
    cleaner: `get cleaner results from ${action}`,
    lighter: `do ${action} with less overhead`,
  };
  // Handle "more X" patterns
  if (comp.startsWith("more ")) {
    return `get ${comp.slice(5)} from ${action}`;
  }
  return outcomes[comp] || action;
}

// ---------------------------------------------------------------------------
// Extract meaningful keywords from text (skip filler words)
// ---------------------------------------------------------------------------
const FILLER_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "by", "for", "with", "about", "as",
  "and", "or", "but", "not", "no", "nor", "so", "yet", "than", "then",
  "i", "me", "my", "we", "us", "our", "you", "your", "he", "she", "it", "they", "their",
  "this", "that", "these", "those", "what", "which", "who", "whom",
  "do", "does", "did", "done", "have", "has", "had", "will", "would", "could", "should",
  "can", "may", "might", "must", "shall",
  "way", "approach", "method", "thing", "stuff", "people", "someone", "something",
  "just", "very", "really", "actually", "basically", "literally", "quite",
  "up", "down", "out", "off", "over", "under", "into", "onto", "from",
  "how", "why", "when", "where",
]);

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z]+/g) || [];
  return words
    .filter(w => w.length > 2 && !FILLER_WORDS.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i) // dedupe
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generate topic-specific hooks based on the analysis
// These are NOT generic — they reference the actual topic, audience, and benefit
// ---------------------------------------------------------------------------
function generateTopicHooks(analysis) {
  const hooks = [];
  const { type, subject, audience, audienceSingular, action, actionGerund, benefit, outcome, comparative, entity, keywords } = analysis;
  const act = actionGerund || action;
  const aud = audience || audienceSingular;
  const audS = audienceSingular || audience;

  if (type === "product_announcement") {
    // Product announcement hooks — focus on the outcome and who it's for
    // Use contrarian/pattern-interrupt patterns that score well on the algorithm
    // BUT keep them specific to the topic
    const comp = comparative || "better";

    if (aud && action) {
      // Contrarian hooks (high quote signal)
      hooks.push(`everyone's wrong about ${act}.`);
      hooks.push(`stop paying premium for ${act}.`);
      hooks.push(`${act} is overrated. the price, not the practice.`);
      hooks.push(`nobody talks about how much ${aud} waste on ${act}.`);
      hooks.push(`the ${act} industry is broken. so I fixed it.`);
      hooks.push(`paying premium for ${act} is a scam.`);
      hooks.push(`${aud} are getting robbed on ${act}.`);
      hooks.push(`the problem with ${act} isn't the effort. it's the cost.`);

      // Pattern-interrupt hooks (high share_via_copy_link)
      hooks.push(`I built a ${comp} way for ${aud} to ${action}.`);
      hooks.push(`the ${comp} way to ${action}.`);
      hooks.push(`${act} doesn't have to be expensive. here's proof.`);
      hooks.push(`I got tired of watching ${aud} overpay for ${act}. so I built something.`);
      hooks.push(`watching ${aud} struggle with ${act} was painful. so I fixed it.`);
      hooks.push(`I was tired of paying too much for ${act}. so I built a ${comp} way.`);

      // Story hooks (high follow_author)
      hooks.push(`I built a ${comp} way to ${action}. here's why.`);
      hooks.push(`why I built a ${comp} way for ${aud} to ${action}.`);
      hooks.push(`the story: ${aud} kept telling me ${act} was too expensive. so I fixed it.`);

      // Debate hooks (high reply)
      hooks.push(`why are ${aud} still paying premium for ${act}?`);
      hooks.push(`${comp} ${act} shouldn't be a luxury. change my mind.`);
      hooks.push(`${aud} shouldn't have to overpay for ${act}. agree?`);

      // Personal hooks (high follow_author + reply)
      hooks.push(`I got tired of paying too much for ${act}.`);
      hooks.push(`every ${audS} I know struggles with ${act}. so I fixed it.`);
      hooks.push(`I built something that makes ${act} ${comp}.`);
    }

    if (outcome) {
      hooks.push(`what if ${outcome} was actually affordable?`);
      hooks.push(`the goal: ${outcome}. without the premium price tag.`);
      hooks.push(`${outcome}. that's the whole point.`);
    }

    // Comparative-specific hooks
    if (comparative === "cheaper" || comparative === "affordable" || comparative === "free") {
      hooks.push(`paying premium for ${act} is a choice. it doesn't have to be.`);
      hooks.push(`you're overpaying for ${act}. here's the alternative.`);
      hooks.push(`the same result. fraction of the cost.`);
      hooks.push(`${act} doesn't have to cost what you're paying.`);
      hooks.push(`stop overpaying for ${act}.`);
      hooks.push(`the same ${act}. fraction of the price.`);
    }
    if (comparative === "faster" || comparative === "quicker") {
      hooks.push(`${act} takes too long. it doesn't have to.`);
      hooks.push(`the same ${act}. half the time.`);
      hooks.push(`you're spending too long on ${act}.`);
    }
    if (comparative === "easier" || comparative === "simpler") {
      hooks.push(`${act} is harder than it needs to be.`);
      hooks.push(`why does ${act} have to be so complicated?`);
      hooks.push(`the complicated part of ${act} is optional. here's proof.`);
    }
  }

  if (type === "product_mention" && entity && action) {
    // Product mention hooks — someone typed just a product name
    hooks.push(`${entity}: ${act}. that's the whole pitch.`);
    hooks.push(`the problem with ${act}: it takes too long. ${entity} fixes that.`);
    hooks.push(`everyone's wrong about ${act}. ${entity} proves it.`);
    hooks.push(`stop doing ${act} the hard way. ${entity} exists.`);
    hooks.push(`${act} is harder than it needs to be. ${entity} fixes that.`);
    hooks.push(`why are ${aud || "people"} still doing ${act} manually?`);
    hooks.push(`I found a ${comparative || "better"} way to ${action}. it's called ${entity}.`);
    hooks.push(`${entity} — ${comparative || "better"} ${act}.`);
    hooks.push(`the ${comparative || "better"} way to ${action}.`);
    hooks.push(`nobody talks about ${entity} enough.`);
    hooks.push(`${entity} is underrated.`);
    hooks.push(`if you're still doing ${act} manually, you're losing.`);
    hooks.push(`${act} doesn't have to be this hard. ${entity} proves it.`);
    hooks.push(`the old way of ${act} is dead. ${entity} is the new way.`);
    hooks.push(`I stopped wasting time on ${act}. ${entity} fixed it.`);
  }

  if (type === "product_description" && entity && action) {
    hooks.push(`${entity} — ${action}.`);
    hooks.push(`the problem: ${act} is hard. the solution: ${entity}.`);
    hooks.push(`what if ${act} was ${comparative || "easier"}?`);
    hooks.push(`${entity} exists because ${act} shouldn't be this hard.`);
  }

  if (type === "opinion" && subject) {
    hooks.push(`${subject}. here's why.`);
    hooks.push(`everyone's wrong about ${subject}.`);
    hooks.push(`${subject}. change my mind.`);
  }

  if (type === "milestone" && subject) {
    // Personal milestone hooks — grounded in what the user actually did
    const action = analysis.action || "built";
    // Convert past tense to base form for phrases like "should build"
    const baseForm = toBaseForm(action);
    const gerund = toGerund(action);
    hooks.push(`I just ${action} ${subject}.`);
    hooks.push(`day 1 of ${subject}.`);
    hooks.push(`${subject}. here we go.`);
    hooks.push(`nobody told me how hard ${subject} would be.`);
    hooks.push(`I ${action} ${subject}. here's what I learned.`);
    hooks.push(`the hardest part about ${subject} isn't what you think.`);
    hooks.push(`I spent more time ${gerund} ${subject} than I expected.`);
    hooks.push(`${subject} is live. here's what nobody tells you.`);
    // If we have an audience profile, add audience-specific milestone hooks
    if (analysis.audienceProfile) {
      const ap = analysis.audienceProfile;
      const audS = analysis.audienceSingular || singularize(analysis.audience || ap.name);
      hooks.push(`every ${audS} should ${baseForm} ${subject} at least once.`);
      hooks.push(`I ${action} ${subject}. other ${ap.name} are doing it wrong.`);
      if (ap.metrics.length >= 1) {
        hooks.push(`I ${action} ${subject}. my ${ap.metrics[0]} is already moving.`);
      }
    }
  }

  // --- Audience-specific hooks using the audience database ---
  // These use the audience's actual vocabulary, pain points, and content style
  if (analysis.audienceProfile) {
    const ap = analysis.audienceProfile;
    const aud = analysis.audience || ap.name;
    const audS = analysis.audienceSingular || singularize(aud);

    // Pain-point hooks — reference what this audience actually struggles with
    for (const pain of ap.painPoints.slice(0, 3)) {
      hooks.push(`every ${audS} deals with ${pain}.`);
      hooks.push(`the ${aud} who fix ${pain} win.`);
      hooks.push(`${aud} think ${pain} is normal. it's not.`);
    }

    // Vocabulary-based hooks — use the community's actual language
    const vocab = ap.vocabulary.slice(0, 5);
    if (vocab.length >= 2) {
      hooks.push(`${aud} obsess over ${vocab[0]}. they should obsess over ${vocab[1]}.`);
      hooks.push(`your ${vocab[0]} doesn't matter if your ${vocab[1] || vocab[0]} is broken.`);
    }

    // Metric-based hooks — reference what this audience measures
    if (ap.metrics.length >= 2) {
      hooks.push(`${aud} track ${ap.metrics[0]}. the smart ones track ${ap.metrics[1]}.`);
      hooks.push(`stop optimizing ${ap.metrics[0]}. start optimizing ${ap.metrics[1] || ap.metrics[0]}.`);
    }

    // Goal-based hooks — reference what this audience wants
    if (ap.goals.length >= 1) {
      hooks.push(`most ${aud} want ${ap.goals[0]}. few are willing to do what it takes.`);
      hooks.push(`the path to ${ap.goals[0]} isn't what you think.`);
    }

    // Contrarian hooks about the community itself
    hooks.push(`90% of ${aud} are doing this wrong.`);
    hooks.push(`the ${aud} who win don't do what 90% of ${aud} do.`);
    hooks.push(`unpopular take for my fellow ${aud}:`);
    hooks.push(`if you're a ${aud} and you're not doing this, you're losing.`);
  }

  // Always add some keyword-based hooks as fallback
  if (keywords.length >= 2) {
    const kw = keywords.slice(0, 3).join(" ");
    hooks.push(`nobody talks about ${kw} enough.`);
    hooks.push(`the truth about ${kw}:`);
  }

  return hooks;
}

// ---------------------------------------------------------------------------
// Generate outcome-focused body lines based on the analysis
// ---------------------------------------------------------------------------
function generateOutcomeBodies(analysis) {
  const bodies = [];
  const { type, subject, audience, audienceSingular, action, actionGerund, benefit, outcome, comparative, entity } = analysis;
  const act = actionGerund || action;
  const aud = audience || audienceSingular;
  const audS = audienceSingular || audience;

  if (type === "product_announcement") {
    if (comparative && action) {
      bodies.push(`same result. ${comparative} process. no catch.`);
      bodies.push(`the goal: make ${act} ${comparative}. done.`);
      bodies.push(`I built this because ${act} shouldn't cost what it costs.`);
      bodies.push(`the old way: expensive. the new way: ${comparative}.`);
      bodies.push(`no premium price tag. no compromise on quality.`);
    }
    if (aud && action) {
      bodies.push(`built for ${aud} who are tired of overpaying.`);
      bodies.push(`${aud} deserve ${comparative || "better"} ${act}.`);
      bodies.push(`if you're a ${audS} doing ${act}, this saves you money.`);
      bodies.push(`the ${aud} who switch first will have a massive head start.`);
      bodies.push(`I watched ${aud} waste money on ${act} for too long.`);
    }
    if (outcome) {
      bodies.push(`the outcome: ${outcome}.`);
      bodies.push(`what you get: ${outcome}.`);
      bodies.push(`the result: ${outcome}. not promises. results.`);
    }
    // Specific comparative outcomes
    if (comparative === "cheaper" || comparative === "affordable" || comparative === "free") {
      bodies.push(`same quality ${act}. fraction of the cost.`);
      bodies.push(`keep your money. get the same result.`);
      bodies.push(`stop overpaying for ${act}.`);
      bodies.push(`the math: you're overpaying. I fixed that.`);
      bodies.push(`the same ${act}. fraction of the price.`);
    }
    if (comparative === "faster" || comparative === "quicker") {
      bodies.push(`${act} in half the time.`);
      bodies.push(`more output. less waiting.`);
      bodies.push(`ship faster. iterate faster. win faster.`);
    }
    if (comparative === "easier" || comparative === "simpler") {
      bodies.push(`${act} without the headache.`);
      bodies.push(`skip the learning curve.`);
      bodies.push(`do it yourself. no agency. no freelancer.`);
    }
  }

  if (type === "product_mention" && entity && action) {
    bodies.push(`${entity} ${act}. ${benefit}.`);
    bodies.push(`what it does: ${act}. ${benefit}.`);
    bodies.push(`${entity} → ${benefit}.`);
    bodies.push(`the outcome: ${benefit}.`);
    bodies.push(`the result: ${comparative} ${act}. no catch.`);
    bodies.push(`${act} in less time. ${entity} handles the rest.`);
    bodies.push(`stop wasting hours on ${act}. ${entity} does it ${comparative}.`);
    bodies.push(`the old way: manual ${act}. the new way: ${entity}.`);
    bodies.push(`${benefit}. that's the whole point.`);
    bodies.push(`if you do ${act}, ${entity} saves you time.`);
  }

  if (type === "product_description" && entity && action) {
    bodies.push(`the outcome: ${action}.`);
    bodies.push(`what it does: ${action}. that's the whole pitch.`);
    bodies.push(`${entity} → ${action}. simple.`);
  }

  if (type === "milestone" && subject) {
    const action = analysis.action || "built";
    const baseForm = toBaseForm(action);
    const gerund = toGerund(action);
    bodies.push(`here's what nobody tells you about ${subject}:`);
    bodies.push(`the hardest part wasn't ${gerund} ${subject}. it was starting.`);
    bodies.push(`I thought ${subject} would be the hard part. it wasn't.`);
    bodies.push(`what I learned from ${gerund} ${subject}:`);
    bodies.push(`${subject} taught me more in a week than a month of planning.`);
    bodies.push(`the plan was simple. ${subject} had other ideas.`);
    bodies.push(`I ${action} ${subject} in a weekend. here's what I'd do differently.`);
    bodies.push(`3 things I got wrong about ${subject}:`);
    bodies.push(`the biggest mistake I made ${gerund} ${subject}:`);
    bodies.push(`nobody warned me about this part of ${subject}:`);
    bodies.push(`I almost quit ${subject} 3 times. here's why I didn't.`);
    bodies.push(`the unexpected cost of ${subject}:`);
    // If we have an audience profile, add audience-specific milestone bodies
    if (analysis.audienceProfile) {
      const ap = analysis.audienceProfile;
      const audS = analysis.audienceSingular || singularize(analysis.audience || ap.name);
      bodies.push(`every ${audS} should ${baseForm} ${subject} at least once. here's why.`);
      bodies.push(`other ${ap.name} will recognize this: ${subject} changes everything.`);
      bodies.push(`I ${action} ${subject} because ${ap.painPoints[0] || "the existing tools weren't good enough"}.`);
      if (ap.metrics.length >= 1) {
        bodies.push(`I ${action} ${subject}. my ${ap.metrics[0]} already moved.`);
        bodies.push(`the first ${ap.metrics[0]} number that proved ${subject} was worth it:`);
      }
      if (ap.painPoints.length >= 1) {
        bodies.push(`${subject} solved ${ap.painPoints[0]}. not on purpose. but it did.`);
        bodies.push(`I built ${subject} to fix ${ap.painPoints[0]}. it fixed more than that.`);
      }
      if (ap.goals.length >= 1) {
        bodies.push(`${subject} isn't about ${ap.goals[0]}. it's about not giving up.`);
      }
    }
  }

  // --- Audience-specific outcome bodies ---
  if (analysis.audienceProfile) {
    const ap = analysis.audienceProfile;
    const aud = analysis.audience || ap.name;

    // Use the audience's actual metrics as outcomes
    if (ap.metrics.length >= 2) {
      bodies.push(`the outcome: better ${ap.metrics[0]}. higher ${ap.metrics[1]}.`);
      bodies.push(`the outcome: ${ap.metrics[0]} up. ${ap.metrics[1] || ap.metrics[0]} up. everything else flat.`);
      bodies.push(`the outcome: track ${ap.metrics[0]} without the manual work.`);
    }

    // Use the audience's goals as outcomes
    if (ap.goals.length >= 1) {
      bodies.push(`the outcome: ${ap.goals[0]}.`);
      bodies.push(`the outcome: get to ${ap.goals[0]} faster.`);
      bodies.push(`the outcome: ${ap.goals[0]} without the usual friction.`);
    }

    // Audience-specific value props
    bodies.push(`the outcome: ${aud} get their time back.`);
    bodies.push(`the outcome: ${aud} stop wasting money on tools they don't need.`);
    bodies.push(`the outcome: ${aud} ship faster. iterate faster. win faster.`);
    bodies.push(`the outcome: ${aud} focus on what matters. not busywork.`);
    bodies.push(`the outcome: ${aud} go from idea to shipped in record time.`);
  }

  return bodies;
}

// ---------------------------------------------------------------------------
// Generate topic-specific closers
// ---------------------------------------------------------------------------
function generateTopicClosers(analysis) {
  const closers = [];
  const { type, audience, action, comparative } = analysis;

  if (type === "product_announcement") {
    if (audience) {
      closers.push(`if you're a ${audience}, try it.`);
      closers.push(`dm me if you want early access.`);
      closers.push(`link in bio. first 100 ${audience} get it free.`);
      closers.push(`reply "demo" and I'll send you a walkthrough.`);
      closers.push(`it's live. go try it.`);
    }
    closers.push(`the old way is obsolete.`);
    closers.push(`this is the new standard.`);
    closers.push(`stop overpaying. start shipping.`);
    closers.push(`the alternative exists. you just found it.`);
    closers.push(`built in public. shipping daily.`);
  }

  // --- Audience-specific closers from the database ---
  if (analysis.audienceProfile) {
    const ap = analysis.audienceProfile;
    // Use the audience's actual closers from the database
    for (const closer of ap.closers) {
      closers.push(closer);
    }
  }

  return closers;
}

module.exports = {
  analyzeTopic,
  generateTopicHooks,
  generateOutcomeBodies,
  generateTopicClosers,
  extractKeywords,
  buildOutcome,
};
