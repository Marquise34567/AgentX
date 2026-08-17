/*
 * Research: What actually makes tweets go viral (10k+ likes)
 * Based on analysis of real viral tweets the user provided.
 *
 * The current system generates structured "insight" posts with CTAs.
 * Real viral tweets are NOTHING like that.
 */

// ---------------------------------------------------------------------------
// ANALYSIS OF REAL VIRAL TWEETS (10k+ likes)
// ---------------------------------------------------------------------------

const viralAnalysis = {
  // --- TWEET 1: Gautam Gambhir (politician, absurd humor) ---
  tweet1: {
    author: "ANI (quote of Gautam Gambhir, BJP MP)",
    text: "Agar mera jalebi khane se Delhi ka pollution badha hai, toh main hamesha ke liye jalebi chhod sakta hoon... 10 minute mein mujhe troll karna shuru kar diya, agar itni mehnat Delhi ki pollution ko kam karne mein ki hoti toh hum saas le pate.",
    translation: "If my eating jalebi increased Delhi's pollution, I can give up jalebi forever... You started trolling me in 10 minutes, if this much effort had been put into reducing Delhi's pollution, we'd be able to breathe.",
    likes: "10k+",
    why_it_went_viral: [
      "ABSURDITY — a politician responding to trolls with a ridiculous comparison (jalebi → pollution)",
      "HUMOR — the absurdity is genuinely funny",
      "SELF-AWARENESS — he's calling out the trolls while being funny about it",
      "POLITICAL DRAMA — people love politicians being human/funny",
      "NO STRUCTURE — it's just a quote, no hook/CTA/format",
      "VIDEO — native video attaches drive 1.21x engagement (ClimbX data)",
    ],
    what_our_system_would_do: "Strip the humor, add 'nobody wants to hear this.', add a CTA. Kill everything that made it viral.",
  },

  // --- TWEET 2: Srinivas BV (emotional/cultural) ---
  tweet2: {
    author: "Srinivas BV",
    text: "Because a Mother-in-Law Was Once a Daughter-in-Law Too",
    context: "Quote tweet of Smriti Irani's old tweet about petrol prices",
    likes: "10k+",
    why_it_went_viral: [
      "EMOTIONAL RESONANCE — touches a universal cultural nerve (mother-in-law/daughter-in-law dynamic)",
      "WISDOM IN 8 WORDS — the entire insight is in one short sentence",
      "QUOTE TWEET CONTRAST — the quoted tweet provides context that makes the reply hit harder",
      "RELATABLE — every Indian household has this dynamic",
      "NO CTA — doesn't need one, the emotion drives replies",
      "NO HASHTAGS — hashtags kill authenticity",
    ],
    what_our_system_would_do: "Add 'send this to someone who needs it.' and 'what's your version of this?' — destroying the emotional punch.",
  },

  // --- TWEET 3: Smriti Irani (hypocrisy exposed) ---
  tweet3: {
    author: "Smriti Z Irani (2011, before she joined BJP)",
    text: "Yet another hike in petrol prices. UPA seems 2 ignore public outcry over price rise. Arrogance of power, unsympathetic 2 d needs of d poor.",
    likes: "10k+ (went viral years later)",
    why_it_went_viral: [
      "HYPOCRISY — she criticized petrol hikes as opposition, then raised them as minister",
      "TIMING — the tweet aged like milk, making it funnier over time",
      "AUTHENTICITY — written in 2011 SMS-speak ('2' instead of 'to', 'd' instead of 'the')",
      "NO STRUCTURE — just an angry observation, no hook/CTA",
      "CONTEXT-DEPENDENT — the tweet itself is nothing special, but the CONTEXT (who she became) makes it viral",
    ],
    what_our_system_would_do: "Would never generate this — it's too casual, too short, and has no 'engagement signals'. But that's exactly why it went viral.",
  },

  // --- TWEET 4: Lego Kingo (drama/gossip) ---
  tweet4: {
    author: "Lego Kingo",
    text: "insane detail here where Elon doesn't recognize the name of Figma, a company that twitter has a SaaS contract with, and just thinks that the guy is doing a bit or something. Unreal incompetence",
    context: "Quote tweet of Matt Binder calling out Elon's behavior",
    likes: "10k+",
    why_it_went_viral: [
      "DRAMA — insider gossip about a famous person (Elon Musk)",
      "SPECIFICITY — names Figma, names the SaaS contract, names the specific behavior",
      "OPINION — 'Unreal incompetence' is a bold take, not neutral",
      "LOWERCASE — casual, conversational, not performative",
      "NO CTA — doesn't ask for engagement, the content IS the engagement",
      "QUOTE TWEET — adds commentary to existing drama, riding the wave",
    ],
    what_our_system_would_do: "Would add 'what's your version of this?' — a CTA that makes no sense on a gossip post.",
  },

  // --- TWEET 5: FourStop (ANTI-EXAMPLE — this did NOT go viral) ---
  tweet5: {
    author: "FourStop - A Jumio Company",
    text: "Watch our webinar and discover the power #data orchestration hubs provide your #KYB, #KYC, #compliance and global #Fraudprevention. Reducing fees, streamlining operations and future-proofing risk mitigation. https://bit.ly/2Vg2RbB #Payments #RiskManagement #SaaS #techsolves",
    likes: "NOT 10k — this is what NOT to do",
    why_it_flopped: [
      "CORPORATE — sounds like a press release, not a human",
      "HASHTAG STUFFING — 7 hashtags, zero authenticity",
      "BIT.LY LINK — external link in body = algorithm demotion",
      "JARGON — KYB, KYC, compliance, fraud prevention — nobody cares",
      "NO HOOK — 'Watch our webinar' is the opposite of a hook",
      "NO PERSONALITY — could be from any company, says nothing unique",
      "PROMOTIONAL — the entire post is an ad, zero value to the reader",
    ],
    what_our_system_resembles: "Our system sometimes generates posts that sound like this — corporate, structured, promotional. This is the failure mode we need to avoid.",
  },

  // --- TWEET 6: arra (relatable humor) ---
  tweet6: {
    author: "arra",
    text: "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time",
    likes: "10k+",
    why_it_went_viral: [
      "RELATABLE — every tech person has this exact thought",
      "LOWERCASE — casual, not trying too hard",
      "HUMOR — 'reading it like a youtube poop' is genuinely funny",
      "SPECIFIC — references a specific internet culture (youtube poop)",
      "NO STRUCTURE — one sentence, no line breaks, no CTA, no hook formula",
      "NO HASHTAGS — authentic, not performative",
      "SELF-DEPRECATING — admitting to a silly habit makes you like the author",
      "INSIDER — only tech people get it, making it feel like an inside joke",
    ],
    what_our_system_would_do: "Would never generate this. It's too casual, too short, has no numbers, no CTA, no 'engagement signals'. But it's exactly what goes viral.",
  },
};

// ---------------------------------------------------------------------------
// THE PATTERN: What ALL viral tweets have in common
// ---------------------------------------------------------------------------

const viralPatterns = {
  "1. HUMAN VOICE": {
    description: "Viral tweets sound like a person talking, not a brand or a content machine",
    examples: ["arra's lowercase humor", "Lego Kingo's casual gossip", "Smriti Irani's 2011 SMS-speak"],
    what_to_do: "Write like you're texting a friend, not writing a blog post",
    what_not_to_do: "Don't add 'send this to someone who needs it' — nobody texts that to a friend",
  },

  "2. EMOTION > STRUCTURE": {
    description: "Viral tweets make you FEEL something (laugh, anger, surprise, recognition). Structure is secondary.",
    examples: ["Gambhir's absurdity makes you laugh", "Srinivas's wisdom makes you feel", "Lego Kingo's gossip makes you react"],
    what_to_do: "Lead with the emotion. If it's not funny/surprising/angering, no amount of structure will save it.",
    what_not_to_do: "Don't add tension lines like 'most people get this wrong' — that's fake tension, not real emotion",
  },

  "3. SPECIFICITY = VIRALITY": {
    description: "Specific details make tweets feel real and shareable",
    examples: ["'Figma, a company that twitter has a SaaS contract with'", "'reading it like a youtube poop'", "'jalebi khane se Delhi ka pollution'"],
    what_to_do: "Use specific names, specific products, specific cultural references",
    what_not_to_do: "Don't use generic 'this saved me $400/month' — that could be anyone",
  },

  "4. NO CTA NEEDED": {
    description: "Viral tweets almost never have CTAs. The content itself drives engagement.",
    examples: ["None of the 10k+ tweets above have 'what's your take?' or 'agree or disagree?'"],
    what_to_do: "Let the content speak. If it's good, people will reply/share naturally.",
    what_not_to_do: "Don't add 'what's your version of this?' — it's the #1 sign of an AI-generated post",
  },

  "5. CASUAL FORMATTING": {
    description: "Viral tweets are often lowercase, no line breaks, no bullet points",
    examples: ["arra: all lowercase, one sentence", "Lego Kingo: lowercase, casual"],
    what_to_do: "Write naturally. Don't force line breaks and structure onto every post.",
    what_not_to_do: "Don't format every post as hook → proof → CTA. That's a thread formula, not a tweet formula.",
  },

  "6. INSIDER/RELATABLE": {
    description: "Tweets that make a specific group feel 'this is about ME' go viral within that group",
    examples: ["arra's tweet is for tech people", "Srinivas's tweet is for Indian households", "Lego Kingo's tweet is for tech/twitter insiders"],
    what_to_do: "Write for a specific audience, not 'everyone'. Insider jokes spread faster than generic advice.",
    what_not_to_do: "Don't write 'most people get this wrong' — that's generic. Write 'every React dev has done this' — that's specific.",
  },

  "7. DRAMA & GOSSIP": {
    description: "People share drama and gossip more than they share advice",
    examples: ["Lego Kingo's Elon gossip", "Smriti Irani's hypocrisy exposed"],
    what_to_do: "If there's drama in your niche, comment on it. Bold takes on current events spread fast.",
    what_not_to_do: "Don't avoid controversy. Safe, neutral posts don't go viral.",
  },

  "8. ABSURDITY & HUMOR": {
    description: "Absurd comparisons and unexpected humor are the highest-engagement format",
    examples: ["Gambhir comparing jalebi to pollution", "arra reading SaaS as youtube poop"],
    what_to_do: "Find the absurd, funny, or unexpected angle in your topic",
    what_not_to_do: "Don't sanitize the humor. 'Here's what most people get wrong' is not funny.",
  },
};

// ---------------------------------------------------------------------------
// WHAT OUR SYSTEM DOES WRONG (based on the viral tweets above)
// ---------------------------------------------------------------------------

const systemProblems = [
  {
    problem: "Every post has a CTA",
    evidence: "None of the 10k+ tweets above have 'what's your version of this?' or 'agree or disagree?'",
    fix: "Only add CTAs to posts that genuinely need them (maybe 20% of posts). Most posts should end on the content, not a question.",
  },
  {
    problem: "Every post has 'send this to someone who needs it'",
    evidence: "None of the viral tweets have share cues. People share because the content is good, not because you told them to.",
    fix: "Remove share cues entirely. If the content is good, people will share it. If it's not, a share cue won't help.",
  },
  {
    problem: "Every post follows the same structure (hook → proof → CTA)",
    evidence: "Viral tweets have wildly different structures — one sentence, a quote, a gossip comment, an absurd comparison",
    fix: "Generate multiple formats: casual one-liners, gossip/drama takes, absurd comparisons, emotional observations, resource lists, AND structured posts. Pick the best.",
  },
  {
    problem: "Posts sound corporate/AI-generated",
    evidence: "arra's tweet is all lowercase and casual. Our posts are capitalized, structured, and formal.",
    fix: "Add a 'casual mode' that writes in lowercase, no line breaks, conversational tone. Like texting a friend.",
  },
  {
    problem: "No humor or absurdity",
    evidence: "Gambhir's jalebi comparison and arra's youtube poop reference are genuinely funny. Our posts have zero humor.",
    fix: "Add humor templates: absurd comparisons, self-deprecating observations, relatable frustrations, insider jokes",
  },
  {
    problem: "No drama or gossip capability",
    evidence: "Lego Kingo's tweet is pure gossip about Elon. Our system can't generate this.",
    fix: "Add a 'drama/commentary' format that takes a news event or industry drama and gives a bold take",
  },
  {
    problem: "Posts are too long and structured",
    evidence: "arra's tweet is one sentence. Srinivas's is 8 words. Our posts are 5-6 lines with line breaks.",
    fix: "Add short-form formats: one-sentence observations, two-word punchlines, single-emoji reactions",
  },
];

// ---------------------------------------------------------------------------
// THE ML RESEARCH: How to make the system LEARN to write viral tweets
// ---------------------------------------------------------------------------

const mlResearch = {
  // APPROACH 1: RL-TweetGen (2025 paper — most directly relevant)
  approach1: {
    name: "RL-TweetGen (Reinforcement Learning + LoRA Fine-tuning)",
    paper: "RL-TweetGen: A Socio-Technical Framework for Engagement-Optimized Short Text Generation (2025)",
    how_it_works: [
      "1. Start with a small open-source LLM (Mistral-7B, LLaMA-3.1-8B, or DeepSeek 7B)",
      "2. Curate a dataset of viral tweets (sorted by engagement)",
      "3. Fine-tune with LoRA (Parameter-Efficient Fine-Tuning) — trains in hours on a single GPU",
      "4. Train an XGBoost engagement predictor on tweet features (length, sentiment, specificity, etc.)",
      "5. Use PPO (Proximal Policy Optimization) with a hybrid reward function:",
      "   - Reward = XGBoost predicted engagement score + expert human feedback",
      "   - The model learns to generate tweets that MAXIMIZE predicted engagement",
      "6. Use Tailored Beam Search + Contextual Temperature Scaling for diverse output",
    ],
    results: "Mistral-7B achieved highest fluency (BLEU: 0.2285), LLaMA-3.1 best semantic precision (BERT-F1: 0.8155)",
    what_we_need: "A GPU (even a T4 on Colab works), a dataset of viral tweets, LoRA fine-tuning, XGBoost for reward model",
    fits_agentx: "YES — this is exactly what AgentX should do. The XGBoost reward model can use our existing engagementAlgo.js scoring as the reward signal.",
  },

  // APPROACH 2: RePALM (ACL 2024 — PPO with dual reward)
  approach2: {
    name: "RePALM (Response-Augmented Popularity-Aligned Language Model)",
    paper: "RePALM: Popular Quote Tweet Generation via Auto-Response Augmentation (ACL 2024)",
    how_it_works: [
      "1. Use PPO with a DUAL reward mechanism:",
      "   - Reward 1: Popularity of the generated tweet (likes, retweets, replies)",
      "   - Reward 2: Consistency with auto-generated reader responses",
      "2. The model learns to write tweets that BOTH get engagement AND provoke meaningful responses",
      "3. The auto-response augmentation simulates what readers would say",
    ],
    results: "Outperforms LLMs that don't incorporate response augmentation",
    fits_agentx: "YES — the dual reward (engagement + response quality) maps perfectly to our reply_author_reply_back signal (+75, the highest signal in X's algorithm)",
  },

  // APPROACH 3: DPO (Direct Preference Optimization — simpler than PPO)
  approach3: {
    name: "DPO (Direct Preference Optimization)",
    paper: "Direct Preference Optimization: Your Language Model is Secretly a Reward Model (NeurIPS 2023)",
    how_it_works: [
      "1. Collect pairs of tweets: (viral tweet, non-viral tweet) on the same topic",
      "2. Fine-tune the model to prefer the viral version",
      "3. NO reward model needed — DPO directly optimizes the policy",
      "4. Much simpler and more stable than PPO",
      "5. OpenAI now supports DPO fine-tuning directly",
    ],
    results: "Matches or exceeds PPO-based RLHF while being substantially simpler",
    fits_agentx: "YES — we can build a preference dataset from our existing scored posts. Posts that scored B+ are 'chosen', posts that scored C are 'rejected'.",
  },

  // APPROACH 4: bwen (fine-tune on YOUR tweets)
  approach4: {
    name: "bwen (Fine-tune on your own tweet archive)",
    repo: "github.com/benthecarman/bwen",
    how_it_works: [
      "1. Download your Twitter/X archive (all your past tweets)",
      "2. Score tweets by engagement + voice quality",
      "3. Cluster tweets by theme (UMAP + HDBSCAN)",
      "4. LoRA fine-tune a small model (Llama, Mistral, Gemma, Qwen3) on YOUR tweets",
      "5. Export to GGUF for Ollama (runs locally, no API key)",
      "6. The model learns YOUR voice, YOUR opinions, YOUR style",
    ],
    results: "Produces a model that writes in your exact voice — no synthetic data, only your real tweets",
    fits_agentx: "YES — this is the voice calibration system AgentX already has, but taken to the next level. Instead of stylometric profiling, actually fine-tune a model on the user's tweets.",
  },

  // APPROACH 5: Feature-based prediction (what we already do, but better)
  approach5: {
    name: "Feature-based engagement prediction (XGBoost + BERT)",
    paper: "Twitter RecSys Challenge 2021 (2nd place solution)",
    how_it_works: [
      "1. Extract features from tweets: text, length, sentiment, specificity, hashtags, mentions, media",
      "2. Fine-tune BERT/DistilBERT on tweet text to get semantic embeddings",
      "3. Train XGBoost on features + embeddings to predict engagement",
      "4. Use the predictor as a reward model for generation",
    ],
    results: "DistilBERT + XGBoost achieved strong engagement prediction on 1 billion tweets",
    fits_agentx: "We already have a heuristic version of this in engagementAlgo.js. The upgrade would be to train a real XGBoost model on real engagement data.",
  },
};

// ---------------------------------------------------------------------------
// THE PRACTICAL PLAN: What AgentX should do (no GPU required for v1)
// ---------------------------------------------------------------------------

const practicalPlan = {
  phase1: {
    name: "Phase 1: Fix the post formats (no ML needed, just better templates)",
    timeline: "Now",
    changes: [
      "Add casual/lowercase format (like arra's tweets)",
      "Add humor/absurdity format (absurd comparisons, relatable frustrations)",
      "Add drama/commentary format (bold takes on industry events)",
      "Add one-sentence observation format (no structure, just a thought)",
      "Add quote-tweet commentary format (comment on existing content)",
      "STOP adding CTAs to every post (only 20% of posts should have them)",
      "STOP adding share cues entirely",
      "STOP forcing every post into hook → proof → CTA structure",
      "Add @mention capability (1.26x engagement lift per ClimbX data)",
      "Add native media suggestion (1.21x lift)",
    ],
  },

  phase2: {
    name: "Phase 2: Collect real engagement data",
    timeline: "1-2 months",
    changes: [
      "Track every post the user publishes (already have /api/analytics/track)",
      "Collect: likes, replies, retweets, bookmarks, profile clicks, impressions",
      "Build a dataset of (tweet text, engagement metrics) pairs",
      "Correlate our algorithm score with real engagement (calibration)",
      "Identify which post formats ACTUALLY perform best for this user",
    ],
  },

  phase3: {
    name: "Phase 3: Train a real engagement predictor",
    timeline: "3-6 months",
    changes: [
      "Fine-tune DistilBERT on the user's tweet dataset",
      "Train XGBoost on features + BERT embeddings → predict engagement",
      "Replace the heuristic scoring in engagementAlgo.js with the trained model",
      "Use the predictor as the reward function for generation",
    ],
  },

  phase4: {
    name: "Phase 4: Fine-tune a small LLM on the user's viral tweets",
    timeline: "6-12 months",
    changes: [
      "Download the user's Twitter/X archive",
      "Score tweets by engagement (use the Phase 3 predictor)",
      "LoRA fine-tune Mistral-7B or LLaMA-3.1-8B on the top 20% of tweets",
      "Use DPO: pairs of (viral version, non-viral version) of the same topic",
      "Export to GGUF, run locally via Ollama (no API key, no cloud)",
      "The model learns the user's voice AND what goes viral for them",
    ],
  },

  phase5: {
    name: "Phase 5: RL with PPO (the full RL-TweetGen approach)",
    timeline: "12+ months",
    changes: [
      "Use the Phase 3 predictor as the reward model",
      "Use PPO to optimize the Phase 4 model for engagement",
      "Add RePALM's dual reward: engagement + response quality",
      "The model learns to generate tweets that maximize REAL predicted engagement",
    ],
  },
};

// ---------------------------------------------------------------------------
// OUTPUT
// ---------------------------------------------------------------------------

console.log("=== VIRAL TWEET ANALYSIS ===\n");
for (const [key, tweet] of Object.entries(viralAnalysis)) {
  console.log(`\n${key.toUpperCase()}:`);
  console.log(`  Author: ${tweet.author}`);
  console.log(`  Text: "${tweet.text?.substring(0, 100)}..."`);
  console.log(`  Likes: ${tweet.likes}`);
  if (tweet.why_it_went_viral) {
    console.log(`  Why it went viral:`);
    for (const reason of tweet.why_it_went_viral) console.log(`    ✓ ${reason}`);
  }
  if (tweet.why_it_flopped) {
    console.log(`  Why it flopped:`);
    for (const reason of tweet.why_it_flopped) console.log(`    ✗ ${reason}`);
  }
  console.log(`  Our system would: ${tweet.what_our_system_would_do || tweet.what_our_system_resembles}`);
}

console.log("\n\n=== VIRAL PATTERNS ===\n");
for (const [pattern, data] of Object.entries(viralPatterns)) {
  console.log(`\n${pattern}`);
  console.log(`  ${data.description}`);
  console.log(`  Examples: ${data.examples.join(" | ")}`);
  console.log(`  DO: ${data.what_to_do}`);
  console.log(`  DON'T: ${data.what_not_to_do}`);
}

console.log("\n\n=== SYSTEM PROBLEMS ===\n");
for (const p of systemProblems) {
  console.log(`\nPROBLEM: ${p.problem}`);
  console.log(`  Evidence: ${p.evidence}`);
  console.log(`  Fix: ${p.fix}`);
}

console.log("\n\n=== ML RESEARCH: 5 APPROACHES ===\n");
for (const [key, approach] of Object.entries(mlResearch)) {
  console.log(`\n${key.toUpperCase()}: ${approach.name}`);
  console.log(`  Source: ${approach.paper || approach.repo}`);
  console.log(`  How it works:`);
  for (const step of approach.how_it_works) console.log(`    ${step}`);
  console.log(`  Results: ${approach.results}`);
  console.log(`  Fits AgentX: ${approach.fits_agentx}`);
}

console.log("\n\n=== PRACTICAL PLAN ===\n");
for (const [phase, data] of Object.entries(practicalPlan)) {
  console.log(`\n${phase.toUpperCase()}: ${data.name}`);
  console.log(`  Timeline: ${data.timeline}`);
  console.log(`  Changes:`);
  for (const change of data.changes) console.log(`    → ${change}`);
}
