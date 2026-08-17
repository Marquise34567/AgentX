/*
 * Neural generator — runs a small open-source LLM directly in Node.js on CPU
 * via @huggingface/transformers (ONNX runtime).
 *
 * No GPU. No third-party API calls. The model downloads once and runs locally.
 *
 * Model: Qwen 2.5 1.5B Instruct (quantized q4) — small enough for CPU,
 * big enough to follow instructions and write good tweets.
 *
 * Approach:
 *   1. Parse the user's input into a structured intent (topic, niche, goal)
 *   2. Select relevant few-shot examples from the expanded viral corpus
 *   3. Generate tweets ONE AT A TIME with a focused, simple prompt
 *      (small models fail at multi-output generation)
 *   4. Score each with the engagement algorithm + iteration engine
 *   5. Return the best ones
 *
 * The few-shot examples teach the model tweet STYLE via in-context learning.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { scorePost } = require("./engagementAlgo");
const { improvePost } = require("./improver");

let _pipeline = null;
let _tokenizer = null;
let _corpus = null;
let _loadingPromise = null;

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

// ---------------------------------------------------------------------------
// Load the expanded viral tweet corpus
// ---------------------------------------------------------------------------

function loadCorpus() {
  if (_corpus) return _corpus;
  const corpusPath = path.join(__dirname, "training_corpus_expanded.json");
  if (fs.existsSync(corpusPath)) {
    _corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
  } else {
    const fallbackPath = path.join(__dirname, "training_corpus.json");
    _corpus = fs.existsSync(fallbackPath)
      ? JSON.parse(fs.readFileSync(fallbackPath, "utf8"))
      : [];
  }
  return _corpus;
}

// ---------------------------------------------------------------------------
// Intent parsing — extract structured meaning from the user's input
// ---------------------------------------------------------------------------

function parseIntent(input) {
  const text = input.trim();
  const lower = text.toLowerCase();

  const nicheKeywords = {
    editing: ["edit", "editor", "footage", "retention", "video", "cut", "transition", "render"],
    saas: ["saas", "mrr", "arr", "subscription", "stripe", "bootstrapped", "founder", "startup"],
    fitness: ["gym", "workout", "fitness", "run", "marathon", "muscle", "weight", "lift", "cardio"],
    money: ["money", "invest", "stock", "debt", "save", "financial", "index fund", "credit"],
    cooking: ["cook", "recipe", "meal", "food", "kitchen", "chef", "dinner"],
    travel: ["travel", "country", "trip", "flight", "backpack", "abroad", "japan", "europe"],
    coding: ["code", "program", "developer", "javascript", "python", "typescript", "bug", "ship"],
    content: ["youtube", "tiktok", "content", "creator", "channel", "subscriber", "views"],
    sales: ["outreach", "cold", "dm", "pitch", "deal", "client", "sell", "affiliate", "partnership"],
    marketing: ["marketing", "brand", "viral", "ad", "campaign", "seo", "email", "newsletter"],
    career: ["job", "career", "salary", "interview", "resume", "promotion", "quit", "remote"],
    writing: ["write", "writing", "blog", "article", "book", "author", "words"],
    music: ["music", "song", "producer", "beat", "album", "stream", "spotify"],
    photography: ["photo", "camera", "lens", "photography", "shoot"],
    design: ["design", "logo", "ui", "ux", "figma", "brand", "typography"],
    realestate: ["house", "property", "realtor", "mortgage", "home", "real estate"],
    mentalhealth: ["anxiety", "therapy", "mental", "stress", "depression", "burnout", "mindful"],
    relationships: ["relationship", "marriage", "dating", "partner", "love", "couple"],
    parenting: ["kid", "child", "parent", "family", "homeschool", "baby"],
    gaming: ["game", "gaming", "gamer", "xbox", "playstation", "stream"],
    health: ["sleep", "diet", "vegan", "keto", "health", "sober", "coffee", "water"],
    business: ["business", "entrepreneur", "side hustle", "passive income", "launch", "product"],
    freelance: ["freelance", "client", "contract", "rate", "invoice"],
    community: ["community", "members", "discord", "forum", "group"],
    education: ["teach", "learn", "course", "student", "education", "school"],
    crypto: ["crypto", "bitcoin", "ethereum", "token", "blockchain", "defi"],
    comedy: ["comedy", "joke", "standup", "funny", "punchline"],
    podcast: ["podcast", "episode", "interview", "mic"],
    newsletter: ["newsletter", "subscriber", "email list"],
    linkedin: ["linkedin", "professional", "corporate"],
    productivity: ["productivity", "focus", "deep work", "pomodoro", "notion", "planner"],
    pets: ["dog", "cat", "pet", "train"],
    healthcare: ["nurse", "doctor", "hospital", "patient", "healthcare"],
    speaking: ["speaking", "presentation", "stage", "talk", "speech"],
    selfimprovement: ["journal", "meditation", "habit", "discipline", "self-improvement"],
    branding: ["brand", "personal brand", "audience", "followers"],
    mindfulness: ["meditation", "mindful", "breath", "present", "awareness"],
  };

  let detectedNiche = null;
  let bestScore = 0;
  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      detectedNiche = niche;
    }
  }

  let goal = "general";
  if (/(outreach|reach out|pitch|offer|partnership|affiliate|deal|collab|dm|cold)/i.test(lower)) {
    goal = "outreach";
  } else if (/(i built|i made|i created|i launched|i started)/i.test(lower)) {
    goal = "founder_story";
  } else if (/(how do i|how to|what should|advice|tips|best way)/i.test(lower)) {
    goal = "advice";
  } else if (/(i tried|i tested|i did|i tracked|i spent)/i.test(lower)) {
    goal = "experiment";
  } else if (text.length > 100) {
    goal = "story";
  }

  let topic = text;
  if (goal === "outreach") {
    topic = extractOutreachCore(text);
  } else {
    if (topic.length > 200) topic = topic.slice(0, 200) + "...";
  }

  return { rawInput: text, topic, niche: detectedNiche || "general", goal };
}

function extractOutreachCore(text) {
  const lower = text.toLowerCase();
  let audience = null;
  let offer = null;
  let incentive = null;

  const audienceMatch = text.match(/(?:your?|you're|you are)\s+(?:a|an)\s+([^,.!?]+)/i);
  if (audienceMatch) audience = audienceMatch[1].trim();

  if (/raw footage/i.test(text)) offer = "give me raw footage, I run it through my retention editing software, you react to the result";
  else if (/affiliate/i.test(text) && /free/i.test(text)) offer = "try the product and become an affiliate";

  if (/affiliate program/i.test(text)) incentive = "affiliate program + free subscription";
  else if (/free subscription/i.test(text)) incentive = "free subscription";
  else if (/free/i.test(text)) incentive = "free access";

  if (audience && offer) {
    return `Outreach to ${audience}: ${offer}. In return: ${incentive || "a mutually beneficial deal"}.`;
  }
  return text.replace(/\s+/g, " ").trim().slice(0, 200);
}

// ---------------------------------------------------------------------------
// Few-shot example selection
// ---------------------------------------------------------------------------

function selectFewShotExamples(intent, count = 5) {
  const corpus = loadCorpus();
  const { niche, goal } = intent;

  const scored = corpus.map((tweet) => {
    let score = 0;
    if (tweet.niche === niche) score += 10;
    if (goal === "outreach" && (tweet.niche === "sales" || tweet.niche === "editing")) score += 5;
    if (goal === "founder_story" && tweet.type === "founder_story") score += 5;
    if (goal === "experiment" && tweet.type === "proof_receipts") score += 5;
    if (goal === "advice" && (tweet.type === "insider_observation" || tweet.type === "actionable_plan")) score += 5;
    const engagement = (tweet.likes || 0) + (tweet.reposts || 0) * 2 + (tweet.bookmarks || 0) * 3;
    score += Math.min(5, Math.log10(engagement + 1));
    return { tweet, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected = [];
  const seenTypes = new Set();
  for (const { tweet } of scored) {
    if (selected.length >= count) break;
    if (seenTypes.has(tweet.type) && selected.length >= count - 2) continue;
    selected.push(tweet);
    seenTypes.add(tweet.type);
  }

  if (selected.length < count) {
    for (const { tweet } of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(tweet)) selected.push(tweet);
    }
  }

  return selected.slice(0, count);
}

// ---------------------------------------------------------------------------
// Build a SINGLE-TWEET generation prompt (one tweet at a time)
// ---------------------------------------------------------------------------

function buildSingleTweetPrompt(intent, fewShotExamples, angleHint) {
  const { topic, niche, goal } = intent;

  // Pick 3 examples for the prompt
  const examples = fewShotExamples.slice(0, 3);
  const examplesText = examples
    .map((t) => `Tweet: ${t.text}`)
    .join("\n\n");

  let angleInstruction = "";
  if (goal === "outreach") {
    angleInstruction = `Write a tweet that would make a pro video editor want to DM you to learn more about the retention editing offer. The tweet should be about the VALUE of retention editing or a specific result it produces — NOT the pitch itself. Make editors curious about what the software can do to their raw footage.`;
  } else if (goal === "founder_story") {
    angleInstruction = `Write a founder story tweet with specific numbers and a transformation. Start with "I" and tell a brief story.`;
  } else if (goal === "experiment") {
    angleInstruction = `Write a tweet showing proof with specific data and results. Include real numbers.`;
  } else if (goal === "advice") {
    angleInstruction = `Write a contrarian or insider observation tweet about this topic. Challenge conventional wisdom.`;
  } else {
    angleInstruction = `Write an engaging tweet about this topic with specific details.`;
  }

  const angleSuffix = angleHint ? ` ${angleHint}` : "";

  const messages = [
    {
      role: "system",
      content: "You are an expert X (Twitter) ghostwriter who writes viral tweets. Your tweets are short, punchy, mostly lowercase, and under 280 characters. You use short lines separated by line breaks, specific numbers, contrarian angles, and curiosity hooks. You never use hashtags or links. You write like the examples — casual, direct, opinionated.",
    },
    {
      role: "user",
      content: `Here are examples of viral tweets in the style I want:\n\n${examplesText}\n\nNow write ONE viral tweet about this topic:\n${topic}\n\n${angleInstruction}${angleSuffix}\n\nImportant: Write ONLY the tweet text. No labels, no "Tweet:", no numbering, no explanation before or after. Just the tweet itself, ready to post.`,
    },
  ];

  return messages;
}

// Simple, focused prompts for the 0.5B model.
// Small models need SHORT, DIRECT prompts — one sentence in, one tweet out.
// We give the model a nearly-complete tweet opening and let it finish.
const TWEET_STARTERS = [
  "nobody talks about how retention editing",
  "the best video editors I know don't",
  "I ran a pro editor's raw footage through my retention software and",
  "most editors think their workflow is fine until",
  "I offered 5 editors free retention editing. 3 said yes in 48 hours. Here's what happened:",
];

function buildSimplePrompt(intent, starter) {
  const { niche, goal } = intent;

  // For non-editing niches, build a starter from the topic
  let promptStarter = starter;
  if (niche !== "editing" && goal !== "outreach") {
    // Generate a starter based on the topic
    const topicShort = intent.topic.slice(0, 60).replace(/[.!?]+$/, "");
    promptStarter = `nobody talks about how ${topicShort}`;
  }

  const messages = [
    {
      role: "system",
      content: "You write viral tweets. Short. Punchy. Lowercase. No hashtags. No links. Max 280 characters.",
    },
    {
      role: "user",
      content: `Finish this tweet. Write 2-4 more short lines that complete the thought. Stop when the tweet is done.\n\n${promptStarter}`,
    },
  ];

  return messages;
}

// ---------------------------------------------------------------------------
// Load the model (lazy, singleton)
// ---------------------------------------------------------------------------

async function getModel() {
  if (_pipeline) return { pipeline: _pipeline, tokenizer: _tokenizer };
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const { pipeline, AutoTokenizer, env } = require("@huggingface/transformers");

    env.allowLocalModels = false;
    env.allowRemoteModels = true;

    console.log("[neuralGenerator] Loading model:", MODEL_ID);
    const start = Date.now();

    _pipeline = await pipeline("text-generation", MODEL_ID, {
      dtype: "q4",
      device: "cpu",
    });

    _tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[neuralGenerator] Model loaded in ${elapsed}s`);
    return { pipeline: _pipeline, tokenizer: _tokenizer };
  })();

  try {
    return await _loadingPromise;
  } finally {
    _loadingPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Generate a single tweet
// ---------------------------------------------------------------------------

async function generateSingleTweet(pipe, tokenizer, messages) {
  // Apply chat template
  const prompt = tokenizer.apply_chat_template(messages, {
    tokenize: false,
    add_generation_prompt: true,
  });

  const result = await pipe(prompt, {
    max_new_tokens: 100, // Just completing a few lines
    temperature: 0.85,
    top_p: 0.9,
    do_sample: true,
    repetition_penalty: 1.15,
  });

  let output = Array.isArray(result) ? result[0].generated_text : result.generated_text;

  // Extract only the new text (after the prompt)
  const promptEnd = prompt.length;
  let generated = output.slice(promptEnd);

  // Cut at end token if present
  const endIdx = generated.indexOf("<|im_end|>");
  if (endIdx >= 0) generated = generated.slice(0, endIdx);

  // Clean up
  generated = generated.trim();

  // Remove leading labels like "Tweet:" or "1."
  generated = generated.replace(/^(tweet\s*:\s*|\d+[\.\)]\s*|["'`])/, "");
  generated = generated.replace(/["'`]$/, "");

  // If the tweet is too long, truncate at the last sentence boundary under 280 chars
  if (generated.length > 280) {
    // Try to cut at a sentence boundary
    const under280 = generated.slice(0, 280);
    const lastPeriod = under280.lastIndexOf(".");
    const lastNewline = under280.lastIndexOf("\n");
    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > 100) {
      generated = under280.slice(0, cutPoint + 1).trim();
    } else {
      generated = under280.trim();
    }
  }

  return generated;
}

// ---------------------------------------------------------------------------
// Generate multiple tweets
// ---------------------------------------------------------------------------

async function generate(input, options = {}) {
  const { count = 5 } = options;

  const intent = parseIntent(input);
  const fewShotExamples = selectFewShotExamples(intent, 5);

  let pipe, tokenizer;
  try {
    const model = await getModel();
    pipe = model.pipeline;
    tokenizer = model.tokenizer;
  } catch (e) {
    return {
      error: `Failed to load neural model: ${e.message}`,
      fallback: true,
      intent,
    };
  }

  // Generate one tweet at a time using simple starters
  const rawTweets = [];
  const starters = TWEET_STARTERS.slice(0, count);

  for (let i = 0; i < count; i++) {
    try {
      const messages = buildSimplePrompt(intent, starters[i % starters.length]);
      const completion = await generateSingleTweet(pipe, tokenizer, messages);

      // The completion is just the ending — prepend the starter
      const fullTweet = (starters[i % starters.length] + " " + completion).trim();

      // Validate
      if (fullTweet.length < 30 || fullTweet.length > 320) continue;
      // Skip if it looks like instructions
      if (/^(here are|these are|below are|i'll write|let me|sure,|okay,|here's a tweet|tweet:)/i.test(fullTweet)) continue;

      rawTweets.push(fullTweet);
    } catch (e) {
      console.error(`[neuralGenerator] Tweet ${i + 1} failed:`, e.message);
    }
  }

  if (rawTweets.length === 0) {
    return {
      error: "Model did not produce usable tweets",
      fallback: true,
      intent,
    };
  }

  // Score and improve each tweet
  const scored = rawTweets.map((tweet) => {
    const score = scorePost(tweet);
    return {
      post: tweet,
      score: score.score,
      grade: score.grade,
      realScore: score.signalModel?.realScore || score.score,
      engagementTier: score.signalModel?.engagementTier || "unknown",
      predictedDwellSeconds: score.signalModel?.predictedDwellSeconds || 0,
      topSignals: score.signalModel?.topPositive?.slice(0, 4).map((s) => `${s.signal} (+${s.contribution})`) || [],
      archetype: `neural-${intent.goal}`,
      archetypeWhy: `Generated by Qwen 2.5 1.5B for ${intent.niche} niche, ${intent.goal} intent`,
      problems: score.problems?.slice(0, 3) || [],
    };
  });

  scored.sort((a, b) => b.realScore - a.realScore);

  // Try to improve the top tweets
  const improved = scored.map((s) => {
    if (s.grade.startsWith("A") || s.grade.startsWith("B+")) {
      return { ...s, iterationCount: 0, converged: true, originalGrade: s.grade, originalScore: s.score };
    }
    try {
      const imp = improvePost(s.post, 85, 6);
      return {
        ...s,
        post: imp.final,
        score: imp.finalScore,
        grade: imp.finalGrade,
        realScore: scorePost(imp.final).signalModel?.realScore || imp.finalScore,
        iterationCount: imp.iterations || 0,
        converged: imp.finalGrade.startsWith("A") || imp.finalGrade.startsWith("B+"),
        originalGrade: s.grade,
        originalScore: s.score,
      };
    } catch {
      return { ...s, iterationCount: 0, converged: false, originalGrade: s.grade, originalScore: s.score };
    }
  });

  improved.sort((a, b) => b.realScore - a.realScore);

  return {
    topic: intent.topic,
    niche: intent.niche,
    goal: intent.goal,
    posts: improved.slice(0, count),
    method: "neural (Qwen 2.5 1.5B Instruct, CPU, few-shot from expanded viral corpus)",
    modelInfo: {
      model: MODEL_ID,
      quantization: "q4 (4-bit)",
      device: "cpu",
      fewShotExamples: fewShotExamples.length,
    },
  };
}

function isLoaded() {
  return _pipeline !== null;
}

function getStats() {
  const corpus = loadCorpus();
  return {
    modelLoaded: isLoaded(),
    corpusSize: corpus.length,
    niches: [...new Set(corpus.map((t) => t.niche).filter(Boolean))].length,
    model: MODEL_ID,
    quantization: "q4",
    device: "cpu",
  };
}

module.exports = { generate, parseIntent, isLoaded, getStats, loadCorpus, selectFewShotExamples };
