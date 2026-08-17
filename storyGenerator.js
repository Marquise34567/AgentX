/*
 * Founder story combinatorial generator.
 *
 * Instead of hardcoded templates, this generates NOVEL founder stories by
 * combining story elements in different ways. The hardcoded stories in
 * founderStoryGenerator.js are used as REFERENCE PATTERNS to understand
 * the structure, but every generated story is a unique combination.
 *
 * Story structure (based on analysis of viral founder tweets):
 *   [PROTAGONIST] + [STARTING CONDITION] + [ACTION] + [STRUGGLE] + [PIVOT] + [RESULT] + [THREAD PROMISE]
 *
 * Example combination:
 *   "2 unemployed friends" + "bootstrapped" + "a scheduling tool" + "for 6 months nobody cared" + "then they niched down to dentists" + "$30k MRR in 4 months" + "Here's how 👇"
 *
 * This generates thousands of unique combinations per domain.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Story elements — the building blocks
// ---------------------------------------------------------------------------

const ELEMENTS = {
  // WHO — the protagonist
  protagonists: [
    "2 unemployed friends",
    "a burned out developer",
    "a college dropout",
    "a former teacher",
    "a single mom",
    "a fired engineer",
    "a 19 year old",
    "a 40 year old who never started a business",
    "two brothers",
    "a designer who couldn't code",
    "a non-technical founder",
    "a former accountant",
    "a laid off marketer",
    "a self-taught developer",
    "a freelancer who was tired of client work",
    "a bootcamp grad",
    "a former consultant",
    "a high school dropout",
    "a retired engineer",
    "a former nurse",
  ],

  // STARTING CONDITION — what was their situation
  startingConditions: [
    "with $0 in the bank",
    "with $200 left from their last paycheck",
    "after getting rejected by 12 investors",
    "after their startup failed",
    "after getting fired for building a side project at work",
    "with no coding experience",
    "after dropping out of college",
    "with a laptop and a problem they had themselves",
    "after 3 failed businesses",
    "with no network and no connections",
    "living in their parents' basement",
    "after a divorce left them broke",
    "with a newborn baby and a mortgage",
    "after moving to a new country with nothing",
    "after quitting a $200k job",
  ],

  // WHAT THEY BUILT — the product (domain-specific)
  products: {
    saas: [
      "a scheduling tool",
      "an invoice automation tool",
      "a CRM for small businesses",
      "a project management tool",
      "an email automation tool",
      "a customer feedback tool",
      "a team chat tool",
      "a document signing tool",
      "a time tracking tool",
      "a password manager for teams",
      "a form builder",
      "a help desk tool",
      "an analytics dashboard",
      "a social media scheduler",
      "a file sharing tool",
      "a meeting notes tool",
      "a contract generator",
      "a lead scraping tool",
      "a churn tracking tool",
      "a feature request board",
    ],
    ai: [
      "an AI writing assistant",
      "an AI code review tool",
      "an AI meeting summarizer",
      "an AI customer support agent",
      "an AI sales call analyzer",
      "an AI content repurposer",
      "an AI research assistant",
      "an AI data entry tool",
      "an AI email writer",
      "an AI image generator for ads",
      "an AI contract analyzer",
      "an AI transcription tool",
      "an AI SEO optimizer",
      "an AI ad copy generator",
      "an AI video editor",
    ],
    coding: [
      "a debugging tool",
      "a code documentation generator",
      "a deployment automation tool",
      "a code review platform",
      "a developer portfolio builder",
      "an API testing tool",
      "a git workflow visualizer",
      "a snippet manager",
      "a dependency updater",
      "a code search engine",
    ],
    general: [
      "a tool",
      "a platform",
      "an app",
      "a service",
    ],
  },

  // STRUGGLE — what went wrong
  struggles: [
    "For {timeline} nobody cared",
    "For {timeline} they had 0 users",
    "For {timeline} they had 3 users and 2 were friends",
    "For {timeline} nobody would pay for it",
    "For {timeline} they were making $0",
    "For {timeline} they were losing money",
    "For {timeline} they couldn't get anyone to try it",
    "For {timeline} they were ignored on every platform",
    "For {timeline} they got 1 user a month",
    "For {timeline} they were about to quit",
    "For {timeline} they were building features nobody asked for",
    "For {timeline} they were copying competitors and getting nowhere",
    "For {timeline} they were posting on X and getting 0 engagement",
    "For {timeline} they were cold DMing people and getting blocked",
  ],

  // PIVOT — what changed everything
  pivots: [
    "then they niched down to {niche}",
    "then they deleted 80% of the product",
    "then they raised prices 4x",
    "then they stopped building and started talking to users",
    "then they changed the target audience completely",
    "then they simplified to one feature",
    "then they pivoted from B2C to B2B",
    "then they pivoted from enterprise to SMB",
    "then they stopped ads and started posting in communities",
    "then they rewrote the onboarding",
    "then they changed the pricing model",
    "then they focused on one specific workflow",
    "then they stopped chasing features and fixed bugs",
    "then they niched down from {broadNiche} to {niche}",
    "then they made it for one specific industry",
  ],

  // RESULT — the outcome
  results: [
    "$10k MRR in {resultTimeline}",
    "$30k MRR in {resultTimeline}",
    "$50k MRR in {resultTimeline}",
    "$79k MRR in {resultTimeline}",
    "$100k MRR in {resultTimeline}",
    "$4.3M ARR in {resultTimeline}",
    "sold it for $10M+ in {resultTimeline}",
    "acquired for $2M in {resultTimeline}",
    "hit $1k MRR in {resultTimeline}",
    "hit $8k MRR in {resultTimeline}",
    "profitable in {resultTimeline}",
    "1,000 paying customers in {resultTimeline}",
    "quit their jobs in {resultTimeline}",
    "$200k in revenue in {resultTimeline}",
    "$1M in revenue in {resultTimeline}",
  ],

  // THREAD PROMISE — the hook for the thread
  threadPromises: [
    "Here's the story 👇",
    "Here's what I learned 👇",
    "Here's exactly what they did 👇",
    "Here's the whole playbook 👇",
    "Here's what worked and what didn't 👇",
    "This is the story, how much money they made & everything they learned 👇",
    "Here's exactly what I'd do differently 👇",
    "Here's the exact strategy 👇",
    "Here's what nobody tells you about this 👇",
    "Here's the full breakdown 👇",
  ],

  // TIMELINES
  timelines: ["3 months", "6 months", "8 months", "12 months", "18 months", "2 years"],

  // RESULT TIMELINES (shorter — after the pivot)
  resultTimelines: ["30 days", "60 days", "3 months", "4 months", "6 months", "90 days"],

  // NICHES (domain-specific)
  niches: {
    saas: ["dentists", "lawyers", "plumbers", "real estate agents", "fitness coaches", "restaurant owners", "freelance designers", "indie hackers", "small agencies", "e-commerce stores", "podcasters", "therapists", "contractors", "auto repair shops", "photographers"],
    ai: ["lawyers", "recruiters", "sales teams", "customer support teams", "content creators", "real estate agents", "healthcare admins", "accountants", "marketers", "researchers"],
    coding: ["junior devs", "indie hackers", "open source maintainers", "dev agencies", "bootcamp students", "freelance developers"],
    general: ["one specific industry", "one specific niche", "one type of user"],
  },

  // BROAD NICHES (for the "niched down from X to Y" pattern)
  broadNiches: {
    saas: ["everyone", "all businesses", "all small businesses", "startups", "teams"],
    ai: ["everyone", "all professionals", "all knowledge workers", "all businesses"],
    coding: ["all developers", "all teams", "everyone"],
    general: ["everyone", "all users", "the mass market"],
  },
};

// ---------------------------------------------------------------------------
// Fill in template variables
// ---------------------------------------------------------------------------

function fillTemplate(str, domain) {
  const niches = ELEMENTS.niches[domain] || ELEMENTS.niches.general;
  const broadNiches = ELEMENTS.broadNiches[domain] || ELEMENTS.broadNiches.general;
  return str
    .replace(/\{timeline\}/g, () => pick(ELEMENTS.timelines))
    .replace(/\{resultTimeline\}/g, () => pick(ELEMENTS.resultTimelines))
    .replace(/\{niche\}/g, () => pick(niches))
    .replace(/\{broadNiche\}/g, () => pick(broadNiches));
}

// Deterministic pick — uses a seed so the same domain produces the same stories
let _seed = 1;
function seed(s) { _seed = s; }
function rand() {
  // Simple LCG (linear congruential generator) for deterministic output
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return _seed / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// ---------------------------------------------------------------------------
// Generate a single founder story
// ---------------------------------------------------------------------------

function generateOneStory(domain, useFirstPerson = false) {
  const products = ELEMENTS.products[domain] || ELEMENTS.products.general;
  const protagonist = pick(ELEMENTS.protagonists);
  const startingCondition = pick(ELEMENTS.startingConditions);
  const product = pick(products);
  const struggle = fillTemplate(pick(ELEMENTS.struggles), domain);
  const pivot = fillTemplate(pick(ELEMENTS.pivots), domain);
  const result = pick(ELEMENTS.results);
  const threadPromise = pick(ELEMENTS.threadPromises);

  // Fix pronouns based on perspective
  // First person: I, my, me, was
  // Third person: they, their, them, were
  const subject = useFirstPerson ? "I" : protagonist;
  
  // Fix starting condition pronouns
  const fixedStartingCondition = useFirstPerson
    ? startingCondition.replace(/\btheir\b/g, "my").replace(/\bthey\b/g, "I")
    : startingCondition;

  // Fill in template variables in ALL elements
  const filledResult = fillTemplate(result, domain);
  const filledStruggle = fillTemplate(struggle, domain);
  const filledPivot = fillTemplate(pivot, domain);

  // Fix struggle pronouns and verb agreement
  // "For 6 months they were losing money" → "For 6 months I was losing money"
  const fixedStruggle = useFirstPerson
    ? filledStruggle
        .replace(/\bthey were\b/g, "I was")
        .replace(/\bthey had\b/g, "I had")
        .replace(/\bthey got\b/g, "I got")
        .replace(/\bthey couldn't\b/g, "I couldn't")
        .replace(/\bthey were about\b/g, "I was about")
        .replace(/\bthey\b/g, "I")
    : filledStruggle;

  // Fix pivot pronouns — remove leading "they" since we already add pronoun before
  // "then they niched down" → "Then I niched down" (not "Then I I niched down")
  const fixedPivot = useFirstPerson
    ? filledPivot
        .replace(/^then\s+they\s+/i, "")
        .replace(/^then\s+/i, "")
        .replace(/\bthey\b/g, "I")
        .replace(/\btheir\b/g, "my")
    : filledPivot
        .replace(/^then\s+they\s+/i, "")
        .replace(/^then\s+/i, "");

  // Fix result pronouns
  const fixedResult = useFirstPerson
    ? filledResult
        .replace(/\bthey\b/g, "I")
        .replace(/\btheir\b/g, "my")
        .replace(/\bquit their jobs\b/g, "quit my job")
        .replace(/\bquit my jobs\b/g, "quit my job")
    : filledResult;

  // Fix thread promise pronouns
  const fixedThreadPromise = useFirstPerson
    ? threadPromise
        .replace(/\bthey\b/g, "I")
        .replace(/\btheir\b/g, "my")
    : threadPromise;

  // SHORT HOOK: just the key facts (protagonist + product + result)
  // "I built a lead scraping tool after 3 failed businesses. Hit $1k MRR in 60 days."
  const capResult = fixedResult.charAt(0).toUpperCase() + fixedResult.slice(1);
  // Add a thread promise to short hooks — it boosts the score
  const promises = ["\n\nHere's the full story 👇", "\n\nHere's what I learned 👇", "\n\nHere's the exact playbook 👇"];
  const promise = promises[Math.floor(rand() * promises.length)];
  const shortHook = `${subject} built ${product} ${fixedStartingCondition}.\n\n${capResult}.${promise}`;

  // FULL STORY: hook + struggle + pivot + result + thread promise
  // This is the Tibo/Dylan format — specific timeline, numbers, struggle, lesson
  const pronoun = useFirstPerson ? "I" : "they";
  const fullStory = `${subject} built ${product} ${fixedStartingCondition}.\n\n${fixedStruggle}.\n\nThen ${pronoun} ${fixedPivot}.\n\n${capResult}.\n\n${fixedThreadPromise}`;

  return { shortHook, fullStory };
}

// ---------------------------------------------------------------------------
// Generate N unique founder stories for a domain
// ---------------------------------------------------------------------------

function generateStories(domain, count = 10) {
  const stories = [];
  const seen = new Set();

  // Use a fixed seed for deterministic output per domain
  seed(domain.length * 1000 + domain.charCodeAt(0));

  // Generate a mix of full stories and short hooks
  // Full stories have the struggle + pivot + result narrative arc
  // Short hooks are just the key facts (protagonist + product + result)
  for (let i = 0; i < count * 4 && stories.length < count; i++) {
    const useFirstPerson = i % 2 === 0; // alternate between first and third person
    const { shortHook, fullStory } = generateOneStory(domain, useFirstPerson);

    // Alternate between adding full stories and short hooks
    const story = i % 3 === 0 ? fullStory : shortHook;
    const storyKey = story.slice(0, 50).toLowerCase();
    if (!seen.has(storyKey)) {
      seen.add(storyKey);
      stories.push(story);
    }
  }

  return stories;
}

module.exports = { generateStories, generateOneStory, ELEMENTS };
