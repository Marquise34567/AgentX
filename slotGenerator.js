/*
 * ML slot generator — learns word choices within each story slot.
 *
 * Instead of generating word-by-word across an entire tweet (which produces
 * nonsense like "fitness advice is just a regex"), this model learns:
 *   - What products do SaaS founders build? (from real tweets)
 *   - What struggles do they face? (from real tweets)
 *   - What pivots work? (from real tweets)
 *   - What results do they get? (from real tweets)
 *
 * It then fills each slot with a learned choice, producing coherent stories
 * that are novel but make sense.
 *
 * TRAINING: Extracts slot fillings from the training corpus + combinatorial
 * examples, building a probability distribution for each slot.
 *
 * GENERATION: Samples from each slot's distribution, then combines them
 * into a coherent story.
 *
 * REINFORCEMENT: Analytics data adjusts slot probabilities — if "I built a
 * scheduling tool" performs well, "scheduling tool" gets upweighted.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { generateStories } = require("./storyGenerator");
const { generateCasual } = require("./casualGenerator");

// ---------------------------------------------------------------------------
// Slot-based ML model
// ---------------------------------------------------------------------------

class SlotModel {
  constructor() {
    this.trained = false;
    
    // Each slot has a Map of fillings → weight
    this.slots = {
      opener: new Map(),      // "I built", "2 unemployed friends bootstrapped", "I raised"
      product: new Map(),     // "a scheduling tool", "an AI writing assistant"
      condition: new Map(),   // "with $0 in the bank", "after 3 failed businesses"
      struggle: new Map(),    // "For 6 months nobody cared", "For 8 months I was cold DMing"
      pivot: new Map(),       // "then I niched down to dentists", "then I deleted 80%"
      result: new Map(),      // "$30k MRR in 4 months", "sold it for $10M+"
      promise: new Map(),     // "Here's what I learned 👇", "Here's the playbook 👇"
    };
    
    // Domain-specific products and niches
    this.domainProducts = new Map();
    this.domainNiches = new Map();
  }

  train() {
    if (this.trained) return;

    let referenceCount = 0;
    let generatedCount = 0;

    // 1. Load reference viral tweets and extract slot fillings
    const corpusPath = path.join(__dirname, "training_corpus.json");
    if (fs.existsSync(corpusPath)) {
      const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
      for (const tweet of corpus) {
        const engagement = (tweet.likes || 0) + (tweet.reposts || 0) * 2 + (tweet.bookmarks || 0) * 3;
        const weight = Math.max(5, Math.min(30, Math.floor(engagement / 3000)));
        this.extractSlots(tweet.text, weight, tweet.type);
        referenceCount++;
      }
    }

    // 2. Train on combinatorially generated stories — extract their slot fillings
    const domains = ["saas", "ai", "coding", "productivity", "remote_work", "fitness", "money", "content", "career", "design"];
    for (const domain of domains) {
      const stories = generateStories(domain, 30);
      for (const story of stories) {
        this.extractSlots(story, 2);
        generatedCount++;
      }
    }

    // 3. Train on analytics data (reinforcement learning)
    const analyticsPath = path.join(__dirname, "analytics_data.json");
    if (fs.existsSync(analyticsPath)) {
      try {
        const analytics = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));
        for (const post of analytics) {
          const perf = (post.impressions || 0) + (post.engagements || 0) * 5;
          const weight = Math.max(3, Math.min(20, Math.floor(perf / 500)));
          this.extractSlots(post.text, weight);
        }
      } catch (e) { /* skip malformed analytics */ }
    }

    // 4. Add domain-specific products from the casual generator's domain data
    // These are real product types that make sense in context
    this.loadDomainProducts();

    this.trained = true;
    return { referenceCount, generatedCount, slotSizes: this.slotSizes() };
  }

  loadDomainProducts() {
    // Real, specific products that founders build — organized by domain
    this.domainProducts.set("saas", [
      "a scheduling tool", "an invoice automation tool", "a CRM for small businesses",
      "a project management tool", "an email automation tool", "a customer feedback tool",
      "a help desk tool", "a document signing tool", "a time tracking tool",
      "a form builder", "an analytics dashboard", "a social media scheduler",
      "a file sharing tool", "a meeting notes tool", "a contract generator",
      "a lead scraping tool", "a churn tracking tool", "a feature request board",
      "a Stripe pricing table", "a payment automation tool", "a subscription manager",
      "a changelog tool", "an onboarding flow builder", "a churn prevention tool",
    ]);
    this.domainProducts.set("ai", [
      "an AI writing assistant", "an AI code review tool", "an AI meeting summarizer",
      "an AI customer support agent", "an AI sales call analyzer", "an AI content repurposer",
      "an AI research assistant", "an AI data entry tool", "an AI email writer",
      "an AI image generator for ads", "an AI contract analyzer", "an AI transcription tool",
      "an AI SEO optimizer", "an AI ad copy generator", "an AI video editor",
    ]);
    this.domainProducts.set("coding", [
      "a debugging tool", "a code documentation generator", "a deployment automation tool",
      "a code review platform", "a developer portfolio builder", "an API testing tool",
      "a git workflow visualizer", "a snippet manager", "a dependency updater",
      "a code search engine", "a TypeScript type checker", "a CI/CD pipeline tool",
    ]);
    this.domainProducts.set("productivity", [
      "a task manager", "a focus timer", "a note-taking app", "a habit tracker",
      "a calendar optimizer", "a meeting scheduler", "a distraction blocker",
    ]);
    this.domainProducts.set("remote_work", [
      "a remote team tool", "an async communication tool", "a virtual office tool",
      "a remote onboarding tool", "a team collaboration tool",
    ]);
    this.domainProducts.set("fitness", [
      "a workout tracker", "a meal planner", "a running coach app", "a sleep tracker",
    ]);
    this.domainProducts.set("money", [
      "a budgeting tool", "an expense tracker", "an investment tracker",
      "a tax automation tool", "a receipt scanner",
    ]);
    this.domainProducts.set("content", [
      "a content scheduler", "a video editor", "a thumbnail generator",
      "a content repurposer", "a social media analytics tool",
    ]);
    this.domainProducts.set("career", [
      "a resume builder", "a job board", "a salary tracker", "a networking tool",
    ]);
    this.domainProducts.set("design", [
      "a design portfolio tool", "a color palette generator", "a font picker",
      "a design feedback tool", "a wireframe builder",
    ]);

    // Domain-specific niches
    this.domainNiches.set("saas", ["dentists", "lawyers", "plumbers", "real estate agents", "fitness coaches", "restaurant owners", "freelance designers", "indie hackers", "small agencies", "e-commerce stores", "podcasters", "therapists", "contractors", "auto repair shops", "photographers"]);
    this.domainNiches.set("ai", ["lawyers", "recruiters", "sales teams", "customer support teams", "content creators", "real estate agents", "healthcare admins", "accountants", "marketers", "researchers"]);
    this.domainNiches.set("coding", ["junior devs", "indie hackers", "open source maintainers", "dev agencies", "bootcamp students", "freelance developers"]);
    this.domainNiches.set("productivity", ["students", "freelancers", "remote workers", "founders", "creatives"]);
    this.domainNiches.set("remote_work", ["remote teams", "distributed companies", "digital nomads", "freelancers"]);
    this.domainNiches.set("general", ["one specific industry", "one specific niche"]);
  }

  // Extract slot fillings from a tweet
  extractSlots(text, weight, type) {
    const lower = text.toLowerCase();

    // OPENER: "i built", "i raised", "2 unemployed friends", "my saas", "i spent"
    const openers = [
      { regex: /^i built\b/i, slot: "opener", value: "I built" },
      { regex: /^i raised\b/i, slot: "opener", value: "I raised" },
      { regex: /^i spent\b/i, slot: "opener", value: "I spent" },
      { regex: /^i turned down\b/i, slot: "opener", value: "I turned down" },
      { regex: /^i went from\b/i, slot: "opener", value: "I went from" },
      { regex: /^i had\b/i, slot: "opener", value: "I had" },
      { regex: /^my saas\b/i, slot: "opener", value: "My SaaS" },
      { regex: /^2 unemployed\b/i, slot: "opener", value: "2 unemployed friends" },
      { regex: /^a (former|burned|fired|laid|self|college|high|retired|19|40|single|non|freelancer|bootcamp|designer)\b/i, slot: "opener", value: null }, // extract full
    ];

    for (const { regex, slot, value } of openers) {
      if (regex.test(text)) {
        if (value) {
          this.slots[slot].set(value, (this.slots[slot].get(value) || 0) + weight);
        }
        break;
      }
    }

    // RESULT: "$Xk MRR in X months", "sold it for $XM in X months", etc.
    const resultMatches = text.match(/\$[\d,.]+[km]?\s*(mrr|arr|in revenue)[^.!?]*|sold it for \$[\d,.]+[km]?[^.!?]*|profitable in \d+ (days|months)[^.!?]*|\d+,?\d* paying customers[^.!?]*|quit (my|their) job[^.!?]*|acquired for \$[\d,.]+[km]?[^.!?]*/gi);
    if (resultMatches) {
      for (const r of resultMatches) {
        const value = r.charAt(0).toUpperCase() + r.slice(1);
        this.slots.result.set(value, (this.slots.result.get(value) || 0) + weight);
      }
    }

    // Add default results with timelines if we don't have enough
    const defaultResults = [
      "$10k MRR in 3 months", "$30k MRR in 4 months", "$50k MRR in 6 months",
      "$79k MRR in 12 months", "$100k MRR in 6 months", "$4.3M ARR in 18 months",
      "sold it for $10M+ in 18 months", "acquired for $2M in 12 months",
      "hit $1k MRR in 30 days", "hit $8k MRR in 60 days", "profitable in 30 days",
      "profitable in 3 months", "1,000 paying customers in 6 months",
      "quit my job in 90 days", "$200k in revenue in 12 months",
      "$1M in revenue in 18 months", "MRR went up 3x in 60 days",
      // Before/after results — these score higher because they show transformation
      "MRR went from $3k to $9k in 60 days", "MRR went from $0 to $30k in 4 months",
      "MRR went from $1k to $50k in 6 months", "went from 0 to 1,000 customers in 90 days",
      "went from $0 to $79k MRR in 12 months", "churn dropped from 12% to 2% in 30 days",
      "revenue went from $0 to $100k in 6 months", "MRR went from $8k to $40k in 3 months",
    ];
    for (const r of defaultResults) {
      if (!this.slots.result.has(r)) {
        this.slots.result.set(r, 3);
      }
    }

    // STRUGGLE: "For X months nobody cared", "For X months I was..."
    const struggleMatches = text.match(/for \d+ (months|days|weeks|years) [^.!?]+/gi);
    if (struggleMatches) {
      for (const s of struggleMatches) {
        this.slots.struggle.set(s.trim(), (this.slots.struggle.get(s.trim()) || 0) + weight);
      }
    }

    // PIVOT: "then I niched down", "then I deleted 80%", "then I raised prices"
    const pivotMatches = text.match(/then (i|they) [^.!?]+/gi);
    if (pivotMatches) {
      for (const p of pivotMatches) {
        this.slots.pivot.set(p.trim(), (this.slots.pivot.get(p.trim()) || 0) + weight);
      }
    }

    // PROMISE: "Here's what I learned 👇", etc.
    const promiseMatches = text.match(/here's[^👇]*👇|this is the story[^👇]*👇/gi);
    if (promiseMatches) {
      for (const p of promiseMatches) {
        this.slots.promise.set(p.trim(), (this.slots.promise.get(p.trim()) || 0) + weight);
      }
    }

    // CONDITION: "with $0 in the bank", "after 3 failed businesses"
    const conditionMatches = text.match(/with \$\d+[^.!?]*|after [^.!?]+/gi);
    if (conditionMatches) {
      for (const c of conditionMatches) {
        const clean = c.trim().replace(/\n/g, " ").slice(0, 60);
        if (clean.length > 10) {
          this.slots.condition.set(clean, (this.slots.condition.get(clean) || 0) + weight);
        }
      }
    }
  }

  // Sample from a slot's distribution
  sample(slot, domain = null, temperature = 1.0) {
    const map = this.slots[slot];
    if (slot === "product" && domain && this.domainProducts.has(domain)) {
      // For products, use the domain-specific list
      const products = this.domainProducts.get(domain);
      return products[Math.floor(Math.random() * products.length)];
    }
    if (slot === "niche" && domain && this.domainNiches.has(domain)) {
      const niches = this.domainNiches.get(domain);
      return niches[Math.floor(Math.random() * niches.length)];
    }

    if (map.size === 0) return this.getDefault(slot, domain);

    // Convert to array and apply temperature
    const entries = Array.from(map.entries());
    let total = 0;
    const adjusted = entries.map(([value, weight]) => {
      const adjustedWeight = Math.pow(weight, 1 / temperature);
      total += adjustedWeight;
      return [value, adjustedWeight];
    });

    // Sample
    let r = Math.random() * total;
    for (const [value, weight] of adjusted) {
      r -= weight;
      if (r <= 0) return value;
    }
    return entries[0][0];
  }

  // Get a default value for a slot if the model has no data
  getDefault(slot, domain) {
    const defaults = {
      opener: "I built",
      condition: "with $0 in the bank",
      struggle: "For 6 months nobody cared",
      pivot: "then I niched down to one specific industry",
      result: "$10k MRR in 3 months",
      promise: "Here's what I learned 👇",
    };
    if (slot === "product") {
      const products = this.domainProducts.get(domain) || ["a tool"];
      return products[Math.floor(Math.random() * products.length)];
    }
    return defaults[slot] || "";
  }

  // Generate a coherent story by filling slots
  generateStory(domain, useFirstPerson = true, temperature = 1.0) {
    // Sample the opener FIRST, then determine person from it
    const opener = this.sample("opener", domain, temperature);
    
    // Determine person from the opener — "I built" is first person, 
    // "2 unemployed friends" is third person
    const openerLower = opener.toLowerCase();
    if (openerLower === "2 unemployed friends") {
      useFirstPerson = false;
    } else {
      useFirstPerson = true;
    }

    const pronoun = useFirstPerson ? "I" : "they";
    const possessive = useFirstPerson ? "my" : "their";

    // Sample remaining slots
    const product = this.sample("product", domain, temperature);
    const condition = this.sample("condition", domain, temperature);
    const struggle = this.sample("struggle", domain, temperature);
    const pivot = this.sample("pivot", domain, temperature);
    const result = this.sample("result", domain, temperature);
    const promise = this.sample("promise", domain, temperature);

    // Build the opener line based on which opener we got
    // Some openers need "built", some need different verbs
    let openerLine;
    if (openerLower === "i built" || openerLower === "2 unemployed friends") {
      const verb = useFirstPerson ? "built" : "built";
      const subject = opener === "2 unemployed friends" ? "2 unemployed friends" : "I";
      openerLine = `${subject} built ${product} ${condition}`;
    } else if (openerLower === "i raised") {
      // "I raised $2M and built the wrong product" — needs a different structure
      openerLine = `I raised $2M and built ${product} ${condition}`;
    } else if (openerLower === "i spent") {
      // "I spent $40k on ads before I realized..." — needs a different structure
      openerLine = `I spent $40k on ads for ${product} ${condition}`;
    } else if (openerLower === "i turned down") {
      // "I turned down $500k in funding" — not about a product
      openerLine = `I turned down $500k in funding to build ${product} ${condition}`;
    } else if (openerLower === "i went from") {
      openerLine = `I went from $0 to building ${product} ${condition}`;
    } else if (openerLower === "i had") {
      openerLine = `I had 3 paying customers for ${product} ${condition}`;
    } else if (openerLower === "my saas") {
      openerLine = `My SaaS, ${product}, ${condition}`;
    } else {
      openerLine = `${opener} ${product} ${condition}`;
    }

    // Fix pronouns in condition
    const fixedCondition = useFirstPerson
      ? condition
          .replace(/\btheir\b/gi, "my")
          .replace(/\bthey\b/gi, "I")
          .replace(/\bthem\b/gi, "me")
          .replace(/\bleft them\b/gi, "left me")
      : condition;
    const fixedStruggle = useFirstPerson
      ? struggle
          .replace(/\bthey were\b/gi, "I was")
          .replace(/\bthey had\b/gi, "I had")
          .replace(/\bthey got\b/gi, "I got")
          .replace(/\bthey couldn't\b/gi, "I couldn't")
          .replace(/\bthey were about\b/gi, "I was about")
          .replace(/\bthey were losing\b/gi, "I was losing")
          .replace(/\bthey were making\b/gi, "I was making")
          .replace(/\bthey were building\b/gi, "I was building")
          .replace(/\bthey were posting\b/gi, "I was posting")
          .replace(/\bthey were copying\b/gi, "I was copying")
          .replace(/\bthey were cold\b/gi, "I was cold")
          .replace(/\bthey were ignored\b/gi, "I was ignored")
          .replace(/\bthey\b/gi, "I")
          .replace(/\btheir\b/gi, "my")
          .replace(/\bthem\b/gi, "me")
      : struggle
          .replace(/\bi was\b/gi, "they were")
          .replace(/\bi had\b/gi, "they had")
          .replace(/\bi got\b/gi, "they got")
          .replace(/\bi couldn't\b/gi, "they couldn't")
          .replace(/\bi was about\b/gi, "they were about")
          .replace(/\bi was losing\b/gi, "they were losing")
          .replace(/\bi was making\b/gi, "they were making")
          .replace(/\bi was building\b/gi, "they were building")
          .replace(/\bi was posting\b/gi, "they were posting")
          .replace(/\bi was copying\b/gi, "they were copying")
          .replace(/\bi was cold\b/gi, "they were cold")
          .replace(/\bi was ignored\b/gi, "they were ignored")
          .replace(/\bi\b/gi, "they")
          .replace(/\bmy\b/gi, "their")
          .replace(/\bme\b/gi, "them");

    // Fix pivot: capitalize "then" and fix pronouns
    // Pivots are stored as "then they X" or "then I X" — we need to:
    // 1. Remove the original pronoun
    // 2. Add the correct one
    const fixedPivot = useFirstPerson
      ? pivot
          .replace(/^then\s+(they|i)\s+/i, "Then ")
          .replace(/^then\s+/i, "Then ")
          .replace(/\bthey\b/gi, "I")
          .replace(/\btheir\b/gi, "my")
          // Now add "I" after "Then" if it's not already there
          .replace(/^Then\s+(?!I\b)/, "Then I ")
      : pivot
          .replace(/^then\s+(they|i)\s+/i, "Then ")
          .replace(/^then\s+/i, "Then ")
          .replace(/\bi\b/gi, "they")
          .replace(/\bmy\b/gi, "their")
          .replace(/^Then\s+(?!they\b)/, "Then they ");
    const fixedResult = useFirstPerson
      ? result
          .replace(/\bthey\b/gi, "I")
          .replace(/\btheir\b/gi, "my")
          .replace(/\bquit their jobs?\b/gi, "quit my job")
          .replace(/\bquit my jobs\b/gi, "quit my job")
          .replace(/\bthey made\b/gi, "I made")
          .replace(/\bthey learned\b/gi, "I learned")
          .replace(/\bthem\b/gi, "me")
      : result
          .replace(/\bquit my jobs?\b/gi, "quit their jobs")
          .replace(/\bi made\b/gi, "they made")
          .replace(/\bi learned\b/gi, "they learned")
          .replace(/\bme\b/gi, "them");
    const fixedPromise = useFirstPerson
      ? promise.replace(/\bthey\b/gi, "I").replace(/\btheir\b/gi, "my")
      : promise;

    // Rebuild openerLine with fixed condition
    if (openerLower === "i built" || openerLower === "2 unemployed friends") {
      const subject = opener === "2 unemployed friends" ? "2 unemployed friends" : "I";
      openerLine = `${subject} built ${product} ${fixedCondition}`;
    } else if (openerLower === "i raised") {
      openerLine = `I raised $2M and built ${product} ${fixedCondition}`;
    } else if (openerLower === "i spent") {
      openerLine = `I spent $40k on ads for ${product} ${fixedCondition}`;
    } else if (openerLower === "i turned down") {
      openerLine = `I turned down $500k in funding to build ${product} ${fixedCondition}`;
    } else if (openerLower === "i went from") {
      openerLine = `I went from $0 to building ${product} ${fixedCondition}`;
    } else if (openerLower === "i had") {
      openerLine = `I had 3 paying customers for ${product} ${fixedCondition}`;
    } else if (openerLower === "my saas") {
      openerLine = `My SaaS, ${product}, ${fixedCondition}`;
    }

    // Build the story — two formats
    // Format 1: Short hook (punchy first line + result + promise)
    // First line is just "I built [product]." — 3-5 words, optimal hook length
    const shortHook = `${openerLine.split(" with ")[0].split(" after ")[0]}.\n\n${fixedResult}.\n\n${fixedPromise}`;

    // Format 2: Full story (short hook + condition + struggle + pivot + result + promise)
    // First line is just "I built [product]." then condition on its own line
    let firstLine;
    if (openerLower === "i built") {
      firstLine = `I built ${product}.`;
    } else if (openerLower === "i raised") {
      firstLine = `I raised $2M and built ${product}.`;
    } else if (openerLower === "i spent") {
      firstLine = `I spent $40k on ads for ${product}.`;
    } else if (openerLower === "i turned down") {
      firstLine = `I turned down $500k to build ${product}.`;
    } else if (openerLower === "i went from") {
      firstLine = `I went from $0 to building ${product}.`;
    } else if (openerLower === "i had") {
      firstLine = `I had 3 customers for ${product}.`;
    } else if (openerLower === "my saas") {
      firstLine = `My SaaS, ${product}, was dying.`;
    } else if (openerLower === "2 unemployed friends") {
      firstLine = `2 unemployed friends built ${product}.`;
    } else {
      firstLine = `${opener} ${product}.`;
    }

    // Capitalize condition for its own line
    const capCondition = fixedCondition.charAt(0).toUpperCase() + fixedCondition.slice(1);
    
    const fullStory = `${firstLine}\n\n${capCondition}.\n\n${fixedStruggle}.\n\n${fixedPivot}.\n\n${fixedResult}.\n\n${fixedPromise}`;

    // Return both — the scorer will pick the better one
    return { shortHook, fullStory };
  }

  // Generate N unique stories
  generate(domain, count = 10) {
    if (!this.trained) this.train();

    const stories = [];
    const seen = new Set();

    for (let i = 0; i < count * 10 && stories.length < count; i++) {
      const useFirstPerson = true; // always first person for stronger voice
      const temp = 0.8 + (i % 3) * 0.15;
      const { fullStory } = this.generateStory(domain, useFirstPerson, temp);

      // Only add full stories (not short hooks) — they score higher
      const key = fullStory.slice(0, 40).toLowerCase();
      if (seen.has(key)) continue;
      if (fullStory.length < 100 || fullStory.length > 280) continue;
      seen.add(key);
      stories.push(fullStory);
    }

    return stories;
  }

  // Get slot sizes for stats
  slotSizes() {
    const sizes = {};
    for (const [slot, map] of Object.entries(this.slots)) {
      sizes[slot] = map.size;
    }
    sizes.products = this.domainProducts.size;
    sizes.niches = this.domainNiches.size;
    return sizes;
  }

  // Add a training example (for reinforcement)
  addExample(text, weight = 5) {
    this.extractSlots(text, weight);
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new SlotModel();
  }
  return _instance;
}

module.exports = { SlotModel, getInstance };
