/*
 * Audience database — the communities that actually live on X.
 *
 * Researched from real X communities, indie hacker culture, build-in-public
 * movement, creator economy, and niche professional audiences.
 *
 * Each audience has:
 *   - id: unique identifier
 *   - name: display name
 *   - aliases: other words that map to this audience
 *   - vocabulary: words/phrases this community actually uses
 *   - painPoints: what they struggle with
 *   - goals: what they want
 *   - metrics: what they measure (MRR, views, subscribers, etc.)
 *   - tools: tools they use
 *   - hookStyle: how posts aimed at them should sound
 *   - bodyStyle: how the body should be structured
 *   - closers: community-appropriate call-to-actions
 *   - contentTypes: what kinds of posts resonate
 *
 * This is what makes AgentX understand 1000+ audience variations.
 */

"use strict";

// ---------------------------------------------------------------------------
// Core audiences — the major X communities
// Each one has distinct language, pain points, and content conventions
// ---------------------------------------------------------------------------
const AUDIENCES = {
  // === BUILD / TECH ===
  founders: {
    id: "founders",
    name: "founders",
    aliases: ["founder", "startup founder", "ceo", "startup", "entrepreneur", "startup guy", "startup girl"],
    vocabulary: ["ship", "MRR", "ARR", "users", "churn", "PMF", "product-market fit", "bootstrapped", "raise", "runway", "burn", "traction", "launch", "iterate", "pivot", "scale", "default alive", "ramen profitable", "indie hacker", "solo founder"],
    painPoints: ["finding users", "building something nobody wants", "running out of runway", "high churn", "no PMF", "burnout", "imposter syndrome", "pricing too low", "not shipping fast enough", "doing everything alone"],
    goals: ["PMF", "$10K MRR", "100 paying users", "freedom", "default alive", "exit", "build something people love"],
    metrics: ["MRR", "ARR", "users", "churn rate", "conversion rate", "CAC", "LTV", "burn rate", "runway"],
    tools: ["Stripe", "Vercel", "Supabase", "Notion", "Linear", "Figma", "Cursor", "Claude", "Next.js", "React"],
    hookStyle: "specific numbers + contrarian take on startup advice",
    bodyStyle: "receipts + what I did + what happened",
    closers: ["follow for updates.", "building in public.", "DM me if you're building too.", "what's your MRR?", "reply with your stack."],
    contentTypes: ["milestone", "lesson", "contrarian", "build_update", "revenue_share"],
  },

  indieHackers: {
    id: "indieHackers",
    name: "indie hackers",
    aliases: ["indie hacker", "indie", "solo builder", "bootstrapper", "solo dev", "one-person business", "micro-saas", "indie dev"],
    vocabulary: ["ship", "MRR", "bootstrapped", "solo", "no-code", "micro-SaaS", "ramen profitable", "default alive", "build in public", "ship fast", "iterate", "side project", "side hustle", "$0 to $X", "streak", "WIP"],
    painPoints: ["never shipping", "building features nobody wants", "no distribution", "comparison paralysis", "analysis paralysis", "too many ideas", "no audience", "pricing fear", "imposter syndrome", "quitting too early"],
    goals: ["first $1 online", "$1K MRR", "$10K MRR", "replace salary", "freedom", "ship 12 products in 12 months", "ramen profitable"],
    metrics: ["MRR", "users", "revenue", "products shipped", "streak days", "conversion"],
    tools: ["Stripe", "Vercel", "Supabase", "ShipFast", "Next.js", "Cursor", "Claude", "Tailwind", "Framer", "Lemon Squeezy"],
    hookStyle: "raw honesty + small numbers + process not results",
    bodyStyle: "what I tried + what happened + what I learned",
    closers: ["building in public.", "follow the journey.", "what are you shipping?", "day X of Y.", "reply with your MRR."],
    contentTypes: ["build_update", "milestone", "lesson", "contrarian", "revenue_share", "failure_story"],
  },

  saasFounders: {
    id: "saasFounders",
    name: "SaaS founders",
    aliases: ["saas founder", "saas", "b2b saas", "saas builder", "saas guy", "subscription business", "recurring revenue"],
    vocabulary: ["MRR", "ARR", "churn", "LTV", "CAC", "onboarding", "activation", "retention", "expansion revenue", "net revenue retention", "trial", "freemium", "PLG", "sales-led", "product-led", "stripe", "annual plan", "monthly plan"],
    painPoints: ["high churn", "low activation", "no PMF", "CAC too high", "support burden", "feature requests", "pricing too low", "no distribution", "trial-to-paid conversion", "onboarding confusion"],
    goals: ["$10K MRR", "$100K MRR", "$1M ARR", "negative churn", "PMF", "scale", "acquisition"],
    metrics: ["MRR", "ARR", "churn rate", "LTV:CAC", "trial-to-paid", "activation rate", "NRR", "burn"],
    tools: ["Stripe", "Mixpanel", "Amplitude", "Intercom", "Linear", "Vercel", "Supabase", "Postgres", "Redis"],
    hookStyle: "data-driven + specific SaaS metric + contrarian on growth advice",
    bodyStyle: "the metric + what moved it + what I learned",
    closers: ["what's your churn?", "reply with your MRR.", "follow for SaaS updates.", "building in public.", "what's your LTV:CAC?"],
    contentTypes: ["metric_share", "lesson", "contrarian", "milestone", "build_update"],
  },

  softwareDevelopers: {
    id: "softwareDevelopers",
    name: "software developers",
    aliases: ["developer", "dev", "programmer", "coder", "software engineer", "engineer", "full-stack", "backend dev", "frontend dev", "dev", "hacker"],
    vocabulary: ["ship", "PR", "merge", "deploy", "refactor", "debug", "stack", "framework", "build", "commit", "issue", "bug", "feature", "API", "database", "query", "optimize", "lint", "test", "CI/CD", "Docker", "Kubernetes"],
    painPoints: ["technical debt", "bad code reviews", "spaghetti code", "imposter syndrome", "burnout", "bad managers", "scope creep", "legacy code", "no tests", "slow CI", "context switching", "meetings"],
    goals: ["clean code", "ship fast", "learn new stack", "open source", "better job", "freelance", "build own product", "senior role", "staff engineer"],
    metrics: ["commits", "PRs merged", "deploy frequency", "uptime", "response time", "bug rate", "test coverage"],
    tools: ["VS Code", "Cursor", "Neovim", "Git", "GitHub", "Docker", "Postgres", "Redis", "AWS", "Vercel", "Next.js", "React", "Vue", "Svelte", "Rust", "Go", "Python", "TypeScript"],
    hookStyle: "technical specificity + opinion on tools/stacks + contrarian on best practices",
    bodyStyle: "the problem + the solution + the code/approach",
    closers: ["what's your stack?", "reply with your approach.", "agree or disagree?", "change my mind.", "follow for dev content."],
    contentTypes: ["technical_tip", "contrarian", "tool_review", "build_update", "lesson"],
  },

  buildInPublic: {
    id: "buildInPublic",
    name: "build in public",
    aliases: ["build in public", "building in public", "buildinpublic", "ship in public", "open startup", "transparent building"],
    vocabulary: ["ship", "day X", "MRR", "users", "build in public", "open startup", "transparent", "milestone", "update", "weekly retro", "commit", "deploy", "streak", "WIP", "shipping"],
    painPoints: ["consistency", "what to share", "oversharing", "comparison", "no engagement", "feeling like a fraud", "numbers too small to share", "burnout from posting"],
    goals: ["1000 followers", "first user", "$1K MRR", "consistency", "audience", "trust", "distribution"],
    metrics: ["followers", "MRR", "users", "posts per week", "streak days", "engagement rate"],
    tools: ["X", "GitHub", "Vercel", "Stripe", "Notion", "Cursor", "Claude"],
    hookStyle: "lowercase + specific + problem-first + no hype",
    bodyStyle: "what I shipped + what broke + what I learned",
    closers: ["day X of building in public.", "follow the build.", "what are you shipping today?", "reply with your progress.", "streak: X days."],
    contentTypes: ["ship_update", "milestone", "failure", "lesson", "retro", "demo"],
  },

  // === CREATORS ===
  videoEditors: {
    id: "videoEditors",
    name: "video editors",
    aliases: ["video editor", "editor", "film editor", "post-production", "video production", "content editor", "youtube editor"],
    vocabulary: ["cut", "timeline", "render", "export", "color grade", "sound design", "B-roll", "hook", "retention", "watch time", "CTR", "thumbnail", "rough cut", "fine cut", "transition", "keyframe", "proxy", "codec"],
    painPoints: ["hours of scrubbing", "manual cuts", "dead air removal", "finding the hook", "captioning", "reformatting for vertical", "render times", "client revisions", "low pay", "software crashes"],
    goals: ["faster workflow", "more clients", "higher rates", "retention editing mastery", "passive income", "own channel"],
    metrics: ["watch time", "retention rate", "CTR", "videos shipped", "hours saved", "client count"],
    tools: ["Premiere Pro", "DaVinci Resolve", "Final Cut", "After Effects", "CapCut", "Descript", "AutoEditor", "Frame.io"],
    hookStyle: "relatable frustration + specific workflow pain + before/after",
    bodyStyle: "the problem + the old way + the new way + time saved",
    closers: ["what's your workflow?", "reply with your editor.", "send this to an editor.", "what's your render time?", "follow for editing tips."],
    contentTypes: ["workflow_tip", "before_after", "contrarian", "relatable_frustration", "tool_review"],
  },

  youTubers: {
    id: "youTubers",
    name: "YouTubers",
    aliases: ["youtuber", "youtube creator", "youtube channel", "content creator", "youtube", "creator"],
    vocabulary: ["views", "watch time", "CTR", "retention", "subscribers", "thumbnail", "title", "hook", "upload", "video", "shorts", "long-form", "monetization", "AdSense", "sponsor", "CTR", "AVD", "impressions"],
    painPoints: ["low views", "bad retention", "thumbnail CTR", "algorithm changes", "burnout", "editing time", "finding ideas", "consistency", "monetization", "comparison"],
    goals: ["1K subscribers", "100K subscribers", "1M views", "full-time income", "viral video", "consistent uploads", "sponsorship"],
    metrics: ["views", "watch time", "subscribers", "CTR", "AVD", "retention rate", "upload frequency"],
    tools: ["YouTube Studio", "Premiere Pro", "DaVinci", "TubeBuddy", "VidIQ", "Canva", "Photoshop", "Descript"],
    hookStyle: "specific metric + contrarian on YouTube advice + relatable creator struggle",
    bodyStyle: "what I tried + the result + the lesson",
    closers: ["what's your CTR?", "reply with your niche.", "subscribe if you found this useful.", "what's working for you?", "follow for YouTube tips."],
    contentTypes: ["metric_share", "lesson", "contrarian", "creator_struggle", "tip"],
  },

  podcasters: {
    id: "podcasters",
    name: "podcasters",
    aliases: ["podcaster", "podcast host", "podcast", "audio creator", "show host"],
    vocabulary: ["downloads", "listeners", "episodes", "guests", "interview", "audio quality", "editing", "show notes", "distribution", "Apple Podcasts", "Spotify", "clip", "repurpose"],
    painPoints: ["low downloads", "finding guests", "editing time", "growing audience", "consistency", "monetization", "audio quality", "repurposing content"],
    goals: ["1K downloads/episode", "10K downloads", "monetization", "consistent schedule", "book great guests", "grow audience"],
    metrics: ["downloads", "listeners", "reviews", "episode count", "consistency"],
    tools: ["Riverside", "Squadcast", "Descript", "Audacity", "GarageBand", "Buzzsprout", "Libsyn"],
    hookStyle: "specific download number + contrarian on podcasting advice + guest story",
    bodyStyle: "the insight from the episode + why it matters + the lesson",
    closers: ["what's your show?", "reply with your favorite episode.", "subscribe to the show.", "who should I interview next?", "follow for podcasting tips."],
    contentTypes: ["episode_insight", "lesson", "contrarian", "guest_story", "tip"],
  },

  streamers: {
    id: "streamers",
    name: "streamers",
    aliases: ["streamer", "twitch streamer", "live streamer", "gaming streamer", "twitch", "livestream"],
    vocabulary: ["viewers", "chat", "subs", "bits", "donations", "raid", "follow", "clip", "highlight", "stream", "live", "VOD", "emotes", "mods", "chat interaction"],
    painPoints: ["low viewership", "growing audience", "consistency", "burnout", "chat engagement", "monetization", "discoverability", "retention"],
    goals: ["affiliate", "partner", "1K viewers", "full-time income", "consistent schedule", "community"],
    metrics: ["viewers", "peak viewers", "subs", "followers", "hours streamed", "chat activity"],
    tools: ["OBS", "Streamlabs", "Twitch", "YouTube Live", "Discord", "StreamElements"],
    hookStyle: "specific viewer number + relatable streamer struggle + contrarian on growth",
    bodyStyle: "what happened on stream + the lesson + the moment",
    closers: ["come hang out.", "what's your stream schedule?", "reply with your channel.", "follow for stream updates.", "see you live."],
    contentTypes: ["stream_moment", "lesson", "contrarian", "growth_tip", "community"],
  },

  designers: {
    id: "designers",
    name: "designers",
    aliases: ["designer", "ui designer", "ux designer", "product designer", "graphic designer", "visual designer", "brand designer"],
    vocabulary: ["design", "UI", "UX", "Figma", "prototype", "wireframe", "mockup", "color palette", "typography", "whitespace", "grid", "component", "design system", "accessibility", "user research"],
    painPoints: ["feedback loops", "design by committee", "imposter syndrome", "portfolio anxiety", "pricing", "client scope creep", "tools changing", "AI replacing design"],
    goals: ["portfolio", "better job", "freelance clients", "design system", "recognition", "own studio", "product designer role"],
    metrics: ["projects shipped", "client count", "portfolio views", "dribbble likes", "followers"],
    tools: ["Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "Framer", "Webflow", "Canva", "Procreate"],
    hookStyle: "visual insight + contrarian on design trends + specific design principle",
    bodyStyle: "the principle + the example + the takeaway",
    closers: ["what's your favorite font?", "reply with your portfolio.", "follow for design tips.", "agree or disagree?", "what's your design process?"],
    contentTypes: ["design_tip", "contrarian", "tool_review", "portfolio_share", "lesson"],
  },

  writers: {
    id: "writers",
    name: "writers",
    aliases: ["writer", "author", "copywriter", "content writer", "blogger", "newsletter writer", "ghostwriter", "technical writer"],
    vocabulary: ["words", "draft", "edit", "publish", "readers", "subscribers", "open rate", "click rate", "headline", "hook", "story", "narrative", "voice", "tone", "editing", "draft"],
    painPoints: ["writer's block", "no audience", "low open rates", "pricing", "finding clients", "consistency", "imposter syndrome", "comparison", "burnout"],
    goals: ["1K subscribers", "10K subscribers", "published book", "freelance clients", "consistent writing habit", "monetization"],
    metrics: ["subscribers", "open rate", "click rate", "words written", "posts published", "revenue"],
    tools: ["Substack", "Notion", "Google Docs", "Scrivener", "Grammarly", "Hemingway"],
    hookStyle: "specific writing insight + contrarian on writing advice + relatable writer struggle",
    bodyStyle: "the lesson + the example + the takeaway",
    closers: ["what's your writing routine?", "reply with your newsletter.", "subscribe if you write.", "what are you working on?", "follow for writing tips."],
    contentTypes: ["writing_tip", "lesson", "contrarian", "writer_struggle", "tool_review"],
  },

  // === BUSINESS / MONEY ===
  marketers: {
    id: "marketers",
    name: "marketers",
    aliases: ["marketer", "growth marketer", "marketing", "growth", "growth hacker", "demand gen", "content marketer", "SEO", "paid ads"],
    vocabulary: ["CTR", "CPC", "CPM", "ROAS", "CAC", "LTV", "conversion", "funnel", "landing page", "A/B test", "attribution", "organic", "paid", "SEO", "keywords", "backlinks", "traffic", "leads"],
    painPoints: ["low conversion", "high CAC", "attribution confusion", "algorithm changes", "budget constraints", "proving ROI", "content scale", "SEO volatility"],
    goals: ["lower CAC", "higher ROAS", "more leads", "viral campaign", "brand awareness", "pipeline growth"],
    metrics: ["CTR", "CPC", "CPM", "ROAS", "CAC", "LTV", "conversion rate", "traffic", "leads", "MQLs"],
    tools: ["Google Ads", "Meta Ads", "HubSpot", "Ahrefs", "SEMrush", "Google Analytics", "Mailchimp", "Klaviyo"],
    hookStyle: "specific metric + contrarian on marketing advice + tactical breakdown",
    bodyStyle: "the tactic + the result + the lesson",
    closers: ["what's your CAC?", "reply with your best channel.", "follow for marketing tips.", "what's working for you?", "agree or disagree?"],
    contentTypes: ["tactic_share", "contrarian", "metric_share", "tool_review", "lesson"],
  },

  freelancers: {
    id: "freelancers",
    name: "freelancers",
    aliases: ["freelancer", "freelance", "contractor", "consultant", "solopreneur", "self-employed", "independent"],
    vocabulary: ["client", "project", "invoice", "rate", "retainer", "proposal", "scope", "deliverable", "deadline", "pipeline", "referral", "portfolio", "niche"],
    painPoints: ["feast or famine", "scope creep", "late payments", "finding clients", "pricing too low", "imposter syndrome", "burnout", "no benefits", "isolation", "client ghosting"],
    goals: ["full pipeline", "higher rates", "retainer clients", "passive income", "own agency", "freedom", "consistent income"],
    metrics: ["hourly rate", "monthly revenue", "client count", "project value", "utilization rate"],
    tools: ["Notion", "Stripe", "PayPal", "Figma", "Google Workspace", "Calendly", "Loom", "Bonsai"],
    hookStyle: "specific rate/revenue + contrarian on freelancing advice + relatable client struggle",
    bodyStyle: "the situation + the lesson + the takeaway",
    closers: ["what's your rate?", "reply with your niche.", "follow for freelance tips.", "what's your biggest client struggle?", "dm for collab."],
    contentTypes: ["lesson", "contrarian", "client_story", "rate_share", "tip"],
  },

  agencies: {
    id: "agencies",
    name: "agency owners",
    aliases: ["agency", "agency owner", "agency founder", "service business", "consultancy", "studio"],
    vocabulary: ["client", "retainer", "MRR", "team", "hire", "delegate", "process", "SOP", "onboarding", "delivery", "pitch", "proposal", "scope", "margin", "utilization"],
    painPoints: ["hiring", "delegation", "client churn", "scope creep", "low margins", "founder bottleneck", "scaling delivery", "finding talent", "process documentation"],
    goals: ["$50K MRR", "$100K MRR", "hire team", "step back from delivery", "sell agency", "consistent pipeline"],
    metrics: ["MRR", "margin", "client count", "team size", "utilization rate", "client LTV"],
    tools: ["Notion", "Slack", "Asana", "Monday", "HubSpot", "Stripe", "Loom", "Figma"],
    hookStyle: "specific revenue + contrarian on agency advice + operational insight",
    bodyStyle: "the problem + the system + the result",
    closers: ["what's your team size?", "reply with your agency niche.", "follow for agency tips.", "what's your biggest operational challenge?", "dm for collab."],
    contentTypes: ["lesson", "contrarian", "metric_share", "operational_tip", "hiring"],
  },

  // === LIFESTYLE / HEALTH ===
  fitnessCoaches: {
    id: "fitnessCoaches",
    name: "fitness coaches",
    aliases: ["fitness coach", "personal trainer", "pt", "trainer", "fitness", "strength coach", "online coach", "nutrition coach"],
    vocabulary: ["clients", "programming", "periodization", "progressive overload", "macros", "calories", "PR", "1RM", "volume", "intensity", "recovery", "sleep", "nutrition", "supplements"],
    painPoints: ["finding clients online", "pricing", "programming for individuals", "client compliance", "building audience", "standing out", "comparison with influencers"],
    goals: ["10 online clients", "50 clients", "full roster", "higher rates", "own app", "passive income programs", "authority"],
    metrics: ["client count", "retention rate", "revenue", "client results", "followers"],
    tools: ["TrueCoach", "Trainerize", "Excel", "MyFitnessPal", "Instagram", "X", "YouTube"],
    hookStyle: "evidence-based + contrarian on fitness myths + specific programming insight",
    bodyStyle: "the principle + the evidence + the application",
    closers: ["what's your training style?", "reply with your PR.", "follow for fitness content.", "what's your biggest fitness myth?", "dm for coaching."],
    contentTypes: ["myth_bust", "programming_tip", "contrarian", "client_result", "evidence_based"],
  },

  // === NICHE PROFESSIONALS ===
  realEstateAgents: {
    id: "realEstateAgents",
    name: "real estate agents",
    aliases: ["realtor", "real estate", "real estate agent", "property", "broker", "agent"],
    vocabulary: ["listings", "buyers", "sellers", "closing", "commission", "MLS", "open house", "staging", "inspection", "offer", "escrow", "market", "inventory", "price"],
    painPoints: ["finding leads", "market slowdown", "competition", "commission splits", "inconsistent income", "client ghosting", "deal falling through"],
    goals: ["more listings", "higher commission", "consistent pipeline", "team", "brokerage", "passive income"],
    metrics: ["deals closed", "GCI", "listings", "pipeline value", "conversion rate"],
    tools: ["MLS", "Zillow", "Redfin", "Follow Up Boss", "KVCore", "Canva", "Instagram"],
    hookStyle: "market insight + contrarian on real estate advice + specific deal story",
    bodyStyle: "the situation + the lesson + the takeaway",
    closers: ["what's your market like?", "reply with your specialty.", "follow for real estate tips.", "what's your biggest challenge?", "dm for referrals."],
    contentTypes: ["market_insight", "deal_story", "contrarian", "tip", "lesson"],
  },

  musicians: {
    id: "musicians",
    name: "musicians",
    aliases: ["musician", "artist", "producer", "beatmaker", "rapper", "singer", "songwriter", "dj", "music producer"],
    vocabulary: ["stream", "Spotify", "Apple Music", "monthly listeners", "release", "single", "EP", "album", "beat", "mix", "master", "DAW", "sample", "verse", "hook", "chorus", "streaming"],
    painPoints: ["low streams", "algorithm playlists", "finding audience", "monetization", "label deals", "creative block", "marketing", "standing out", "comparison"],
    goals: ["1K monthly listeners", "10K monthly listeners", "viral song", "tour", "merch", "full-time music", "label deal"],
    metrics: ["monthly listeners", "streams", "followers", "playlist adds", "save rate"],
    tools: ["Spotify for Artists", "Ableton", "FL Studio", "Logic Pro", "Pro Tools", "Bandcamp", "DistroKid"],
    hookStyle: "specific stream number + contrarian on music industry + relatable artist struggle",
    bodyStyle: "the insight + the story + the lesson",
    closers: ["what are you working on?", "reply with your song.", "follow for music content.", "what's your biggest struggle?", "link in bio."],
    contentTypes: ["release_share", "lesson", "contrarian", "artist_struggle", "tip"],
  },

  // === TECH-ADJACENT ===
  aiBuilders: {
    id: "aiBuilders",
    name: "AI builders",
    aliases: ["ai builder", "ai", "ml engineer", "ai engineer", "ml", "machine learning", "ai researcher", "llm", "ai dev"],
    vocabulary: ["model", "LLM", "GPT", "Claude", "fine-tune", "RAG", "embedding", "vector", "prompt", "token", "inference", "training", "dataset", "benchmark", "agent", "tool use", "context window"],
    painPoints: ["hallucinations", "cost", "latency", "eval quality", "data quality", "model selection", "prompt engineering", "deployment", "scaling", "context limits"],
    goals: ["ship AI product", "better evals", "lower cost", "faster inference", "novel application", "research paper", "open source"],
    metrics: ["latency", "cost per query", "eval scores", "accuracy", "tokens", "users"],
    tools: ["OpenAI", "Anthropic", "LangChain", "LlamaIndex", "Pinecone", "Weaviate", "vLLM", "Hugging Face", "PyTorch"],
    hookStyle: "specific benchmark + contrarian on AI hype + technical insight",
    bodyStyle: "the approach + the result + the lesson",
    closers: ["what model are you using?", "reply with your AI project.", "follow for AI content.", "what's your biggest AI challenge?", "agree or disagree?"],
    contentTypes: ["technical_tip", "contrarian", "benchmark_share", "build_update", "lesson"],
  },

  noCodeBuilders: {
    id: "noCodeBuilders",
    name: "no-code builders",
    aliases: ["no-code", "nocode", "no code builder", "bubble", "webflow", "make", "zapier", "automation"],
    vocabulary: ["no-code", "Bubble", "Webflow", "Make", "Zapier", "Airtable", "Glide", "Softr", "workflow", "automation", "database", "API", "integration", "trigger", "action"],
    painPoints: ["scaling limits", "custom code needed", "learning curve", "pricing tiers", "vendor lock-in", "performance", "finding developers"],
    goals: ["ship MVP", "first user", "$1K MRR", "automate workflow", "replace spreadsheet", "build SaaS without code"],
    metrics: ["users", "MRR", "automations run", "time saved", "apps shipped"],
    tools: ["Bubble", "Webflow", "Make", "Zapier", "Airtable", "Glide", "Softr", "Xano", "WeWeb"],
    hookStyle: "specific build + contrarian on no-code vs code + workflow insight",
    bodyStyle: "the problem + the no-code solution + the result",
    closers: ["what's your stack?", "reply with your no-code project.", "follow for no-code tips.", "what are you building?", "dm for collab."],
    contentTypes: ["build_update", "contrarian", "tool_review", "workflow_tip", "lesson"],
  },

  // === INVESTORS / FINANCE ===
  investors: {
    id: "investors",
    name: "investors",
    aliases: ["investor", "angel", "vc", "venture capital", "angel investor", "lp", "fund"],
    vocabulary: ["deal", "thesis", "portfolio", "fund", "LP", "GP", "carry", "management fee", "pre-seed", "seed", "Series A", "valuation", "cap table", "pro-rata", "lead", "participating"],
    painPoints: ["deal flow", "finding founders", "valuation inflation", "missed deals", "portfolio support", "fundraising from LPs", "market downturn"],
    goals: ["fund I", "fund II", "100x return", "unicorn", "portfolio support", "fundraise", "deal flow"],
    metrics: ["IRR", "MOIC", "TVPI", "fund size", "portfolio count", "follow-on rate"],
    tools: ["Notion", "Affinity", "Carta", "AngelList", "Crunchbase", "PitchBook"],
    hookStyle: "specific thesis + contrarian on VC advice + portfolio insight",
    bodyStyle: "the thesis + the evidence + the takeaway",
    closers: ["what's your thesis?", "reply with your fund.", "follow for investment content.", "what are you looking for?", "dm for deals."],
    contentTypes: ["thesis_share", "contrarian", "portfolio_insight", "lesson", "market_take"],
  },

  // === E-COMM / LOCAL BUSINESS ===
  ecommerceOwners: {
    id: "ecommerceOwners",
    name: "e-commerce owners",
    aliases: ["ecommerce", "e-commerce", "shopify", "dropshipping", "amazon seller", "fba", "online store", "d2c", "dtc"],
    vocabulary: ["AOV", "LTV", "CAC", "ROAS", "conversion rate", "Shopify", "Amazon", "FBA", "dropship", "supplier", "inventory", "SKU", "fulfillment", "shipping", "returns", "ad spend"],
    painPoints: ["high CAC", "low AOV", "ad fatigue", "supply chain", "inventory management", "returns", "platform fees", "competition", "seasonality"],
    goals: ["$10K/month", "$100K/month", "first sale", "consistent sales", "own brand", "exit", "scale ads"],
    metrics: ["revenue", "AOV", "LTV", "CAC", "ROAS", "conversion rate", "margin"],
    tools: ["Shopify", "Amazon", "Meta Ads", "Google Ads", "Klaviyo", "ShipStation", "Helium 10"],
    hookStyle: "specific revenue/metric + contrarian on e-commerce advice + tactical breakdown",
    bodyStyle: "the tactic + the result + the lesson",
    closers: ["what's your AOV?", "reply with your store.", "follow for e-commerce tips.", "what's your best channel?", "what's your biggest challenge?"],
    contentTypes: ["tactic_share", "contrarian", "metric_share", "tool_review", "lesson"],
  },

  localBusinessOwners: {
    id: "localBusinessOwners",
    name: "local business owners",
    aliases: ["local business", "restaurant owner", "cafe owner", "small business", "brick and mortar", "physical business", "shop owner", "store owner"],
    vocabulary: ["customers", "foot traffic", "reviews", "Google", "Yelp", "inventory", "staff", "rent", "lease", "location", "menu", "service", "community", "regulars"],
    painPoints: ["foot traffic", "online reviews", "staff turnover", "rent", "competition", "marketing", "seasonality", "supply costs"],
    goals: ["full restaurant", "regular customers", "5-star reviews", "open second location", "consistent revenue", "community presence"],
    metrics: ["revenue", "customer count", "average ticket", "review rating", "repeat rate"],
    tools: ["Square", "Toast", "Google Business", "Instagram", "Yelp", "Resy", "OpenTable"],
    hookStyle: "community-focused + specific customer story + contrarian on local business advice",
    bodyStyle: "the situation + the lesson + the community angle",
    closers: ["come say hi.", "what's your favorite local spot?", "reply with your business.", "follow for local business tips.", "stop by."],
    contentTypes: ["customer_story", "lesson", "contrarian", "community", "tip"],
  },

  // === EDUCATION ===
  courseCreators: {
    id: "courseCreators",
    name: "course creators",
    aliases: ["course creator", "online course", "educator", "teacher", "instructor", "coaching program"],
    vocabulary: ["students", "enrollment", "cohort", "course", "lesson", "module", "completion rate", "refund rate", "launch", "waitlist", "scholarship", "community", "cohort-based"],
    painPoints: ["low completion", "no audience", "pricing", "competition", "platform fees", "marketing", "student results", "refund requests"],
    goals: ["first student", "100 students", "$100K launch", "consistent enrollment", "high completion", "community"],
    metrics: ["students", "revenue", "completion rate", "refund rate", "enrollment", "NPS"],
    tools: ["Teachable", "Thinkific", "Kajabi", "Maven", "Circle", "Discord", "Notion", "Loom"],
    hookStyle: "specific student result + contrarian on course advice + tactical insight",
    bodyStyle: "the insight + the student story + the lesson",
    closers: ["what are you teaching?", "reply with your course.", "follow for education content.", "what's your completion rate?", "dm for collab."],
    contentTypes: ["student_result", "contrarian", "lesson", "tactic_share", "tip"],
  },

  // === CRYPTO / WEB3 ===
  cryptoBuilders: {
    id: "cryptoBuilders",
    name: "crypto builders",
    aliases: ["crypto", "web3", "defi", "nft", "blockchain", "solidity", "smart contract", "dao", "token"],
    vocabulary: ["token", "DeFi", "NFT", "smart contract", "Solidity", "gas", "wallet", "DAO", "governance", "liquidity", "staking", "yield", "TVL", "audit", "mainnet", "testnet"],
    painPoints: ["regulation", "scams", "user experience", "gas fees", "audits", "adoption", "market downturn", "bridge security"],
    goals: ["mainnet launch", "TVL", "users", "token launch", "DAO", "protocol adoption", "exit"],
    metrics: ["TVL", "users", "volume", "fees", "token price", "holders"],
    tools: ["Solidity", "Hardhat", "Foundry", "Ethers.js", "Web3.js", "The Graph", "IPFS"],
    hookStyle: "specific metric + contrarian on crypto narrative + technical insight",
    bodyStyle: "the protocol + the mechanic + the takeaway",
    closers: ["what are you building?", "reply with your protocol.", "follow for crypto content.", "what's your thesis?", "dm for collab."],
    contentTypes: ["technical_tip", "contrarian", "metric_share", "build_update", "thesis"],
  },

  // === SALES ===
  salesPros: {
    id: "salesPros",
    name: "sales professionals",
    aliases: ["sales", "sales rep", "sdr", "ae", "account executive", "salesperson", "closer", "bdr"],
    vocabulary: ["pipeline", "quota", "deal", "close", "prospect", "lead", "demo", "discovery", "objection", "negotiation", "CRM", "sequence", "cadence", "cold call", "cold email"],
    painPoints: ["quota", "pipeline generation", "cold outreach", "objections", "long sales cycles", "ghosting", "competition", "discounting"],
    goals: ["hit quota", "presidents club", "promotion", "higher OTE", "own territory", "management", "founder sales"],
    metrics: ["quota attainment", "pipeline", "win rate", "deal size", "cycle length", "activity"],
    tools: ["Salesforce", "HubSpot", "Outreach", "Salesloft", "Apollo", "LinkedIn", "Gong"],
    hookStyle: "specific deal story + contrarian on sales advice + tactical breakdown",
    bodyStyle: "the situation + the tactic + the result",
    closers: ["what's your win rate?", "reply with your sales tip.", "follow for sales content.", "what's your biggest objection?", "dm for collab."],
    contentTypes: ["deal_story", "contrarian", "tactic_share", "lesson", "tip"],
  },

  // === PRODUCT ===
  productManagers: {
    id: "productManagers",
    name: "product managers",
    aliases: ["product manager", "pm", "product", "product lead", "group pm", "head of product"],
    vocabulary: ["roadmap", "spec", "PRD", "sprint", "backlog", "stakeholder", "user story", "acceptance criteria", "discovery", "delivery", "metrics", "experiment", "A/B test", "north star"],
    painPoints: ["stakeholder alignment", "scope creep", "engineering bandwidth", "no clear metrics", "feature factory", "imposter syndrome", "politics", "prioritization"],
    goals: ["ship feature", "north star metric", "promotion", "better process", "user impact", "head of product"],
    metrics: ["north star", "activation", "retention", "engagement", "NPS", "experiment results"],
    tools: ["Linear", "Jira", "Notion", "Figma", "Amplitude", "Mixpanel", "Productboard"],
    hookStyle: "specific product insight + contrarian on PM advice + framework breakdown",
    bodyStyle: "the framework + the application + the result",
    closers: ["what's your north star?", "reply with your PM framework.", "follow for product content.", "what's your biggest PM challenge?", "agree or disagree?"],
    contentTypes: ["framework_share", "contrarian", "lesson", "tip", "experiment_result"],
  },

  // === STUDENTS / CAREER ===
  students: {
    id: "students",
    name: "students",
    aliases: ["student", "college", "university", "cs student", "bootcamp", "self-taught", "learner"],
    vocabulary: ["learn", "study", "project", "portfolio", "internship", "job", "interview", "resume", "GPA", "class", "degree", "bootcamp", "self-taught", "tutorial"],
    painPoints: ["finding first job", "imposter syndrome", "tutorial hell", "no experience", "student debt", "comparison", "burnout", "no guidance"],
    goals: ["first job", "internship", "portfolio", "skills", "graduation", "first $1K", "open source"],
    metrics: ["projects shipped", "applications sent", "interviews", "job offers", "skills learned"],
    tools: ["GitHub", "VS Code", "freeCodeCamp", "LeetCode", "Notion", "LinkedIn"],
    hookStyle: "relatable struggle + contrarian on career advice + specific learning insight",
    bodyStyle: "the struggle + the lesson + the takeaway",
    closers: ["what are you learning?", "reply with your project.", "follow for career content.", "what's your biggest challenge?", "dm for collab."],
    contentTypes: ["lesson", "contrarian", "student_struggle", "tip", "project_share"],
  },

  // === REMOTE WORK / DIGITAL NOMAD ===
  digitalNomads: {
    id: "digitalNomads",
    name: "digital nomads",
    aliases: ["digital nomad", "nomad", "remote work", "remote worker", "location independent", "travel", "work from anywhere"],
    vocabulary: ["remote", "nomad", "timezone", "coworking", "Bali", "Lisbon", "Chiang Mai", "visa", "Airbnb", "wifi", "async", "location independent", "freelance", "timezone"],
    painPoints: ["visas", "timezones", "loneliness", "unstable wifi", "healthcare", "taxes", "banking", "consistency", "burnout", "comparison"],
    goals: ["sustainable travel", "consistent income", "community", "long-term visa", "work-life balance", "freedom"],
    metrics: ["countries visited", "monthly income", "cost of living", "work hours", "stability"],
    tools: ["Nomad List", "Airbnb", "Starlink", "Notion", "Stripe", "VPN", "Slack"],
    hookStyle: "specific location insight + contrarian on nomad life + relatable travel struggle",
    bodyStyle: "the experience + the lesson + the takeaway",
    closers: ["where are you based?", "reply with your nomad setup.", "follow for nomad content.", "what's your biggest nomad challenge?", "dm for collab."],
    contentTypes: ["location_insight", "contrarian", "lesson", "tip", "nomad_struggle"],
  },

  // === NEWSLETTER ===
  newsletterWriters: {
    id: "newsletterWriters",
    name: "newsletter writers",
    aliases: ["newsletter", "newsletter writer", "substack", "email creator", "email newsletter"],
    vocabulary: ["subscribers", "open rate", "click rate", "growth rate", "unsubscribe", "paid", "free", "Substack", "Beehiiv", "ConvertKit", "issue", "edition", "send"],
    painPoints: ["growing subscribers", "open rate decline", "consistency", "monetization", "churn", "content ideas", "comparison", "algorithm"],
    goals: ["1K subscribers", "10K subscribers", "100K subscribers", "paid tier", "full-time newsletter", "acquisition"],
    metrics: ["subscribers", "open rate", "click rate", "growth rate", "paid conversion", "revenue"],
    tools: ["Substack", "Beehiiv", "ConvertKit", "Mailchimp", "Ghost", "Notion"],
    hookStyle: "specific growth number + contrarian on newsletter advice + tactical breakdown",
    bodyStyle: "the tactic + the result + the lesson",
    closers: ["what's your open rate?", "reply with your newsletter.", "subscribe if you found this useful.", "what's your biggest newsletter challenge?", "follow for newsletter tips."],
    contentTypes: ["growth_tactic", "contrarian", "metric_share", "lesson", "tip"],
  },
};

// ---------------------------------------------------------------------------
// Audience matcher — find the best audience for a given topic
// ---------------------------------------------------------------------------
function matchAudience(topic) {
  const lower = topic.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const [id, audience] of Object.entries(AUDIENCES)) {
    let score = 0;
    // Check aliases
    for (const alias of audience.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        score += alias.split(" ").length * 2; // longer aliases score higher
      }
    }
    // Check vocabulary words
    for (const vocab of audience.vocabulary) {
      if (lower.includes(vocab.toLowerCase())) {
        score += 1;
      }
    }
    // Check pain points
    for (const pain of audience.painPoints) {
      const painWords = pain.toLowerCase().split(/\s+/);
      const matchCount = painWords.filter(w => w.length > 3 && lower.includes(w)).length;
      if (matchCount >= 2) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = audience;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// ---------------------------------------------------------------------------
// Get audience by ID
// ---------------------------------------------------------------------------
function getAudience(id) {
  return AUDIENCES[id] || null;
}

// ---------------------------------------------------------------------------
// List all audience IDs
// ---------------------------------------------------------------------------
function listAudiences() {
  return Object.keys(AUDIENCES);
}

// ---------------------------------------------------------------------------
// Count total audiences
// ---------------------------------------------------------------------------
function countAudiences() {
  return Object.keys(AUDIENCES).length;
}

module.exports = {
  AUDIENCES,
  matchAudience,
  getAudience,
  listAudiences,
  countAudiences,
};
