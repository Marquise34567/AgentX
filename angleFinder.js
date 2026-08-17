/*
 * Angle finder — analyzes a topic and finds the highest-engagement angle.
 *
 * A senior copywriter doesn't start with a template. They start with a
 * question: "What's the most interesting thing I can say about this topic
 * that will make people stop scrolling?"
 *
 * This module:
 *   1. Maps the topic to a domain (SaaS, fitness, marketing, etc.)
 *   2. Pulls relevant insights from the INSIGHT_DATABASE
 *   3. Scores each angle for tension, novelty, specificity, and algorithm fit
 *   4. Returns the best angles with their reasoning
 *
 * The INSIGHT_DATABASE is the "knowledge" of a senior PM/copywriter.
 * It's curated, specific, contrarian — not platitudes.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Topic → domain mapping
// ---------------------------------------------------------------------------

const DOMAIN_KEYWORDS = {
  saas: ["saas", "micro saas", "mrr", "subscription", "b2b", "churn", "onboarding", "indie hacker", "shipping product", "building saas", "building a saas"],
  marketing: ["marketing", "growth", "seo", "ads", "campaign", "brand", "content marketing", "email", "newsletter", "funnel", "conversion", "cpc", "ctr"],
  ai: ["ai", "gpt", "llm", "machine learning", "ml", "neural", "transformer", "prompt", "chatbot", "automation", "agent", "claude", "openai", "ai video", "ai editing", "autoeditor", "video editing"],
  fitness: ["fitness", "gym", "workout", "muscle", "strength", "cardio", "diet", "nutrition", "weight loss", "running", "bodybuilding", "health", "fit", "getting fit", "getting in shape", "in shape", "lose weight", "fat loss", "bulk", "cutting", "lifting", "protein"],
  money: ["money", "investing", "stocks", "stock market", "crypto", "bitcoin", "wealth", "passive income", "real estate", "financial", "trading", "portfolio", "index fund", "day trading", "rigged", "wall street", "etf"],
  productivity: ["productivity", "focus", "deep work", "time management", "habits", "routine", "discipline", "procrastination", "systems", "gtd", "notion", "obsidian", "todoist", "calendar", "email", "slack", "distraction", "burnout"],
  content: ["content", "youtube", "blog", "podcast", "twitter", "x", "social media", "creator", "audience", "followers", "engagement", "viral"],
  career: ["career", "job", "interview", "resume", "promotion", "salary", "remote work", "freelance", "consulting", "networking", "linkedin"],
  design: ["design", "ui ", " ux", "figma", "prototype", "user experience", "interface", "css", "typography", "logo", "web design", "landing page"],
  coding: ["coding", "programming", "javascript", "python", "react", "node", "api", "debugging", "architecture", "clean code", "refactoring", "learning to code", "learn to code", "learn coding", "developer", "software engineer", "full stack", "frontend", "backend", "code"],
};

function mapTopicToDomain(topic) {
  const t = topic.toLowerCase();
  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = 0;
    for (const kw of keywords) {
      if (t.includes(kw)) scores[domain] += kw.length > 4 ? 2 : 1;
    }
  }
  // Find the best domain
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return { domain: "general", allDomains: [] };
  return { domain: sorted[0][0], allDomains: sorted.filter(s => s[1] > 0).map(s => s[0]) };
}

// ---------------------------------------------------------------------------
// Insight database — the "knowledge" of a senior PM/copywriter
// ---------------------------------------------------------------------------

const INSIGHT_DATABASE = {
  saas: [
    { insight: "Your churn problem isn't a product problem — it's an onboarding problem. Fix the first 5 minutes.", type: "contrarian", specificity: 9 },
    { insight: "I spent 18 months building features nobody asked for. Then I deleted 80% of my product. MRR went up 3x.", type: "story", specificity: 10 },
    { insight: "The feature you're most proud of is probably the one killing your conversion rate.", type: "contrarian", specificity: 8 },
    { insight: "Your pricing page is more important than your landing page. 10x more people see it than you think.", type: "specific", specificity: 8 },
    { insight: "Annual plans don't reduce churn. They delay it. You still have the same problem, just on a longer clock.", type: "contrarian", specificity: 9 },
    { insight: "The best growth hack for your SaaS is answering support tickets within 5 minutes. Not SEO. Not a referral program.", type: "contrarian", specificity: 10 },
    { insight: "Free trials are a trap. Most people who sign up for a free trial were never going to pay. Use freemium or paid trials.", type: "contrarian", specificity: 8 },
    { insight: "Your SaaS isn't competing with other SaaS. It's competing with spreadsheets. Most people would rather use a spreadsheet.", type: "contrarian", specificity: 9 },
    { insight: "I raised $2M and built the wrong product. My friend bootstrapped the right one with $0. He's at $40k MRR. I'm at $0.", type: "story", specificity: 10 },
    { insight: "The hardest part of SaaS isn't building it. It's getting the first 10 paying customers who aren't your friends.", type: "specific", specificity: 8 },
    { insight: "Your users don't want more features. They want the features they have to actually work.", type: "contrarian", specificity: 8 },
    { insight: "I tracked every feature request for a year. 90% came from 10% of users. Those users also had the highest churn.", type: "data", specificity: 10 },
    { insight: "The SaaS founders winning right now aren't the best coders — they're the best communicators.", type: "contrarian", specificity: 7 },
    { insight: "Your demo video is too long. Cut it to 60 seconds. Show one thing doing one thing well.", type: "specific", specificity: 8 },
    { insight: "Most SaaS pricing is set by guessing. The right price is usually 2-3x what you're charging now.", type: "contrarian", specificity: 8 },
  ],
  marketing: [
    { insight: "SEO is not a channel. It's a side effect of being useful. Stop optimizing for Google. Start optimizing for the person searching.", type: "contrarian", specificity: 8 },
    { insight: "Your email list is dying. Open rates are dropping across the board. The answer isn't better subject lines — it's fewer, better emails.", type: "contrarian", specificity: 8 },
    { insight: "I A/B tested 50 headlines. The one that won was the one I almost didn't publish because it felt too simple.", type: "story", specificity: 9 },
    { insight: "The best marketing channel is the one you can stick with for 2 years. Not the one that's trending on Twitter.", type: "contrarian", specificity: 7 },
    { insight: "Your landing page has too many words. Cut 50%. Conversion will go up.", type: "specific", specificity: 8 },
    { insight: "Nobody cares about your brand story. They care about whether your product solves their problem. Lead with the problem.", type: "contrarian", specificity: 8 },
    { insight: "I spent $50k on Facebook ads with zero ROI. Then I posted one thread on X and got 200 customers. Cost: $0.", type: "story", specificity: 10 },
    { insight: "The 'marketing funnel' is a lie. People don't move through stages. They see your thing, forget about it, see it again 3 months later, then buy.", type: "contrarian", specificity: 9 },
    { insight: "Your content calendar is killing your content. Stop scheduling. Start writing when you actually have something to say.", type: "contrarian", specificity: 8 },
    { insight: "Word of mouth isn't a marketing strategy. It's a product quality score. If you need to 'do' word of mouth, your product isn't good enough yet.", type: "contrarian", specificity: 9 },
  ],
  ai: [
    { insight: "AI won't replace you. But a person using AI will. The skill isn't prompting — it's knowing what to ask.", type: "contrarian", specificity: 7 },
    { insight: "Most AI tools are wrappers around GPT with a nice UI. The moat isn't the AI — it's the workflow around it.", type: "contrarian", specificity: 8 },
    { insight: "I replaced 3 tools with one ChatGPT prompt. Saved $200/mo. The prompt took 20 minutes to write.", type: "story", specificity: 9 },
    { insight: "The best AI use cases aren't 'generate content.' They're 'summarize this 50-page PDF in 30 seconds so I can decide if it's worth reading.'", type: "specific", specificity: 8 },
    { insight: "Your AI-generated content is detectable. Not by AI detectors — by humans. It reads like nothing. No personality. No risk.", type: "contrarian", specificity: 9 },
    { insight: "Prompt engineering is not a real job. It's a temporary skill. In 2 years, the AI will prompt itself.", type: "contrarian", specificity: 8 },
    { insight: "I've used AI every day for 2 years. The biggest productivity gain wasn't writing — it was reading. AI cuts my research time by 80%.", type: "story", specificity: 9 },
    { insight: "The companies winning with AI aren't the ones with the best AI. They're the ones with the best data to feed it.", type: "contrarian", specificity: 8 },
    { insight: "Fine-tuning a model on your data beats prompt engineering 9 times out of 10. But nobody does it because it's harder.", type: "contrarian", specificity: 9 },
    { insight: "AI makes everyone a writer. But it doesn't make everyone interesting. The bottleneck moved from output to insight.", type: "contrarian", specificity: 9 },
    { insight: "I built an AI tool that saves 4 hours per video. My last 10 videos were edited by AI. Watch time went up 2x.", type: "story", specificity: 10 },
    { insight: "The AI bubble isn't in the models. It's in the wrappers. 90% of 'AI startups' are a form on top of an API. They'll die when the API adds that feature.", type: "contrarian", specificity: 9 },
    { insight: "AI doesn't make bad writers good. It makes bad writers fast. The output is still bad, just 10x more of it.", type: "contrarian", specificity: 8 },
    { insight: "I tested 50 AI tools last month. 45 were the same tool with a different landing page. The 5 that were different were actually useful.", type: "story", specificity: 9 },
    { insight: "The real AI productivity gain isn't doing things faster. It's doing things you wouldn't have done at all. AI makes the impossible cheap.", type: "contrarian", specificity: 8 },
  ],
  fitness: [
    { insight: "You don't need a better workout program. You need to show up 4x a week for 6 months. The program barely matters.", type: "contrarian", specificity: 8 },
    { insight: "I worked out 5x a week for a year and gained 2lbs of muscle. Then I fixed my sleep and protein. Gained 8lbs in 3 months.", type: "story", specificity: 10 },
    { insight: "Cardio doesn't burn fat. It makes you hungry. Lift weights, eat protein, walk 10k steps. That's 90% of it.", type: "contrarian", specificity: 9 },
    { insight: "The supplement industry is built on the assumption that you're not eating enough protein. You're probably not. Fix that first.", type: "specific", specificity: 8 },
    { insight: "Your gym routine is fine. Your diet is the problem. You can't out-train a bad diet — everyone says this, nobody listens.", type: "contrarian", specificity: 7 },
    { insight: "I tracked every workout for 3 years. The months I gained the most muscle were the months I slept 8+ hours. Not the months I trained hardest.", type: "data", specificity: 10 },
    { insight: "Stretching before lifting doesn't prevent injury. It reduces strength output. Warm up with the movement you're about to do.", type: "contrarian", specificity: 9 },
    { insight: "The best fitness investment isn't a gym membership. It's a $20 pair of walking shoes. Walk 10k steps. Watch what happens in 30 days.", type: "specific", specificity: 8 },
    { insight: "You're not plateaued. You're under-recovered. Take a deload week. Eat more. Sleep more. Come back stronger.", type: "contrarian", specificity: 8 },
    { insight: "Nobody at the gym is looking at you. They're looking at themselves in the mirror. Go.", type: "contrarian", specificity: 7 },
  ],
  money: [
    { insight: "The best investment I ever made wasn't a stock. It was spending $200 on books that changed how I think about money.", type: "story", specificity: 8 },
    { insight: "You don't need to learn options trading. You need to learn to save 20% of your income and put it in index funds. Boring works.", type: "contrarian", specificity: 8 },
    { insight: "I tried day trading for 6 months. I made $340. I would have made $4,000 just buying and holding the same stocks.", type: "story", specificity: 10 },
    { insight: "Your emergency fund isn't an investment. It's insurance. Stop trying to optimize it. Keep it in a savings account.", type: "specific", specificity: 8 },
    { insight: "The people selling you 'passive income' courses are making active income from selling you the course. Think about that.", type: "contrarian", specificity: 9 },
    { insight: "You're not broke because you don't earn enough. You're broke because your lifestyle expands to match your income. Always.", type: "contrarian", specificity: 8 },
    { insight: "I tracked every dollar I spent for a year. 30% went to things I couldn't remember buying. That's $12k a year on nothing.", type: "data", specificity: 10 },
    { insight: "Buying a house isn't always smart. Run the numbers. Sometimes renting + investing the difference wins by $200k+ over 30 years.", type: "contrarian", specificity: 9 },
    { insight: "The 4% rule assumes a 30-year retirement. If you retire at 40, you need 3%. Maybe 2.5%. The math changes everything.", type: "specific", specificity: 9 },
    { insight: "Dollar-cost averaging beats market timing 99% of the time. But it's boring, so nobody does it.", type: "contrarian", specificity: 8 },
  ],
  productivity: [
    { insight: "Productivity systems are procrastination in a suit. You don't need Notion. You need a piece of paper and 3 things on it.", type: "contrarian", specificity: 9 },
    { insight: "I tried 12 productivity apps in one year. My output went up when I deleted all of them and used a text file.", type: "story", specificity: 9 },
    { insight: "Deep work isn't about focus. It's about eliminating the 50 things that interrupt your focus. The interruptions are the problem.", type: "contrarian", specificity: 8 },
    { insight: "Your morning routine doesn't matter. Your evening routine does. What you do at night determines how tomorrow goes.", type: "contrarian", specificity: 8 },
    { insight: "The 5 AM club is a cult. Wake up when you can think clearly. For some people that's 5 AM. For others it's 9 AM. Know thyself.", type: "contrarian", specificity: 8 },
    { insight: "I tracked my time for 30 days. 40% of my 'work hours' were spent on email and Slack. That's 3 hours a day on other people's priorities.", type: "data", specificity: 10 },
    { insight: "You don't have a time management problem. You have a priority problem. You're doing everything instead of the one thing that matters.", type: "contrarian", specificity: 8 },
    { insight: "Pomodoro is training wheels. If you need a timer to focus for 25 minutes, the work isn't engaging enough. Find better work.", type: "contrarian", specificity: 8 },
    { insight: "The most productive people I know work fewer hours than the least productive. Intensity > hours. Always.", type: "contrarian", specificity: 7 },
    { insight: "Stop optimizing your system. Start optimizing your sleep. 7 hours of sleep beats 10 hours of 'productivity.'", type: "contrarian", specificity: 8 },
  ],
  content: [
    { insight: "Your content isn't growing because you're writing for everyone. Pick one person. Write only for them. Everyone else will follow.", type: "contrarian", specificity: 8 },
    { insight: "I posted every day for 200 days. The thread that went viral was one I almost didn't post because it felt too personal.", type: "story", specificity: 9 },
    { insight: "Consistency doesn't mean posting every day. It means posting when you have something worth saying. Quality > frequency. Always.", type: "contrarian", specificity: 7 },
    { insight: "Your bio doesn't matter. Your last 3 posts matter. That's what people read before they follow.", type: "specific", specificity: 8 },
    { insight: "The algorithm doesn't reward good content. It rewards content that makes people interact. Those are different things.", type: "contrarian", specificity: 9 },
    { insight: "I analyzed 100 viral threads. 80% started with a 4-6 word hook. The hook matters more than the rest of the thread combined.", type: "data", specificity: 9 },
    { insight: "Stop trying to go viral. Viral content attracts the wrong audience. Build for 100 true fans. They'll do your marketing for you.", type: "contrarian", specificity: 8 },
    { insight: "Your content is too polished. People connect with mess. Show the mistakes, the failures, the in-progress. That's what gets saved.", type: "contrarian", specificity: 8 },
    { insight: "The best content creators aren't the best writers. They're the best observers. They notice things everyone else walks past.", type: "contrarian", specificity: 8 },
    { insight: "Repurposing content isn't lazy. It's efficient. One good idea deserves 5 formats. Stop reinventing the wheel.", type: "contrarian", specificity: 7 },
  ],
  career: [
    { insight: "Your resume doesn't get you hired. Your network does. 70% of jobs are never posted publicly. Stop applying. Start talking.", type: "contrarian", specificity: 9 },
    { insight: "I job-hopped 4 times in 3 years. My salary went up 120%. Loyalty is a tax. Job hopping is a strategy.", type: "story", specificity: 10 },
    { insight: "The best career advice isn't 'follow your passion.' It's 'follow what you're willing to be obsessed with for 5 years.'", type: "contrarian", specificity: 8 },
    { insight: "Your LinkedIn profile isn't a resume. It's a landing page. Optimize it like one. The first 2 lines are your headline.", type: "specific", specificity: 8 },
    { insight: "Negotiating your salary for 30 minutes can earn you more than 6 months of hard work. Most people don't negotiate. That's a $50k mistake.", type: "specific", specificity: 9 },
    { insight: "I got promoted 3x in 2 years. Not by working harder. By making my boss look good. Your boss is your #1 customer.", type: "story", specificity: 9 },
    { insight: "Remote work isn't a perk. It's a trade-off. You save 2 hours of commute but lose 2 hours of social capital. Know which one you need.", type: "contrarian", specificity: 8 },
    { insight: "The people who get promoted aren't the best at their job. They're the best at making sure people know they're good at their job.", type: "contrarian", specificity: 8 },
    { insight: "Your 5-year career plan is fiction. The world changes faster than your plan. Optimize for optionality, not a specific path.", type: "contrarian", specificity: 8 },
    { insight: "Freelancing isn't freedom until you charge 3x what you think you're worth. At 1x, you're an employee without benefits.", type: "contrarian", specificity: 9 },
  ],
  coding: [
    { insight: "Clean code doesn't matter if the product doesn't work. Ship ugly. Refactor later. Most code gets deleted before it needs refactoring.", type: "contrarian", specificity: 8 },
    { insight: "I spent 2 weeks refactoring a function. The next sprint, we deleted the entire feature. 2 weeks wasted on code that no longer exists.", type: "story", specificity: 10 },
    { insight: "The best programmers I know don't write more code. They write less. They delete more. They say no to features.", type: "contrarian", specificity: 8 },
    { insight: "Your code doesn't need to be clever. It needs to be readable by the next person who touches it. Clever code is a liability.", type: "contrarian", specificity: 7 },
    { insight: "Tests don't catch bugs. Types catch bugs. Tests catch regressions. Know the difference. Use both.", type: "specific", specificity: 8 },
    { insight: "I've been coding for 10 years. I still Google 'how to center a div' at least once a month. You're not alone.", type: "story", specificity: 8 },
    { insight: "The framework doesn't matter. React, Vue, Svelte — they all build the same UI. Pick one. Learn it deeply. Stop switching.", type: "contrarian", specificity: 7 },
    { insight: "Most performance issues aren't in your code. They're in your database. Index your tables. N+1 queries are killing your app.", type: "specific", specificity: 9 },
    { insight: "Documentation is a feature. If your code needs comments to be understood, your code is too complex. Simplify first, document second.", type: "contrarian", specificity: 7 },
    { insight: "The best debugging tool isn't a debugger. It's a piece of paper and a pen. Write down what you think the code does. Then read what it actually does.", type: "contrarian", specificity: 8 },
    { insight: "I deleted 10,000 lines of code last month. The app got faster. Less code = fewer bugs = fewer edge cases. Delete more.", type: "story", specificity: 9 },
    { insight: "Senior devs don't write code faster. They write less code because they know what NOT to build. Junior devs solve the problem. Senior devs question the problem.", type: "contrarian", specificity: 8 },
    { insight: "Your CI/CD pipeline is broken if deploys are scary. You should deploy 5x a day. If you can't, your pipeline is the bottleneck, not your code.", type: "specific", specificity: 9 },
    { insight: "I spent 3 days debugging a race condition. The fix was 1 line. The lesson: learn concurrency before you need it, not after.", type: "story", specificity: 9 },
    { insight: "TypeScript isn't about types. It's about catching mistakes before your users do. If you're not using it in 2025, you're shipping bugs on purpose.", type: "contrarian", specificity: 8 },
  ],
  design: [
    { insight: "Your UI has too many features visible. Hide 80% of them. The best UIs look simple because they are. Complexity is a failure.", type: "contrarian", specificity: 8 },
    { insight: "Whitespace isn't wasted space. It's the most important element on the page. It tells the user where to look.", type: "contrarian", specificity: 7 },
    { insight: "I redesigned a landing page 5 times. The version that converted best was the one with the fewest words and the biggest button.", type: "story", specificity: 9 },
    { insight: "Good design is invisible. Users don't notice it. They only notice bad design. If someone compliments your UI, it's probably too loud.", type: "contrarian", specificity: 8 },
    { insight: "Your color palette has too many colors. Pick 3. Use them consistently. Every additional color reduces clarity.", type: "specific", specificity: 8 },
    { insight: "Mobile-first isn't a design strategy. It's a constraint. Most of your users are on mobile. Design for the smallest screen first.", type: "specific", specificity: 7 },
    { insight: "The best designers I know steal more than they create. Not plagiarize — study. They have a library of screenshots they reference.", type: "contrarian", specificity: 8 },
    { insight: "Your form has too many fields. Every field you remove increases conversion by ~5%. Cut them in half.", type: "specific", specificity: 9 },
    { insight: "I A/B tested 20 button colors. The winner was the one that contrasted most with the background. Not the prettiest. The loudest.", type: "story", specificity: 9 },
    { insight: "Design trends are a trap. Glassmorphism, neumorphism, brutalism — they all fade. Hierarchy, contrast, and clarity never go out of style.", type: "contrarian", specificity: 8 },
    { insight: "Your landing page has 3 seconds to answer: what is this, who is it for, and why should I care. If it takes longer, they're gone.", type: "specific", specificity: 9 },
    { insight: "The best UX improvement I ever made was removing a feature. Confusion dropped. Conversion went up 30%. Less is more.", type: "story", specificity: 9 },
  ],
  general: [
    { insight: "The advice that changes your life is usually the advice you already know. The problem isn't information. It's execution.", type: "contrarian", specificity: 7 },
    { insight: "I read 50 books last year. 5 of them changed my life. The other 45 said the same 5 things differently. Read fewer books. Apply more.", type: "story", specificity: 8 },
    { insight: "Most people don't need more information. They need a deadline. A deadline fixes 90% of procrastination.", type: "contrarian", specificity: 8 },
    { insight: "The biggest risk isn't failing. It's spending 10 years being average at something you don't care about.", type: "contrarian", specificity: 7 },
    { insight: "You're not lazy. You're unmotivated because the goal isn't specific enough. 'Get fit' doesn't work. 'Lose 10lbs by June' does.", type: "contrarian", specificity: 8 },
    { insight: "I spent 5 years avoiding the hard thing. The hard thing took 3 months once I started. The avoidance was the real problem.", type: "story", specificity: 9 },
    { insight: "Confidence isn't a feeling. It's a track record. You build it by doing hard things and surviving. There's no shortcut.", type: "contrarian", specificity: 7 },
    { insight: "The people who give the best advice are usually the ones who've made the most mistakes. They're not smarter — they've just failed more.", type: "contrarian", specificity: 7 },
    { insight: "Your comfort zone isn't keeping you safe. It's keeping you small. Every year you stay in it, the smaller your world gets.", type: "contrarian", specificity: 7 },
    { insight: "The best time to start was 5 years ago. The second best time is now. The third best time is tomorrow. Don't wait for tomorrow.", type: "contrarian", specificity: 6 },
  ],
};

// ---------------------------------------------------------------------------
// Angle scoring — which angles will get the most engagement?
// ---------------------------------------------------------------------------

function scoreAngle(insight, topic, domain) {
  let score = 0;

  // Domain match bonus — prefer domain-specific insights over general ones
  if (insight.domain && insight.domain !== "general") score += 20;
  if (insight.domain === "general") score -= 10;

  // Specificity — specific claims beat vague ones (algorithm rewards dwell time)
  score += insight.specificity * 2;

  // Contrarian insights get a boost (quote-tweets = 5.0, replies = 5.0)
  if (insight.type === "contrarian") score += 15;
  if (insight.type === "story") score += 12; // stories drive replies + follows
  if (insight.type === "data") score += 14; // data drives copy-link shares (20.0)
  if (insight.type === "specific") score += 8;

  // Length — shorter insights make punchier posts
  const wordCount = insight.insight.split(/\s+/).length;
  if (wordCount < 25) score += 5;
  if (wordCount > 60) score -= 3;

  // Contains a number — numbers boost engagement
  if (/\d/.test(insight.insight)) score += 8;

  // Contains a comparison/contrast — creates tension
  if (/\b(not|isn't|don't|but|instead|rather|than|vs|versus)\b/i.test(insight.insight)) score += 6;

  // Contains a personal story marker
  if (/\b(i |my |me )\b/i.test(insight.insight)) score += 4;

  return score;
}

// ---------------------------------------------------------------------------
// Find the best angles for a topic
// ---------------------------------------------------------------------------

/**
 * Find the best angles for a topic.
 *
 * @param {string} topic - What to post about
 * @param {number} count - How many angles to return
 * @returns {Array} Array of { insight, type, specificity, score, domain, reasoning }
 */
function findAngles(topic, count = 5) {
  const { domain, allDomains } = mapTopicToDomain(topic);

  // Get insights from the primary domain + any secondary domains
  const insights = [];
  const domains = allDomains.length > 1 ? allDomains : [domain];

  for (const d of domains) {
    if (INSIGHT_DATABASE[d]) {
      for (const insight of INSIGHT_DATABASE[d]) {
        insights.push({ ...insight, domain: d });
      }
    }
  }

  // Always include some general insights as fallback
  if (insights.length < count) {
    for (const insight of INSIGHT_DATABASE.general) {
      insights.push({ ...insight, domain: "general" });
    }
  }

  // Score each angle
  const scored = insights.map(i => ({
    ...i,
    score: scoreAngle(i, topic, domain),
    reasoning: explainAngle(i),
  }));

  // Sort by score, deduplicate by insight text
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const unique = scored.filter(s => {
    const key = s.insight.slice(0, 30).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, count);
}

function explainAngle(insight) {
  const reasons = [];
  if (insight.type === "contrarian") reasons.push("contrarian → drives quote-tweets (5.0) + replies (5.0)");
  if (insight.type === "story") reasons.push("personal story → drives replies (5.0) + follows (4.0)");
  if (insight.type === "data") reasons.push("specific data → drives copy-link shares (20.0)");
  if (insight.specificity >= 9) reasons.push("highly specific → high dwell time");
  if (/\d/.test(insight.insight)) reasons.push("contains numbers → +46% engagement on first line");
  return reasons.join(" | ");
}

module.exports = {
  findAngles,
  mapTopicToDomain,
  scoreAngle,
  INSIGHT_DATABASE,
  DOMAIN_KEYWORDS,
};
