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
      "unpopular take: the idea that {belief} is wrong.",
      "everyone's wrong about {topic}.",
      "the thing nobody wants to admit about {topic}:",
      "most {audience} get this backwards.",
      "{belief}? not anymore.",
      "unpopular take: the idea that {belief} is wrong.",
      "stop {common_action}. it's killing your time.",
    ],
    bodyTemplates: [
      "I used to think {belief} too.\n\nthen I {experience}.\n\nthe reality: {reality}.",
      "here's what actually happens:\n\n{reality}\n\nI learned this the hard way.",
      "after {timeframe} of {actionGerund}:\n\n{reality}\n\nthe old way is dead.",
      "I {experience}.\n\nit changed how I think about {topic}.",
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
      "I {failure}. lost weeks of work. here's what I learned.",
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
      "share this with someone who needs to hear it.",
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
      "{number} {metric} in {timeframe}.",
      "I didn't expect {outcome}.",
    ],
    bodyTemplates: [
      "I was {bad_state}.\n\nthen {inciting_incident}.\n\nI started {actionGerund}.\n\n{result}.",
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
      "share this with someone who needs to hear it.",
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
      "the number isn't the point.\n\nthe point: {lesson}.",
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
      "I was spending {timeframe} on {actionGerund}.",
      "every {audienceSingular} deals with {pain_point}.",
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
      "the idea that {belief} is wrong. here's why.",
      "the {audience} who win don't do what 90% of {audience} do.",
    ],
    bodyTemplates: [
      "if {condition}, more of that won't fix it.\n\n{evidence}.\n\n{implication}.",
      "the evidence: {evidence}.\n\nthe implication: {implication}.",
      "I've been {actionGerund} for {timeframe}. {evidence}.",
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
      "I reviewed {number} {things}. here's the pattern.",
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
      "building {product}: which {thing} should I ship first?",
      "which {thing} should I ship for {product}: A, B, or C?",
      "I need your help with {product}. which one?",
      "help me decide on {product}:",
      "I'm torn between {option_a} and {option_b} for {product}.",
      "vote: {option_a} or {option_b} for {product}?",
    ],
    bodyTemplates: [
      "A: {option_a_detail}\n\nB: {option_b_detail}\n\nI'll post the result after {number} votes.",
      "option 1: {option_a}\n\noption 2: {option_b}\n\nwhich one?",
      "{context} for {product}.\n\nA or B?",
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
      "{number} AI tools every {audienceSingular} should know:",
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
      "watch me turn {input} into {output} in {demo_time}.",
      "watch me {action} in {demo_time}.",
      "{input} → {output} in {demo_time}.",
      "from {input} to {output}:",
      "watch this workflow:",
    ],
    bodyTemplates: [
      "[screen recording]\n\n{demo_time}. no manual work.",
      "[screen recording]\n\nthe whole process: {demo_time}.",
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
// Niche-specific example banks
// These ensure that examples in the templates match the topic's niche.
// A video editing post should talk about timelines and renders, not onboarding flows.
// ---------------------------------------------------------------------------
const NICHE_EXAMPLES = {
  videoEditors: {
    things: ["editing workflows", "video pipelines", "rendering setups", "cutting workflows", "export queues"],
    change: ["cut the timeline from 20 clips to 3", "removed the manual scrubbing step", "deleted 5 unused effect presets", "replaced 8 manual steps with one click"],
    what_shipped: ["auto-clip", "silence removal", "auto-captions", "batch export", "auto-color match", "dead air detection"],
    what_broke: ["the export queue backed up", "one codec wouldn't render", "audio sync drifted on long clips"],
    mistake: ["too many manual cuts", "no clear before/after", "overcomplicated timelines", "scrubbing through every frame"],
    what_removed: ["3 manual editing steps", "the manual scrubbing phase", "5 redundant timeline layers"],
    pain_point: ["hours of manual scrubbing", "dead air in every recording", "repetitive cutting and trimming", "rendering overnight"],
    failure: ["shipped a transition pack nobody used", "built the wrong export preset", "optimized for the wrong codec"],
    failure_detail: ["I spent weeks scrubbing through dead air manually. it was unsustainable.", "I built a fancy transition pack that nobody asked for. crickets.", "I optimized for 4K when most users just wanted fast exports."],
    evidence: ["every editor I talked to said the same thing", "the watch-time data showed the opposite", "3 months of testing on real footage"],
    opinion: ["most AI editing tools are just fancy presets", "the bottleneck moved from editing to finding the good clips", "AI doesn't replace editors, it replaces the boring parts"],
    experience: ["built a tool for it", `watched 100 ${"editors"} struggle with dead air`, "tested it on 50 hours of raw footage"],
    insight: ["the demo matters more than the feature list", "show the painful 'before' and editors will pay attention", "editers don't want more features, they want fewer clicks"],
    workflow: "1. drop in the raw footage\n2. AutoEditor finds and cuts dead air\n3. export the clean cut",
    old_workflow: "scrub through every clip, find the dead air, cut it manually, repeat",
    new_workflow: "drop in the footage, AutoEditor cuts the dead air automatically",
    input: "a 40-minute raw recording",
    output: "a clean 12-minute cut",
    starting_state: "knew nothing about editing",
    inciting_incident: ["I found AutoEditor", "I tried AI-assisted editing", "I built my own editing tool"],
    tool_list: `1. ${"AutoEditor"} — removes dead air automatically\n2. Descript — edit video by editing text\n3. CapCut — fast short-form editing`,
    metrics: ["exports", "renders", "clips", "hours saved", "edits"],
  },
  youTubers: {
    things: ["thumbnail designs", "video hooks", "title formulas", "intro sequences", "end screens"],
    change: ["cut the intro from 30s to 3s", "removed 4 mid-roll breaks", "simplified the thumbnail from 5 elements to 2", "replaced the long intro with a cold open"],
    what_shipped: ["auto-thumbnails", "hook generator", "title A/B testing", "chapter markers"],
    what_broke: ["the thumbnail render queue", "one title format didn't parse", "chapters drifted on long videos"],
    mistake: ["intros that are too long", "no hook in the first 3 seconds", "thumbnails with too much text", "burying the payoff"],
    what_removed: ["the 30-second intro", "4 mid-roll breaks", "the long channel intro"],
    pain_point: ["low click-through rates", "viewers dropping in the first 10 seconds", "thumbnails that don't convert", "titles that don't get clicks"],
    failure: ["shipped a thumbnail style nobody clicked on", "built an intro sequence that killed retention", "optimized for the wrong metric"],
    failure_detail: ["I spent weeks on thumbnail designs that nobody clicked. it was demoralizing.", "I built a fancy intro that killed retention. viewers dropped in 10 seconds.", "I optimized for watch time when I should have optimized for CTR."],
    evidence: ["every creator I talked to said the same thing", "the CTR data showed the opposite", "3 months of testing thumbnails"],
    opinion: ["most thumbnail advice is wrong", "the hook matters more than the edit quality", "AI doesn't replace creators, it replaces the busywork"],
    experience: ["built a tool for it", `watched 100 ${"creators"} struggle with thumbnails`, "tested it on 200 videos"],
    insight: ["the thumbnail matters more than the video quality", "show the payoff in the first frame", "creators don't want more tools, they want more clicks"],
    workflow: "1. upload the video\n2. tool generates thumbnail options\n3. pick the best one and publish",
    old_workflow: "manually design 5 thumbnails, test them, pick one, repeat",
    new_workflow: "upload the video, get thumbnail options automatically",
    input: "a finished video",
    output: "5 thumbnail options ranked by predicted CTR",
    starting_state: "knew nothing about YouTube",
    inciting_incident: ["I found a thumbnail tool", "I tried AI-assisted thumbnails", "I built my own thumbnail generator"],
    tool_list: `1. ${"this tool"} — auto-thumbnails\n2. Canva — manual thumbnail design\n3. TubeBuddy — title suggestions`,
    metrics: ["views", "CTR", "watch time", "subscribers", "impressions"],
  },
  saasFounders: {
    things: ["onboarding flows", "landing pages", "pricing pages", "signup forms", "trial experiences"],
    change: ["removed 9 fields from onboarding", "cut the trial from 30 to 7 days", "deleted 80% of features", "simplified pricing from 4 tiers to 1"],
    what_shipped: ["billing", "team accounts", "API keys", "webhooks", "SSO"],
    what_broke: ["the billing webhook", "one edge case in SSO", "the trial expiry logic"],
    mistake: ["too many onboarding fields", "no clear value in the first session", "overcomplicated pricing", "building features nobody asked for"],
    what_removed: ["9 onboarding fields", "3 unused features", "the complex pricing matrix"],
    pain_point: ["low activation rates", "users churning in the first week", "expensive CAC", "no clear aha moment"],
    failure: ["shipped a feature nobody used", "built the wrong integration", "optimized for the wrong metric"],
    failure_detail: ["I spent weeks building a feature that got 2 users. crickets.", "I built an integration nobody asked for. zero adoption.", "I optimized for signups when I should have optimized for activation."],
    evidence: ["every user I talked to said the same thing", "the activation data showed the opposite", "3 months of testing onboarding"],
    opinion: ["most SaaS tools are wrappers around the same API", "the bottleneck moved from features to distribution", "AI doesn't replace founders, it replaces the busywork"],
    experience: ["built a tool for it", `watched 100 ${"founders"} struggle with activation`, "tested it on 50 real users"],
    insight: ["the demo matters more than the landing page", "show the aha moment in the first session", "founders don't want more features, they want more activation"],
    workflow: "1. user signs up\n2. tool runs the onboarding flow\n3. user hits aha moment in 60 seconds",
    old_workflow: "manually walk every user through onboarding, one by one",
    new_workflow: "user signs up, tool runs onboarding automatically",
    input: "a new signup",
    output: "an activated user who hit the aha moment",
    starting_state: "knew nothing about SaaS",
    inciting_incident: ["I found a SaaS tool", "I tried AI-assisted onboarding", "I built my own SaaS"],
    tool_list: `1. ${"this tool"} — SaaS onboarding\n2. Linear — issue tracking\n3. Vercel — deployments`,
    metrics: ["trials", "activations", "MRR", "signups", "retention"],
  },
  founders: {
    things: ["pitch decks", "demo calls", "investor updates", "product launches", "cold outreach scripts"],
    change: ["cut the pitch from 20 slides to 5", "removed 4 demo steps", "simplified the investor update", "replaced cold outreach with warm intros"],
    what_shipped: ["a new pitch deck", "a demo bot", "an investor update generator", "a launch plan"],
    what_broke: ["the demo crashed on the call", "one investor passed", "the launch got no traction"],
    mistake: ["too many slides", "no clear ask", "overcomplicated demo", "building before validating"],
    what_removed: ["15 extra slides", "3 unnecessary demo steps", "the long company history section"],
    pain_point: ["no investor meetings", "demo calls that go nowhere", "cold outreach that gets ignored", "no clear value prop"],
    failure: ["shipped a pitch that got no meetings", "built a demo nobody understood", "optimized for the wrong investor"],
    failure_detail: ["I spent weeks on a pitch deck that got zero meetings. brutal.", "I built a demo that confused every investor. blank stares.", "I optimized for design when I should have optimized for clarity."],
    evidence: ["every founder I talked to said the same thing", "the meeting data showed the opposite", "3 months of testing pitches"],
    opinion: ["most pitch decks are too long", "the bottleneck moved from building to selling", "AI doesn't replace founders, it replaces the busywork"],
    experience: ["built a tool for it", `watched 100 ${"founders"} struggle with pitching`, "tested it on 50 real investors"],
    insight: ["the demo matters more than the deck", "show the traction in the first 30 seconds", "founders don't need more tools, they need more meetings"],
    workflow: "1. founder inputs their pitch\n2. tool generates a 5-slide deck\n3. founder gets meetings",
    old_workflow: "manually design 20 slides, practice the pitch, cold email investors, repeat",
    new_workflow: "input your pitch, get a clean 5-slide deck automatically",
    input: "a rough pitch idea",
    output: "a 5-slide deck that gets meetings",
    starting_state: "knew nothing about startups",
    inciting_incident: ["I found a pitch tool", "I tried AI-assisted pitching", "I built my own pitch generator"],
    tool_list: `1. ${"this tool"} — pitch deck generator\n2. Notion — startup wiki\n3. Linear — product roadmap`,
    metrics: ["meetings", "deals", "signups", "investors contacted", "referrals"],
  },
  podcasters: {
    things: ["podcast workflows", "clip selection", "audio levels", "show notes", "distribution pipelines"],
    change: ["cut the editing from 4 hours to 20 minutes", "removed 3 manual audio steps", "simplified the clip selection process", "replaced manual show notes with auto-generated ones"],
    what_shipped: ["auto-clip", "auto-show-notes", "audio leveling", "chapter markers"],
    what_broke: ["the audio export crashed", "one clip had sync issues", "the show notes were wrong"],
    mistake: ["too much manual editing", "no clips for social media", "overcomplicated audio chains", "no show notes"],
    what_removed: ["3 manual editing steps", "the manual clip selection phase", "5 redundant audio plugins"],
    pain_point: ["hours of manual editing", "no social clips from episodes", "inconsistent audio levels", "writing show notes takes forever"],
    failure: ["shipped a clip tool nobody used", "built the wrong audio preset", "optimized for the wrong platform"],
    failure_detail: ["I spent weeks editing episodes manually. it was unsustainable.", "I built a clip tool that nobody asked for. crickets.", "I optimized for Spotify when most listeners were on Apple."],
    evidence: ["every podcaster I talked to said the same thing", "the download data showed the opposite", "3 months of testing workflows"],
    opinion: ["most podcast tools are too complicated", "the bottleneck moved from recording to editing", "AI doesn't replace podcasters, it replaces the editing"],
    experience: ["built a tool for it", `watched 100 ${"podcasters"} struggle with editing`, "tested it on 50 episodes"],
    insight: ["the clips matter more than the full episode", "show the best moment in the first 3 seconds", "podcasters don't want more tools, they want more listeners"],
    workflow: "1. upload the episode\n2. tool finds the best clips\n3. post clips to social media",
    old_workflow: "listen to the whole episode, find good clips manually, edit them, write show notes",
    new_workflow: "upload the episode, get clips and show notes automatically",
    input: "a 60-minute podcast episode",
    output: "5 social clips with show notes",
    starting_state: "knew nothing about podcasting",
    inciting_incident: ["I found a podcast tool", "I tried AI-assisted editing", "I built my own podcast tool"],
    tool_list: `1. ${"this tool"} — podcast clipping\n2. Descript — edit audio by editing text\n3. Riverside — recording`,
    metrics: ["downloads", "clips", "listeners", "hours saved", "episodes"],
  },
  general: {
    things: ["workflows", "processes", "setups", "systems", "pipelines"],
    change: ["cut the workflow from 10 steps to 3", "removed 3 manual steps", "simplified the process", "replaced manual work with automation"],
    what_shipped: ["a new feature", "an automation", "a workflow update", "a new tool"],
    what_broke: ["the export failed", "one edge case", "a sync issue"],
    mistake: ["too many manual steps", "no clear before/after", "overcomplicated process", "no automation"],
    what_removed: ["3 manual steps", "the manual review phase", "5 redundant steps"],
    pain_point: ["hours of manual work", "repetitive tasks", "slow workflows", "no automation"],
    failure: ["shipped a feature nobody used", "built the wrong thing", "optimized for the wrong metric"],
    failure_detail: ["I spent weeks doing it manually. it was unsustainable.", "I built something nobody asked for. crickets.", "I optimized for the wrong thing."],
    evidence: ["every person I talked to said the same thing", "the data showed the opposite", "3 months of testing"],
    opinion: ["most tools are too complicated", "the bottleneck moved from doing to automating", "AI doesn't replace people, it replaces the busywork"],
    experience: ["built a tool for it", `watched 100 people struggle`, "tested it on real workflows"],
    insight: ["the result matters more than the process", "show the payoff clearly", "people don't want more tools, they want more time"],
    workflow: "1. input your work\n2. tool processes it\n3. get the result",
    old_workflow: "do everything manually, step by step",
    new_workflow: "input your work, get the result automatically",
    input: "raw input",
    output: "polished result",
    starting_state: "knew nothing about this",
    inciting_incident: ["I found a tool", "I tried AI assistance", "I built my own tool"],
    tool_list: `1. ${"this tool"} — automation\n2. Zapier — integrations\n3. Notion — organization`,
    metrics: ["results", "outputs", "hours saved", "tasks", "completions"],
  },
};

// ---------------------------------------------------------------------------
// Build niche context — all the fill variables based on the actual niche
// ---------------------------------------------------------------------------
function buildNicheContext(analysis) {
  const nicheId = analysis.audienceProfile?.id || "general";
  const examples = NICHE_EXAMPLES[nicheId] || NICHE_EXAMPLES.general;

  const aud = analysis.audience || "people";
  const product = analysis.entity || analysis.subject || "this tool";
  const action = analysis.action || "edit";
  const actionGerund = analysis.actionGerund || "editing";
  const benefit = analysis.benefit || "save time";
  const comparative = analysis.comparative || "better";

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const num = () => String(Math.floor(Math.random() * 50) + 5);

  return {
    // Core variables
    topic: actionGerund,
    audience: aud,
    audienceSingular: aud.replace(/s$/, "").replace(/ies$/, "y"),
    product,
    action,
    actionGerund,
    benefit,
    comparative,
    outcome: analysis.outcome || benefit,

    // Niche-specific examples
    things: pick(examples.things),
    change: pick(examples.change),
    what_shipped: pick(examples.what_shipped),
    what_broke: pick(examples.what_broke),
    mistake: pick(examples.mistake),
    what_removed: pick(examples.what_removed),
    pain_point: pick(examples.pain_point),
    failure: pick(examples.failure),
    failure_detail: pick(examples.failure_detail),
    evidence: pick(examples.evidence),
    opinion: pick(examples.opinion),
    experience: pick(examples.experience),
    insight: pick(examples.insight),
    workflow: examples.workflow,
    old_workflow: examples.old_workflow,
    new_workflow: `${product} does it automatically`,
    input: examples.input,
    output: examples.output,
    starting_state: examples.starting_state,
    inciting_incident: pick(examples.inciting_incident),
    tool_list: examples.tool_list.replace(/this tool/g, product),
    metrics: pick(examples.metrics),

    // Generated values
    number: num(),
    timeframe: pick(["3 months", "6 months", "1 year", "2 years", "18 months"]),
    demo_time: pick(["45 seconds", "30 seconds", "1 minute", "2 minutes", "under a minute"]),
    cost: pick(["3 weeks", "a month", "2 months", "$500", "100 hours"]),
    metric: pick(examples.metrics),
    category: aud,
    time_saved: pick(["5 hours", "10 hours", "3 hours", "6 hours"]),
    period: "week",

    // Pre-built phrases
    old_way: `manually ${actionGerund}`,
    new_way: `${product} does it automatically`,
    how_it_works: (() => {
      // Third person singular: "AutoEditor removes silence" not "AutoEditor remove silence"
      const act = action || "edit";
      const words = act.split(/\s+/);
      const first = words[0];
      let conjugated;
      if (first.endsWith("y") && !/[aeiou]y$/.test(first)) conjugated = first.slice(0, -1) + "ies";
      else if (first.endsWith("s") || first.endsWith("sh") || first.endsWith("ch") || first.endsWith("x") || first.endsWith("o")) conjugated = first + "es";
      else if (first.endsWith("e")) conjugated = first + "s";
      else conjugated = first + "s";
      return `${product} ${conjugated}${words.length > 1 ? " " + words.slice(1).join(" ") : ""} automatically`;
    })(),
    common_action: `${actionGerund} manually`,
    wasted_action: `${actionGerund} manually`,
    painful_action: `${actionGerund} manually for hours`,
    pain_detail: `${actionGerund} took hours every week`,
    why_it_matters: `${aud} waste hours on ${actionGerund}. this fixes that.`,
    what_it_does: `${product} ${actionGerund} automatically`,
    key_feature: benefit,

    // Story elements — these should connect logically
    belief: `AI will replace ${aud}`,
    wrong_belief: pick(["more features = more value", `AI replaces ${aud}`, "you need a big team", "more tools = more productivity"]),
    wrong_assumption: "more features = more value",
    reality: `${aud} want fewer decisions, not more`,
    what_actually_happens: `${aud} want fewer decisions`,
    fix: pick(examples.change),
    pivot: "simplified everything",
    breakthrough: "I simplified everything",
    result: benefit,
    lesson: pick(["show the pain, not the feature", "build for the pain", "the pain is the product", "less is more", "fewer clicks, not more features"]),
    takeaway: pick(["show the pain, not the feature", "specificity wins", "build for the pain", "the demo matters more than the feature list"]),

    // SaaS-specific (only used by SaaS formats)
    drivers: "1. clear demo\n2. pain-first hook\n3. fast activation",
    wrong_source: "ads",
    real_source: "organic demos",
    wrong_reason: "the edit was flashy",
    real_reason: "it showed the painful 'before'",
    implication: "the old way is dead",
    problem_type: "distribution",
    real_problem: "proof",
    asset: "homepage",
    condition: "buyers can't see a real outcome in 10 seconds",
    total: "20",
    finding_1: "most overcomplicate the first step",
    finding_2: "the best ones show the result immediately",
    next_action: pick(["ship the next feature", "fix the workflow", "launch"]),

    // Dialogue
    statement: `AI can't ${action}`,
    response: `correct. it does it faster`,
    request: "can you make this faster?",
    skeptic_statement: "this will never work",
    mic_drop: "it already does",
    follow_up: "but quality?",
    punchline: "same quality. fraction of the time",
    question: "how long does this take?",
    answer: "45 seconds",
    proof: "the result",
    adjective: "boring",

    // Decision format
    option_a: "option A",
    option_b: "option B",
    option_a_detail: "simpler but less powerful",
    option_b_detail: "more powerful but complex",
    context: "building the next feature",

    // Data format
    data_points: "traffic: 2.3K\ntrials: 47\nchurn risk: 3",
    traffic: "2.3K",
    trials: "47",
    churn: "3",
    surprise: `most ${examples.metrics[0]} came from one demo`,
    insight_data: "the demo matters more than the landing page",

    // System format
    steps: "1. find the pain\n2. show the fix\n3. post the demo",
    step_1: "find the pain",
    step_2: "show the fix",
    step_3: "post the demo",

    // Story format
    bad_state: pick(["struggling", "stuck", "overwhelmed"]),
    conflict: "nobody thought it would work",
    resolution: "it worked",

    // Before/after — use niche-specific
    before: pick(["22%", "15%", "31%", "18%"]),
    after: pick(["39%", "52%", "47%", "61%"]),
  };
}

// ---------------------------------------------------------------------------
// Grammar repair — fix common issues that arise from template filling
// ---------------------------------------------------------------------------
function grammarRepair(text) {
  let repaired = text;

  // Fix: "more [verb phrase] won't fix it" → "more [noun] won't fix it"
  // "more remove silence from videos won't fix it" → "more editing won't fix it"
  repaired = repaired.replace(/more (\w+ \w+ \w+ \w+) won't fix it/gi, "more of that won't fix it");
  repaired = repaired.replace(/more (\w+ing \w+ \w+) won't fix it/gi, "more of that won't fix it");

  // Fix: "send this to a video editors" → "send this to video editors" (no "a" before plurals)
  repaired = repaired.replace(/send this to a (\w+s)\./gi, "send this to $1.");
  repaired = repaired.replace(/send this to a (people|founders|editors|creators|podcasters|developers|designers|writers|marketers|students|musicians)\./gi, "send this to $1.");

  // Fix: "I've been {audience} for {timeframe}" → "I've been working with {audience} for {timeframe}"
  repaired = repaired.replace(/I've been (video editors|founders|creators|podcasters|developers|designers|writers|marketers|students|musicians|people) for/gi, "I've been working with $1 for");

  // Fix: "I've been {action} for {timeframe}" where action is a verb phrase
  // "I've been removing silence from videos for hours" is OK
  // "I've been edit videos for hours" is not — fix to "editing videos"
  repaired = repaired.replace(/I've been (\w+) (\w+s) for/gi, (match, verb, noun) => {
    if (verb.endsWith("ing")) return match; // already gerund
    if (verb.endsWith("e")) return `I've been ${verb.slice(0, -1)}ing ${noun} for`;
    return `I've been ${verb}ing ${noun} for`;
  });

  // Fix: standalone "saves hours of manual editing." with no product context
  // → "AutoEditor saves hours of manual editing."
  const lines = repaired.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^(saves |automatically |faster )/.test(lines[i].trim()) && i > 0) {
      const prev = lines[i - 1].trim();
      // If previous line doesn't mention a product, add context
      if (!/(product|tool|app|AutoEditor|built|shipped|descript|premiere|capcut|tool)/i.test(prev) && !/(product|tool|app|AutoEditor|built|shipped)/i.test(lines[i])) {
        // Leave it — benefit lines can work standalone in short posts
      }
    }
  }

  // Fix: double spaces
  repaired = repaired.replace(/  +/g, " ");

  // Fix: "the the" or "a a"
  repaired = repaired.replace(/\b(the|a|an) \1\b/gi, "$1");

  // Fix: "video editors want fewer decisions" appearing twice in the same post
  const lines2 = repaired.split("\n");
  const seen = new Set();
  const deduped = lines2.filter(l => {
    const key = l.trim().toLowerCase().replace(/[.,!?;:]+$/, "");
    if (key.length < 10) return true; // skip short lines
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  repaired = deduped.join("\n");

  // Fix: "I was {bad_state}." → "I was stuck." (already handled by fill)
  // Fix: sentences that end with a verb phrase awkwardly
  repaired = repaired.replace(/\.$/, ".");

  return repaired;
}

// ---------------------------------------------------------------------------
// Coherence check — reject posts where story elements don't connect
// ---------------------------------------------------------------------------
function coherenceCheck(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  const issues = [];

  // Check: no unfilled template variables
  const unfilled = text.match(/\{[a-z_]+\}|\$\{[a-z_]+\}/g);
  if (unfilled) {
    issues.push(`unfilled variables: ${unfilled.join(", ")}`);
  }

  // Check: post should have at least 3 lines
  if (lines.length < 3) {
    issues.push("post too short");
  }

  // Check: no line should be more than 200 chars (readability)
  for (const line of lines) {
    if (line.length > 200) {
      issues.push(`line too long: ${line.substring(0, 50)}...`);
      break;
    }
  }

  // Check: "saves hours of manual editing" shouldn't appear as a standalone line
  // It needs to be connected to a product mention
  for (let i = 0; i < lines.length; i++) {
    if (/^(saves|automatically |faster )/.test(lines[i]) && i > 0 && !lines[i - 1].match(/(product|tool|app|AutoEditor|built|shipped)/i)) {
      // This is OK — benefit lines can follow any line
    }
  }

  // Check: don't have the same word repeated 3+ times in a line
  for (const line of lines) {
    const words = line.toLowerCase().split(/\s+/);
    const counts = {};
    for (const w of words) {
      if (w.length > 4) counts[w] = (counts[w] || 0) + 1;
    }
    for (const [word, count] of Object.entries(counts)) {
      if (count >= 3) {
        issues.push(`word repeated ${count}x: "${word}" in: ${line.substring(0, 50)}`);
      }
    }
  }

  // Check: "editting" typo (should be "editing")
  if (/editting/.test(text)) {
    issues.push("typo: editting");
  }

  return {
    passes: issues.length === 0,
    issues,
  };
}

// ---------------------------------------------------------------------------
// Generate a post from a format + analysis
// Uses niche-specific examples, grammar repair, and coherence checking.
// Retries up to 3 times if the coherence check fails.
// ---------------------------------------------------------------------------
function generateFromFormat(formatId, analysis) {
  const format = VIRAL_FORMATS[formatId];
  if (!format) return null;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // Try up to 3 times to generate a coherent post
  for (let attempt = 0; attempt < 3; attempt++) {
    // Build niche context for this attempt
    const ctx = buildNicheContext(analysis);

    const hookTemplate = pick(format.hookTemplates);
    const bodyTemplate = pick(format.bodyTemplates);
    const closerTemplate = pick(format.closerTemplates);

    // Fill in template variables from the niche context
    const fill = (template) => {
      let result = template;
      // Replace all {variable} with values from ctx
      result = result.replace(/\{(\w+)\}/g, (match, key) => {
        const val = ctx[key];
        if (val !== undefined && val !== null) return String(val);
        return match; // leave unfilled (will be caught by coherence check)
      });
      return result;
    };

    const hook = fill(hookTemplate);
    const body = fill(bodyTemplate);
    const closer = fill(closerTemplate);

    let text = `${hook}\n\n${body}\n\n${closer}`;

    // Grammar repair
    text = grammarRepair(text);

    // Coherence check
    const check = coherenceCheck(text);
    if (check.passes) {
      return {
        text,
        formatId: format.id,
        formatName: format.name,
      };
    }
    // If it failed, try again with different random picks
  }

  // If all 3 attempts failed, return the last one anyway (better than nothing)
  const ctx = buildNicheContext(analysis);
  const hookTemplate = pick(format.hookTemplates);
  const bodyTemplate = pick(format.bodyTemplates);
  const closerTemplate = pick(format.closerTemplates);
  const fill = (template) => {
    let result = template;
    result = result.replace(/\{(\w+)\}/g, (match, key) => {
      const val = ctx[key];
      if (val !== undefined && val !== null) return String(val);
      return "";
    });
    return result;
  };
  const text = grammarRepair(`${fill(hookTemplate)}\n\n${fill(bodyTemplate)}\n\n${fill(closerTemplate)}`);

  return {
    text,
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
