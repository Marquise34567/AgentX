/*
 * Viral format database — the actual post structures that go viral on X
 * in the AI video editing and SaaS niches.
 *
 * Researched from real viral tweets and 2026 content strategy guides.
 * Each format has:
 *   - id, name, description
 *   - structure: the actual post structure
 *   - hookTemplates: first-line patterns
 *   - bodyTemplates: body line patterns
 *   - closerTemplates: closing line patterns
 *   - niches: which niches this works best for
 *   - examples: real viral examples
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Viral format database
// ---------------------------------------------------------------------------
const VIRAL_FORMATS = {
  // === THE CONTRARIAN HOOK + STORY (Paradigm Shift) ===
  contrarianStory: {
    id: "contrarianStory",
    name: "Contrarian Hook + Story",
    description: "Start with a widely accepted belief, state why it's wrong, break down the reality from experience",
    niches: ["videoEditors", "saasFounders", "founders", "softwareDevelopers", "marketers"],
    structure: "contrarian hook → your experience → the reality → the lesson",
    hookTemplates: [
      "everyone thinks {belief}. they're wrong.",
      "the {audience} industry is built on a lie: {belief}.",
      "unpopular take: {belief} is wrong.",
      "everyone's wrong about {topic}.",
      "the thing nobody wants to admit about {topic}:",
      "most {audience} get this backwards.",
      "{belief}? not anymore.",
      "stop {common_action}. it's killing your {metric}.",
    ],
    bodyTemplates: [
      "I used to think {belief} too.\n\nthen I {experience}.\n\nthe reality: {reality}.",
      "here's what actually happens:\n\n{reality}\n\nI learned this the hard way.",
      "after {timeframe} of doing this:\n\n{reality}\n\nthe old way is dead.",
      "I {experience}.\n\nthe result changed my mind completely.",
    ],
    closerTemplates: [
      "screenshot this in 6 months.",
      "the old way is obsolete.",
      "change my mind.",
      "agree or disagree?",
      "this is the hill I'll die on.",
    ],
    examples: [
      "everyone thinks AI video editors replace editors. they don't. they replace the boring parts. the cutting, the trimming, the dead air removal. the editing still needs a human.",
    ],
  },

  // === THE VULNERABLE FAILURE-TO-WIN BREAKDOWN ===
  failureToWin: {
    id: "failureToWin",
    name: "Vulnerable Failure → Win",
    description: "Open with a painful mistake, walk through the messy reality, finish with the lesson",
    niches: ["videoEditors", "saasFounders", "founders", "indieHackers", "buildInPublic"],
    structure: "painful failure → messy reality → what you learned → the win",
    hookTemplates: [
      "I {failure} and it cost me {cost}.",
      "I spent {timeframe} {wasted_action}. here's what I should have done.",
      "I {failure}. nobody talks about this part.",
      "the biggest mistake I made building {product}:",
      "I was wrong about {topic}. here's what changed.",
      "{failure}. it was brutal. here's the lesson.",
      "I {failure}. lost {metric}. here's what I learned.",
    ],
    bodyTemplates: [
      "here's what happened:\n\n{failure_detail}\n\nI thought {wrong_assumption}.\n\nthe reality: {reality}.\n\nthe fix: {fix}.",
      "for {timeframe} I was {wasted_action}.\n\nthen I {pivot}.\n\n{result}.",
      "the messy reality:\n\n{failure_detail}\n\nwhat I learned: {lesson}.",
    ],
    closerTemplates: [
      "lesson learned.",
      "the process is the point.",
      "if this helps one person, worth it.",
      "what would you have done?",
      "share this with someone building {category}.",
    ],
    examples: [
      "I spent 3 weeks shipping a feature that got 2 users. Here's what I should have validated first.",
    ],
  },

  // === THE SHORT STORY / NARRATIVE ARC ===
  shortStory: {
    id: "shortStory",
    name: "Short Story / Narrative Arc",
    description: "Hook → Conflict → Resolution → Lesson. Micro-paragraphs, heavy whitespace.",
    niches: ["videoEditors", "saasFounders", "founders", "indieHackers", "youTubers", "podcasters"],
    structure: "hook → conflict → resolution → climax/lesson",
    hookTemplates: [
      "{number} {timeframe} ago, I {starting_state}.",
      "I was {bad_state}.",
      "it started with {inciting_incident}.",
      "{number} {metric}. {timeframe}.",
      "I didn't expect {outcome}.",
    ],
    bodyTemplates: [
      "I was {bad_state}.\n\nthen {inciting_incident}.\n\nI {action}.\n\n{result}.",
      "nobody thought it would work.\n\n{conflict}\n\nI kept going.\n\n{resolution}.",
      "the first {number} tries failed.\n\nthen {breakthrough}.\n\n{result}.",
    ],
    closerTemplates: [
      "here we go.",
      "day 1 of many.",
      "the streak starts now.",
      "what's your story?",
      "follow along.",
    ],
    examples: [
      "Aos 12 anos, criei meu primeiro canal no YouTube. Para a surpresa de ninguém, era de Minecraft. Era ruim? Muito. Mas ali, aprendi pela primeira vez a editar vídeos.",
    ],
  },

  // === THE DIALOGUE FORMAT ===
  dialogue: {
    id: "dialogue",
    name: "Dialogue / Conversation",
    description: "Recreate a punchy conversation that ends with a mic-drop punchline",
    niches: ["videoEditors", "saasFounders", "founders", "salesPros", "freelancers"],
    structure: "brief conversation → mic-drop punchline",
    hookTemplates: [
      "\"{statement}\"\n\n\"{response}\"",
      "client: \"{request}\"\n\nme: \"{response}\"",
      "them: \"{skeptic_statement}\"\n\nme: \"{mic_drop}\"",
      "\"{question}\"\n\n\"{answer}\"",
    ],
    bodyTemplates: [
      "\"{follow_up}\"\n\n\"{punchline}\"",
      "they laughed.\n\nthen I showed them {proof}.\n\nthey stopped laughing.",
    ],
    closerTemplates: [
      "and that's the whole pitch.",
      "the proof is in the work.",
      "send this to a {audience}.",
      "results speak louder.",
    ],
    examples: [
      "\"AI can't edit like a human.\"\n\n\"Correct. It edits faster.\"\n\nand that's the whole point.",
    ],
  },

  // === PROOF → STORY → LESSON ===
  proofStoryLesson: {
    id: "proofStoryLesson",
    name: "Proof → Story → Lesson",
    description: "Lead with a number/result, tell the story behind it, end with a transferable lesson",
    niches: ["saasFounders", "founders", "indieHackers", "buildInPublic", "videoEditors", "youTubers"],
    structure: "proof (number) → story behind it → transferable lesson",
    hookTemplates: [
      "we got {number} {metric} from one {action}.",
      "{number} {metric}. here's how.",
      "I {action} and got {number} {metric}.",
      "{number} {metric} in {timeframe}.",
      "the result: {number} {metric}.",
      "one {action} → {number} {metric}.",
    ],
    bodyTemplates: [
      "not because {wrong_reason}.\n\nit worked because {real_reason}.\n\nthe lesson: {lesson}.",
      "here's what happened:\n\n{story}\n\nthe lesson: {lesson}.",
      "the {metric} isn't the point.\n\nthe point is {lesson}.",
    ],
    closerTemplates: [
      "steal this.",
      "what's your number?",
      "the lesson is transferable.",
      "apply this to your {category}.",
    ],
    examples: [
      "We got 117 trials from one 32-second demo. Not because the edit was flashy. It opened with the exact painful task our user hates doing manually. The lesson: show the painful 'before' for 3 seconds, then show the payoff.",
    ],
  },

  // === PROBLEM → LIVE BUILD → RESULT ===
  problemBuildResult: {
    id: "problemBuildResult",
    name: "Problem → Build → Result",
    description: "Hook with a painful problem, show the build/solution, end with the result",
    niches: ["videoEditors", "saasFounders", "founders", "buildInPublic", "softwareDevelopers"],
    structure: "painful problem → the build/solution → the result",
    hookTemplates: [
      "{action} should not take {timeframe}.",
      "the problem with {action}: {pain_point}.",
      "I was spending {timeframe} on {action}.",
      "every {audience} deals with {pain_point}.",
      "{action} is broken. here's the fix.",
      "stop wasting {timeframe} on {action}.",
    ],
    bodyTemplates: [
      "the old way: {old_way}.\n\nthe new way: {new_way}.\n\n{result}.",
      "I built {product} to fix this.\n\n{how_it_works}.\n\n{result}.",
      "here's the workflow:\n\n{workflow}\n\n{result}.",
    ],
    closerTemplates: [
      "[screen recording]",
      "what workflow should I automate next?",
      "try it.",
      "dm for early access.",
      "what's your workflow?",
    ],
    examples: [
      "Editing podcasts into clips should not take 4 hours. The old way: scrub through, find moments, cut, export. The new way: AutoEditor finds the moments, cuts, exports. 45 seconds.",
    ],
  },

  // === HOT TAKE → EVIDENCE → INVITATION ===
  hotTakeEvidence: {
    id: "hotTakeEvidence",
    name: "Hot Take → Evidence → Invitation",
    description: "State a sharp opinion, back it with evidence, invite engagement",
    niches: ["saasFounders", "founders", "videoEditors", "marketers", "softwareDevelopers"],
    structure: "hot take → evidence → engagement invitation",
    hookTemplates: [
      "hot take: {opinion}.",
      "most {audience} don't have a {problem_type} problem. they have a {real_problem} problem.",
      "unpopular opinion: {opinion}.",
      "{belief} is wrong. here's why.",
      "the {audience} who win don't do what 90% of {audience} do.",
    ],
    bodyTemplates: [
      "if {condition}, more {action} won't fix it.\n\n{evidence}.\n\n{implication}.",
      "the evidence: {evidence}.\n\nthe implication: {implication}.",
      "I've been {audience} for {timeframe}. {evidence}.",
    ],
    closerTemplates: [
      "what proof does your {asset} currently show?",
      "agree or disagree?",
      "change my mind.",
      "what's your take?",
      "reply with your experience.",
    ],
    examples: [
      "Hot take: most early SaaS founders don't have a distribution problem. They have a proof problem. If buyers can't see a real outcome in 10 seconds, more posting will not fix it.",
    ],
  },

  // === "I WAS WRONG" → WHAT CHANGED ===
  iWasWrong: {
    id: "iWasWrong",
    name: "I Was Wrong → What Changed",
    description: "Admit a mistake, show what you learned, show the result of the change",
    niches: ["saasFounders", "founders", "indieHackers", "buildInPublic", "videoEditors"],
    structure: "admit wrong → what changed → the result",
    hookTemplates: [
      "I was wrong about {topic}.",
      "I thought {wrong_belief}.",
      "I changed my mind on {topic}.",
      "I used to believe {wrong_belief}. I was wrong.",
      "the biggest thing I was wrong about:",
    ],
    bodyTemplates: [
      "I thought {wrong_belief}.\n\nthe reality: {reality}.\n\nso I {change}.\n\n{result}.",
      "I believed {wrong_belief}.\n\nthen {evidence}.\n\nI {change}.\n\n{result}.",
      "I was wrong.\n\n{what_actually_happens}\n\nI {change}.\n\n{result}.",
    ],
    closerTemplates: [
      "the lesson: {lesson}.",
      "what did you used to believe?",
      "being wrong is fine. staying wrong isn't.",
      "share this with someone who needs to hear it.",
    ],
    examples: [
      "I thought users wanted more AI controls. They wanted fewer decisions. So we cut the workflow from 7 settings to 2. Trial-to-first-export improved immediately.",
    ],
  },

  // === BUILD LOG / SERIES FORMAT ===
  buildLog: {
    id: "buildLog",
    name: "Build Log / Day X",
    description: "Recurring series format with a clear scoreboard. Makes people return.",
    niches: ["buildInPublic", "saasFounders", "founders", "indieHackers", "videoEditors"],
    structure: "day X → what I shipped → metric → lesson",
    hookTemplates: [
      "day {number} building {product}:",
      "week {number} of {project}:",
      "build log #{number}:",
      "{product} update — day {number}:",
      "shipping {product} in public: day {number}.",
    ],
    bodyTemplates: [
      "shipped: {what_shipped}.\n\n{metric}: {number}.\n\nlesson: {lesson}.",
      "what I built: {what_shipped}.\n\nwhat broke: {what_broke}.\n\nwhat I learned: {lesson}.",
      "shipped {what_shipped}.\n\ngot {number} {metric}.\n\nlearned: {lesson}.",
    ],
    closerTemplates: [
      "streak: {number} days.",
      "follow the build.",
      "what are you shipping today?",
      "day {number} of many.",
      "tomorrow: {next_action}.",
    ],
    examples: [
      "Day 28 building AutoEditor: shipped captions, got 17 trials, learned one painful pricing lesson.",
    ],
  },

  // === CUSTOMER PAIN-STORY POST ===
  customerPainStory: {
    id: "customerPainStory",
    name: "Customer Pain Story",
    description: "Share a real customer pain to make the product relevant without being an ad",
    niches: ["saasFounders", "founders", "videoEditors", "indieHackers"],
    structure: "customer's pain → what they were doing → what changed",
    hookTemplates: [
      "a customer was spending {timeframe} doing {action} manually.",
      "a {audience} sent us this: {complaint}.",
      "a customer told me {pain_point}.",
      "the moment I knew {product} was needed:",
      "a {audience} was {painful_action}. this is what we replaced.",
    ],
    bodyTemplates: [
      "they were {old_workflow}.\n\n{timeframe} every {period}.\n\nnow: {new_workflow}.\n\n{result}.",
      "here's what they were doing:\n\n{old_workflow}\n\nhere's what they do now:\n\n{new_workflow}\n\n{time_saved} saved.",
      "the pain was real:\n\n{pain_detail}\n\nwe rebuilt the feature the same day.\n\n{result}.",
    ],
    closerTemplates: [
      "what's your biggest {category} time-waster?",
      "the pain is the product.",
      "build for the pain, not the feature.",
      "share this with a {audience}.",
    ],
    examples: [
      "A customer was spending 6 hours/week doing this manually. This is the workflow we replaced.",
    ],
  },

  // === PUBLIC TEARDOWN ===
  publicTeardown: {
    id: "publicTeardown",
    name: "Public Teardown",
    description: "Audit something publicly, teach while showing expertise",
    niches: ["saasFounders", "marketers", "videoEditors", "designers", "softwareDevelopers"],
    structure: "I audited X → here's what I found → the lesson",
    hookTemplates: [
      "I audited {number} {things}. here's what most get wrong.",
      "I reviewed {number} {things}. the #1 mistake:",
      "I looked at {number} {things}. most of them make this mistake:",
      "I teardown {number} {things}. here's the pattern.",
    ],
    bodyTemplates: [
      "the most common mistake:\n\n{mistake}\n\nthe fix: {fix}.",
      "here's what I found:\n\n{finding_1}\n\n{finding_2}\n\nthe lesson: {lesson}.",
      "most of them had this problem:\n\n{problem}\n\nhere's how to fix it: {fix}.",
    ],
    closerTemplates: [
      "steal this.",
      "what's your biggest mistake?",
      "apply this to your {asset}.",
      "the lesson is transferable.",
    ],
    examples: [
      "I audited 20 SaaS onboarding flows. The one screen most founders overcomplicate is this one.",
    ],
  },

  // === "I CHANGED ONE THING" MINI CASE STUDY ===
  iChangedOneThing: {
    id: "iChangedOneThing",
    name: "I Changed One Thing",
    description: "Clear before/after from a single change. Creates an open loop.",
    niches: ["saasFounders", "founders", "indieHackers", "buildInPublic", "marketers"],
    structure: "the one change → before metric → after metric → the lesson",
    hookTemplates: [
      "I changed one thing: {change}.",
      "I removed {what_removed}. {metric} went from {before} to {after}.",
      "one change: {change}.",
      "I {change}. the result was immediate.",
      "the smallest change that had the biggest impact:",
    ],
    bodyTemplates: [
      "before: {before}.\n\nafter: {after}.\n\nthe change: {change}.",
      "{before} → {after}.\n\nfrom one change: {change}.",
      "I {change}.\n\n{before} → {after}.\n\nthe lesson: {lesson}.",
    ],
    closerTemplates: [
      "small changes, big results.",
      "what one thing would you change?",
      "the lesson: {lesson}.",
      "steal this.",
    ],
    examples: [
      "I removed 9 fields from onboarding. Activation went from 22% to 39%.",
    ],
  },

  // === REVENUE / TRACTION REVEAL ===
  revenueReveal: {
    id: "revenueReveal",
    name: "Revenue / Traction Reveal",
    description: "Share a specific number with context and a takeaway",
    niches: ["saasFounders", "founders", "indieHackers", "buildInPublic"],
    structure: "the number → the context → the takeaway",
    hookTemplates: [
      "we hit {number} {metric}.",
      "{number} {metric}.",
      "just crossed {number} {metric}.",
      "{number} {metric} with a {adjective} {category} tool.",
      "{number} {metric}. here's what drove it.",
    ],
    bodyTemplates: [
      "not from {wrong_source}.\n\nfrom {real_source}.\n\nthe takeaway: {takeaway}.",
      "here are the {number} things that drove it:\n\n{drivers}\n\nthe takeaway: {takeaway}.",
      "the number isn't the point.\n\nthe point: {takeaway}.",
    ],
    closerTemplates: [
      "what's your number?",
      "the takeaway is transferable.",
      "steal this.",
      "build in public.",
    ],
    examples: [
      "We hit $4,200 MRR with a boring video-editing tool. Here are the 3 pages that drove 71% of signups.",
    ],
  },

  // === AUDIENCE-IN-THE-LOOP DECISION ===
  audienceDecision: {
    id: "audienceDecision",
    name: "Audience-in-the-Loop Decision",
    description: "Ask the audience to make a real decision. Comments rise with real input.",
    niches: ["saasFounders", "founders", "buildInPublic", "indieHackers", "videoEditors"],
    structure: "present a real choice → ask for input → promise to share the result",
    hookTemplates: [
      "which {thing} should I ship: A, B, or C?",
      "I need your help. which one?",
      "help me decide:",
      "I'm torn between {option_a} and {option_b}.",
      "vote: {option_a} or {option_b}?",
    ],
    bodyTemplates: [
      "A: {option_a_detail}\n\nB: {option_b_detail}\n\nI'll post the result after {number} votes.",
      "option 1: {option_a}\n\noption 2: {option_b}\n\nwhich one?",
      "{context}\n\nA or B?",
    ],
    closerTemplates: [
      "I'll share the result.",
      "reply with A or B.",
      "vote below.",
      "the result comes tomorrow.",
    ],
    examples: [
      "Which onboarding should I ship: A, B, or C? I'll post the result after 100 votes.",
    ],
  },

  // === BEHIND-THE-SCENES DATA ===
  behindScenesData: {
    id: "behindScenesData",
    name: "Behind-the-Scenes Data",
    description: "Share data people normally can't see. Gives access to hidden signals.",
    niches: ["saasFounders", "founders", "indieHackers", "buildInPublic"],
    structure: "here's our data → what surprised me → the insight",
    hookTemplates: [
      "here's our exact {asset}:",
      "our {asset} for the first week:",
      "the data nobody shares:",
      "here's what our {asset} looks like:",
      "transparent {asset} update:",
    ],
    bodyTemplates: [
      "{data_points}\n\nwhat surprised me: {surprise}.",
      "{data_points}\n\nthe insight: {insight}.",
      "traffic: {traffic}\ntrials: {trials}\nchurn risk: {churn}\n\nwhat surprised me: {surprise}.",
    ],
    closerTemplates: [
      "what's your number?",
      "the data is the lesson.",
      "build in public.",
      "what would you do differently?",
    ],
    examples: [
      "Here is our exact first-week launch dashboard: traffic, trials, churn risk, and what surprised me.",
    ],
  },

  // === "STEAL MY SYSTEM" CAROUSEL ===
  stealMySystem: {
    id: "stealMySystem",
    name: "Steal My System",
    description: "Share a step-by-step system. High saves and shares because it's actionable.",
    niches: ["saasFounders", "founders", "marketers", "videoEditors", "indieHackers"],
    structure: "my system for X → the steps → steal it",
    hookTemplates: [
      "my {number}-step system for {outcome}:",
      "steal my system for {outcome}:",
      "the exact system I use to {outcome}:",
      "how I {outcome} (step by step):",
      "my {outcome} system:",
    ],
    bodyTemplates: [
      "{steps}\n\nsteal it.",
      "step 1: {step_1}\nstep 2: {step_2}\nstep 3: {step_3}\n\nthat's the whole system.",
      "{steps}\n\nthe system is simple. the execution isn't.",
    ],
    closerTemplates: [
      "steal this.",
      "save this.",
      "bookmark this.",
      "share this with a {audience}.",
      "what's your system?",
    ],
    examples: [
      "My 5-step system for turning one customer call into a week of SaaS content.",
    ],
  },

  // === AI TOOL LIST / RESOURCE LIST ===
  aiToolList: {
    id: "aiToolList",
    name: "AI Tool List",
    description: "List of AI tools for a specific use case. High saves and shares.",
    niches: ["videoEditors", "saasFounders", "marketers", "founders", "youTubers"],
    structure: "X AI tools for Y → the list → save this",
    hookTemplates: [
      "{number} AI tools to save hours of {action}:",
      "{number} AI tools every {audience} should know:",
      "as a {audience}, these are the AI tools I use daily:",
      "{number} AI tools for {outcome}:",
      "the AI tools I use to {outcome}:",
    ],
    bodyTemplates: [
      "{tool_list}\n\nsave this.",
      "{tool_list}\n\nsteal these.",
      "{tool_list}\n\nbookmark this for later.",
    ],
    closerTemplates: [
      "save this.",
      "steal these.",
      "bookmark this.",
      "what AI tools did I miss?",
      "share this with a {audience}.",
    ],
    examples: [
      "6 AI tools to save hours of time every day:\n\n1. Summarize meetings → tldv.io\n2. AI video editor → descript.com\n3. AI-powered presentation → ...",
    ],
  },

  // === LAUNCH ANNOUNCEMENT ===
  launchAnnouncement: {
    id: "launchAnnouncement",
    name: "Launch Announcement",
    description: "Product launch with a clear value prop. Not hype-driven.",
    niches: ["saasFounders", "founders", "buildInPublic", "indieHackers", "videoEditors"],
    structure: "what we built → who it's for → why it matters → try it",
    hookTemplates: [
      "today we're launching {product}.",
      "I built {product}.",
      "{product} is live.",
      "we just shipped {product}.",
      "introducing {product}.",
    ],
    bodyTemplates: [
      "a {category} for {audience}.\n\n{what_it_does}.\n\n{why_it_matters}.",
      "use AI to {action}.\n\nbuilt for {audience}.\n\n{key_feature}.",
      "{what_it_does}.\n\nfinally, a {category} built for {audience}.",
    ],
    closerTemplates: [
      "open-source. available now.",
      "try it.",
      "dm for early access.",
      "link in bio.",
      "first {number} users get it free.",
    ],
    examples: [
      "today we're launching @Palmier_io, a video editor Claude can edit. use AI to edit, organize, and generate footage directly in the timeline. finally, a video editor built for AI. open-source. mac native. available now.",
    ],
  },

  // === SCREEN RECORDING DEMO ===
  screenRecordingDemo: {
    id: "screenRecordingDemo",
    name: "Screen Recording Demo",
    description: "Native video showing the product doing its job. Tangible value fast.",
    niches: ["videoEditors", "saasFounders", "buildInPublic", "founders"],
    structure: "watch me do X → [screen recording] → the result",
    hookTemplates: [
      "watch me turn {input} into {output} in {timeframe}.",
      "watch me {action} in {timeframe}.",
      "{input} → {output} in {timeframe}.",
      "from {input} to {output}:",
      "watch this workflow:",
    ],
    bodyTemplates: [
      "[screen recording]\n\n{timeframe}. no manual {action}.",
      "[screen recording]\n\nthe whole process: {timeframe}.",
      "[screen recording]\n\nbefore: {before}\nafter: {after}",
    ],
    closerTemplates: [
      "what workflow should I automate next?",
      "try it.",
      "dm for early access.",
      "what's your workflow?",
    ],
    examples: [
      "Watch me turn a raw 40-minute recording into 12 publishable clips in 45 seconds.",
    ],
  },
};

// ---------------------------------------------------------------------------
// Get formats for a specific niche
// ---------------------------------------------------------------------------
function getFormatsForNiche(niche) {
  return Object.values(VIRAL_FORMATS).filter(f => f.niches.includes(niche));
}

// ---------------------------------------------------------------------------
// Get a format by ID
// ---------------------------------------------------------------------------
function getFormat(id) {
  return VIRAL_FORMATS[id] || null;
}

// ---------------------------------------------------------------------------
// List all format IDs
// ---------------------------------------------------------------------------
function listFormats() {
  return Object.keys(VIRAL_FORMATS);
}

// ---------------------------------------------------------------------------
// Count total formats
// ---------------------------------------------------------------------------
function countFormats() {
  return Object.keys(VIRAL_FORMATS).length;
}

// ---------------------------------------------------------------------------
// Generate a post from a format + analysis
// Fills in the template variables with data from the topic analysis
// ---------------------------------------------------------------------------
function generateFromFormat(formatId, analysis) {
  const format = VIRAL_FORMATS[formatId];
  if (!format) return null;

  const { entity, audience, action, actionGerund, benefit, comparative, outcome } = analysis;
  const act = actionGerund || action || "editing";
  const aud = audience || "people";
  const product = entity || analysis.subject || "this tool";

  // Pick random templates
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const hookTemplate = pick(format.hookTemplates);
  const bodyTemplate = pick(format.bodyTemplates);
  const closerTemplate = pick(format.closerTemplates);

  // Fill in template variables
  const fill = (template) => {
    return template
      .replace(/\{topic\}/g, act)
      .replace(/\{project\}/g, product)
      .replace(/\{story\}/g, `I was ${act} manually for hours. then I built ${product}. now it takes seconds.`)
      .replace(/\{failure_detail\}/g, pick([`I spent weeks ${act} manually. it was unsustainable.`, `users were dropping off because the workflow was too complex.`, `I shipped a feature nobody asked for. crickets.`]))
      .replace(/\{problem\}/g, pick([`too many manual steps`, `overcomplicated workflows`, `no clear before/after`, `too many settings`]))
      .replace(/\{audience\}/g, aud)
      .replace(/\{product\}/g, product)
      .replace(/\{action\}/g, action || "edit")
      .replace(/\{belief\}/g, `AI will replace ${aud}`)
      .replace(/\{common_action\}/g, `${act} manually`)
      .replace(/\{metric\}/g, pick(["trials", "users", "signups", "exports", "demos"]))
      .replace(/\{category\}/g, analysis.audience || "editing")
      .replace(/\{number\}/g, String(Math.floor(Math.random() * 50) + 5))
      .replace(/\{timeframe\}/g, pick(["hours", "days", "weeks", "months"]))
      .replace(/\{cost\}/g, pick(["3 weeks", "a month", "2 months", "$500", "100 hours"]))
      .replace(/\{failure\}/g, pick(["shipped a feature nobody used", "built the wrong thing", "optimized the wrong metric"]))
      .replace(/\{wasted_action\}/g, `${act} manually`)
      .replace(/\{result\}/g, benefit || `${comparative || "better"} ${act}`)
      .replace(/\{benefit\}/g, benefit || `save time on ${act}`)
      .replace(/\{comparative\}/g, comparative || "better")
      .replace(/\{outcome\}/g, outcome || benefit || `better ${act}`)
      .replace(/\{old_way\}/g, `manual ${act}`)
      .replace(/\{new_way\}/g, `${product} does it automatically`)
      .replace(/\{how_it_works\}/g, `${product} ${act} automatically`)
      .replace(/\{workflow\}/g, `1. import\n2. ${product} processes\n3. export`)
      .replace(/\{pain_point\}/g, pick(["hours of manual work", "expensive software", "slow workflows", "repetitive tasks"]))
      .replace(/\{lesson\}/g, pick(["show the pain, not the feature", "build for the pain", "the pain is the product", "less is more"]))
      .replace(/\{takeaway\}/g, pick(["show the pain, not the feature", "specificity wins", "build for the pain"]))
      .replace(/\{change\}/g, pick(["removed 9 fields", "cut the workflow in half", "deleted 80% of features"]))
      .replace(/\{before\}/g, String(Math.floor(Math.random() * 30) + 10) + "%")
      .replace(/\{after\}/g, String(Math.floor(Math.random() * 30) + 40) + "%")
      .replace(/\{drivers\}/g, "1. clear demo\n2. pain-first hook\n3. fast onboarding")
      .replace(/\{wrong_source\}/g, "ads")
      .replace(/\{real_source\}/g, "organic demos")
      .replace(/\{wrong_reason\}/g, "the edit was flashy")
      .replace(/\{real_reason\}/g, "it showed the painful 'before'")
      .replace(/\{wrong_assumption\}/g, "more features = more value")
      .replace(/\{reality\}/g, `${aud} want fewer decisions, not more`)
      .replace(/\{fix\}/g, `cut the workflow to 2 steps`)
      .replace(/\{pivot\}/g, `simplified everything`)
      .replace(/\{experience\}/g, pick(["built a tool for it", "watched 100 ${aud} struggle", "tested it on real workflows"]))
      .replace(/\{evidence\}/g, pick(["every user I talked to said the same thing", "the data showed the opposite", "3 months of testing"]))
      .replace(/\{implication\}/g, "the old way is dead")
      .replace(/\{opinion\}/g, pick(["most AI tools are wrappers", "the bottleneck moved from output to insight", "AI doesn't replace ${aud}, it replaces the boring parts"]))
      .replace(/\{problem_type\}/g, "distribution")
      .replace(/\{real_problem\}/g, "proof")
      .replace(/\{asset\}/g, "homepage")
      .replace(/\{condition\}/g, "buyers can't see a real outcome in 10 seconds")
      .replace(/\{things\}/g, pick(["onboarding flows", "landing pages", "demos", "workflows"]))
      .replace(/\{total\}/g, "20")
      .replace(/\{mistake\}/g, "too many fields")
      .replace(/\{finding_1\}/g, "most overcomplicate the first screen")
      .replace(/\{finding_2\}/g, "the best ones show the result immediately")
      .replace(/\{what_removed\}/g, "9 onboarding fields")
      .replace(/\{what_shipped\}/g, pick(["captions", "auto-clip", "silence removal", "batch export"]))
      .replace(/\{what_broke\}/g, pick(["the export queue", "nothing", "one edge case"]))
      .replace(/\{next_action\}/g, pick(["ship the next feature", "fix onboarding", "launch"]))
      .replace(/\{complaint\}/g, "this takes too long")
      .replace(/\{painful_action\}/g, `${act} manually for hours`)
      .replace(/\{pain_detail\}/g, `${act} took hours every week`)
      .replace(/\{old_workflow\}/g, `manual ${act}`)
      .replace(/\{new_workflow\}/g, `${product} does it automatically`)
      .replace(/\{time_saved\}/g, pick(["5 hours", "10 hours", "3 hours"]))
      .replace(/\{period\}/g, "week")
      .replace(/\{input\}/g, "raw recording")
      .replace(/\{output\}/g, "polished clips")
      .replace(/\{input\}/g, "a 40-minute recording")
      .replace(/\{output\}/g, "12 publishable clips")
      .replace(/\{before\}/g, "manual editing")
      .replace(/\{after\}/g, "automated")
      .replace(/\{tool_list\}/g, `1. ${product} — ${act}\n2. Descript — edit by editing text\n3. CapCut — short-form editing`)
      .replace(/\{option_a\}/g, "option A")
      .replace(/\{option_b\}/g, "option B")
      .replace(/\{option_a_detail\}/g, "simpler but less powerful")
      .replace(/\{option_b_detail\}/g, "more powerful but complex")
      .replace(/\{context\}/g, "building the next feature")
      .replace(/\{data_points\}/g, "traffic: 2.3K\ntrials: 47\nchurn risk: 3")
      .replace(/\{traffic\}/g, "2.3K")
      .replace(/\{trials\}/g, "47")
      .replace(/\{churn\}/g, "3")
      .replace(/\{surprise\}/g, "most trials came from one demo")
      .replace(/\{insight\}/g, "the demo matters more than the landing page")
      .replace(/\{steps\}/g, "1. find the pain\n2. show the fix\n3. post the demo")
      .replace(/\{step_1\}/g, "find the pain")
      .replace(/\{step_2\}/g, "show the fix")
      .replace(/\{step_3\}/g, "post the demo")
      .replace(/\{starting_state\}/g, "knew nothing about editing")
      .replace(/\{bad_state\}/g, pick(["struggling", "stuck", "overwhelmed"]))
      .replace(/\{inciting_incident\}/g, pick(["I found AutoEditor", "I tried AI editing", "I built my own tool"]))
      .replace(/\{conflict\}/g, "nobody thought it would work")
      .replace(/\{resolution\}/g, "it worked")
      .replace(/\{breakthrough\}/g, "I simplified everything")
      .replace(/\{statement\}/g, "AI can't edit like a human")
      .replace(/\{response\}/g, "correct. it edits faster")
      .replace(/\{request\}/g, "can you make this faster?")
      .replace(/\{skeptic_statement\}/g, "this will never work")
      .replace(/\{mic_drop\}/g, "it already does")
      .replace(/\{follow_up\}/g, "but quality?")
      .replace(/\{punchline\}/g, "same quality. fraction of the time")
      .replace(/\{question\}/g, "how long does this take?")
      .replace(/\{answer\}/g, "45 seconds")
      .replace(/\{proof\}/g, "the result")
      .replace(/\{adjective\}/g, "boring")
      .replace(/\{key_feature\}/g, `${benefit || "saves hours of manual work"}`)
      .replace(/\{why_it_matters\}/g, `${aud} waste hours on ${act}. this fixes that.`)
      .replace(/\{what_it_does\}/g, `${act} automatically`)
      .replace(/\{wrong_belief\}/g, pick(["more features = more value", "AI replaces editors", "you need a big team"]))
      .replace(/\{what_actually_happens\}/g, `${aud} want fewer decisions`)
      .replace(/\{change\}/g, "simplified everything")
      .replace(/\{timeframe\}/g, pick(["3 months", "6 months", "1 year"]))
      .replace(/\{belief\}/g, "AI replaces editors")
      .replace(/\{common_action\}/g, `${act} manually`)
      .replace(/\{action\}/g, action || "edit");
  };

  const hook = fill(hookTemplate);
  const body = fill(bodyTemplate);
  const closer = fill(closerTemplate);

  return {
    text: `${hook}\n\n${body}\n\n${closer}`,
    formatId: format.id,
    formatName: format.name,
  };
}

module.exports = {
  VIRAL_FORMATS,
  getFormatsForNiche,
  getFormat,
  listFormats,
  countFormats,
  generateFromFormat,
};
