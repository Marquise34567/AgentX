/*
 * Context-clue engine — understands what ANY product/tool/topic is by
 * decomposing its name into meaningful parts and inferring its function.
 *
 * Instead of a hardcoded list of products, this engine uses:
 *   1. Word decomposition — "autoeditor" → "auto" + "editor"
 *   2. A morpheme/word-part database — what "auto", "edit", "screen", "record" etc. mean
 *   3. Context clue patterns — "X for Y" → X is a tool, Y is the use case
 *   4. Compound word analysis — "screen recorder" = screen + recorder
 *   5. Industry/domain inference — if it has "edit" in it, it's probably a creative tool
 *
 * This lets AgentX understand products it has never seen before.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Morpheme database — word parts and what they imply
// Each morpheme maps to: action, audience, benefit, category, comparative
// ---------------------------------------------------------------------------
const MORPHEMES = {
  // Action morphemes — what the tool DOES
  edit: { action: "edit videos", audience: "videoEditors", category: "video editing", benefit: "faster editing", comparative: "faster" },
  editor: { action: "edit videos", audience: "videoEditors", category: "video editing", benefit: "faster editing", comparative: "faster" },
  record: { action: "record screen", audience: "founders", category: "screen recording", benefit: "easy recording", comparative: "easier" },
  recorder: { action: "record screen", audience: "founders", category: "screen recording", benefit: "easy recording", comparative: "easier" },
  capture: { action: "capture screen", audience: "founders", category: "screen capture", benefit: "easy capture", comparative: "easier" },
  transcribe: { action: "transcribe audio", audience: "podcasters", category: "transcription", benefit: "automatic transcription", comparative: "faster" },
  transcriber: { action: "transcribe audio", audience: "podcasters", category: "transcription", benefit: "automatic transcription", comparative: "faster" },
  caption: { action: "add captions to videos", audience: "videoEditors", category: "captioning", benefit: "automatic captions", comparative: "faster" },
  subtitle: { action: "add subtitles to videos", audience: "videoEditors", category: "subtitling", benefit: "automatic subtitles", comparative: "faster" },
  clip: { action: "clip videos", audience: "videoEditors", category: "video clipping", benefit: "fast clipping", comparative: "faster" },
  cut: { action: "cut videos", audience: "videoEditors", category: "video editing", benefit: "fast cutting", comparative: "faster" },
  render: { action: "render videos", audience: "videoEditors", category: "rendering", benefit: "faster rendering", comparative: "faster" },
  compress: { action: "compress videos", audience: "videoEditors", category: "compression", benefit: "smaller files", comparative: "better" },
  convert: { action: "convert video formats", audience: "videoEditors", category: "conversion", benefit: "easy conversion", comparative: "easier" },
  upload: { action: "upload videos", audience: "youTubers", category: "uploading", benefit: "easy uploading", comparative: "easier" },
  schedule: { action: "schedule posts", audience: "marketers", category: "scheduling", benefit: "save time scheduling", comparative: "faster" },
  post: { action: "post content", audience: "marketers", category: "posting", benefit: "easy posting", comparative: "easier" },
  publish: { action: "publish content", audience: "writers", category: "publishing", benefit: "easy publishing", comparative: "easier" },
  write: { action: "write content", audience: "writers", category: "writing", benefit: "faster writing", comparative: "faster" },
  writer: { action: "write content", audience: "writers", category: "writing", benefit: "faster writing", comparative: "faster" },
  generate: { action: "generate content", audience: "marketers", category: "content generation", benefit: "automatic content", comparative: "faster" },
  generator: { action: "generate content", audience: "marketers", category: "content generation", benefit: "automatic content", comparative: "faster" },
  design: { action: "design graphics", audience: "designers", category: "design", benefit: "faster design", comparative: "faster" },
  designer: { action: "design graphics", audience: "designers", category: "design", benefit: "faster design", comparative: "faster" },
  analyze: { action: "analyze data", audience: "marketers", category: "analytics", benefit: "automatic analysis", comparative: "faster" },
  track: { action: "track metrics", audience: "saasFounders", category: "analytics", benefit: "automatic tracking", comparative: "easier" },
  monitor: { action: "monitor systems", audience: "softwareDevelopers", category: "monitoring", benefit: "automatic monitoring", comparative: "easier" },
  deploy: { action: "deploy apps", audience: "softwareDevelopers", category: "deployment", benefit: "easy deployment", comparative: "faster" },
  build: { action: "build apps", audience: "softwareDevelopers", category: "development", benefit: "faster building", comparative: "faster" },
  code: { action: "write code", audience: "softwareDevelopers", category: "development", benefit: "faster coding", comparative: "faster" },
  ship: { action: "ship products", audience: "founders", category: "deployment", benefit: "faster shipping", comparative: "faster" },
  launch: { action: "launch products", audience: "founders", category: "launch", benefit: "easy launching", comparative: "easier" },
  optimize: { action: "optimize content", audience: "marketers", category: "optimization", benefit: "better performance", comparative: "better" },
  automate: { action: "automate workflows", audience: "founders", category: "automation", benefit: "save time", comparative: "faster" },
  scrape: { action: "scrape websites", audience: "marketers", category: "scraping", benefit: "automatic data collection", comparative: "faster" },
  parse: { action: "parse data", audience: "softwareDevelopers", category: "data processing", benefit: "automatic parsing", comparative: "faster" },
  summarize: { action: "summarize content", audience: "writers", category: "summarization", benefit: "save time reading", comparative: "faster" },
  translate: { action: "translate content", audience: "writers", category: "translation", benefit: "automatic translation", comparative: "faster" },
  dub: { action: "dub videos", audience: "videoEditors", category: "dubbing", benefit: "automatic dubbing", comparative: "faster" },
  voice: { action: "generate voiceovers", audience: "videoEditors", category: "voiceover", benefit: "automatic voiceovers", comparative: "faster" },
  narrate: { action: "narrate videos", audience: "videoEditors", category: "narration", benefit: "automatic narration", comparative: "faster" },
  animate: { action: "animate graphics", audience: "designers", category: "animation", benefit: "faster animation", comparative: "faster" },
  grade: { action: "color grade videos", audience: "videoEditors", category: "color grading", benefit: "faster color grading", comparative: "faster" },
  mix: { action: "mix audio", audience: "musicians", category: "audio mixing", benefit: "better audio", comparative: "better" },
  master: { action: "master audio", audience: "musicians", category: "audio mastering", benefit: "professional audio", comparative: "better" },

  // Modifier morphemes — HOW the tool works
  auto: { modifier: "automatic", comparative: "faster", benefitPrefix: "automatically " },
  automatic: { modifier: "automatic", comparative: "faster", benefitPrefix: "automatically " },
  ai: { modifier: "AI-powered", comparative: "faster", benefitPrefix: "AI " },
  smart: { modifier: "smart", comparative: "better", benefitPrefix: "intelligently " },
  quick: { modifier: "quick", comparative: "faster", benefitPrefix: "quickly " },
  fast: { modifier: "fast", comparative: "faster", benefitPrefix: "quickly " },
  pro: { modifier: "professional", comparative: "better", benefitPrefix: "professionally " },
  easy: { modifier: "easy", comparative: "easier", benefitPrefix: "easily " },
  simple: { modifier: "simple", comparative: "simpler", benefitPrefix: "simply " },
  free: { modifier: "free", comparative: "cheaper", benefitPrefix: "freely " },
  cheap: { modifier: "cheap", comparative: "cheaper", benefitPrefix: "affordably " },
  instant: { modifier: "instant", comparative: "faster", benefitPrefix: "instantly " },
  real: { modifier: "real-time", comparative: "faster", benefitPrefix: "in real-time " },
  live: { modifier: "live", comparative: "faster", benefitPrefix: "live " },
  batch: { modifier: "batch", comparative: "faster", benefitPrefix: "in bulk " },
  bulk: { modifier: "bulk", comparative: "faster", benefitPrefix: "in bulk " },

  // Medium morphemes — WHAT the tool works on
  video: { medium: "video", audience: "videoEditors", category: "video editing" },
  audio: { medium: "audio", audience: "musicians", category: "audio editing" },
  screen: { medium: "screen", audience: "founders", category: "screen recording" },
  image: { medium: "image", audience: "designers", category: "image editing" },
  photo: { medium: "photo", audience: "designers", category: "photo editing" },
  text: { medium: "text", audience: "writers", category: "text editing" },
  code: { medium: "code", audience: "softwareDevelopers", category: "code editing" },
  music: { medium: "music", audience: "musicians", category: "music production" },
  podcast: { medium: "podcast", audience: "podcasters", category: "podcast production" },
  stream: { medium: "stream", audience: "streamers", category: "streaming" },
  thumbnail: { medium: "thumbnail", audience: "youTubers", category: "thumbnail design" },
  subtitle: { medium: "subtitle", audience: "videoEditors", category: "subtitling" },
  caption: { medium: "caption", audience: "videoEditors", category: "captioning" },
  clip: { medium: "clip", audience: "videoEditors", category: "video clipping" },
  reel: { medium: "reel", audience: "videoEditors", category: "short-form video" },
  short: { medium: "short", audience: "videoEditors", category: "short-form video" },
  post: { medium: "post", audience: "marketers", category: "social media" },
  tweet: { medium: "tweet", audience: "marketers", category: "social media" },
  email: { medium: "email", audience: "marketers", category: "email marketing" },
  newsletter: { medium: "newsletter", audience: "newsletterWriters", category: "newsletter" },
  blog: { medium: "blog", audience: "writers", category: "blogging" },
  website: { medium: "website", audience: "designers", category: "web design" },
  app: { medium: "app", audience: "softwareDevelopers", category: "app development" },
  saas: { medium: "SaaS", audience: "saasFounders", category: "SaaS" },
  form: { medium: "form", audience: "saasFounders", category: "forms" },
  landing: { medium: "landing page", audience: "saasFounders", category: "landing pages" },
  invoice: { medium: "invoice", audience: "freelancers", category: "invoicing" },
  contract: { medium: "contract", audience: "freelancers", category: "contracts" },
  resume: { medium: "resume", audience: "students", category: "resumes" },
  pitch: { medium: "pitch", audience: "founders", category: "pitching" },
  demo: { medium: "demo", audience: "founders", category: "demos" },
};

// ---------------------------------------------------------------------------
// Context-clue patterns — infer meaning from sentence structure
// ---------------------------------------------------------------------------
const CONTEXT_PATTERNS = [
  // "X for Y" → X is a tool, Y is the use case
  { pattern: /^(.+?)\s+for\s+(.+)$/i, entity: 1, useCase: 2 },
  // "a tool that X" → X is what it does
  { pattern: /^a\s+tool\s+that\s+(.+)$/i, action: 1 },
  // "an app that X" → X is what it does
  { pattern: /^an?\s+app\s+that\s+(.+)$/i, action: 1 },
  // "X that helps you Y" → X is the tool, Y is the action
  { pattern: /^(.+?)\s+that\s+helps\s+(?:you\s+)?(.+)$/i, entity: 1, action: 2 },
  // "X that lets you Y" → X is the tool, Y is the action
  { pattern: /^(.+?)\s+that\s+lets\s+(?:you\s+)?(.+)$/i, entity: 1, action: 2 },
  // "X that makes Y" → X is the tool, Y is what it makes
  { pattern: /^(.+?)\s+that\s+makes\s+(.+)$/i, entity: 1, action: 2 },
  // "I use X to Y" → X is the tool, Y is the action
  { pattern: /^i\s+use\s+(.+?)\s+to\s+(.+)$/i, entity: 1, action: 2 },
  // "X for Y editing" → X is an editing tool for Y
  { pattern: /^(.+?)\s+for\s+(.+?)\s+editing$/i, entity: 1, medium: 2 },
];

// ---------------------------------------------------------------------------
// Decompose a word into morphemes
// "autoeditor" → ["auto", "editor"]
// "screenrecorder" → ["screen", "recorder"]
// "aicaptiongenerator" → ["ai", "caption", "generator"]
// ---------------------------------------------------------------------------
function decomposeWord(word) {
  const lower = word.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.length < 4) return [lower];

  // Try to find morphemes by scanning from left to right
  // Try longest match first
  const morphemeKeys = Object.keys(MORPHEMES).sort((a, b) => b.length - a.length);
  const found = [];
  let remaining = lower;

  while (remaining.length > 0) {
    let matched = false;
    for (const key of morphemeKeys) {
      if (remaining.startsWith(key)) {
        found.push(key);
        remaining = remaining.slice(key.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Skip one character and try again
      // But don't add single chars as morphemes
      remaining = remaining.slice(1);
    }
  }

  return found.length > 0 ? found : [lower];
}

// ---------------------------------------------------------------------------
// Decompose a phrase (handles spaces)
// "screen recorder" → ["screen", "recorder"]
// "ai video editor" → ["ai", "video", "editor"]
// ---------------------------------------------------------------------------
function decomposePhrase(phrase) {
  const words = phrase.toLowerCase().split(/\s+/);
  const morphemes = [];
  for (const word of words) {
    // Check if the word itself is a morpheme
    if (MORPHEMES[word]) {
      morphemes.push(word);
    } else {
      // Try decomposing the word
      const decomposed = decomposeWord(word);
      for (const d of decomposed) {
        if (MORPHEMES[d]) morphemes.push(d);
      }
    }
  }
  return morphemes;
}

// ---------------------------------------------------------------------------
// Infer product meaning from morphemes
// ---------------------------------------------------------------------------
function inferFromMorphemes(morphemes) {
  if (morphemes.length === 0) return null;

  let action = null;
  let audience = null;
  let category = null;
  let benefit = null;
  let comparative = null;
  let modifier = null;
  let benefitPrefix = "";
  let medium = null;

  for (const morpheme of morphemes) {
    const data = MORPHEMES[morpheme];
    if (!data) continue;

    if (data.action && !action) action = data.action;
    if (data.audience && !audience) audience = data.audience;
    if (data.category && !category) category = data.category;
    if (data.benefit && !benefit) benefit = data.benefit;
    if (data.comparative && !comparative) comparative = data.comparative;
    if (data.modifier) modifier = data.modifier;
    if (data.benefitPrefix) benefitPrefix = data.benefitPrefix;
    if (data.medium && !medium) medium = data.medium;
  }

  // If we have a medium but no action, infer action from medium
  if (medium && !action) {
    if (medium === "video") action = "edit videos";
    else if (medium === "audio") action = "edit audio";
    else if (medium === "screen") action = "record screen";
    else if (medium === "image" || medium === "photo") action = "edit images";
    else if (medium === "text") action = "edit text";
    else if (medium === "code") action = "write code";
    else if (medium === "music") action = "produce music";
    else if (medium === "podcast") action = "produce podcasts";
    else if (medium === "stream") action = "stream content";
    else if (medium === "thumbnail") action = "design thumbnails";
    else if (medium === "subtitle" || medium === "caption") action = "add captions to videos";
    else if (medium === "clip") action = "clip videos";
    else if (medium === "reel" || medium === "short") action = "create short-form videos";
    else if (medium === "post" || medium === "tweet") action = "create social media posts";
    else if (medium === "email") action = "create email campaigns";
    else if (medium === "newsletter") action = "write newsletters";
    else if (medium === "blog") action = "write blog posts";
    else if (medium === "website") action = "design websites";
    else if (medium === "app") action = "build apps";
    else if (medium === "SaaS") action = "build SaaS products";
    else if (medium === "form") action = "create forms";
    else if (medium === "landing page" || medium === "landing") action = "build landing pages";
    else if (medium === "invoice") action = "create invoices";
    else if (medium === "contract") action = "create contracts";
    else if (medium === "resume") action = "create resumes";
    else if (medium === "pitch") action = "create pitch decks";
    else if (medium === "demo") action = "create demos";
  }

  // If we have a modifier, enhance the benefit
  if (modifier && benefit) {
    benefit = benefitPrefix + benefit;
  }
  if (modifier && comparative) {
    // Keep the comparative from the modifier if it's stronger
  }

  // If we still don't have an action, try to infer from category
  if (!action && category) {
    if (category.includes("video")) action = "edit videos";
    else if (category.includes("audio")) action = "edit audio";
    else if (category.includes("screen")) action = "record screen";
    else if (category.includes("design")) action = "design graphics";
    else if (category.includes("writing")) action = "write content";
    else if (category.includes("code")) action = "write code";
  }

  if (!action) return null;

  return {
    action,
    audience,
    category,
    benefit: benefit || `better ${action}`,
    comparative: comparative || "better",
    modifier,
    medium,
    morphemes,
  };
}

// ---------------------------------------------------------------------------
// Main entry point — understand any product/tool/topic from context clues
// ---------------------------------------------------------------------------
function understandProduct(input) {
  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Check context patterns first ("X for Y", "tool that X", etc.)
  for (const cp of CONTEXT_PATTERNS) {
    const match = lower.match(cp.pattern);
    if (match) {
      const result = {
        raw: text,
        action: cp.action ? match[cp.action] : null,
        entity: cp.entity ? match[cp.entity] : null,
        useCase: cp.useCase ? match[cp.useCase] : null,
        medium: cp.medium ? match[cp.medium] : null,
        source: "context_pattern",
      };
      // If we got an entity, try to understand it further
      if (result.entity) {
        const morphemes = decomposePhrase(result.entity);
        const inferred = inferFromMorphemes(morphemes);
        if (inferred) {
          if (!result.action && inferred.action) result.action = inferred.action;
          result.audience = inferred.audience;
          result.category = inferred.category;
          result.benefit = inferred.benefit;
          result.comparative = inferred.comparative;
        }
      }
      if (result.action) return result;
    }
  }

  // 2. Decompose the input into morphemes
  const morphemes = decomposePhrase(lower);
  if (morphemes.length === 0) return null;

  // 3. Infer meaning from morphemes
  const inferred = inferFromMorphemes(morphemes);
  if (!inferred) return null;

  return {
    raw: text,
    entity: text,
    action: inferred.action,
    audience: inferred.audience,
    category: inferred.category,
    benefit: inferred.benefit,
    comparative: inferred.comparative,
    modifier: inferred.modifier,
    medium: inferred.medium,
    morphemes: inferred.morphemes,
    source: "morpheme_decomposition",
  };
}

module.exports = {
  MORPHEMES,
  decomposeWord,
  decomposePhrase,
  inferFromMorphemes,
  understandProduct,
};
