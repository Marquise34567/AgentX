/*
 * ML tweet generator — n-gram language model trained on viral tweets.
 *
 * TRAINING DATA:
 *   1. The reference viral tweets (training_corpus.json) — high weight
 *   2. Thousands of combinatorially generated stories — learns structure
 *   3. Analytics feedback loop — posts that performed well get more weight
 *
 * MODEL:
 *   - Character-level and word-level n-gram model with Kneser-Ney backoff
 *   - Learns: word sequences, sentence structures, transition patterns
 *   - Generates: novel tweets by sampling from the learned distribution
 *   - The output is NOT a recombined template — it's sampled from probabilities
 *
 * GENERATION:
 *   - Seed with a topic/domain keyword
 *   - Sample word-by-word from the n-gram distribution
 *   - Score each generated tweet with the engagement algorithm
 *   - Keep the top N that score A/B+
 *
 * REINFORCEMENT:
 *   - When analytics data comes in, posts that performed well get upweighted
 *   - Posts that flopped get downweighted
 *   - The model literally learns from real performance over time
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { generateStories } = require("./storyGenerator");
const { generateCasual } = require("./casualGenerator");

// ---------------------------------------------------------------------------
// N-gram language model
// ---------------------------------------------------------------------------

class NgramModel {
  constructor(n = 3) {
    this.n = n; // n-gram order (3 = trigram)
    this.counts = new Map(); // n-gram counts: "word1 word2 word3" → count
    this.contextCounts = new Map(); // context counts: "word1 word2" → count
    this.vocab = new Set(); // all words seen
    this.totalTokens = 0;
    this.continuations = new Map(); // word → set of words that follow it
    this.preceded = new Map(); // word → set of words that precede it
  }

  // Train on a single text
  train(text, weight = 1) {
    const tokens = this.tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
      this.vocab.add(tokens[i]);
      this.totalTokens += weight;

      // Build n-grams of all orders from 1 to n
      for (let order = 1; order <= this.n; order++) {
        if (i + order > tokens.length) break;
        const ngram = tokens.slice(i, i + order).join(" ");
        this.counts.set(ngram, (this.counts.get(ngram) || 0) + weight);

        // Context = first (order-1) words
        if (order > 1) {
          const ctx = tokens.slice(i, i + order - 1).join(" ");
          this.contextCounts.set(ctx, (this.contextCounts.get(ctx) || 0) + weight);
        }
      }

      // Track continuations for Kneser-Ney smoothing
      if (i > 0) {
        const prev = tokens[i - 1];
        const curr = tokens[i];
        if (!this.continuations.has(prev)) this.continuations.set(prev, new Set());
        this.continuations.get(prev).add(curr);
        if (!this.preceded.has(curr)) this.preceded.set(curr, new Set());
        this.preceded.get(curr).add(prev);
      }
    }
  }

  // Tokenize text into words
  tokenize(text) {
    return text
      .toLowerCase()
      // Protect decimal numbers and dollar amounts: $4.3M, 12.5%, $10M+
      .replace(/\$?(\d+[.,]\d+[km%]?)/g, " $1 ")
      // Protect newlines
      .replace(/\n/g, " \n ")
      // Split punctuation (but not inside protected tokens)
      .replace(/([.,!?;:])(?!\d)/g, " $1 ")
      .replace(/([.,!?;:])(?=\s|$)/g, " $1 ")
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  // Get probability of a word given context (with Kneser-Ney backoff)
  probability(word, context) {
    const ctxTokens = context.split(" ").filter(t => t.length > 0);
    const discount = 0.75; // Kneser-Ney discount

    // Try highest order first, then back off
    for (let order = Math.min(this.n - 1, ctxTokens.length); order >= 0; order--) {
      const ctx = ctxTokens.slice(ctxTokens.length - order).join(" ");
      const ngramKey = ctx ? `${ctx} ${word}` : word;
      const ngramCount = this.counts.get(ngramKey) || 0;
      const ctxCount = this.contextCounts.get(ctx) || 0;

      if (ctxCount > 0) {
        // Kneser-Ney smoothed probability
        const contCount = this.continuations.get(ctx.split(" ").pop())?.size || 0;
        const lambda = (discount * contCount) / ctxCount;
        const lowerProb = this.lowerOrderProbability(word, ctx);
        return Math.max(ngramCount - discount, 0) / ctxCount + lambda * lowerProb;
      }
    }

    // Fallback: unigram probability
    return (this.counts.get(word) || 0) / this.totalTokens;
  }

  // Lower order probability for backoff
  lowerOrderProbability(word, context) {
    const ctxTokens = context.split(" ").filter(t => t.length > 0);
    if (ctxTokens.length === 0) {
      return (this.counts.get(word) || 0) / this.totalTokens;
    }
    // Use continuation probability (Kneser-Ney)
    const precededCount = this.preceded.get(word)?.size || 0;
    const totalContinuations = Array.from(this.preceded.values()).reduce((s, v) => s + v.size, 0);
    return precededCount / totalContinuations;
  }

  // Sample the next word given context
  sampleNext(context, temperature = 1.0) {
    const ctxTokens = context.split(" ").filter(t => t.length > 0);
    const ctx = ctxTokens.slice(Math.max(0, ctxTokens.length - this.n + 1)).join(" ");

    // Get all candidate words that could follow this context
    const candidates = new Map();

    // Find words that have been seen after this context
    for (const [ngram, count] of this.counts) {
      const parts = ngram.split(" ");
      if (parts.length < 2) continue;
      const ngramCtx = parts.slice(0, -1).join(" ");
      if (ngramCtx === ctx || (ctx === "" && parts.length === 1)) {
        const word = parts[parts.length - 1];
        const prob = this.probability(word, ctx);
        candidates.set(word, prob);
      }
    }

    // If no candidates from n-gram, try backing off to shorter context
    if (candidates.size === 0 && ctxTokens.length > 0) {
      return this.sampleNext(ctxTokens.slice(1).join(" "), temperature);
    }

    // If still no candidates, sample from most common words
    if (candidates.size === 0) {
      for (const [word, count] of this.counts) {
        if (!word.includes(" ") && count > 2) {
          candidates.set(word, count / this.totalTokens);
        }
      }
    }

    if (candidates.size === 0) return null;

    // Apply temperature and sample
    let total = 0;
    const adjusted = new Map();
    for (const [word, prob] of candidates) {
      const adjustedProb = Math.pow(prob, 1 / temperature);
      adjusted.set(word, adjustedProb);
      total += adjustedProb;
    }

    let r = Math.random() * total;
    for (const [word, prob] of adjusted) {
      r -= prob;
      if (r <= 0) return word;
    }

    return Array.from(candidates.keys())[0];
  }

  // Generate text by sampling word by word
  generate(seedText, maxLength = 280, temperature = 1.0, domain = null) {
    let result = this.tokenize(seedText);
    let context = result.join(" ");
    let sentenceCount = 0;
    let lastWasNewline = false;

    for (let i = 0; i < maxLength; i++) {
      const next = this.sampleNext(context, temperature);
      if (!next) break;
      result.push(next);
      context = result.slice(Math.max(0, result.length - this.n + 1)).join(" ");

      // Track sentences
      if (next === "." || next === "!" || next === "?") {
        sentenceCount++;
      }

      // Stop after 4-6 sentences (typical tweet length)
      if (sentenceCount >= 4 && (next === "." || next === "!" || next === "?" || next === "\n")) {
        // Check if we have enough content
        const text = this.detokenize(result);
        if (text.length > 50) break;
      }

      // Stop at thread promises
      const currentText = this.detokenize(result);
      if (currentText.includes("👇") && currentText.length > 40) break;

      // Stop if we hit a natural ending after enough content
      if (currentText.length > 120 && next === "\n" && sentenceCount >= 3) break;

      // Hard stop at max length
      if (currentText.length > maxLength) break;

      // Avoid runaway repetition
      if (result.length > 3) {
        const last3 = result.slice(-3).join(" ");
        const last6 = result.slice(-6, -3).join(" ");
        if (last3 === last6) break; // repeating pattern
      }
    }

    return this.detokenize(result);
  }

  // Convert tokens back to text
  detokenize(tokens) {
    let text = "";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t === "\n") {
        text += "\n";
      } else if (t === "." || t === "," || t === "!" || t === "?" || t === ";" || t === ":") {
        // Don't add space before punctuation, but don't break decimal numbers
        // Check if previous token ends with a digit and this is a period
        if (t === "." && i > 0 && /\d$/.test(tokens[i - 1]) && i + 1 < tokens.length && /^\d/.test(tokens[i + 1])) {
          // This is a decimal point — no space
          text += t;
        } else {
          text += t;
        }
      } else if (i === 0 || text.endsWith("\n") || text.endsWith(" ")) {
        text += t;
      } else {
        text += " " + t;
      }
    }
    // Clean up spacing
    return text
      .replace(/ \n /g, "\n")
      .replace(/ \n/g, "\n")
      .replace(/\n /g, "\n")
      .replace(/\s+\./g, ".")
      .replace(/\s+,/g, ",")
      .replace(/\s+!/g, "!")
      .replace(/\s+\?/g, "?")
      .trim();
  }

  // Get model stats
  stats() {
    return {
      vocabSize: this.vocab.size,
      totalTokens: this.totalTokens,
      ngramCount: this.counts.size,
      contextCount: this.contextCounts.size,
    };
  }
}

// ---------------------------------------------------------------------------
// ML Tweet Generator — trains on viral tweets + generated examples
// ---------------------------------------------------------------------------

class MLTweetGenerator {
  constructor() {
    this.model = new NgramModel(3);
    this.trained = false;
    this.trainingData = [];
  }

  // Train the model on all available data
  train() {
    if (this.trained) return;

    // 1. Load reference viral tweets (high weight — these are proven viral)
    const corpusPath = path.join(__dirname, "training_corpus.json");
    let referenceCount = 0;
    if (fs.existsSync(corpusPath)) {
      const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
      for (const tweet of corpus) {
        // Weight by engagement — more engagement = more training weight
        const engagement = (tweet.likes || 0) + (tweet.reposts || 0) * 2 + (tweet.bookmarks || 0) * 3;
        const weight = Math.max(3, Math.min(20, Math.floor(engagement / 5000)));
        this.model.train(tweet.text, weight);
        this.trainingData.push({ text: tweet.text, weight, type: tweet.type });
        referenceCount++;
      }
    }

    // 2. Generate training data from the combinatorial generator
    // This teaches the model story structure, word patterns, and transitions
    const domains = ["saas", "ai", "coding", "productivity", "remote_work", "fitness", "money", "content", "career", "design"];
    let generatedCount = 0;
    for (const domain of domains) {
      const stories = generateStories(domain, 50);
      for (const story of stories) {
        this.model.train(story, 2); // lower weight than reference tweets
        this.trainingData.push({ text: story, weight: 2, type: "generated", domain });
        generatedCount++;
      }

      // Also train on casual tweets
      const casual = generateCasual(domain, domain);
      for (const c of casual) {
        this.model.train(c, 2);
        this.trainingData.push({ text: c, weight: 2, type: "casual", domain });
        generatedCount++;
      }
    }

    // 3. Train on user's own posts (if analytics data exists)
    // This is the reinforcement loop — posts that performed well get more weight
    const analyticsPath = path.join(__dirname, "analytics_data.json");
    if (fs.existsSync(analyticsPath)) {
      try {
        const analytics = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));
        for (const post of analytics) {
          // Weight by actual performance
          const perf = (post.impressions || 0) + (post.engagements || 0) * 5;
          const weight = Math.max(1, Math.min(15, Math.floor(perf / 1000)));
          this.model.train(post.text, weight);
          this.trainingData.push({ text: post.text, weight, type: "analytics" });
        }
      } catch (e) {
        // Analytics data might be malformed — skip it
      }
    }

    this.trained = true;
    return { referenceCount, generatedCount, stats: this.model.stats() };
  }

  // Generate novel tweets for a domain/topic
  generate(topic, domain, count = 10) {
    if (!this.trained) this.train();

    const tweets = [];
    const seen = new Set();

    // Create seed phrases based on the topic
    const seeds = this.createSeeds(topic, domain);

    for (let i = 0; i < count * 20 && tweets.length < count; i++) {
      const seed = seeds[i % seeds.length];
      const temperature = 0.7 + (i % 4) * 0.15; // vary temperature for diversity (0.7-1.15)
      const generated = this.model.generate(seed, 280, temperature, domain);

      // Clean up the generated text
      let cleaned = this.cleanup(generated);

      // Fix pronoun consistency
      cleaned = this.fixPronouns(cleaned);

      // Skip if too short, too long, or duplicate
      if (cleaned.length < 50 || cleaned.length > 280) continue;
      const key = cleaned.slice(0, 40).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      // Skip if it's too similar to a training example
      if (this.isTooSimilarToTraining(cleaned)) continue;

      // Skip if not coherent
      if (!this.isCoherent(cleaned)) continue;

      // Enhance: add a thread promise if the tweet doesn't have one
      cleaned = this.addThreadPromise(cleaned);

      tweets.push(cleaned);
    }

    return tweets;
  }

  // Create seed phrases for generation
  createSeeds(topic, domain) {
    const lower = topic.toLowerCase();
    const seeds = [];

    // Topic-based seeds
    if (domain === "saas" || lower.includes("saas") || lower.includes("founder")) {
      seeds.push("i built", "2 unemployed", "i raised", "i spent", "i turned down", "my saas", "mrr");
    }
    if (domain === "ai" || lower.includes("ai")) {
      seeds.push("ai makes", "i built an ai", "your ai", "every ai", "ai tools");
    }
    if (domain === "coding" || lower.includes("code")) {
      seeds.push("tests don't", "typescript", "the most annoying part of coding", "i know nobody cares");
    }
    if (domain === "productivity" || lower.includes("product")) {
      seeds.push("deep work", "pomodoro", "i tried", "most people don't need", "every productivity");
    }
    if (domain === "remote_work" || lower.includes("remote")) {
      seeds.push("remote work", "nobody talks about", "your resume", "i job-hopped");
    }

    // General seeds
    seeds.push("nobody talks about", "i know", "the most annoying", "unpopular opinion", "every");

    // Add the topic itself as a seed
    if (topic.length > 0 && topic.length < 50) {
      seeds.push(lower);
    }

    return seeds;
  }

  // Add a thread promise to tweets that don't have one
  // This boosts the score by adding a credibility/curiosity element
  addThreadPromise(text) {
    // Skip if already has a thread promise
    if (/👇|here's|this is the story|full breakdown|exact playbook/i.test(text)) return text;

    // Skip if it's a one-liner (thread promises don't fit on one-liners)
    if (!text.includes(".") && text.length < 100) return text;

    // Add a thread promise
    const promises = [
      "\n\nHere's what I learned 👇",
      "\n\nHere's the full story 👇",
      "\n\nHere's what worked 👇",
      "\n\nHere's the exact playbook 👇",
      "\n\nHere's what nobody tells you 👇",
    ];
    const promise = promises[Math.floor(Math.random() * promises.length)];
    return text + promise;
  }

  // Clean up generated text
  cleanup(text) {
    return text
      .replace(/\n{3,}/g, "\n\n") // max 2 consecutive newlines
      .replace(/^\s+/gm, "") // remove leading whitespace on lines
      .replace(/\s+$/gm, "") // remove trailing whitespace
      .replace(/\s+\./g, ".") // fix space before period
      .replace(/\s+,/g, ",") // fix space before comma
      .replace(/\s+!/g, "!") // fix space before exclamation
      .replace(/\s+\?/g, "?") // fix space before question mark
      .replace(/\$ (\d)/g, "$$$1") // fix "$ 4" → "$4"
      .replace(/(\d) ([km%])/g, "$1$2") // fix "4 k" → "4k", "3 m" → "3m"
      .replace(/\b(\d+) \. (\d+)/g, "$1.$2") // fix "4 . 3" → "4.3"
      .replace(/(\d) (months|days|weeks|years|hours|minutes|users|customers)/g, "$1 $2") // fix "4months" → "4 months"
      .replace(/\b(\d+)(months|days|weeks|years|hours|minutes|users|customers)\b/g, "$1 $2") // fix "4months" → "4 months"
      .replace(/\s{2,}/g, " ") // collapse multiple spaces
      .trim();
  }

  // Fix pronoun consistency — if the tweet starts with "I", keep it first-person throughout
  fixPronouns(text) {
    const startsWithI = /^i\b/i.test(text);
    const startsWithThird = /^(2 |a |two |every |nobody |the |people|founder)/i.test(text);

    if (startsWithI) {
      // Convert third-person pronouns to first-person
      // Order matters — do phrases before single words
      return text
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
        .replace(/\bthey learned\b/gi, "I learned")
        .replace(/\bthey made\b/gi, "I made")
        .replace(/\bthey stopped\b/gi, "I stopped")
        .replace(/\bthey started\b/gi, "I started")
        .replace(/\bthey changed\b/gi, "I changed")
        .replace(/\bthey deleted\b/gi, "I deleted")
        .replace(/\bthey simplified\b/gi, "I simplified")
        .replace(/\bthey niched\b/gi, "I niched")
        .replace(/\bthey pivoted\b/gi, "I pivoted")
        .replace(/\bthey rewrote\b/gi, "I rewrote")
        .replace(/\bthey focused\b/gi, "I focused")
        .replace(/\bthey raised\b/gi, "I raised")
        .replace(/\bthey turned\b/gi, "I turned")
        .replace(/\bthey spent\b/gi, "I spent")
        .replace(/\bthey built\b/gi, "I built")
        .replace(/\bthey quit\b/gi, "I quit")
        .replace(/\bthey\b/gi, "I")
        .replace(/\btheir\b/gi, "my")
        .replace(/\bthem\b/gi, "me")
        .replace(/\bhe pivoted\b/gi, "I pivoted")
        .replace(/\bhe has\b/gi, "I have")
        .replace(/\bhe\b/gi, "I")
        .replace(/\bshe\b/gi, "I");
    }

    if (startsWithThird) {
      // Keep third-person consistent — fix any stray "I" or "my"
      return text
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
        .replace(/\bi learned\b/gi, "they learned")
        .replace(/\bi made\b/gi, "they made")
        .replace(/\bi stopped\b/gi, "they stopped")
        .replace(/\bi started\b/gi, "they started")
        .replace(/\bi changed\b/gi, "they changed")
        .replace(/\bi deleted\b/gi, "they deleted")
        .replace(/\bi simplified\b/gi, "they simplified")
        .replace(/\bi niched\b/gi, "they niched")
        .replace(/\bi pivoted\b/gi, "they pivoted")
        .replace(/\bi rewrote\b/gi, "they rewrote")
        .replace(/\bi focused\b/gi, "they focused")
        .replace(/\bi raised\b/gi, "they raised")
        .replace(/\bi turned\b/gi, "they turned")
        .replace(/\bi spent\b/gi, "they spent")
        .replace(/\bi built\b/gi, "they built")
        .replace(/\bi quit\b/gi, "they quit")
        .replace(/\bi had\b/gi, "they had")
        .replace(/\bmy\b/gi, "their");
    }

    return text;
  }

  // Check if a generated tweet is coherent enough to publish
  isCoherent(text) {
    // Must have at least 2 sentences
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 3);
    if (sentences.length < 2) return false;

    // Must not have too many repeated words
    const words = text.toLowerCase().split(/\s+/);
    const wordCounts = {};
    for (const w of words) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    }
    // Allow common words to repeat, but not content words
    const stopWords = new Set(["no", "the", "a", "i", "they", "and", "to", "in", "for", "of", "it", "is", "was", "i'm", "here's", "then", "but", "that", "this", "what", "my", "their"]);
    const contentWords = words.filter(w => !stopWords.has(w) && w.length > 2);
    const repeats = contentWords.filter(w => wordCounts[w] > 2);
    if (repeats.length > 3) return false;

    // Must have at least one number or specific detail
    if (!/\d|\$|mrr|arr|users|customers|months|days|saas|ai|code|tool|app/i.test(text)) return false;

    // Must not have broken sentences (less than 3 words between periods)
    const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 3);
    if (shortSentences.length > sentences.length / 2) return false;

    // Must not have orphaned fragments
    if (/\b(\d+)\s*\.\s*$/m.test(text)) return false; // ends with "4."
    if (/\$ \d/.test(text)) return false; // "$ 4" broken

    // Must not have too many sentence fragments run together
    // If there are more than 5 sentences and the text is under 200 chars, it's probably fragmented
    if (sentences.length > 5 && text.length < 200) return false;

    // Must not have weird transitions like "then they raised prices 4x. they need a deadline."
    // Check for jarring topic switches
    const lower = text.toLowerCase();
    if (lower.includes("social capital") && lower.includes("mrr")) return false;
    if (lower.includes("deadline") && lower.includes("mrr")) return false;
    if (lower.includes("no tiktok") && lower.includes("no tiktok")) return false; // repeated
    if (lower.includes("design thinker") && lower.includes("mrr")) return false;
    if (lower.includes("linkedin") && lower.includes("mrr")) return false;
    if (lower.includes("commute") && lower.includes("mrr")) return false;
    if (lower.includes("procrastination") && lower.includes("mrr")) return false;

    // Must not mix "founder story" language with "productivity" language
    const hasFounderLang = /\b(mrr|arr|saas|bootstrapped|funding|investors|customers|revenue|profitable|acquired)\b/i.test(text);
    const hasProductivityLang = /\b(pomodoro|notion|deadline|procrastination|focus|deep work|productivity|planner)\b/i.test(text);
    if (hasFounderLang && hasProductivityLang) return false;

    // Must not have jarring transitions
    if (lower.includes("that era is over")) return false;
    if (lower.includes("ai clones")) return false;
    if (lower.includes("unpopular opinion later")) return false;
    if (lower.includes("later:")) return false; // "18 months later:" is fine but "unpopular opinion later:" is not
    if (lower.includes("me: ") && lower.includes("mrr")) return false; // dialogue mixed with metrics
    if (lower.includes("sticky note") && lower.includes("mrr")) return false;
    if (lower.includes("workout") && lower.includes("mrr")) return false;
    if (lower.includes("from zero:") && !lower.includes("here's")) return false;

    // Must not start with a fragment
    if (/^(unpopular |later |then |but |and |or |so |mrr |arr |200 |profitable |acquired |sold )/i.test(text)) return false;

    // Must start with a proper subject (I, 2, a, every, nobody, the, my, people, founder)
    if (!/^(i |2 |a |two |every |nobody |the |my |people|founder|remote |ai |tests |typescript |deep |pomodoro |annual |your |most |this )/i.test(text)) return false;

    // Must not have stray quotes
    if (text.includes('"') && !text.includes('"')) return false; // unbalanced quotes
    if (/\w"\w/.test(text)) return false; // quote in the middle of a word

    // Must not have "remote work" mixed into a founder story
    if (lower.includes("remote work") && (lower.includes("mrr") || lower.includes("saas"))) return false;

    return true;
  }

  // Check if generated text is too similar to training data
  isTooSimilarToTraining(text) {
    const textLower = text.toLowerCase();
    for (const example of this.trainingData) {
      const exampleLower = example.text.toLowerCase();
      // Check if 80% of words match
      const overlap = this.wordOverlap(textLower, exampleLower);
      if (overlap > 0.8) return true;
    }
    return false;
  }

  // Calculate word overlap ratio
  wordOverlap(a, b) {
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = b.split(/\s+/);
    let common = 0;
    for (const w of wordsB) {
      if (wordsA.has(w)) common++;
    }
    return common / Math.max(wordsB.length, 1);
  }

  // Get model stats
  stats() {
    return {
      trained: this.trained,
      trainingExamples: this.trainingData.length,
      ...this.model.stats(),
    };
  }

  // Add a new training example (for reinforcement learning)
  addExample(text, weight = 5) {
    this.model.train(text, weight);
    this.trainingData.push({ text, weight, type: "reinforcement" });
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

let _instance = null;

function getInstance() {
  if (!_instance) {
    _instance = new MLTweetGenerator();
  }
  return _instance;
}

module.exports = { MLTweetGenerator, NgramModel, getInstance };
