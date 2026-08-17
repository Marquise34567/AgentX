/*
 * Founder story generator — generates realistic founder journey narratives.
 *
 * Based on real viral founder story tweets:
 * - Tibo: "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months"
 * - Dylan: "I'm 30. I built an AI startup to $4.3M ARR. Got accepted into YC."
 * - Starter Story: "This guy built a $79K MRR app. Not from AI slop SEO. Not from TikTok."
 * - levelsio: "$456,372/year in cuts. 20% reduction. Margin from 67% to 87%."
 *
 * The generator creates MULTIPLE different founder stories per domain, each with:
 * - Specific starting condition (unemployed, dropped out, fired, broke)
 * - Specific timeline (months/years)
 * - Specific revenue numbers ($X MRR, $X ARR, $X exit)
 * - Specific struggle/lesson
 * - Thread-worthy hook
 *
 * IMPORTANT: These are HYPOTHETICAL templates, not claims about real people.
 * The user should replace the numbers with their own real numbers before posting.
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Founder story templates per domain
// Each template has: hook, body, thread-promise
// ---------------------------------------------------------------------------

const FOUNDER_STORIES = {
  saas: [
    {
      hook: "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months.",
      body: "No funding. No team. Just 2 guys, a laptop, and a problem they had themselves.\n\nMonth 1: built the MVP in 2 weeks\nMonth 3: hit $1k MRR from cold DMs\nMonth 6: $10k MRR, quit their jobs\nMonth 12: $50k MRR, 2 employees\nMonth 18: acquired for $10M+",
      thread: "This is the story, how much money they made & everything they learned 👇",
    },
    {
      hook: "I built a SaaS nobody wanted. Then I deleted 80% of it. MRR went up 3x.",
      body: "I spent 18 months building features because I thought they were cool.\n\nNobody asked for them. Nobody used them.\n\nSo I deleted everything except the one feature people actually paid for.\n\nMRR went from $3k to $9k in 60 days.",
      thread: "Here's exactly what I deleted and why 👇",
    },
    {
      hook: "I raised $2M and built the wrong product. My friend bootstrapped the right one with $0.",
      body: "I had a team of 6, a fancy office, and a product nobody wanted.\n\nHe had a laptop and a problem he solved for himself.\n\n18 months later:\nMe: $0 MRR, $200k left in the bank\nHim: $40k MRR, profitable, solo",
      thread: "Here's what I got wrong and what he got right 👇",
    },
    {
      hook: "I went from $0 to $79k MRR in 12 months. No SEO. No TikTok. No personal brand.",
      body: "Everyone says you need content marketing to grow a SaaS.\n\nI did none of that.\n\nI posted in 3 niche communities. Answered every question. Built what people asked for.\n\nThat's the whole strategy.",
      thread: "Here's the exact playbook 👇",
    },
    {
      hook: "I turned down $500k in funding. Best decision I ever made.",
      body: "Everyone told me to take the money. 'You'd be stupid not to.'\n\nInstead I kept my day job, built on weekends, and charged from day 1.\n\n12 months later: $8k MRR, 100% mine, no investors to answer to.\n\nThe founder who took the $500k? He pivoted 3 times and has $0 MRR.",
      thread: "Here's why bootstrapping beat funding for me 👇",
    },
    {
      hook: "I built a SaaS in 7 days. It hit $1k MRR in month 1.",
      body: "No, this isn't a 'build in public' flex.\n\nI had a problem. I solved it. I put it online. 3 people paid for it on day 1.\n\nThe '7 days' wasn't the build. It was the courage to ship something ugly.",
      thread: "Here's what I built and how I got the first 10 users 👇",
    },
    {
      hook: "I had 3 paying customers. Then I raised prices 4x. I lost 2 of them.",
      body: "Everyone said don't raise prices. 'You'll lose customers!'\n\nI lost 2. The 1 who stayed was happier. The product was better.\n\n6 months later: 40 customers at the new price. $16k MRR.\n\nThe 2 I lost? They were costing me more in support than they paid.",
      thread: "Here's why raising prices was the best thing I did 👇",
    },
    {
      hook: "I spent $40k on ads before I realized my SaaS doesn't need ads.",
      body: "$40k. 8 months. 12 customers. Negative ROI.\n\nThen I stopped ads entirely. Started replying to every person who mentioned my problem on X.\n\n3 months later: 50 customers. $0 in ad spend.\n\nThe lesson: some products don't need ads. They need conversations.",
      thread: "Here's what I did instead of ads 👇",
    },
    {
      hook: "My SaaS was dying. Churn was 12%. I fixed one thing. Churn dropped to 2%.",
      body: "I tried everything. New features. Price cuts. Email campaigns. Loyalty programs.\n\nNothing worked.\n\nThen I called 20 churned customers and asked why they left.\n\n18 of them said the same thing: onboarding was confusing.\n\nI rebuilt onboarding. Churn dropped from 12% to 2% in 60 days.",
      thread: "Here's the exact onboarding flow that fixed it 👇",
    },
    {
      hook: "I built a SaaS for a niche of 200 people. It makes $30k MRR.",
      body: "Everyone said the market was too small. 'You can't build a business on 200 people.'\n\n200 people × $150/month = $30k MRR.\n\nNo competition. No marketing. No SEO.\n\nThey all know each other. Word of mouth did the rest.",
      thread: "Here's why tiny niches are the best kept secret in SaaS 👇",
    },
  ],

  ai: [
    {
      hook: "I built an AI tool that nobody used. Then I changed one thing. It hit $4.3M ARR.",
      body: "Version 1: a ChatGPT wrapper with a nice UI. Nobody cared.\nVersion 2: same tool, but I niched down to one industry.\n\nThat's the only thing that changed. The tech was identical.\n\nThe niche made it $4.3M ARR.",
      thread: "Here's the exact niche and why it worked 👇",
    },
    {
      hook: "My AI startup got rejected by YC. 18 months later we're at $4.3M ARR.",
      body: "The rejection email said 'AI wrappers are a dime a dozen.'\n\nThey were right. That's why we stopped being a wrapper.\n\nWe built our own model for one specific use case nobody else was solving.\n\nNow we're the ones rejecting term sheets.",
      thread: "Here's what changed after YC said no 👇",
    },
    {
      hook: "I killed my AI startup. It was the best decision I ever made.",
      body: "$200k spent. 8 months of work. 0 paying users.\n\nThe tech was impressive. The demos got oohs and aahs.\n\nBut nobody would pay $20/month for something ChatGPT could do for free.\n\nSo I killed it. Built something boring instead. Hit $5k MRR in 3 months.",
      thread: "Here's what I learned from killing my dream project 👇",
    },
  ],

  coding: [
    {
      hook: "I spent 3 years building the wrong product. Then I built the right one in 2 weeks.",
      body: "3 years of architecture decisions. 3 years of 'just one more feature.' 3 years of $0.\n\nThen I deleted everything. Built one feature in 2 weeks. Charged $19 for it.\n\nMade more in the first month than in 3 years combined.",
      thread: "Here's what I was building vs what I should've built 👇",
    },
    {
      hook: "I open-sourced my side project. It got 10k stars in a week. Then a company bought it.",
      body: "I built a dev tool because I needed it. Put it on GitHub. Went to sleep.\n\nWoke up to 2k stars. By the end of the week: 10k.\n\nA month later, a company offered to buy it. I said yes.\n\nThe lesson: build what you need, not what you think others need.",
      thread: "Here's the tool, the offer, and what I learned 👇",
    },
  ],

  productivity: [
    {
      hook: "I tried 12 productivity apps in one year. My output went DOWN.",
      body: "Notion, Linear, Todoist, Things, Obsidian, Roam, Superhuman, Sunsama, Akiflow, Tana, Coda, Airtable.\n\nEach one promised to 10x my output.\n\nInstead I spent more time managing systems than doing work.\n\nSo I deleted everything. Switched to a sticky note. Output went up 3x.",
      thread: "Here's what each app promised vs what actually happened 👇",
    },
  ],

  fitness: [
    {
      hook: "I worked out 5x a week for a year and gained 2lbs of muscle. Then I changed one thing. Gained 8lbs in 3 months.",
      body: "Year 1: followed the 'optimal' routine. 5 days a week, 20 sets per muscle, perfect form.\n\nGained 2lbs. Barely visible.\n\nYear 2: simplified everything. 3 days a week, 5 compound lifts, ate more.\n\nGained 8lbs in 3 months.",
      thread: "Here's exactly what I changed 👇",
    },
  ],

  money: [
    {
      hook: "I tracked every dollar I spent for 3 years. Here's what I learned.",
      body: "Not a budgeting app. A spreadsheet. Every single transaction.\n\nYear 1: shocked at how much I wasted on food\nYear 2: cut expenses by 30%, invested the difference\nYear 3: my investments made more than my side hustle\n\nThe boring stuff works. It just takes 3 years to see it.",
      thread: "Here are the 5 things I learned 👇",
    },
  ],

  content: [
    {
      hook: "I posted on X every day for 365 days. Here's what happened.",
      body: "Day 1: 0 followers, 0 likes, 0 replies.\nDay 90: still nothing. Almost quit.\nDay 180: one post hit 10k impressions. Gained 500 followers.\nDay 365: 5k followers, consistent engagement, 3 clients from X.\n\nThe lesson: it doesn't work until it does. Most people quit on day 89.",
      thread: "Here's what worked, what didn't, and what I'd do differently 👇",
    },
  ],

  career: [
    {
      hook: "I job-hopped 4 times in 6 years. My salary went from $45k to $180k.",
      body: "Job 1: $45k, 2 years, learned the basics\nJob 2: $65k, 18 months, learned to lead\nJob 3: $95k, 2 years, learned to manage\nJob 4: $180k, current, learned to negotiate\n\nLoyalty cost me $135k. Job-hopping made me $135k.\n\nDo the math.",
      thread: "Here's exactly how I negotiated each jump 👇",
    },
  ],

  design: [
    {
      hook: "I spent 6 months redesigning my portfolio. Got 0 clients. Then I did one thing.",
      body: "6 months. 47 versions. Every pixel perfect.\n\n0 clients. 0 inquiries. 0 revenue.\n\nThen I stopped redesigning and started posting my work on X every day.\n\nGot 3 clients in the first month. None of them looked at my portfolio.",
      thread: "Here's what actually gets design clients 👇",
    },
  ],

  general: [
    {
      hook: "I failed at 3 businesses before one worked. Here's what the failures taught me.",
      body: "Business 1: built something nobody wanted ($0)\nBusiness 2: built something people wanted but wouldn't pay for ($0)\nBusiness 3: built something people would pay for but couldn't find ($0)\n\nBusiness 4: built something people wanted, would pay for, and could find.\n\n$40k MRR in 6 months.",
      thread: "Here's what each failure taught me 👇",
    },
  ],
};

// ---------------------------------------------------------------------------
// Generate founder stories for a domain
// ---------------------------------------------------------------------------

function generateFounderStories(domain) {
  const stories = FOUNDER_STORIES[domain] || FOUNDER_STORIES.general;
  return stories.map(s => {
    // Combine hook + body + thread promise into a full post
    return `${s.hook}\n\n${s.body}\n\n${s.thread}`;
  });
}

// Also generate just the hooks (for short-form variations)
function generateFounderStoryHooks(domain) {
  const stories = FOUNDER_STORIES[domain] || FOUNDER_STORIES.general;
  return stories.map(s => s.hook);
}

module.exports = { generateFounderStories, generateFounderStoryHooks, FOUNDER_STORIES };
