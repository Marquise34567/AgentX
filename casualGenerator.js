/*
 * Casual tweet generator — generates human-sounding casual tweets from topics.
 *
 * This is NOT a template engine. It uses domain knowledge + pattern matching
 * to generate tweets that sound like a person texting a friend.
 *
 * Based on analysis of real 10k+ viral tweets:
 * - arra: "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time"
 * - Jake: "Men used to go to war and now they sell b2b SaaS"
 * - levelsio: "the most annoying part of running a business for me is collecting receipts for my accountant"
 * - George Pu: "Founder: 'My company can be the next Uber.' Me: That era is over."
 * - Lego Kingo: "insane detail here where Elon doesn't recognize the name of Figma"
 *
 * Patterns:
 * 1. "i KNOW [obvious thing] but [silly behavior]" — self-deprecating honesty
 * 2. "[grand past] and now [mundane present]" — absurd contrast
 * 3. "the most annoying part of [activity] is [specific annoyance]" — relatable frustration
 * 4. "[person]: '[ambitious claim]' Me: [reality check]" — dialogue/reality check
 * 5. "i keep [doing X] even though [i know Y]" — self-deprecating observation
 * 6. "nobody talks about [specific thing] and it's [honest take]" — insider observation
 * 7. "every [type of person] i meet [pattern]" — pattern recognition
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

// ---------------------------------------------------------------------------
// Domain knowledge — what's funny/annoying/relatable about each topic
// ---------------------------------------------------------------------------

const DOMAIN_CASUAL = {
  saas: {
    obviousFacts: [
      "SaaS stands for software as a service",
      "MRR doesn't mean you're rich",
      "churn is just breakups with extra steps",
      "a freemium plan is just a free plan nobody upgrades from",
    ],
    sillyBehaviors: [
      "reading it like a youtube poop every time",
      "checking stripe 40 times a day even though nothing changed",
      "calling yourself a founder when you have 3 users",
      "spending more time on your landing page than your product",
    ],
    grandPast: ["Men used to go to war", "People used to build real things", "Our ancestors hunted for food"],
    mundanePresent: ["now they sell b2b SaaS", "now we optimize button colors", "now we fight about pricing tiers"],
    annoyances: [
      "collecting receipts for my accountant",
      "explaining what you do to your parents",
      "chasing overdue invoices from companies that definitely have the money",
      "the 47th feature request this week from someone on the free plan",
      "writing changelog entries nobody reads",
    ],
    ambitiousClaims: [
      "My company can be the next Uber",
      "We're going to disrupt the entire industry",
      "It's like ChatGPT but for [everything]",
      "We're building the operating system for [vague concept]",
    ],
    realityChecks: [
      "That era is over. AI clones it tomorrow.",
      "You have 12 users and 8 of them are your friends.",
      "You're building a Notion clone with worse fonts.",
      "It's a CRUD app with a landing page. That's fine. Just say that.",
    ],
    patterns: [
      "every saas founder i meet is building a project management tool",
      "every indie hacker i talk to is making $0 and calling it 'pre-revenue'",
      "every saas landing page looks the same now — gradient hero, 3 features, 'trusted by' logos that are just other startups",
    ],
    insiderObservations: [
      "nobody talks about how most saas 'success stories' are just people who got lucky with timing",
      "nobody admits that the hardest part of saas isn't building it, it's getting anyone to care",
      "the saas community pretends building in public works but most of them are just performing",
    ],
    actionablePlans: [
      "i've got your next 6 months of SaaS plans right here:\n\n> block off 4 hours of your weekend\n> pick a $1b company\n> build a micro-micro version of it\n> like one-single feature\n> open claude/chatgpt + cursor\n> type 'i'm a noob. i wanna build something like [tool]'\n> ship it by sunday night",
      "how to go from 0 to $1k MRR in 30 days:\n\n> pick a painful problem you've had\n> find 10 people with the same problem\n> ask them what they'd pay for a solution\n> build the smallest version that solves it\n> charge from day 1\n> if nobody pays, the problem wasn't painful enough",
      "the solo founder playbook nobody shares:\n\n> don't raise money\n> don't hire\n> don't build a team\n> build one thing that solves one problem\n> charge for it\n> talk to every user\n> repeat for 2 years",
    ],
  },

  notion: {
    obviousFacts: [
      "Notion is just a database with a pretty UI",
      "Notion's loading speed hasn't improved in 3 years",
      "your 'second brain' in Notion is just a folder of pages you never open",
    ],
    sillyBehaviors: [
      "spending 4 hours setting up a productivity system instead of doing the work",
      "building a custom dashboard you'll look at once",
      "creating a template for something you'll only do one time",
    ],
    annoyances: [
      "waiting 3 seconds for a page to load in 2025",
      "the sync issue that's been 'being worked on' for 2 years",
      "accidentally pressing backspace and deleting your entire database",
    ],
    ambitiousClaims: ["Notion is going to replace every tool", "My Notion setup changed my life"],
    realityChecks: ["It's a notes app. You write notes in it.", "You haven't opened it in 2 weeks.", "Google Docs was right there the whole time."],
    patterns: [
      "every productivity person i meet has a 47-page notion setup and gets nothing done",
      "every notion template i see is just a table with colors",
    ],
    insiderObservations: [
      "nobody talks about how notion made us all less productive because we spend more time organizing than doing",
      "nobody admits their notion workspace is just a graveyard of good intentions",
    ],
    actionablePlans: [
      "your notion setup is too complicated. here's the reset:\n\n> delete everything\n> make 3 pages: work, life, notes\n> no databases\n> no relations\n> no rollups\n> just write things down\n> if you need a database after 30 days, add one",
      "how to actually use notion (not what the gurus tell you):\n\n> pick one template\n> don't customize it for 30 days\n> just use it as-is\n> if something feels missing, add it\n> if something feels extra, delete it\n> stop building systems. start using them.",
    ],
  },

  ai: {
    obviousFacts: [
      "AI stands for artificial intelligence",
      "most 'AI tools' are just a ChatGPT wrapper with a landing page",
      "your AI startup is probably just an API call with extra steps",
    ],
    sillyBehaviors: [
      "calling it 'AI-powered' when it's just a regex",
      "adding 'AI' to your landing page even though you're using a rules engine",
      "pretending your AI tool is different from the other 400 identical ones",
    ],
    grandPast: ["People used to learn skills", "We used to actually write things"],
    mundanePresent: ["now we prompt ChatGPT and call ourselves creators", "now we type 'write me a tweet' and call it content"],
    annoyances: [
      "every AI tool claiming to '10x your productivity' when it just saves you 3 minutes",
      "the 50th 'AI will replace [job]' thread this week",
      "AI content that sounds exactly like AI content trying not to sound like AI content",
    ],
    ambitiousClaims: ["AI won't replace developers, it'll make them 10x better", "AI is going to create more jobs than it destroys"],
    realityChecks: ["Have you actually used it for real work?", "It hallucinated 3 times in your demo.", "Your AI tool is just a search bar."],
    patterns: [
      "every AI bro i meet is building the same tool with a different name",
      "every AI startup i see is just chatgpt with a niche landing page",
    ],
    insiderObservations: [
      "nobody talks about how most AI 'productivity gains' are just doing the same work but faster and worse",
      "nobody admits that AI content is getting boring because it all sounds the same",
    ],
    actionablePlans: [
      "how to actually build an AI tool (not just another wrapper):\n\n> pick a workflow you do manually every week\n> figure out the 3 steps that take the longest\n> automate only those 3 steps with an API call\n> keep the rest manual\n> charge for the time saved, not the AI",
      "the AI tool playbook that actually works:\n\n> don't build a chatbot\n> don't build a wrapper\n> pick one boring industry (dental, legal, plumbing)\n> find their most annoying paperwork\n> automate it with AI\n> they don't care about AI, they care about less paperwork",
    ],
  },

  coding: {
    obviousFacts: [
      "your code doesn't need to be perfect to ship",
      "TypeScript types won't save you from bad architecture",
      "nobody cares about your clean code if the product doesn't work",
    ],
    sillyBehaviors: [
      "spending 3 hours naming a variable",
      "rewriting your entire codebase because the folder structure bothered you",
      "adding TypeScript to a project that has 2 functions",
    ],
    grandPast: ["Men used to go to war", "Programmers used to write assembly"],
    mundanePresent: ["now they argue about tabs vs spaces", "now they fight about which framework is best"],
    annoyances: [
      "the dependency update that breaks everything on a Friday",
      "spending 3 days debugging something that was a typo",
      "the merge conflict that makes you question your career choices",
      "npm install pulling 847 packages for a button component",
    ],
    ambitiousClaims: ["This framework will replace React", "TypeScript prevents all bugs"],
    realityChecks: ["You still have 47 bugs in production.", "Your types are all 'any'.", "It's HTML with extra steps."],
    patterns: [
      "every junior dev i meet is learning 12 frameworks and can't build a CRUD app",
      "every senior dev i talk to just wants to write plain JavaScript",
    ],
    insiderObservations: [
      "nobody talks about how most 'clean code' is just code that's been rewritten so many times it's shorter",
      "nobody admits that the best code is the code you didn't write",
    ],
    actionablePlans: [
      "how to actually learn to code in 2025 (not what bootcamps tell you):\n\n> pick a project you actually want to use\n> build it with claude/chatgpt helping\n> read every line it generates\n> when something breaks, fix it yourself\n> ship it. put it online.\n> build 3 more. that's your portfolio.",
      "the junior dev roadmap nobody shares:\n\n> don't learn 12 frameworks\n> learn one language well\n> build 3 real projects (not todo apps)\n> put them online with real URLs\n> write about what you learned\n> apply to 50 jobs\n> 5 will respond. 1 will hire you.",
    ],
  },

  productivity: {
    obviousFacts: [
      "your productivity system is just procrastination with better branding",
      "you don't need 12 apps to write a to-do list",
      "the best productivity tool is just doing the thing",
    ],
    sillyBehaviors: [
      "spending 4 hours setting up a Notion dashboard to avoid 30 minutes of work",
      "buying a new planner every January and using it for 2 weeks",
      "watching productivity YouTube videos instead of being productive",
    ],
    annoyances: [
      "the 100th 'productivity hack' that's just 'wake up early'",
      "productivity gurus who sell courses on productivity instead of just being productive",
      "the '5 AM club' people who are just sleep deprived and calling it discipline",
    ],
    ambitiousClaims: ["This system will 10x your output", "I do the work of 5 people using this system"],
    realityChecks: ["You just wrote a to-do list. That's it.", "You spent 3 hours on the system and 0 hours on the work.", "A sticky note would've been faster."],
    patterns: [
      "every productivity person i meet has the most elaborate system and the least output",
      "every productivity guru i see is selling a course about productivity",
    ],
    insiderObservations: [
      "nobody talks about how productivity culture is just anxiety with a planner",
      "nobody admits that the most productive people just do the work and don't talk about it",
    ],
    actionablePlans: [
      "your productivity system is broken. here's the fix:\n\n> delete every app except one\n> write 3 things on paper every morning\n> do the first one before checking your phone\n> do the second one before lunch\n> do the third one before 5pm\n> that's it. no apps. no systems. just doing.",
      "i've got your actual productivity plan right here:\n\n> turn off your phone\n> close every tab\n> open one document\n> write the one thing that matters today\n> do it\n> don't open anything else until it's done",
    ],
  },

  remote_work: {
    obviousFacts: [
      "remote work doesn't mean working from a beach in Bali",
      "your home office is just your bedroom with a laptop",
    ],
    sillyBehaviors: [
      "pretending you're productive while watching Netflix",
      "joining the call from bed and calling it 'remote-first culture'",
    ],
    annoyances: [
      "the 47th Zoom meeting that could've been an email",
      "your roommate walking in during a client call",
      "the 'can you hop on a quick call' that's never quick",
    ],
    ambitiousClaims: ["Remote work is the future", "We're more productive working from home"],
    realityChecks: ["You haven't left your apartment in 3 days.", "You're wearing sweatpants in a 'business meeting'.", "Your career is stalling and you know it."],
    patterns: [
      "every remote worker i meet says they're more productive but also more lonely",
      "every remote company i see is just a Slack channel with a payroll",
    ],
    insiderObservations: [
      "nobody talks about how remote work killed mentorship for juniors",
      "nobody admits that 'async communication' just means 'i'll ignore you for 6 hours'",
    ],
    actionablePlans: [
      "how to actually be productive working from home (not the instagram version):\n\n> get dressed. yes, actually dressed.\n> work from one spot, not bed\n> take a real lunch break away from the screen\n> have one human conversation per day (not slack)\n> stop at a set time. not 'when the work is done.'\n> the work is never done.",
    ],
  },

  fitness: {
    obviousFacts: [
      "you don't need supplements to build muscle",
      "the best workout is the one you'll actually do",
      "consistency beats optimization every time",
    ],
    sillyBehaviors: [
      "spending $200/month on supplements to avoid eating vegetables",
      "watching fitness YouTube instead of going to the gym",
      "buying new workout clothes to motivate yourself and never wearing them",
    ],
    annoyances: [
      "fitness influencers giving advice when they've been fit their whole life",
      "the 'just be consistent' advice from someone with perfect genetics",
      "the 47th 'what i eat in a day' video that's just chicken and rice",
    ],
    ambitiousClaims: ["This supplement will change your life", "This workout routine is all you need"],
    realityChecks: ["You just need to eat less and move more.", "You haven't been to the gym in a month.", "It's chicken and rice. That's the secret."],
    patterns: [
      "every fitness influencer i see is on steroids and telling you it's just 'hard work'",
      "every fitness app i try is just a timer with a subscription",
    ],
    insiderObservations: [
      "nobody talks about how most fitness advice is just 'eat less, move more' wrapped in 47 pages of branding",
      "nobody admits that the hardest part of fitness isn't the workout, it's showing up when you don't feel like it",
    ],
    actionablePlans: [
      "the actual beginner fitness plan (not what influencers sell you):\n\n> walk 30 minutes every day\n> do 10 push-ups and 10 squats 3x a week\n> eat protein with every meal\n> sleep 7 hours\n> do this for 90 days before you buy anything\n> that's it. that's the whole plan.",
    ],
  },

  money: {
    obviousFacts: [
      "you don't need to be an expert to invest in index funds",
      "day trading is just gambling with extra steps",
      "your $5 coffee isn't why you're broke",
    ],
    sillyBehaviors: [
      "checking your portfolio 40 times a day when you're investing for retirement",
      "watching finance YouTube instead of just buying index funds",
      "calling yourself an investor when you bought $50 of crypto",
    ],
    annoyances: [
      "the 'stop buying coffee' advice from someone who owns 3 houses",
      "finance influencers selling courses on how to get rich",
      "the 47th 'passive income' video that's just 'start a YouTube channel'",
    ],
    ambitiousClaims: ["This strategy will make you rich", "I turned $1000 into $100k"],
    realityChecks: ["You bought high and sold low. Again.", "That 'passive income' is just a second job.", "Index funds. That's the answer. It's always index funds."],
    patterns: [
      "every finance bro i meet is renting an apartment and giving investment advice",
      "every crypto person i talk to is down 60% and still saying 'have fun staying poor'",
    ],
    insiderObservations: [
      "nobody talks about how most 'wealth building' is just 'spend less than you earn and invest the rest'",
      "nobody admits that the finance industry profits from making simple things seem complicated",
    ],
    actionablePlans: [
      "the actual money plan for your 20s (not what finance gurus sell):\n\n> spend less than you earn\n> put the rest in a low-cost index fund\n> do this every month automatically\n> don't touch it for 30 years\n> that's it. no crypto. no day trading. no courses.",
    ],
  },

  content: {
    obviousFacts: [
      "going viral once doesn't make you a creator",
      "your follower count doesn't matter if nobody engages",
      "engagement bait is just begging with extra steps",
    ],
    sillyBehaviors: [
      "checking your analytics 40 times a day",
      "writing threads about how to write threads",
      "calling yourself a 'content strategist' when you just post memes",
    ],
    annoyances: [
      "the 'how i got 100k followers' thread from someone who bought followers",
      "engagement bait threads that are just '1/ 🧵' and then nothing",
      "the 47th 'build in public' post that's just humble bragging",
    ],
    ambitiousClaims: ["I can teach you to go viral", "This framework will 10x your engagement"],
    realityChecks: ["You have 200 followers and 180 are bots.", "Your viral post was luck. Admit it.", "Posting every day isn't a strategy, it's a compulsion."],
    patterns: [
      "every content creator i meet is burned out and calling it 'grindset'",
      "every growth hacker i talk to is just posting more and hoping",
    ],
    insiderObservations: [
      "nobody talks about how most 'viral' accounts just got lucky once and have been chasing it since",
      "nobody admits that the algorithm doesn't care about quality, it cares about arguments",
    ],
    actionablePlans: [
      "how to actually grow on X (not what growth gurus sell you):\n\n> post about one topic for 90 days\n> reply to 10 bigger accounts every day\n> don't thread. don't 'build in public.' just post real shit.\n> if a post does well, post the opposite take next week\n> the algorithm rewards arguments, not quality",
    ],
  },

  career: {
    obviousFacts: [
      "your job title doesn't define your worth",
      "nobody cares about your GPA after your first job",
      "networking is just making friends with extra steps",
    ],
    sillyBehaviors: [
      "updating your LinkedIn every time you learn a new Excel function",
      "calling yourself a 'thought leader' when you have 200 LinkedIn connections",
      "going to networking events and talking to no one",
    ],
    annoyances: [
      "the 'we're like a family here' companies that lay you off in 3 months",
      "the 47th 'hustle culture' post from someone who inherited a business",
      "LinkedIn posts that start with 'I'm humbled to announce...'",
    ],
    ambitiousClaims: ["This career hack will get you promoted", "I 10x'd my salary in 2 years"],
    realityChecks: ["You just job-hopped. That's the secret.", "Your LinkedIn post got 3 likes. From your mom.", "Nobody reads cover letters. Nobody."],
    patterns: [
      "every career coach i meet has never had a real job",
      "every linkedin influencer i see is just posting motivational quotes over stock photos",
    ],
    insiderObservations: [
      "nobody talks about how most 'career growth' is just switching companies every 2 years",
      "nobody admits that the best career move is usually just staying somewhere long enough to get good",
    ],
    actionablePlans: [
      "how to actually get promoted (not what career coaches tell you):\n\n> do your job well for 6 months\n> ask your boss what 'great' looks like\n> do that for 6 months\n> ask for the promotion with evidence\n> if they say no, switch companies\n> repeat every 2 years",
    ],
  },

  design: {
    obviousFacts: [
      "your design system is just a Figma file you don't update",
      "nobody notices your 2px padding adjustment",
      "a gradient isn't a brand identity",
    ],
    sillyBehaviors: [
      "redesigning your portfolio instead of applying for jobs",
      "spending 4 hours picking the perfect font that nobody will notice",
      "calling yourself a 'design thinker' when you just like pretty things",
    ],
    annoyances: [
      "every SaaS landing page looking the same now",
      "the 'design is not decoration' people who then make everything decorative",
      "designers who can't take feedback but call it 'defending their work'",
    ],
    ambitiousClaims: ["This design will increase conversions 10x", "Good design is good business"],
    realityChecks: ["It's a button. Just make it blue.", "Your 'design system' has 3 components. That's a style guide.", "Users don't care about your kerning."],
    patterns: [
      "every designer i meet is redesigning their portfolio instead of doing client work",
      "every design twitter thread is just 'here's why [obvious thing] is actually profound'",
    ],
    insiderObservations: [
      "nobody talks about how most 'award-winning' designs are unusable in practice",
      "nobody admits that the best design is usually the simplest one that shipped on time",
    ],
    actionablePlans: [
      "how to actually get better at design (not what design twitter tells you):\n\n> copy 10 designs you like. pixel for pixel.\n> don't post them. just do them.\n> then redesign the same 10 in your own style\n> ship one real project\n> get feedback from users, not designers\n> repeat",
    ],
  },

  general: {
    obviousFacts: [
      "everyone's pretending they know what they're doing",
      "most advice is just someone describing what worked for them once",
    ],
    sillyBehaviors: [
      "reading advice instead of doing the thing",
      "saving this post and never looking at it again",
    ],
    annoyances: [
      "the 47th 'life-changing' hack that's just common sense",
    ],
    ambitiousClaims: ["This will change your life"],
    realityChecks: ["It won't. You'll forget about it by tomorrow."],
    patterns: [
      "everyone i meet is pretending they have it figured out",
    ],
    insiderObservations: [
      "nobody talks about how most 'success' is just luck with good branding",
    ],
  },
};

// ---------------------------------------------------------------------------
// Generate a casual tweet from a topic
// ---------------------------------------------------------------------------

function generateCasual(topic, domain) {
  const d = DOMAIN_CASUAL[domain] || DOMAIN_CASUAL.general;
  const candidates = [];

  // Pattern 1: "i KNOW [obvious fact] but [silly behavior]"
  // Like arra: "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time"
  if (d.obviousFacts.length > 0 && d.sillyBehaviors.length > 0) {
    for (const fact of d.obviousFacts) {
      for (const behavior of d.sillyBehaviors) {
        candidates.push(`i KNOW ${fact.toLowerCase()} but that will not stop me from ${behavior}`);
      }
    }
  }

  // Pattern 2: "[grand past] and now [mundane present]"
  // Like Jake: "Men used to go to war and now they sell b2b SaaS"
  if (d.grandPast && d.mundanePresent) {
    for (const past of d.grandPast) {
      for (const present of d.mundanePresent) {
        candidates.push(`${past} and ${present}`);
      }
    }
  }

  // Pattern 3: "the most annoying part of [activity] is [specific annoyance]"
  // Like levelsio: "the most annoying part of running a business for me is collecting receipts"
  for (const annoyance of d.annoyances) {
    candidates.push(`the most annoying part of ${domain === "saas" ? "running a SaaS" : domain === "coding" ? "coding" : domain === "fitness" ? "getting fit" : domain === "money" ? "managing money" : domain === "content" ? "creating content" : domain === "career" ? "your career" : domain === "design" ? "design" : domain === "productivity" ? "productivity" : "this"} is ${annoyance}`);
  }

  // Pattern 4: "[person]: '[ambitious claim]' Me: [reality check]"
  // Like George Pu: "Founder: 'My company can be the next Uber.' Me: That era is over."
  if (d.ambitiousClaims && d.realityChecks) {
    const person = domain === "saas" ? "Founder" : domain === "ai" ? "AI bro" : domain === "coding" ? "Junior dev" : domain === "fitness" ? "Fitness influencer" : domain === "money" ? "Finance bro" : domain === "content" ? "Growth hacker" : domain === "career" ? "Career coach" : domain === "design" ? "Designer" : "Everyone";
    for (const claim of d.ambitiousClaims) {
      for (const check of d.realityChecks) {
        candidates.push(`${person}: "${claim}"\n\nMe: ${check}`);
      }
    }
  }

  // Pattern 5: "every [type of person] i meet [pattern]"
  for (const pattern of d.patterns) {
    candidates.push(pattern);
  }

  // Pattern 6: "nobody talks about [specific thing] and [honest take]"
  for (const obs of d.insiderObservations) {
    candidates.push(obs);
  }

  // Pattern 7: Actionable plan — like Starter Story
  // "i've got your [timeframe] plans right here:
  // > step 1
  // > step 2
  // > step 3"
  if (d.actionablePlans) {
    for (const plan of d.actionablePlans) {
      candidates.push(plan);
    }
  }

  return candidates;
}

module.exports = { generateCasual, DOMAIN_CASUAL };
