/*
 * Marketing Agent — scrapes a website and generates a full marketing strategy.
 *
 * You type a URL → it:
 *   1. Scrapes the website (pure Node, no dependencies)
 *   2. Extracts: product name, tagline, features, pricing, target audience
 *   3. Analyzes: outcomes the product provides, problems it fixes
 *   4. Identifies: target audience, best channels (X, Reddit, etc.)
 *   5. Generates: post ideas for X and Reddit tailored to the product
 *
 * Zero dependencies. Uses Node's built-in https/http modules.
 */

"use strict";

const https = require("https");
const http = require("http");
const { sprint } = require("./sprinter");
const { mapTopicToDomain } = require("./angleFinder");

// ---------------------------------------------------------------------------
// Website scraper — fetches HTML and extracts text content
// ---------------------------------------------------------------------------

function fetchPage(url, opts = {}) {
  return new Promise((resolve, reject) => {
    if (!url.startsWith("http")) url = "https://" + url;

    const mod = url.startsWith("https") ? https : http;
    const maxRedirects = opts.maxRedirects || 5;

    const req = mod.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AgentX-Marketing-Bot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects > 0) {
          const newUrl = res.headers.location.startsWith("http")
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return fetchPage(newUrl, { ...opts, maxRedirects: maxRedirects - 1 }).then(resolve).catch(reject);
        }
        return reject(new Error("Too many redirects"));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => resolve(body));
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timeout")); });
  });
}

// ---------------------------------------------------------------------------
// HTML text extraction — pull readable content from HTML
// ---------------------------------------------------------------------------

function extractTextFromHTML(html) {
  // Extract structured data BEFORE removing scripts
  const structured = extractStructuredData(html);

  // Remove scripts, styles, and other non-content elements
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Extract meta tags before removing them
  const meta = {};
  const titleMatch = text.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) meta.title = decodeEntities(titleMatch[1].trim());

  const descMatch = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch) meta.description = decodeEntities(descMatch[1].trim());

  const ogTitleMatch = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitleMatch) meta.ogTitle = decodeEntities(ogTitleMatch[1].trim());

  const ogSiteNameMatch = text.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogSiteNameMatch) meta.siteName = decodeEntities(ogSiteNameMatch[1].trim());

  // Extract headings (h1, h2, h3) — these are the key marketing messages
  const headings = [];
  const headingMatches = text.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gis) || [];
  for (const h of headingMatches) {
    const clean = h.replace(/<[^>]+>/g, "").trim();
    if (clean && clean.length > 3 && clean.length < 200) headings.push(clean);
  }

  // Extract all text content
  text = text
    .replace(/<\/?(p|div|span|br|li|ul|ol|section|article|header|footer|nav|main|aside)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  text = decodeEntities(text);

  // Split into lines and filter
  let lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 5 && l.length < 500);

  // Merge structured data into the results
  if (structured.jsonLd) {
    // Add JSON-LD data as additional lines
    if (structured.jsonLd.name && !meta.title) meta.title = structured.jsonLd.name;
    if (structured.jsonLd.description && !meta.description) meta.description = structured.jsonLd.description;
    if (structured.jsonLd.headlines) {
      for (const h of structured.jsonLd.headlines) {
        if (!headings.includes(h)) headings.push(h);
      }
    }
  }

  // If we got very little text from the raw HTML, flag it for headless rendering
  const isThinContent = lines.length < 10 && headings.length < 3 && !structured.jsonLd;

  return {
    meta,
    headings,
    lines,
    rawText: lines.join("\n"),
    structured,
    isThinContent,
  };
}

// ---------------------------------------------------------------------------
// Extract structured data from HTML — JSON-LD, Next.js __NEXT_DATA__, meta tags
// ---------------------------------------------------------------------------

function extractStructuredData(html) {
  const result = { jsonLd: null, nextData: null, metaTags: {} };

  // 1. JSON-LD — <script type="application/ld+json">
  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const match of jsonLdMatches) {
    try {
      const jsonStr = match.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
      const data = JSON.parse(jsonStr);
      // Could be a single object or array
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "SoftwareApplication" || item["@type"] === "Product" || item["@type"] === "WebSite" || item["@type"] === "Organization") {
          result.jsonLd = {
            name: item.name,
            description: item.description,
            type: item["@type"],
            headlines: item.headline ? [item.headline] : [],
            features: item.featureList || [],
            audience: item.audience?.audienceType || null,
            pricing: item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]).map(o => o.price ? `$${o.price}` : null).filter(Boolean) : null,
            url: item.url,
          };
        }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // 2. Next.js __NEXT_DATA__ — <script id="__NEXT_DATA__" type="application/json">
  const nextDataMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      const jsonStr = nextDataMatch[1].trim();
      const data = JSON.parse(jsonStr);
      result.nextData = data;

      // Try to extract useful content from the page props
      const props = data.props?.pageProps;
      if (props) {
        // Look for product/app data in common Next.js patterns
        const productData = props.product || props.app || props.data || props.page || props.content;
        if (productData && typeof productData === "object") {
          if (!result.jsonLd) {
            result.jsonLd = {
              name: productData.name || productData.title || productData.productName,
              description: productData.description || productData.tagline || productData.subtitle,
              type: "NextData",
              headlines: [],
              features: productData.features || productData.benefits || [],
              audience: null,
              pricing: null,
              url: null,
            };
          }
        }
        // Extract any text-like fields
        const textFields = extractTextFields(props);
        if (textFields.length > 0 && !result.jsonLd) {
          result.jsonLd = {
            name: textFields.find(f => f.key === "name" || f.key === "title")?.value,
            description: textFields.find(f => f.key === "description" || f.key === "tagline")?.value,
            type: "NextData",
            headlines: textFields.filter(f => f.value?.length > 10 && f.value?.length < 200).map(f => f.value).slice(0, 10),
            features: [],
            audience: null,
            pricing: null,
            url: null,
          };
        }
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // 3. Additional meta tags
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImageMatch) result.metaTags.ogImage = ogImageMatch[1];

  const twitterCardMatch = html.match(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i);
  if (twitterCardMatch) result.metaTags.twitterCard = twitterCardMatch[1];

  return result;
}

// Recursively extract text-like fields from an object (for Next.js data)
function extractTextFields(obj, depth = 0) {
  if (depth > 3 || !obj || typeof obj !== "object") return [];
  const fields = [];
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.length > 5 && value.length < 500) {
      fields.push({ key, value });
    } else if (typeof value === "object" && depth < 3) {
      fields.push(...extractTextFields(value, depth + 1));
    }
  }
  return fields;
}

// ---------------------------------------------------------------------------
// Headless browser fallback — uses Puppeteer for JS-heavy sites
// ---------------------------------------------------------------------------

async function fetchPageWithBrowser(url) {
  let browser = null;
  try {
    const puppeteer = require("puppeteer");
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      timeout: 20000,
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (compatible; AgentX-Marketing-Bot/1.0)");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Wait a bit for any final JS rendering
    await new Promise(r => setTimeout(r, 2000));

    // Get the fully rendered HTML
    const html = await page.content();
    return html;
  } catch (e) {
    throw new Error(`Headless browser failed: ${e.message}`);
  } finally {
    if (browser) {
      try { await browser.close(); } catch (e) { /* ignore */ }
    }
  }
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#\d+;/g, "");
}

// ---------------------------------------------------------------------------
// Product analysis — extract product info from scraped content
// ---------------------------------------------------------------------------

function analyzeProduct(content, url) {
  const { meta, headings, lines, rawText } = content;
  const text = rawText.toLowerCase();

  // 1. Product name
  let productName = meta.siteName || meta.ogTitle || meta.title || "";
  // Clean up common suffixes
  productName = productName.replace(/\s*[-|–—]\s*.*/i, "").replace(/\s*home\s*$/i, "").trim();
  if (!productName) {
    // Try to extract from URL
    const urlMatch = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/);
    if (urlMatch) productName = urlMatch[1].split(".")[0];
  }

  // 2. Tagline / one-liner
  let tagline = meta.description || "";
  if (!tagline && headings.length > 0) tagline = headings[0];
  if (!tagline && lines.length > 0) tagline = lines.find(l => l.length > 20 && l.length < 120) || lines[0];

  // 3. Features / benefits
  const features = [];
  for (const h of headings) {
    if (h.length > 5 && h.length < 80 && !features.includes(h)) {
      features.push(h);
    }
  }
  // Also look for bullet-point-like lines
  for (const line of lines) {
    if (line.length > 10 && line.length < 100 && /^(•|\*|-|✓|→)/.test(line)) {
      const clean = line.replace(/^[•\*\-✓→\s]+/, "").trim();
      if (clean && !features.includes(clean)) features.push(clean);
    }
  }

  // 4. Pricing
  let pricing = null;
  const priceMatch = rawText.match(/\$[\d,.]+(?:\/mo|\/month|\/yr|\/year)?/g);
  if (priceMatch && priceMatch.length > 0) {
    pricing = [...new Set(priceMatch)].slice(0, 5);
  }
  const freeMatch = /\bfree\b/i.test(text);
  if (freeMatch && !pricing) pricing = ["Free"];

  // 5. Keywords / topics
  const keywords = extractKeywords(rawText);

  // 6. CTA buttons
  const ctas = [];
  const ctaMatches = rawText.match(/\b(get started|sign up|try free|start free|book a demo|request demo|join now|create account|try now|start now|get .+ free)\b/gi) || [];
  for (const cta of ctaMatches) {
    if (!ctas.includes(cta.toLowerCase())) ctas.push(cta.toLowerCase());
  }

  return {
    productName,
    tagline,
    features: features.slice(0, 10),
    pricing,
    keywords,
    ctas,
    url,
  };
}

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const keywords = [];

  // SaaS / product keywords
  const productWords = ["saas", "platform", "tool", "dashboard", "analytics", "automation", "api", "integration", "workflow", "ai", "ml", "machine learning", "crm", "erp", "project management", "collaboration", "chatbot", "no-code", "low-code", "open source", "developer", "startup", "founder", "indie", "bootstrap"];
  for (const w of productWords) {
    if (lower.includes(w)) keywords.push(w);
  }

  // Industry keywords
  const industryWords = ["marketing", "sales", "finance", "hr", "design", "engineering", "content", "social media", "email", "seo", "video", "podcast", "newsletter", "ecommerce", "fintech", "edtech", "healthtech", "gaming", "crypto", "real estate"];
  for (const w of industryWords) {
    if (lower.includes(w)) keywords.push(w);
  }

  // Problem keywords
  const problemWords = ["save time", "faster", "efficient", "automate", "simplify", "streamline", "reduce", "eliminate", "fix", "solve", "problem", "challenge", "struggle", "pain point", "frustrating", "manual", "tedious", "repetitive", "overwhelming"];
  for (const w of problemWords) {
    if (lower.includes(w)) keywords.push(w);
  }

  return [...new Set(keywords)];
}

// ---------------------------------------------------------------------------
// Marketing strategy — outcomes, problems, audience, channels, post ideas
// ---------------------------------------------------------------------------

function generateStrategy(product) {
  const { productName, tagline, features, pricing, keywords, url } = product;

  // 1. OUTCOMES — what does the product DO for the user?
  // Turn features into user-facing outcomes, not just feature names
  const outcomes = [];
  for (const f of features.slice(0, 8)) {
    const outcome = featureToOutcome(f, keywords);
    if (outcome && !outcomes.includes(outcome)) outcomes.push(outcome);
  }
  if (outcomes.length === 0 && tagline) {
    outcomes.push(tagline);
  }

  // 2. PROBLEMS — what problem does it fix?
  const problems = [];
  const problemMap = {
    "save time": "Manual, repetitive work that eats hours every week",
    "faster": "Slow, bottlenecked workflows that delay everything",
    "automate": "Tasks that should be automated but are done manually",
    "simplify": "Overcomplicated tools that take weeks to learn",
    "streamline": "Disconnected tools that don't talk to each other",
    "reduce": "Wasted spend on tools/processes that don't work",
    "eliminate": "Friction points that kill productivity",
    "fix": "Broken workflows that nobody has time to fix",
    "solve": "Problems that have been ignored because they're 'not urgent'",
    "ai": "Work that AI can do in seconds but humans do manually",
    "analytics": "Flying blind without data — making decisions on gut feel",
    "dashboard": "Data scattered across 5 tools with no single source of truth",
    "workflow": "Chaos — no system, no process, everything ad-hoc",
    "integration": "Siloed tools that require manual copy-paste between them",
    "collaboration": "Teams working in silos, nobody knows what anyone else is doing",
    "no-code": "Needing a developer for every small change",
    "payments": "Complex payment infrastructure that takes months to build",
    "billing": "Inflexible billing systems that can't handle your pricing model",
    "email": "Email workflows that should be automated but aren't",
    "video": "Hours wasted on video editing that could be automated",
    "content": "Content creation that takes too much time",
    "seo": "Guessing at SEO instead of using data",
  };
  for (const kw of keywords) {
    if (problemMap[kw]) problems.push(problemMap[kw]);
  }
  // Add generic problems if we didn't find enough
  if (problems.length < 3) {
    problems.push("Wasting time on tasks that should be automated");
    problems.push("Using 5 different tools when 1 would do");
  }

  // 3. AUDIENCE — who is this for?
  const audience = [];
  const audienceMap = {
    "saas": "SaaS founders and indie hackers",
    "startup": "Early-stage startup founders",
    "founder": "Bootstrapped founders building solo",
    "indie": "Indie hackers and solo builders",
    "developer": "Developers and engineering teams",
    "marketing": "Marketing teams and growth professionals",
    "sales": "Sales teams and revenue leaders",
    "finance": "Finance teams and CFOs",
    "hr": "HR teams and people ops",
    "design": "Designers and creative teams",
    "engineering": "Engineering teams and CTOs",
    "content": "Content creators and marketers",
    "social media": "Social media managers",
    "email": "Email marketers",
    "seo": "SEO professionals",
    "video": "Video creators and YouTubers",
    "podcast": "Podcasters",
    "newsletter": "Newsletter writers and creators",
    "ecommerce": "E-commerce store owners",
    "fintech": "Fintech professionals",
    "edtech": "Educators and EdTech builders",
    "no-code": "No-code builders and makers",
    "ai": "AI power users and early adopters",
    "api": "Developers building integrations",
    "payments": "Businesses that need to accept payments",
    "billing": "SaaS companies with complex billing",
  };
  for (const kw of keywords) {
    if (audienceMap[kw]) audience.push(audienceMap[kw]);
  }
  if (audience.length === 0) audience.push("Professionals looking to save time and work more efficiently");
  const uniqueAudience = [...new Set(audience)].slice(0, 5);

  // 4. CHANNELS — where should you market this?
  const channels = [];

  channels.push({
    channel: "X (Twitter)",
    why: "Best for building in public, sharing insights, and reaching founders/creators",
    postTypes: recommendXPostTypes(keywords, product),
    frequency: "3-5 posts per day, mix of insights + product",
  });

  channels.push({
    channel: "Reddit",
    why: "Best for honest feedback, niche communities, and organic discovery",
    postTypes: recommendRedditPostTypes(keywords, product),
    frequency: "1-2 posts per week in relevant subreddits",
  });

  if (keywords.includes("developer") || keywords.includes("api") || keywords.includes("open source")) {
    channels.push({
      channel: "Hacker News",
      why: "Developers hang out here. A single front-page post can drive 10k+ visits",
      postTypes: ["Show HN: [product] — [what it does]", "Technical deep-dive on how you built it"],
      frequency: "Once at launch, then when you ship something notable",
    });
  }
  if (keywords.includes("design") || keywords.includes("ui") || keywords.includes("ux")) {
    channels.push({
      channel: "Dribbble / Product Hunt",
      why: "Design community. Product Hunt launch can drive 5k+ signups",
      postTypes: ["Product Hunt launch", "Design case studies", "Before/after UI shots"],
      frequency: "Product Hunt: once at launch. Dribbble: weekly",
    });
  }
  if (keywords.includes("content") || keywords.includes("newsletter") || keywords.includes("social media") || keywords.includes("marketing")) {
    channels.push({
      channel: "LinkedIn",
      why: "B2B audience. Good for thought leadership and reaching decision-makers",
      postTypes: ["Case studies", "Industry insights", "How-to guides"],
      frequency: "3-4 posts per week",
    });
  }
  if (keywords.includes("video") || keywords.includes("youtube")) {
    channels.push({
      channel: "YouTube",
      why: "Video content ranks on Google and builds deep trust",
      postTypes: ["Tutorial videos", "Behind-the-scenes", "Product demos"],
      frequency: "1-2 videos per week",
    });
  }

  // 5. POST IDEAS — specific posts for X and Reddit
  const postIdeas = generatePostIdeas(product, outcomes, problems, uniqueAudience);

  return {
    product: {
      name: productName,
      tagline,
      url,
      pricing: pricing || "Not found",
      features: features.slice(0, 5),
    },
    outcomes: outcomes.slice(0, 5),
    problems: [...new Set(problems)].slice(0, 5),
    audience: uniqueAudience,
    channels,
    postIdeas,
  };
}

function featureToOutcome(feature, keywords) {
  const lower = feature.toLowerCase();
  // Turn "Real-time analytics dashboard" → "See your data in real-time"
  if (lower.includes("analytics") || lower.includes("dashboard")) return "See your data in real-time, make decisions faster";
  if (lower.includes("automat")) return "Automate repetitive work and get hours back every week";
  if (lower.includes("ai")) return "Let AI handle the busywork so you can focus on what matters";
  if (lower.includes("collab")) return "Keep your team aligned without 5 different tools";
  if (lower.includes("integrat")) return "Connect your tools so data flows automatically";
  if (lower.includes("fast") || lower.includes("speed")) return "Get things done in minutes, not hours";
  if (lower.includes("simple") || lower.includes("easy")) return "Skip the learning curve — it just works";
  if (lower.includes("save")) return "Save time on tasks that shouldn't need your attention";
  if (lower.includes("track") || lower.includes("monitor")) return "Track everything in one place, stop switching tabs";
  if (lower.includes("manage")) return "Manage your work without the chaos";
  // Default: just return the feature as-is
  return feature.length > 100 ? null : feature;
}

function recommendXPostTypes(keywords, product) {
  const types = [];

  if (keywords.includes("saas") || keywords.includes("startup") || keywords.includes("founder")) {
    types.push("Build in public: share MRR, user count, and lessons learned");
    types.push("Contrarian takes on your industry's conventional wisdom");
    types.push("Thread: 'I built [product] because [problem]. Here's what I learned.'");
  }
  if (keywords.includes("developer") || keywords.includes("api")) {
    types.push("Technical tips and code snippets related to your product");
    types.push("Show HN-style posts: 'Here's how I solved [hard problem]'");
  }
  if (keywords.includes("ai")) {
    types.push("AI use cases: 'I used AI to do X. Here's the workflow.'");
    types.push("Contrarian AI takes: 'AI won't replace X. Here's why.'");
  }
  if (keywords.includes("marketing") || keywords.includes("content")) {
    types.push("Data-driven threads: 'I analyzed 100 [X]. Here's what I found.'");
    types.push("How-to threads: 'How to [achieve outcome] in [timeframe]'");
  }

  // Always add these
  types.push("Story posts: 'I tried [thing]. Here's what happened.'");
  types.push("Specific tips: 'Here's the [tool/method] that saved me [number] hours'");

  return [...new Set(types)].slice(0, 5);
}

function recommendRedditPostTypes(keywords, product) {
  const types = [];

  if (keywords.includes("saas") || keywords.includes("startup")) {
    types.push("r/SaaS, r/Entrepreneur, r/startups: 'How I built [product] — honest post-mortem'");
    types.push("r/IndieHackers: 'Month X of building [product] — here's my revenue and lessons'");
  }
  if (keywords.includes("developer") || keywords.includes("api")) {
    types.push("r/programming, r/webdev: Technical deep-dive on how you built it");
    types.push("r/SideProject: 'Show my project: [product] — [what it does]'");
  }
  if (keywords.includes("ai")) {
    types.push("r/artificial, r/ChatGPT: 'I built an AI tool that does X. Here's what I learned'");
  }
  if (keywords.includes("marketing")) {
    types.push("r/marketing, r/digital_marketing: 'I tested [strategy] for 30 days. Here are the results'");
  }
  if (keywords.includes("design")) {
    types.push("r/design, r/UI_Design: 'Redesigned [thing]. Before/after + what I learned'");
  }

  // Always add
  types.push("r/smallbusiness: 'What tool do you wish existed?' (then mention yours naturally)");
  types.push("Honest comparison posts: '[product] vs [competitor] — here's my honest take'");

  return [...new Set(types)].slice(0, 5);
}

function generatePostIdeas(product, outcomes, problems, audience) {
  const ideas = [];
  const name = product.productName;

  // X post ideas
  ideas.push({
    platform: "X",
    type: "story",
    idea: `I built ${name} because ${problems[0] || "I was wasting time on manual work"}. Here's what I learned.`,
  });
  ideas.push({
    platform: "X",
    type: "contrarian",
    idea: `Most ${audience[0] || "people"} use 5 tools when 1 would do. ${name} replaces all of them.`,
  });
  if (outcomes[0]) {
    ideas.push({
      platform: "X",
      type: "data",
      idea: `I tested ${name} for 30 days. ${outcomes[0]}. Here's the data.`,
    });
  }
  ideas.push({
    platform: "X",
    type: "build in public",
    idea: `Building ${name} in public. Here's what worked, what didn't, and what I'd do differently.`,
  });

  // Reddit post ideas
  ideas.push({
    platform: "Reddit",
    type: "show and tell",
    idea: `I built ${name} — ${product.tagline || "a tool that fixes a problem I had"}. Here's the story.`,
  });
  ideas.push({
    platform: "Reddit",
    type: "problem-solution",
    idea: `How do you deal with ${problems[0] || "wasting time on manual work"}? I got so frustrated I built a tool for it.`,
  });
  if (outcomes[0]) {
    ideas.push({
      platform: "Reddit",
      type: "case study",
      idea: `I used ${name} for 30 days. ${outcomes[0]}. Here's my honest review.`,
    });
  }

  return ideas;
}

// ---------------------------------------------------------------------------
// Main: analyze a website and generate a marketing strategy
// ---------------------------------------------------------------------------

/**
 * Analyze a website and generate a full marketing strategy.
 *
 * @param {string} url - The website URL
 * @returns {Promise<Object>} The marketing strategy
 */
async function analyze(url, opts = {}) {
  if (!url) return { error: "No URL provided" };
  const { useBrowser = "auto" } = opts; // "auto" | "always" | "never"

  try {
    // Normalize URL
    if (!url.startsWith("http")) url = "https://" + url;

    // 1. Fetch the page (raw HTML)
    let html = await fetchPage(url);

    // 2. Extract text content + structured data
    let content = extractTextFromHTML(html);

    // 3. If the raw HTML is thin (JS-heavy site), fall back to headless browser
    //    "auto" = use browser only when needed
    //    "always" = always use browser
    //    "never" = never use browser (raw HTML only)
    let usedBrowser = false;
    if (useBrowser === "always" || (useBrowser === "auto" && content.isThinContent)) {
      try {
        const browserHtml = await fetchPageWithBrowser(url);
        const browserContent = extractTextFromHTML(browserHtml);
        // Only use browser content if it has MORE data than the raw HTML
        if (browserContent.lines.length > content.lines.length || browserContent.headings.length > content.headings.length) {
          content = browserContent;
          usedBrowser = true;
        }
      } catch (e) {
        // Browser failed — continue with raw HTML content
        // This is a soft failure, not a hard error
      }
    }

    // 4. Analyze the product
    const product = analyzeProduct(content, url);

    // 5. Generate the marketing strategy
    const strategy = generateStrategy(product);
    strategy.usedBrowser = usedBrowser;
    strategy.contentSource = usedBrowser ? "headless-browser" : (content.structured?.jsonLd ? "structured-data" : "raw-html");

    return strategy;
  } catch (e) {
    return { error: e.message, url };
  }
}

// ---------------------------------------------------------------------------
// Format the strategy for display
// ---------------------------------------------------------------------------

function formatStrategy(s) {
  if (s.error) return `Error analyzing ${s.url || "website"}: ${s.error}`;

  const lines = [];
  lines.push("=== MARKETING AGENT ===");
  if (s.contentSource) {
    const sourceLabel = s.contentSource === "headless-browser" ? "headless browser (JS-rendered)" : s.contentSource === "structured-data" ? "structured data (JSON-LD/Next.js)" : "raw HTML";
    lines.push(`Content source: ${sourceLabel}`);
  }
  lines.push();
  lines.push(`PRODUCT: ${s.product.name}`);
  lines.push(`TAGLINE: ${s.product.tagline || "Not found"}`);
  lines.push(`URL: ${s.product.url}`);
  lines.push(`PRICING: ${Array.isArray(s.product.pricing) ? s.product.pricing.join(", ") : s.product.pricing}`);
  lines.push();

  lines.push("FEATURES DETECTED:");
  for (const f of s.product.features) lines.push(`  • ${f}`);
  lines.push();

  lines.push("OUTCOMES (what your product DOES for users):");
  for (const o of s.outcomes) lines.push(`  → ${o}`);
  lines.push();

  lines.push("PROBLEMS IT FIXES:");
  for (const p of s.problems) lines.push(`  ✗ ${p}`);
  lines.push();

  lines.push("TARGET AUDIENCE:");
  for (const a of s.audience) lines.push(`  👤 ${a}`);
  lines.push();

  lines.push("BEST CHANNELS:");
  for (const c of s.channels) {
    lines.push(`  📢 ${c.channel}`);
    lines.push(`     Why: ${c.why}`);
    lines.push(`     Post types:`);
    for (const pt of c.postTypes) lines.push(`       • ${pt}`);
    lines.push(`     Frequency: ${c.frequency}`);
    lines.push();
  }

  lines.push("POST IDEAS:");
  for (const idea of s.postIdeas) {
    lines.push(`  [${idea.platform}] [${idea.type}] ${idea.idea}`);
  }
  lines.push();

  // Generate actual posts using the sprint engine
  // Use the product name + outcome as the sprint topic
  if (s.outcomes[0] && s.product.name) {
    lines.push("=== GENERATED X POSTS ===");
    lines.push();
    // Generate posts about the product's outcome
    const sprintTopic = `${s.product.name} ${s.outcomes[0]}`;
    const sprintResult = sprint(sprintTopic);
    for (const p of sprintResult.posts.slice(0, 3)) {
      lines.push(`[${p.grade}] Score: ${p.score}`);
      lines.push("```");
      lines.push(p.post);
      lines.push("```");
      lines.push();
    }
  }

  return lines.join("\n");
}

module.exports = {
  analyze,
  formatStrategy,
  fetchPage,
  extractTextFromHTML,
  analyzeProduct,
  generateStrategy,
};
