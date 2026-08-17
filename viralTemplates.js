/*
 * Viral tweet templates — real formats that blew up on X, extracted from
 * deep research on @nevodavid/@wickedguro, @leomeethewoo, ChatCSV,
 * RalphBlaster, Chatbase, Fieldy, Kalash Vasaniya, Rob Hallam, and
 * 2026 viral format analysis.
 *
 * Each template has:
 *  - id, name
 *  - detect(text): returns 0-1 confidence the text matches this format
 *  - transform(text, analysis): rewrites text into this format
 *  - example: a real viral tweet using this format
 *  - why: why it triggers the algorithm
 *  - bestFor: when to use it
 */

"use strict";

const { analyze } = require("./engagementAlgo");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hasMoney(s) { return /\$[\d,]+(\.\d+)?\s?(k|m|arr|mrr)?/i.test(s); }
function hasMRR(s) { return /\b(mrr|arr|revenue|monthly recurring)\b/i.test(s); }
function hasTime(s) { return /\b(\d+\s?(days?|weeks?|months?|hours?|minutes?|years?|weekend))\b/i.test(s); }
function hasFollowers(s) { return /\b(followers?|following)\b/i.test(s); }
function hasBuilt(s) { return /\b(i (built|made|shipped|created|launched|developed)|just (built|shipped|launched)|^built\b|built a (new|tool|app|feature|system|product))\b/i.test(s); }
function hasDemo(s) { return /\b(demo|video|screen.?record|watch|show|gif|clip)\b/i.test(s); }
function hasFailure(s) { return /\b(failed?|failure|mistake|wrong|broke|lost|quit|gave up|\$0|made no money|didn't work|flop)\b/i.test(s); }
function hasContrarian(s) { return /\b(nobody|everyone|most people|they say|wrong about|myth|bullshit|bs|actually|real truth|unpopular opinion)\b/i.test(s); }
function hasThread(s) { return /\b(thread|🧵|\d+\/\d+)\b/i.test(s); }
function hasBreakdown(s) { return /\b(breakdown|how (i|we) (made|did|built)|exact|step.by.step|process|behind the scenes)\b/i.test(s); }
function hasList(s) { return /\b(\d+\s?(things|lessons|ways|tips|mistakes|steps|rules|secrets|habits))\b/i.test(s); }
function hasData(s) { return /\b(analyzed?|studied?|researched?|data|stats|metric|chart|graph|numbers?)\b/i.test(s); }
function hasQuestion(s) { return s.trimEnd().endsWith("?"); }
function hasAnti(s) { return /\b(everyone'?s|stop|don'?t|never|instead|rather than|unlike|fuck it|f\*\* it)\b/i.test(s); }
function hasCTA(s) { return /\b(buy|sign up|try|join|link|reply|dm|book|schedule|waitlist)\b/i.test(s); }
function hasLowercase(s) { return /^[a-z]/.test(s.trim()); }
function hasSpecificNumber(s) { return /\b\d[\d,.]*\b/.test(s); }
function hasBeforeAfter(s) { return /\b(from|to|before|after|went|grew|started|now|used to)\b/i.test(s); }

// Extract the first "thing" the post is about (product name, topic)
function extractSubject(text) {
  // 1. try to find a product/tool name — look for patterns like "my app", "called X", "X.co", brand names
  const named = text.match(/(?:called|named|building|launched|shipped|built)\s+([A-Z][\w]+)/);
  if (named) return named[1];
  const dotBrand = text.match(/\b([A-Z][\w]+)\.(?:co|com|io|app|space|xyz|ai)\b/);
  if (dotBrand) return dotBrand[1];
  // 2. look for "my X" or "our X" patterns where X is a proper noun
  const possive = text.match(/\b(?:my|our)\s+([A-Z][\w]+)/);
  if (possive && !/^(App|Product|Tool|Feature|Startup|Company|Project|New|First|Last|Video|Demo|Launch|Update|Work|Day|Week|Month|Year)$/i.test(possive[1])) {
    return possive[1];
  }
  // 3. try to find a proper noun (capitalized word NOT at sentence start)
  // Only accept if it's clearly a name (2+ chars, not a common word/verb)
  const sentences = text.split(/[.!?]+/);
  const common = new Set(["The", "This", "That", "It", "I", "We", "My", "Our", "Just", "So", "But", "And", "Or", "A", "An", "Excited", "Today", "Everyone", "Here", "Now", "When", "If", "Most", "People", "Many", "Some", "All", "Every", "After", "Before", "Finally", "Honestly", "Look", "Listen", "Stop", "Don", "Check", "Let", "Think", "Added", "Built", "Shipped", "Launched", "Created", "Made", "Got", "Want", "Need", "Try", "Started", "Failed", "Learned", "Discovered", "Realized", "Share", "Sharing", "Posting", "Reply", "Agree", "Disagree", "Nobody", "Anyone", "Someone", "There", "These", "Those", "Each", "Both", "More", "Less", "Very", "Much", "Such", "Too", "Also", "Even", "Still", "Never", "Always", "Only", "Quite", "Rather", "Pretty", "Really", "Actually", "Basically", "Literally", "Simply", "Eventually", "Currently", "Recently", "Already", "Sometimes", "Usually", "Often", "Rarely", "Seldom", "Will", "AI", "Let", "Look", "Here", "Many", "Thoughts", "Thought", "Ideas", "Idea", "Things", "Thing", "Stuff", "Work", "Today", "Yesterday", "Tomorrow", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "SaaS", "Product", "App", "Tool", "Feature", "Demo", "Video", "Thread", "Post", "Tweet", "Launch", "Update", "Milestone", "Journey", "Story", "Breakdown", "Process", "Result", "Outcome", "Output", "Input", "Data", "Stats", "Numbers", "Metrics", "Growth", "Revenue", "MRR", "ARR", "Users", "Customers", "Followers", "Impressions", "Views", "Likes", "Replies", "Retweets", "Bookmarks", "Shares", "Clicks", "Conversions", "Sales", "Profit", "Loss", "Cost", "Price", "Value", "Worth", "Time", "Money", "Effort", "Energy", "Focus", "Attention", "Interest", "Passion", "Purpose", "Mission", "Vision", "Goal", "Target", "Objective", "Strategy", "Tactic", "Plan", "Idea", "Concept", "Framework", "System", "Method", "Approach", "Technique", "Habit", "Routine", "Practice", "Exercise", "Workout", "Diet", "Food", "Sleep", "Health", "Fitness", "Body", "Mind", "Brain", "Heart", "Soul", "Spirit", "Life", "Death", "Birth", "Growth", "Change", "Transformation", "Evolution", "Revolution", "Innovation", "Disruption", "Trend", "Fad", "Craze", "Hype", "Buzz", "Noise", "Signal", "Message", "Communication", "Conversation", "Dialogue", "Discussion", "Debate", "Argument", "Fight", "Conflict", "Resolution", "Solution", "Problem", "Challenge", "Opportunity", "Threat", "Risk", "Reward", "Benefit", "Advantage", "Disadvantage", "Drawback", "Limitation", "Constraint", "Boundary", "Edge", "Frontier", "Horizon", "Future", "Past", "Present", "Now", "Then", "Next", "Last", "First", "Final", "Initial", "Original", "New", "Old", "Young", "Fresh", "Stale", "Modern", "Ancient", "Classic", "Traditional", "Conventional", "Unconventional", "Radical", "Extreme", "Moderate", "Mild", "Strong", "Weak", "Powerful", "Effective", "Efficient", "Productive", "Creative", "Innovative", "Disruptive", "Revolutionary", "Evolutionary", "Transformative", "Game", "Changer", "Breakthrough", "Leap", "Jump", "Step", "Stage", "Phase", "Level", "Tier", "Grade", "Rank", "Score", "Rating", "Review", "Feedback", "Criticism", "Praise", "Compliment", "Insult", "Offense", "Defense", "Protection", "Security", "Safety", "Danger", "Risk", "Hazard", "Threat", "Fear", "Hope", "Dream", "Wish", "Desire", "Want", "Need", "Craving", "Yearning", "Longing", "Missing", "Lacking", "Having", "Holding", "Keeping", "Losing", "Gaining", "Winning", "Losing", "Tying", "Drawing", "Playing", "Working", "Resting", "Sleeping", "Waking", "Living", "Dying", "Surviving", "Thriving", "Struggling", "Suffering", "Enjoying", "Loving", "Hating", "Liking", "Disliking", "Wanting", "Needing", "Having", "Getting", "Taking", "Giving", "Receiving", "Sending", "Sharing", "Posting", "Tweeting", "Replying", "Commenting", "Liking", "Retweeting", "Bookmarking", "Following", "Unfollowing", "Blocking", "Reporting", "Ignoring", "Noticing", "Seeing", "Watching", "Listening", "Hearing", "Reading", "Writing", "Typing", "Clicking", "Tapping", "Swiping", "Scrolling", "Browsing", "Searching", "Finding", "Discovering", "Exploring", "Investigating", "Researching", "Studying", "Learning", "Teaching", "Training", "Practicing", "Rehearsing", "Performing", "Showing", "Demonstrating", "Presenting", "Explaining", "Describing", "Defining", "Clarifying", "Simplifying", "Complicating", "Confusing", "Understanding", "Comprehending", "Grasping", "Realizing", "Recognizing", "Acknowledging", "Admitting", "Confessing", "Denying", "Rejecting", "Accepting", "Embracing", "Welcoming", "Greeting", "Meeting", "Introducing", "Presenting", "Announcing", "Declaring", "Proclaiming", "Stating", "Saying", "Telling", "Speaking", "Talking", "Discussing", "Debating", "Arguing", "Fighting", "Battling", "Warring", "Peace", "War", "Conflict", "Harmony", "Balance", "Imbalance", "Stability", "Instability", "Certainty", "Uncertainty", "Clarity", "Confusion", "Order", "Chaos", "Structure", "Freedom", "Control", "Power", "Weakness", "Strength", "Force", "Energy", "Matter", "Space", "Time", "Dimension", "Reality", "Fantasy", "Truth", "Lie", "Fact", "Fiction", "Myth", "Legend", "Story", "Tale", "Narrative", "Plot", "Character", "Setting", "Theme", "Motif", "Symbol", "Metaphor", "Simile", "Analogy", "Comparison", "Contrast", "Similarity", "Difference", "Change", "Continuity", "Permanence", "Impermanence", "Eternity", "Infinity", "Finite", "Infinite", "Limit", "Bound", "Boundless", "Endless", "End", "Beginning", "Start", "Finish", "Complete", "Incomplete", "Whole", "Part", "Piece", "Fragment", "Fraction", "Portion", "Share", "Section", "Segment", "Division", "Unity", "Union", "Separation", "Connection", "Disconnection", "Link", "Bridge", "Gap", "Distance", "Closeness", "Far", "Near", "Close", "Distant", "Remote", "Local", "Global", "Universal", "Cosmic", "Earthly", "Heavenly", "Divine", "Human", "Animal", "Plant", "Mineral", "Element", "Compound", "Mixture", "Blend", "Combination", "Integration", "Synthesis", "Analysis", "Breakdown", "Buildup", "Growth", "Decay", "Life", "Death", "Birth", "Rebirth", "Renewal", "Restoration", "Recovery", "Healing", "Curing", "Treating", "Managing", "Handling", "Dealing", "Coping", "Adapting", "Adjusting", "Modifying", "Changing", "Transforming", "Converting", "Translating", "Interpreting", "Explaining", "Understanding", "Knowing", "Believing", "Doubting", "Trusting", "Suspecting", "Accusing", "Defending", "Protecting", "Guarding", "Shielding", "Sheltering", "Housing", "Building", "Constructing", "Creating", "Making", "Producing", "Manufacturing", "Assembling", "Putting", "Placing", "Positioning", "Locating", "Finding", "Searching", "Seeking", "Looking", "Watching", "Observing", "Noticing", "Spotting", "Identifying", "Recognizing", "Acknowledging", "Confirming", "Verifying", "Checking", "Testing", "Trying", "Attempting", "Endeavoring", "Striving", "Struggling", "Fighting", "Battling", "Warring", "Competing", "Contesting", "Challenging", "Defying", "Resisting", "Opposing", "Supporting", "Backing", "Endorsing", "Approving", "Authorizing", "Permitting", "Allowing", "Granting", "Giving", "Offering", "Providing", "Supplying", "Furnishing", "Equipping", "Arming", "Preparing", "Readying", "Setting", "Arranging", "Organizing", "Ordering", "Sorting", "Classifying", "Categorizing", "Grouping", "Clustering", "Bundling", "Packaging", "Wrapping", "Covering", "Hiding", "Concealing", "Revealing", "Exposing", "Showing", "Displaying", "Presenting", "Demonstrating", "Illustrating", "Exemplifying", "Embodying", "Representing", "Symbolizing", "Signifying", "Meaning", "Indicating", "Suggesting", "Implying", "Hinting", "Insinuating", "Intimating", "Mentioning", "Referencing", "Citing", "Quoting", "Paraphrasing", "Summarizing", "Condensing", "Abbreviating", "Shortening", "Lengthening", "Extending", "Expanding", "Growing", "Increasing", "Decreasing", "Reducing", "Shrinking", "Contracting", "Compressing", "Squeezing", "Pressing", "Pushing", "Pulling", "Drawing", "Dragging", "Hauling", "Carrying", "Bearing", "Supporting", "Holding", "Keeping", "Retaining", "Maintaining", "Sustaining", "Preserving", "Conserving", "Saving", "Storing", "Hoard", "Collect", "Gather", "Assemble", "Convene", "Meet", "Greet", "Welcome", "Receive", "Accept", "Take", "Grab", "Snatch", "Seize", "Capture", "Catch", "Hold", "Keep", "Have", "Own", "Possess", "Control", "Manage", "Direct", "Guide", "Lead", "Follow", "Pursue", "Chase", "Hunt", "Track", "Trace", "Find", "Discover", "Uncover", "Reveal", "Expose", "Show", "Display", "Present", "Offer", "Give", "Provide", "Supply", "Deliver", "Send", "Ship", "Transport", "Move", "Transfer", "Shift", "Relocate", "Place", "Put", "Set", "Lay", "Position", "Arrange", "Organize", "Sort", "Order", "Structure", "Form", "Shape", "Mold", "Cast", "Forge", "Create", "Make", "Build", "Construct", "Assemble", "Produce", "Generate", "Yield", "Bear", "Deliver", "Provide", "Offer", "Give", "Grant", "Award", "Reward", "Compensate", "Pay", "Buy", "Purchase", "Acquire", "Obtain", "Get", "Receive", "Accept", "Take", "Seize", "Grab", "Snatch", "Capture", "Catch", "Hold", "Keep", "Retain", "Maintain", "Sustain", "Preserve", "Conserve", "Save", "Store", "Keep", "Hold", "Have", "Own", "Possess"]);
  for (const sentence of sentences) {
    // find capitalized words NOT at the start of the sentence
    const words = sentence.match(/\b([A-Z][a-z]+)\b/g) || [];
    for (const w of words) {
      // skip the first word of each sentence (it's capitalized by grammar, not a name)
      if (!common.has(w) && w.length >= 3) {
        // check it's not the first word
        const idx = sentence.indexOf(w);
        const before = sentence.slice(0, idx).trim();
        if (before.length > 3) return w; // not at sentence start
      }
    }
  }
  // 4. No clear subject found — return "this" (transforms handle this gracefully)
  return "this";
}

// Extract any number from text (returns just the digits, no $ sign)
function extractNumber(text) {
  const m = text.match(/\$?(\d[\d,.]*)/);
  return m ? m[1] : null;
}

// Extract a timeframe
function extractTime(text) {
  const m = text.match(/(\d+\s?(?:days?|weeks?|months?|hours?|minutes?|years?|weekend))/i);
  return m ? m[0] : "a weekend";
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const TEMPLATES = [

  {
    id: "mrr_milestone",
    name: "MRR/Revenue Milestone",
    why: "Specific numbers + before/after contrast = social proof + curiosity. Nevo's $120k MRR tweet is the template.",
    bestFor: "When you hit a revenue or growth milestone",
    example: "Postiz just reached $120k MRR!\nI would never have imagined that my app in February ($21k MRR) would go up to $120k MRR in 4 months.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // Require ACTUAL revenue/MRR language — not just any number
      if (hasMRR(t)) s += 0.5;
      if (/\b(revenue|mrr|arr|monthly recurring|annual recurring)\b/.test(t)) s += 0.3;
      if (hasMoney(t) && /\b(reached|hit|crossed|passed|grew|grew from|went from)\b/.test(t)) s += 0.2;
      if (hasBeforeAfter(t) && hasMoney(t)) s += 0.2;
      // Don't score high just for having a number — that was the bug
      if (hasSpecificNumber(t) && !hasMoney(t)) s += 0.05;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const subject = extractSubject(text);
      // try to find a "from" number for before/after
      const beforeMatch = text.match(/(?:from|was|at|started(?:\s+at)?)\s+\$?(\d[\d,.]*)/i);
      const beforeNum = beforeMatch ? "$" + beforeMatch[1] : "$0";
      // Only use this format if there's a real number in the text
      if (num) {
        return `${subject} just reached $${num}!\nI would never have imagined that this was at ${beforeNum} just a few months ago.\n\nHere's what actually drove the growth 👇`;
      }
      // No number — fall back to a milestone-style hook without fake numbers
      return `${subject} just hit a milestone I didn't think was possible.\n\nA few months ago this was just an idea.\n\nHere's what actually drove the growth 👇`;
    },
  },

  {
    id: "i_built_in_time",
    name: "I Built X in Y Time",
    why: "Time constraint creates curiosity gap. ChatCSV ('Couldn't get access, so built it') and Chatbase ('6 weeks ago I started building') both used this.",
    bestFor: "After shipping a side project or feature",
    example: "6 weeks ago I started building Chatbase.co. It lets you create a ChatGPT-like chatbot from any PDF document.\n\nCouldn't get access to OpenAI Code interpreter, so built it myself.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasBuilt(t)) s += 0.4;
      if (hasTime(t)) s += 0.35;
      if (/\b(started building|started (to )?build)\b/.test(t)) s += 0.15;
      if (/\b(so|because|couldn'?t|didn'?t have)\b/.test(t)) s += 0.1;
      if (hasSpecificNumber(t)) s += 0.05;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      const time = extractTime(text);
      // try to find the "why" — the problem that led to building it
      const whyMatch = text.match(/(?:because|so|couldn'?t|didn'?t have|need(ed)? to|wanted to)\s+(.{10,80})/i);
      const why = whyMatch ? whyMatch[1].trim() : "the existing tools weren't good enough";
      return `${time} ago I started building ${subject}.\n\nCouldn't find what I needed, so built it myself.\n\nHere's what it does 👇`;
    },
  },

  {
    id: "zero_to_x",
    name: "$0 to $X Revenue Reveal",
    why: "The '$0 to $X' frame is instantly recognizable. 'No VC, no ads, no influencers' triad creates controversy → replies. @dillionverma's version got 463K views.",
    bestFor: "When you hit a meaningful revenue milestone with an unusual growth story",
    example: "i bootstrapped my first app from 0 to $300k MRR in 45 days. no vc, no paid ads, no influencers.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\$0|0 to|from 0/.test(t)) s += 0.4;
      if (hasMoney(t)) s += 0.2;
      if (hasTime(t)) s += 0.2;
      if (/\b(no vc|no ads|no funding|bootstrapped|self.funded)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const time = extractTime(text) || "90 days";
      if (num) {
        return `i went from $0 to $${num} in ${time}.\n\nno vc. no paid ads. no influencers.\n\nhere's exactly what i did 🧵`;
      }
      return `i went from nothing to something real in ${time}.\n\nno vc. no paid ads. no influencers.\n\nhere's exactly what i did 🧵`;
    },
  },

  {
    id: "demo_absurd",
    name: "Demo + 'It's Absurd'",
    why: "Curiosity hook ('it's absurd') + concrete workflow transformation + bullet points. RalphBlaster got 221K views, 2500 bookmarks with this.",
    bestFor: "When you ship a tool/feature that transforms a workflow",
    example: "I just built RalphBlaster™ 😋 and it's absurd\n\nMy entire workflow is now:\n- create ticket\n- click to generate PRD\n- approve it\n- Ralph does the rest\n\nI don't touch an editor or terminal\n\nIt's a new world",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasBuilt(t)) s += 0.2;
      if (/\b(absurd|insane|crazy|wild|nuts|ridiculous|mind.blown|blown away)\b/.test(t)) s += 0.4;
      if (/\b(workflow|now|entire|whole)\b/.test(t)) s += 0.2;
      if (text.includes("\n-") || text.includes("\n•")) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      // "I fixed a problem" variant — punchy hook + preserved story
      if (/\b(i fixed|i figured out|solved|finally cracked|spent months)\b/i.test(text)) {
        // Build a punchy hook from the original first sentence
        const firstSentence = text.split(/[.!?]+/)[0].trim();
        // Shorten "I spent months figuring out why X" → "why do X"
        let hook = firstSentence
          .replace(/^i spent months figuring out why /i, "why do ")
          .replace(/^i spent .* figuring out why /i, "why do ")
          .replace(/\.$/, "");
        if (!hook.endsWith("?")) hook += "?";

        // Extract proof points — split on both newlines AND sentences
        const allSentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => {
          const sl = s.toLowerCase();
          return s.length > 10 && !/^(then i fixed|agree or|https?:|i spent months|figured out|excited|thrilled|check out)/i.test(sl);
        });
        // Find the key proof: lines with numbers, "edited", "zero", "perfect", etc.
        const proofPoints = allSentences.filter((s) => {
          const sl = s.toLowerCase();
          return /\b(edited|zero|perfect|pacing|hook|minute|hour|just \d|dead air|built|shipped|launched)\b/i.test(sl);
        });

        const out = [];
        out.push(hook);
        out.push("");
        out.push("then I fixed it.");
        out.push("");
        for (const p of proofPoints.slice(0, 2)) {
          out.push(p.toLowerCase().replace(/\.$/, "") + ".");
          out.push("");
        }
        out.push("it's a new world.");
        return out.join("\n");
      }
      // Default: "I just built X and it's absurd"
      const toolMatch = text.match(/\b(ai tool|ai agent|app|tool|product|feature|bot|platform|service)\b/i);
      const toolWord = toolMatch ? toolMatch[0].toLowerCase() : null;
      const article = toolWord && /^[aeiou]/.test(toolWord) ? "an" : "a";
      const subject = toolWord ? `${article} ${toolWord}` : "this";
      // Split on sentence boundaries — but NOT periods in version numbers (v2.0) or decimals
      const sentences = text.split(/(?<!\d)[.!?]+(?!\d)/).map((s) => s.trim()).filter((s) => {
        const sl = s.toLowerCase();
        return s.length > 10 && !/^(excited|thrilled|happy|proud|just launched|check out|here is|here'?s|built|launched|shipped|created|made|we'?re|after months|agree or|reply with|what'?s your)/i.test(sl);
      });
      const actions = sentences.slice(0, 3).map((s) => `- ${s.toLowerCase()}`);
      return `I just built ${subject} and it's absurd\n\nMy entire workflow is now:\n${actions.join("\n")}\n\nI don't touch the old way anymore\n\nIt's a new world`;
    },
  },

  {
    id: "contrarian_take",
    name: "Contrarian Founder Take",
    why: "Direct challenge to conventional wisdom forces replies (+75 signal). 'Posting daily is killing your growth' format. Nevo's 'SaaS is dead' tweet.",
    bestFor: "When you have genuine conviction against a popular belief",
    example: "Posting daily on X is killing your growth. Here's what actually works:",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasContrarian(t)) s += 0.4;
      if (/\b(killing|dead|wrong|myth|bullshit|lie|scam|fake)\b/.test(t)) s += 0.3;
      if (/\b(here'?s what|actually|real truth|instead)\b/.test(t)) s += 0.2;
      if (text.length < 120) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // extract the core claim and make it contrarian
      const firstLine = text.split("\n")[0].trim();
      // Remove weak openers
      let claim = firstLine.replace(/^(i think|i believe|in my opinion|imo|here are some thoughts about|here is what|i want to share some thoughts about)\s*/i, "");
      // If the claim is still generic, make it punchy
      if (/^(building in public|thoughts about|what i learned|building a startup)/i.test(claim)) {
        claim = "building in public is overrated.";
      }
      // If the claim starts with "some thoughts about X", make it contrarian
      claim = claim.replace(/^some thoughts about (.+)/i, "$1 is overrated.");
      // Remove trailing "A thread 🧵" or similar
      claim = claim.replace(/\s+a thread.*$/i, "").replace(/\s+let me (tell|share).*$/i, "").trim();
      return `${claim}\n\nHere's what actually works 👇`;
    },
  },

  {
    id: "failure_list",
    name: "Failure List / Confession",
    why: "Extreme vulnerability builds trust. Rob Hallam's 'I built 5 products that made $0' tweet led to his first $3k client. Failure posts outperform wins 2:1.",
    bestFor: "When you've failed at something and want to build trust",
    example: "I built 5 products that made $0\n\nI built Indiedex. Made no money.\nI built Brandcast. Made no money.\nI built TechServia. Didn't even launch.\n\n5 products. $0.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasFailure(t)) s += 0.4;
      if (/\b(built|made|launched|tried)\b/.test(t) && /\$0|zero|nothing|no money/.test(t)) s += 0.3;
      if ((t.match(/\n/g) || []).length >= 2) s += 0.2;
      if (/\b\d+\s?(products?|times?|attempts?|failures?)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const lines = text.split("\n").filter((l) => l.trim());
      const count = lines.length;
      return `I built ${count} things that made $0\n\n${lines.slice(0, 5).map((l) => `I ${l.trim().replace(/^(i |I )/, "")}`).join("\n")}\n\n${count} attempts. $0.\n\nHere's what I learned 👇`;
    },
  },

  {
    id: "anti_pattern_launch",
    name: "Anti-Pattern Launch",
    why: "Everyone's doing X, I'm doing Y. Fieldy's 'Everyone's posting demos — f** it. Buy this' got 600k impressions + $20k in 24h. Authenticity + direct CTA.",
    bestFor: "When launching something and you want to cut through the noise",
    example: "Everyone's posting demos — f** it. Buy this and I'll ship next week.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasAnti(t)) s += 0.4;
      if (hasCTA(t)) s += 0.3;
      if (/\b(everyone|everybody|all these|stop posting|enough)\b/.test(t)) s += 0.2;
      if (text.length < 100) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `Everyone's posting demos.\n\n${subject} is live. Buy it and I'll ship the next feature this week.\n\nNo waitlist. No landing page. Just the product.`;
    },
  },

  {
    id: "build_in_public_daily",
    name: "Build in Public Daily",
    why: "Lowercase + specific + screenshot = authenticity. 2026 format: lowercase openers average 387 likes vs 76 for bold claims. Predictable cadence trains the algorithm.",
    bestFor: "Daily updates while building (within 30 min of a commit)",
    example: "shipped the onboarding flow today. here's the before/after\n\ntook 4 hours. the old version had a 62% drop-off at step 2.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasLowercase(text)) s += 0.3;
      if (/\b(shipped?|built|fixed|pushed|deployed|launched|done|finished)\b/.test(t)) s += 0.3;
      if (hasSpecificNumber(t)) s += 0.2;
      if (text.length < 200) s += 0.1;
      if (/\b(today|just now|this morning)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const lines = text.split("\n").filter((l) => l.trim());
      const firstLine = lines[0].trim();
      // lowercase the first letter (build in public style)
      const lower = firstLine.charAt(0).toLowerCase() + firstLine.slice(1);
      const rest = lines.slice(1).join("\n").trim();
      let out = lower;
      if (rest) {
        // lowercase first letter of rest too, but keep it as a separate line
        const restLower = rest.charAt(0).toLowerCase() + rest.slice(1);
        out += "\n\n" + restLower;
      }
      // only add "took X" if there's actually a time mentioned in the original
      const time = extractTime(text);
      const hasRealTime = /\b(\d+\s?(hours?|minutes?|days?))\b/i.test(text);
      if (hasRealTime) out += `\n\ntook ${time}.`;
      return out;
    },
  },

  {
    id: "exact_breakdown",
    name: "Exact Breakdown Thread",
    why: "Leo's most viral format. 'Many people liked X. Here's the exact breakdown 🧵' — social proof + transparency promise + educational value.",
    bestFor: "When something you made got attention and you want to amplify it",
    example: "Many people liked our last video for Pear So here's the exact Breakdown on how we made it🧵",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasBreakdown(t)) s += 0.4;
      if (hasThread(t)) s += 0.3;
      if (/\b(liked|loved|asked|requested|wanted)\b/.test(t)) s += 0.2;
      if (/\b(how (i|we) (made|did|built)|exact|step)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `Many people liked ${subject}. So here's the exact breakdown on how I made it 🧵\n\n1/ The hook`;
    },
  },

  {
    id: "data_drop",
    name: "Data Drop (Bookmark Magnet)",
    why: "Bookmarks weighted 2.5x likes since Nov 2025. 'Metric A to Metric B in timeframe after one change' = reference content people save.",
    bestFor: "When you have real metrics and a specific change that drove them",
    example: "Our churn dropped from 8% to 2.1% in 90 days after we changed one onboarding email. Here's what we changed:",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // require actual "from X to Y" or "dropped/increased X to Y" pattern
      if (/\b(from .{1,15} to|dropped from|increased from|grew from|went from)\b/.test(t)) s += 0.5;
      if (hasSpecificNumber(t)) s += 0.2;
      if (hasTime(t)) s += 0.15;
      if (/\b(here'?s what|here'?s how|after (we|i) (changed|did|switched))\b/.test(t)) s += 0.15;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const time = extractTime(text) || "90 days";
      if (num) {
        return `Went from ${num} in ${time} after one specific change.\n\nHere's exactly what I changed 👇`;
      }
      return `Changed one thing and the results surprised me.\n\nHere's exactly what I changed 👇`;
    },
  },

  {
    id: "career_timeline",
    name: "Career Journey Timeline",
    why: "Nevo's '> Age 21...' timeline tweet was one of his most viral. Scrollable format, shows vulnerability, specific salary numbers, dramatic arc.",
    bestFor: "Telling your origin story / when you hit a big milestone",
    example: "> Age 21, released from the army, got a job building WordPress websites at $2,025 per month.\n> Age 35, Bringing Postiz to $132,527 MRR.\n\nYour life can flip in a second.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/>\s*age|age \d/.test(t)) s += 0.7;
      if ((t.match(/>\s/g) || []).length >= 2) s += 0.3;
      if (hasMoney(t)) s += 0.05;
      if (/\b(never give up|keep going|life can flip|journey)\b/.test(t)) s += 0.05;
      return Math.min(1, s);
    },
    transform(text, a) {
      const lines = text.split("\n").filter((l) => l.trim());
      return lines.map((l) => `> ${l.trim().replace(/^>\s*/, "")}`).join("\n") + "\n\nYour life can flip in a second. never give up.";
    },
  },

  {
    id: "counterintuitive_analysis",
    name: "I Analyzed N Things",
    why: "'I analyzed 200 viral threads' signals you did the work. Specific number builds credibility. People bookmark to reference the framework.",
    bestFor: "When you've done actual research or analysis",
    example: "I analyzed 200 viral founder threads. Here's the pattern every single one shares:",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(analyzed?|studied?|researched?|reviewed?|looked at)\b/.test(t)) s += 0.4;
      if (hasSpecificNumber(t)) s += 0.3;
      if (/\b(here'?s (what|the pattern)|every single|all of them)\b/.test(t)) s += 0.3;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const subject = extractSubject(text);
      if (num) {
        return `I analyzed ${num} ${subject}.\n\nHere's the pattern every single one shares 👇`;
      }
      return `I analyzed every ${subject} I could find.\n\nHere's the pattern every single one shares 👇`;
    },
  },

  {
    id: "listicle_thread",
    name: "Listicle Thread",
    why: "Numbered promises set clear expectations. 'Most skip #X' creates curiosity gap. Lists get bookmarked 2.8x more than single tweets.",
    bestFor: "How-to content, frameworks, lessons learned",
    example: "7 things I learned scaling from $0 to $10k MRR (most founders skip #4)",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (hasList(t)) s += 0.4;
      if (hasThread(t)) s += 0.2;
      if (/\b(most (people|founders) skip|nobody talks about)\b/.test(t)) s += 0.3;
      if (/\b(learned|lessons|tips|ways|mistakes)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = (text.match(/\d+/) || [7])[0];
      const subject = extractSubject(text);
      return `${num} things I learned from ${subject} (most people skip #${Math.min(parseInt(num), 4)})\n\n🧵`;
    },
  },

  {
    id: "personal_story_hook",
    name: "Personal Story Hook",
    why: "First-person story openers average 241 likes / 24,704 views — highest of any format. 'I quit my job in March. Six months later...' The 'then' creates tension.",
    bestFor: "Failure/recovery stories, before/after narratives",
    example: "I quit my job in March. Six months later I had 4,000 subscribers and $4,000 MRR. Here is what actually happened.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/^i (quit|left|started|built|launched|failed|lost)/.test(t)) s += 0.4;
      if (/\b(then|later|after|months?|weeks?|days?)\b/.test(t)) s += 0.2;
      if (hasBeforeAfter(t)) s += 0.2;
      if (/\b(here'?s what|what actually|the real)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const firstLine = text.split("\n")[0].trim();
      return `${firstLine}\n\nHere's what actually happened 👇`;
    },
  },

  {
    id: "humble_confusion",
    name: "Humble 'I Don't Know Why'",
    why: "Nevo's 'I don't know why, but Postiz is trending' tweet. Feels authentic, humble brag disguised as confusion. Makes achievement feel accidental.",
    bestFor: "When something good happens unexpectedly",
    example: "I don't know why, but Postiz is trending in the main GitHub feed! :)",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\bi don'?t know why\b/.test(t)) s += 0.6;
      if (/\b(trending|blew up|went viral|exploded)\b/.test(t)) s += 0.3;
      if (/:|\)/.test(text)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `I don't know why, but ${subject} is trending :)\n\nI hope it's because of the work I put in`;
    },
  },

  {
    id: "raw_data_drop",
    name: "Raw Data Drop",
    why: "Kalash's 'it took me 12 million tokens to build programmatic seo. result? 100k pages ranking on google' got 800k+ views. No hype, just raw numbers. Made global Twitter news.",
    bestFor: "When you have an impressive specific metric and want maximum reach",
    example: "it took me 12 million tokens to build programmatic seo for my startup. result? 100k pages ranking on google.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // Require a meaningful number — not version numbers like "v2.0"
      // Look for numbers preceded by words like "took", "spent", "hours", "days", "$"
      if (/\b(took|spent|cost|hours?|days?|weeks?|months?|tokens?|\$)\s*\d/.test(t)) s += 0.3;
      else if (hasSpecificNumber(t) && !/\bv\d+\.\d+/.test(t)) s += 0.15;
      if (/\b(result|outcome|output|ended up)\b/.test(t)) s += 0.3;
      if (hasLowercase(text)) s += 0.2;
      if (text.length < 150) s += 0.1;
      if (!text.includes("\n")) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // Extract a meaningful number — not version numbers
      const meaningfulNum = text.match(/\b(?:took|spent|cost)\s+(\d[\d,.]*\s*(?:million|thousand|hours?|days?|weeks?|months?|tokens?)?)/i) ||
                            text.match(/\$(\d[\d,.]*[kmKM]?)/) ||
                            text.match(/\b(\d[\d,]*\s*(?:million|thousand|hours?|days?|weeks?|months?|tokens?))\b/i);
      const num = meaningfulNum ? (meaningfulNum[1] || meaningfulNum[0]).trim() : null;
      const subject = extractSubject(text);
      if (num) {
        return `it took me ${num} to build ${subject}. result? it's working.`;
      }
      return `it took me way too long to build ${subject}. result? it's working.`;
    },
  },

  // =========================================================================
  // 2026 pattern additions — from Drew Hahn, Zack, and Tech Twitter analysis
  // =========================================================================

  {
    id: "micro_storytelling",
    name: "Micro-Storytelling Hook",
    why: "Hyper-grounded visual setting (waiting room, plastic chairs, bad coffee) subverts the guru aesthetic. Drops the reader's ad shield instantly. Forces them to keep reading to see where the scene goes. Zack's '$44k/month guy in a waiting room' tweet is the template.",
    bestFor: "When you discovered something unexpected in an mundane setting",
    example: "waiting room.\nplastic chairs.\nbad coffee.\na tv playing the news.\n\nfound a guy clearing $44k/month with zero original content.\n\nhere's how 👇",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // grounded setting words
      if (/\b(waiting room|plastic chairs?|bad coffee|late.night|3am|midnight|coffee shop|airport|train|bus stop|hospital|doctor'?s office|dentist|garage|car service|parking lot|gas station|diner|laundromat|barbershop|gym|elevator|subway|alley|basement|attic|garage)\b/.test(t)) s += 0.4;
      // short fragmentary lines (the visual rhythm)
      const lines = text.split("\n").filter((l) => l.trim());
      const shortFragments = lines.filter((l) => l.trim().length <= 30 && l.trim().length > 0).length;
      if (shortFragments >= 3 && lines.length >= 3) s += 0.3;
      // ends with a curiosity gap / "here's how"
      if (/\b(here'?s how|here'?s what|then i|so i|what happened|long story)\b/.test(t)) s += 0.2;
      // has a money/shock number
      if (hasMoney(t) || hasSpecificNumber(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // extract the key discovery/claim
      const lines = text.split("\n").filter((l) => l.trim());
      const claim = lines.find((l) => hasMoney(l) || hasSpecificNumber(l)) || lines[lines.length - 1];
      return `waiting room.\nplastic chairs.\nbad coffee.\n\n${claim.trim()}\n\nhere's what happened 👇`;
    },
  },

  {
    id: "accidental_discovery",
    name: "Accidental Discovery",
    why: "Hyper-casual grounded opener + massive counterintuitive claim + withheld 'how'. Forces Show More clicks (massive dwell signal). Zack's 'found a guy clearing $44k/month with zero original content' is the template.",
    bestFor: "When you stumbled onto something unexpected that makes absurd money/sense",
    example: "found a guy clearing $44k/month with zero original content.\n\nhe scrapes, repurposes, and schedules.\nno face. no brand. no originality.\n\nhere's the exact setup 🧵",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(found|discovered|stumbled|came across|ran into|met a guy|saw someone)\b/.test(t)) s += 0.3;
      // Require ACTUAL money ($ sign) + zero/no/without — not just any number
      // This prevents "12 minute video" + "zero dead air" from matching
      if (/\b(zero|no|without)\b/.test(t) && hasMoney(t)) s += 0.3;
      if (/\b(original content|face|brand|audience|followers|ads)\b/.test(t)) s += 0.2;
      if (/\b(here'?s (the|how|what)|exact setup|exact breakdown)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      // Only extract numbers that have a $ prefix — don't grab "12" from "12 minute video"
      const moneyMatch = text.match(/\$(\d[\d,.]*[km]?)/i);
      const money = moneyMatch ? "$" + moneyMatch[1] : "$44k";
      return `found a guy clearing ${money}/month with zero original content.\n\nhe ${subject}, repurposes, and schedules.\nno face. no brand. no originality.\n\nhere's the exact setup 🧵`;
    },
  },

  {
    id: "niche_shock",
    name: "Shocking Niche Asymmetry",
    why: "Spotlight absurd businesses making absurd money (cat playing sudoku = $6M/month). Triggers disbelief + inspiration + debate. Quote-tweets flood in with 'we are in a simulation' or 'how do I build this?'.",
    bestFor: "When you found an absurdly profitable niche/business model",
    example: "a cat playing sudoku makes $6M/month on youtube.\n\nno I'm not joking.\n\nhere's the business model 👇",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // Require ACTUAL money ($ prefix) — not just any number like "v2.0"
      if (hasMoney(t)) s += 0.3;
      if (/\b(absurd|insane|crazy|ridiculous|not joking|not kidding|seriously|actually|real)\b/.test(t)) s += 0.2;
      if (/\b(cat|dog|baby|kid|faceless|automated|ai generated|bot|scraper)\b/.test(t)) s += 0.2;
      if (/\b(makes|earning|clearing|pulling|generating|revenue|per month|per year)\b/.test(t)) s += 0.2;
      if (/\b(here'?s (the|how)|business model|how it works)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // Only extract $-prefixed money — never fabricate from version numbers
      const moneyMatch = text.match(/\$(\d[\d,.]*[kmKM]?)/);
      const money = moneyMatch ? "$" + moneyMatch[1] : null;
      if (!money) return null; // Don't transform if no real money
      const subject = extractSubject(text);
      return `${subject} makes ${money}/month.\n\nno I'm not joking.\n\nhere's the business model 👇`;
    },
  },

  {
    id: "relatable_tech_humor",
    name: "Relatable Tech Humor",
    why: "Drew Hahn style — universally understood tech frustration + absurdity of over-engineered solutions. Concise enough to read in half a second. Boosts completion rate + dwell time. Self-deprecating about coding/AI workflows hits the builder demographic hard.",
    bestFor: "When you have a funny/relatable tech frustration (coding, AI agents, debugging)",
    example: "hey codex can you just move the text slightly to the right\n\n*gpt-5.6-sol xhigh activates*\n\n*rewrites the entire rendering pipeline*",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // tech frustration / coding humor
      if (/\b(codex|claude|gpt|copilot|cursor|ai agent|coding agent|debug|stack overflow|npm|docker|kubernetes|regex|css|javascript|python|react|typescript)\b/.test(t)) s += 0.3;
      // absurd overreaction pattern
      if (/\b(rewrites|rebuilds|deletes|nukes|destroys|refactors|overwrites|wipes)\b/.test(t)) s += 0.2;
      // mock versioning / tech tags
      if (/\b(gpt.?5|sol|xhigh|v\d|beta|alpha|rc|nightly)\b/i.test(t)) s += 0.2;
      // short + punchy (under 200 chars)
      if (text.length < 250) s += 0.15;
      // asterisk action (the *activates* pattern)
      if (/\*[^*]+\*/.test(text)) s += 0.15;
      return Math.min(1, s);
    },
    transform(text, a) {
      // keep it short and punchy — extract the frustration + add the absurd overreaction
      const firstLine = text.split("\n")[0].trim();
      const frustration = firstLine.replace(/^(hey|hi|so|just|can you|could you)\s*/i, "");
      return `hey ${frustration.slice(0, 60)}\n\n*gpt-5.6-sol xhigh activates*\n\n*rewrites the entire system*`;
    },
  },

  {
    id: "open_loop_thread",
    name: "Open Loop + Curiosity Gap",
    why: "Drop a massive counterintuitive claim early but withhold the 'how' until the end. Forces Show More clicks (dwell signal). X's algo heavily rewards expansion clicks + 10-15s dwell. High-retention storytelling formula.",
    bestFor: "When you have a surprising result but the method is the interesting part",
    example: "I made $10k in 48 hours selling something that doesn't exist.\n\nno product. no inventory. no shipping.\n\nhere's exactly what I sold 👇",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // massive claim — require ACTUAL money ($), not just any number
      // "12 minute video" should NOT trigger this
      if (hasMoney(t)) s += 0.2;
      // "doesn't exist" / "no X" pattern — the curiosity gap
      // "zero" alone is too weak — require "doesn't exist" or "no product/inventory/etc"
      if (/\b(doesn'?t exist|no product|no inventory|no shipping|no code|no audience|no followers|no money|no budget)\b/.test(t)) s += 0.3;
      else if (/\bzero\b/.test(t) && hasMoney(t)) s += 0.2; // "zero" only counts with money
      // withheld "how" — open loop
      if (/\b(here'?s (exactly|what|how)|what I (sold|did|built|used)|the (exact|real) (method|way|secret))\b/.test(t)) s += 0.3;
      // short fragmentary lines
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length >= 3 && lines.filter((l) => l.trim().length <= 50).length >= 2) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      // Extract the REAL money amount (look for $XXk or $XX,000 patterns)
      const moneyMatch = text.match(/\$(\d[\d,.]*[km]?)/i);
      const money = moneyMatch ? "$" + moneyMatch[1] : "$10k";
      return `I made ${money} in 48 hours selling something that doesn't exist.\n\nno product. no inventory. no shipping.\n\nhere's exactly what I sold 👇`;
    },
  },

  {
    id: "zero_friction_readable",
    name: "Zero-Friction Readability",
    why: "Broken single-sentence paragraphs + heavy white space. Most people scroll on mobile at lightning speed — if it looks like a textbook they swipe past. If it looks like clean bite-sized dialogue, they read half before realizing it.",
    bestFor: "Any post that's currently a wall of text — reformat for mobile scroll speed",
    example: "I tried everything.\n\nTwitter ads. Nothing.\n\nCold DMs. Nothing.\n\nSEO. Nothing.\n\nThen I did one thing differently.\n\nEverything changed.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // single-sentence paragraphs (lines separated by blank lines, each short)
      const paras = text.split(/\n\s*\n/).filter((p) => p.trim());
      const singleSentence = paras.filter((p) => {
        const sentences = p.split(/[.!?]+/).filter((s) => s.trim());
        return sentences.length <= 1 && p.trim().length <= 80;
      });
      if (singleSentence.length >= 3) s += 0.4;
      // heavy white space (blank lines between paragraphs)
      if (paras.length >= 3 && (text.match(/\n\s*\n/g) || []).length >= 2) s += 0.2;
      // short lines overall
      if (text.split("\n").filter((l) => l.trim()).every((l) => l.trim().length <= 80)) s += 0.2;
      // narrative tension words
      if (/\b(nothing|everything changed|then|tried|failed|worked)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      // break into single-sentence paragraphs with white space
      const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      return sentences.join("\n\n");
    },
  },

  {
    id: "meta_timeline_ride",
    name: "Meta Timeline Ride",
    why: "Align content with what the current sub-niche is obsessed with (AI agents, autonomous SaaS, anti-VC bootstrapping). Piggyback on an audience already engaged + debating + looking for ammunition. Nevo's 'agents' repositioning is the template.",
    bestFor: "When there's a trending topic/conversation you can authentically contribute to",
    example: "everyone's arguing about whether AI agents will replace developers.\n\nmeanwhile I just shipped 3 features using only agents.\n\nno opinions. just results. here's what I built 👇",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // trending topic references
      if (/\b(everyone'?s arguing|everyone'?s talking|hot take|unpopular opinion|the discourse|timeline)\b/.test(t)) s += 0.3;
      // current meta topics
      if (/\b(ai agents?|autonomous|vibe coding|agentic|claude code|codex|cursor|devin|open.?source|bootstrapped|anti.?vc|indie hacker)\b/.test(t)) s += 0.3;
      // "no opinions just results" pattern
      if (/\b(no opinions|just results|no takes|just (shipped|built|launched))\b/.test(t)) s += 0.2;
      if (/\b(here'?s what I (built|shipped|made))\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `everyone's arguing about AI agents.\n\nmeanwhile I just shipped ${subject} using only agents.\n\nno opinions. just results. here's what I built 👇`;
    },
  },

  // =========================================================================
  // 2026 timeline skeletons — zack, RUX, John, Vadim
  // =========================================================================

  {
    id: "mundane_encounter",
    name: "Mundane Encounter Story",
    why: "Open with an unglamorous, hyper-specific real-world location to build instant authenticity before dropping a massive monetization claim. Zack's 'i met him at a car service center' format. The sensory grounding drops the reader's ad shield and forces them to keep reading to see where the scene goes.",
    bestFor: "When you met/saw someone doing something unexpectedly profitable in a boring setting",
    example: "i met him at a car service center.\n\nplastic chairs. fluorescent lights. a tv playing commercials nobody watched.\n\nhe was on his phone.\n\ni assumed he was scrolling instagram.\n\ni glanced over.\n\nhe was on a spreadsheet. tracking $44k/month from repurposed content.\n\nhere's how he did it 🧵",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // mundane physical location opener
      if (/\b(i met (him|her|a guy|someone) at a|met him at a|car service|waiting room|laundromat|diner|airport|coffee shop|bus stop|gas station|barbershop|gym|hospital|clinic|dmv|post office)\b/.test(t)) s += 0.4;
      // sensory lines (sights/smells/sounds)
      if (/\b(plastic chairs|fluorescent|bad coffee|tv playing|smelled|sounded|buzzing|humming|neon|flickering|sticky|cracked|worn|dingy)\b/.test(t)) s += 0.2;
      // "i glanced over" / "i assumed" pattern
      if (/\b(i glanced|i assumed|i looked|i noticed|peered|leaned)\b/.test(t)) s += 0.2;
      // massive monetization reveal
      if (hasMoney(t) || hasSpecificNumber(t)) s += 0.1;
      // thread cue
      if (/\b(here'?s how|here'?s what|thread|🧵)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const money = num ? `$${num}` : "$44k";
      return `i met him at a car service center.\n\nplastic chairs. fluorescent lights. a tv playing commercials nobody watched.\n\nhe was on his phone.\n\ni assumed he was scrolling.\n\ni glanced over.\n\nhe was tracking ${money}/month from repurposed content.\n\nhere's how he did it 🧵`;
    },
  },

  {
    id: "reverse_engineered_blueprint",
    name: "Reverse-Engineered Blueprint",
    why: "Call out a massive industry mistake immediately, then present an optimized, data-driven reverse-engineering framework. RUX's 'this guy doesn't make a single video until he's reverse-engineered the channels that are already winning' format. Positions you as the expert who knows the system, not the hopeful amateur.",
    bestFor: "When you have a systematic approach that beats the default/generic approach",
    example: "this guy doesn't make a single video until he's reverse-engineered the channels that are already winning.\n\nmost creators start with \"what should I make?\" and hope they land on the right niche.\n\nhe starts with \"what's already working?\" then lets AI answer it with evidence.\n\n• $44k/month\n• 12 camera appearances\n• 1 person operating the whole system\n\nmost creators fail because they use generic prompts that spit out robotic scripts nobody wants to watch.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // reverse-engineering language
      if (/\b(reverse.?engineer|already (working|winning)|what'?s already|deconstruct|tear down|study (the|what))\b/.test(t)) s += 0.4;
      // "most people/creators start with X" callout
      if (/\b(most (people|creators|founders|builders) (start|begin)|everyone starts|the default)\b/.test(t)) s += 0.2;
      // "he starts with" / "I start with" contrast
      if (/\b((he|i) start(s)? with|instead (of|he))\b/.test(t)) s += 0.2;
      // bullet metrics
      if (/[•\-*]\s.*[\$\d]/.test(text)) s += 0.1;
      if (hasMoney(t) || hasSpecificNumber(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // Extract the REAL money number (look for $XXk or $XX,XXX patterns)
      const moneyMatch = text.match(/\$(\d[\d,.]*[km]?)/i);
      const money = moneyMatch ? "$" + moneyMatch[1] : "$44k";
      return `this guy doesn't make a single video.\n\nnot until he's reverse-engineered what's already winning.\n\nmost creators start with "what should I make?" and hope.\n\nhe starts with "what's already working?" then proves it.\n\n• ${money}/month\n• 1 person\n• zero original content\n\nhere's his exact system 👇`;
    },
  },

  {
    id: "absurd_niche_brainrot",
    name: "Absurd Niche / Brainrot Scale Proof",
    why: "Highlight an utterly ridiculous, low-effort niche pulling millions to break the reader's perception of what a successful business looks like. John's 'the kinda bullshit that's printing you $X million/mo nowadays' format. Triggers disbelief + inspiration + debate → quote-tweets flood in.",
    bestFor: "When you found an absurd/ridiculous niche making shocking money",
    example: "the kinda bullshit that's printing you $6M/mo nowadays:\n\na cat playing sudoku did $6,000,000 a month inside 90 days.\n\nnot a venture-backed rocketship with a war chest. a cat. doing sudoku. wrapped in the most degenerate, oversaturated, brainrot content format imaginable.\n\nand it worked.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // "the kinda bullshit" / "printing you" opener
      if (/\b(the kinda (bullshit|shit|stuff)|printing you|printing money|nowadays)\b/.test(t)) s += 0.4;
      // absurd subject (animal/person doing mundane task)
      if (/\b(cat|dog|baby|kid|monkey|hamster|ai|bot|faceless|automated)\b/.test(t) && /\b(playing|doing|watching|making|solving)\b/.test(t)) s += 0.2;
      // "not a venture-backed" / contrast language
      if (/\b(not a (venture|funded|backed)|not a rocketship|wrapped in|brainrot|degenerate|oversaturated)\b/.test(t)) s += 0.2;
      if (hasMoney(t) || hasSpecificNumber(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const money = num ? `$${num}` : "$6M";
      return `the kinda bullshit that's printing you ${money}/mo nowadays:\n\na cat playing sudoku did ${money} a month inside 90 days.\n\nnot a venture-backed rocketship with a war chest. a cat. doing sudoku. wrapped in the most degenerate, oversaturated, brainrot content format imaginable.\n\nand it worked.`;
    },
  },

  {
    id: "bulleted_growth_hack",
    name: "Bulleted Growth Hack",
    why: "A blunt, ultra-short milestone statement followed by an exact, numbered 3-step blueprint stripped of all fluff. Vadim's 'my app crossed $X,000/mo in less than X days / All I did was:' format. The brevity + specificity makes it save-worthy (bookmark signal) and copyable.",
    bestFor: "When you hit a milestone and can distill the method to 3 concrete steps",
    example: "my app crossed $40k/mo in less than 90 days\n\nAll I did was:\n1. copied the competitor's landing page structure\n2. posted 3x/day across 4 platforms\n3. shipped a new feature every Friday based on user DMs\n\nit's never been simpler",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // milestone opener
      if (/\b(my (app|product|tool|saas|business) (crossed|hit|reached|passed)|crossed \$|hit \$)\b/.test(t)) s += 0.3;
      if (hasMoney(t) || hasSpecificNumber(t)) s += 0.2;
      // "All I did was" / "Here's what I did"
      if (/\b(all i did was|here'?s (what|all) i did|the (entire|whole) playbook|the exact steps)\b/.test(t)) s += 0.3;
      // numbered list (1. 2. 3.)
      if (/\b1\.\s.*\b2\.\s.*\b3\.\s/s.test(text)) s += 0.2;
      // "it's never been simpler" / brevity cue
      if (/\b(never been simpler|that'?s it|nothing else|no fluff|no bs)\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const subject = extractSubject(text);
      const money = num ? `$${num}` : "$40k";
      return `my ${subject || "app"} crossed ${money}/mo in less than 90 days\n\nAll I did was:\n1. copied the competitor's landing page structure\n2. posted 3x/day across 4 platforms\n3. shipped a new feature every Friday based on user DMs\n\nit's never been simpler`;
    },
  },

  // =========================================================================
  // 2026 timeline examples — Andi, Eade, David Ch, Ira, Jeremy, Jay
  // =========================================================================

  {
    id: "i_quit_my_job",
    name: "I Quit My Job (Vulnerable Milestone)",
    why: "Andi's format. A raw, vulnerable life-changing decision with zero pretense. 'Today was my last day at my 9-to-5. I quit to chase my dream.' The authenticity drops all ad shields. People reply with support, their own stories, or 'wish me luck' echoes. Massive reply-chain driver because the author WILL reply back to supporters (+75 signal).",
    bestFor: "When you actually quit a job / made a big life leap to build something",
    example: "Today was my last day at my 9-to-5.\n\nI quit my job to chase my dream of building my own SaaS.\n\nFrom today I'm living off savings and doing whatever it takes to make it work.\n\nWish me luck.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(quit my job|last day|leaving my (job|9.to.5)|i quit|resigned|handed in my|two weeks|notice)\b/.test(t)) s += 0.5;
      if (/\b(living off savings|doing whatever it takes|chase my dream|full.time|all in|no safety net|betting on myself)\b/.test(t)) s += 0.3;
      if (/\b(wish me luck|here goes|let'?s go|next chapter|day one)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      return `Today was my last day at my 9-to-5.\n\nI quit my job to chase my dream of building my own thing.\n\nFrom today I'm living off savings and doing whatever it takes to make it work.\n\nWish me luck.`;
    },
  },

  {
    id: "absurd_juxtaposition",
    name: "Absurd Juxtaposition (Biological → Business)",
    why: "Eade's format. Takes a serious/biological/scientific concept and connects it to a mundane business outcome. '16-hour timelapse of an embryo building a central nervous system so 23 years from now it can sell b2b SAAS.' The humor comes from the contrast between something profound and something banal. Extremely high share/quote rate because it's funny and relatable.",
    bestFor: "When you can connect a serious/scientific/historical concept to a funny business outcome",
    example: "Here's a 16-hour timelapse of an embryo building a central nervous system so 23 years from now it can sell b2b SAAS",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(embryo|nervous system|brain|dna|evolution|cell|organism|timelapse|microscope|telescope|galaxy|universe|big bang|dinosaur|fossil|photosynthesis|mitosis|meiosis)\b/.test(t)) s += 0.3;
      if (/\b(sell (b2b )?saas|b2b|saas|cold call|linkedin|sales call|crm|pipeline|kpi|synergy|stakeholder|deliverable|agile|scrum|standup|jira)\b/.test(t)) s += 0.3;
      if (/\b(so \d+ years? from now|so it can|so they can|just to|only to)\b/.test(t)) s += 0.3;
      if (text.length < 200) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      return `Here's a 16-hour timelapse of an embryo building a central nervous system so 23 years from now it can sell b2b SAAS`;
    },
  },

  {
    id: "ai_product_launch",
    name: "AI Product Launch (Trending Tool + Demo)",
    why: "David Ch's format. Name-drops a trending AI tool + positions your product as the bridge. 'Claude just got a huge upgrade... we just launched Shipper 2.0.' Rides the AI meta wave + has a demo. The tool name-drop captures search/trend traffic.",
    bestFor: "When your product integrates with or enhances a trending AI tool",
    example: "Big news, @claudeai just got a huge upgrade today.\n\nFrom today on, Claude Code can build and run a business for you.\n\nWe just launched Shipper 2.0 — a tool that lets Claude:\n→ Build web/mobile apps\n→ Run deployments\n→ Handle customer support\n\nHere's a 90-second demo 👇",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(claude|gpt.?5|gpt.?4|copilot|cursor|codex|gemini|llama|mistral|perplexity|openai|anthropic)\b/.test(t)) s += 0.3;
      if (/\b(just launched|launching|introducing|big news|huge upgrade|new release|v2|2\.0)\b/.test(t)) s += 0.3;
      if (/→|=>|\b(build|run|handle|deploy|manage|automate)\b/.test(t)) s += 0.2;
      if (/\b(demo|watch|video|clip|show|screenshot)\b/.test(t)) s += 0.2;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `Big news — a major AI tool just got upgraded.\n\nFrom today on, it can build and run a business for you.\n\nWe just launched ${subject || "our tool"} 2.0 — it lets AI:\n→ Build web/mobile apps\n→ Run deployments\n→ Handle customer support\n\nHere's a 90-second demo 👇`;
    },
  },

  {
    id: "ai_killed_my_startup",
    name: "AI Killed My Startup (Vulnerable Confession)",
    why: "Ira's format. Dramatic personal loss tied to AI meta. 'Claude just killed our startup. We got several hundred paying clients in 2 months. One Claude feature and our close rate dropped from 70% to 20%.' Vulnerability + specific numbers + AI fear = massive engagement. People reply with sympathy, similar stories, or debate.",
    bestFor: "When AI/competition actually hurt your business and you have real numbers",
    example: "Claude just killed our startup.\n\nI woke up today and Claude killed my startup. We got several hundred paying clients in 2 months, was growing like crazy. One Claude feature and our close rate dropped from 70% to 20%.\n\nHere's what happened 🧵",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(killed (our|my) startup|killed my business|destroyed (our|my)|ended (our|my) startup|lost everything|shut (it|everything) down)\b/.test(t)) s += 0.5;
      if (/\b(claude|gpt|ai|manus|openai|anthropic|copilot|cursor)\b/.test(t)) s += 0.2;
      if (/\b(paying clients|close rate|growing like crazy|dropped from|went from)\b/.test(t)) s += 0.2;
      if (hasSpecificNumber(t) || hasMoney(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const num = extractNumber(text);
      const money = num ? `$${num}` : "several hundred";
      return `AI just killed our startup.\n\nI woke up today and it killed my startup. We got ${money} paying clients in 2 months, was growing like crazy. One AI feature and our close rate dropped from 70% to 20%.\n\nHere's what happened 🧵`;
    },
  },

  {
    id: "lead_gen_dm_bait",
    name: "Lead-Gen DM Bait (Like + Reply for Free Guide)",
    why: "Jeremy's format. 'I wrote a guide. Like + Reply with 👋 and I'll DM it to you for free.' Classic lead-gen. High reply count (good for algo) but RISKY — X may flag as engagement bait if overused. The credibility line ('I've done SEO for 100+ SaaS startups') is what makes it work. Use sparingly.",
    bestFor: "When you have a genuinely valuable free resource + credibility to back it up",
    example: "I wrote a guide for startups on using SEO to acquire customers.\n\nLike + Reply with 👋 and I'll DM it to you for free, right now.\n\n(I've done SEO for 100+ SaaS startups)",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      // Require BOTH a reply/like request AND a DM offer
      const hasReplyRequest = /\b(like \+ reply|reply with|comment .* below)\b/.test(t);
      const hasDMOffer = /\b(dm (it|you)|send it (to you|for free)|free (guide|resource|template|checklist))\b/.test(t);
      if (hasReplyRequest && hasDMOffer) s += 0.5;
      else if (hasReplyRequest && /\bfree\b/.test(t)) s += 0.3;
      if (/\b(i wrote a guide|i built a|i made a (free|guide)|here'?s a (free|guide))\b/.test(t)) s += 0.2;
      if (/\b(i'?ve done|i'?ve helped|i'?ve worked with|experience in|years? of)\b/.test(t)) s += 0.2;
      if (/\bfree\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      // Try to extract the actual topic from the original text
      const topicMatch = text.match(/guide (for|on|about) (.+?)(?:\.|$)/i) || text.match(/wrote a guide (.+?)(?:\.|$)/i);
      const topic = topicMatch ? (topicMatch[2] || topicMatch[1]).trim() : null;
      // Look for credibility line in original — preserve it
      const credMatch = text.match(/\(?(i'?ve done[^)]+|i'?ve helped[^)]+|i'?ve worked with[^)]+|experience in[^)]+|years? of[^)]+)\)?/i);
      const cred = credMatch ? credMatch[0].replace(/[()]/g, "") : "I've done this for 100+ startups";
      // Preserve the original guide line if possible
      const firstLine = text.split("\n")[0].trim();
      const guideLine = firstLine.match(/^i wrote a guide/i) ? firstLine : (topic ? `I wrote a guide on ${topic}.` : `I wrote a guide on this.`);
      return `${guideLine}\n\nLike + Reply with 👋 and I'll DM it to you for free, right now.\n\n(${cred})`;
    },
  },

  {
    id: "free_giveaway_24h",
    name: "24-Hour Free Giveaway Launch",
    why: "Jay's format. 'For the next 24 hours, I'm giving it away FREE! Just like, repost, and comment below.' Urgency + free + engagement bait. Extremely high reply/repost volume. RISKY — X may penalize as engagement bait. The 24-hour window creates FOMO. Works best for digital products.",
    bestFor: "When launching a digital product and want maximum initial engagement spike",
    example: "Alright, it's finally here!\n\nMeet Aligno — a premium SaaS template crafted to elevate SaaS businesses.\n\nFor the next 24 hours, I'm giving it away FREE!\n\nJust like, repost, and comment \"Aligno\" below, and I'll DM you the link.",
    detect(text) {
      const t = text.toLowerCase();
      let s = 0;
      if (/\b(24 hours?|next 24|today only|limited time|giving it away|free for|free for the next)\b/.test(t)) s += 0.4;
      if (/\b(just like|repost and|comment .* below|dm you the link|follow so i can)\b/.test(t)) s += 0.3;
      if (/\b(finally here|meet \w+|premium|template|launching|introducing)\b/.test(t)) s += 0.2;
      if (/\bfree\b/.test(t)) s += 0.1;
      return Math.min(1, s);
    },
    transform(text, a) {
      const subject = extractSubject(text);
      return `Alright, it's finally here!\n\nMeet ${subject || "this"} — a premium tool built to elevate your business.\n\nFor the next 24 hours, I'm giving it away FREE!\n\nJust like, repost, and comment below, and I'll DM you the link.`;
    },
  },
];
// API
// ---------------------------------------------------------------------------
function detectFormat(text) {
  const a = analyze(text);
  let best = null;
  let bestScore = 0;
  for (const tpl of TEMPLATES) {
    const score = tpl.detect(text);
    if (score > bestScore) {
      bestScore = score;
      best = { template: tpl, confidence: score };
    }
  }
  return best;
}

function getAllFormats(text) {
  const matches = [];
  for (const tpl of TEMPLATES) {
    const score = tpl.detect(text);
    if (score > 0.3) matches.push({ template: tpl, confidence: score });
  }
  return matches.sort((a, b) => b.confidence - a.confidence);
}

function transformToFormat(text, templateId) {
  const tpl = TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return text;
  const a = analyze(text);
  return tpl.transform(text, a);
}

// Pick the best format for a given post based on its content
function recommendFormat(text) {
  const a = analyze(text);
  const t = text.toLowerCase();

  // career timeline has highest priority — "> Age" pattern is unique
  if (/>\s*age|age \d/.test(t) && (t.match(/>\s/g) || []).length >= 2) return TEMPLATES.find((x) => x.id === "career_timeline");
  // open loop: "doesn't exist" / "no product/inventory/etc" + "here's what" — check BEFORE i_built_in_time
  // "zero" alone is NOT enough — it appears in "zero dead air" etc.
  if (/\b(doesn'?t exist|no product|no inventory|no shipping|no code|no audience|no followers|no money|no budget)\b/.test(t) && /\b(here'?s (exactly|what|how))\b/.test(t)) return TEMPLATES.find((x) => x.id === "open_loop_thread");
  // "I built X in Y time" — check before data_drop (both have numbers+time)
  if (hasBuilt(t) && hasTime(t)) return TEMPLATES.find((x) => x.id === "i_built_in_time");

  // 2026 new patterns — check BEFORE MRR (they're more specific)
  // reverse-engineered blueprint: "reverse-engineer" + "most people start with"
  if (/\b(reverse.?engineer|already (working|winning))\b/.test(t) && /\b(most (people|creators|founders) (start|begin))\b/.test(t)) return TEMPLATES.find((x) => x.id === "reverse_engineered_blueprint");
  // mundane encounter: "i met him at a" + sensory setting
  if (/\b(i met (him|her|a guy|someone) at a|met him at a)\b/.test(t)) return TEMPLATES.find((x) => x.id === "mundane_encounter");
  // absurd niche brainrot: "the kinda bullshit" / "printing you" + money
  if (/\b(the kinda (bullshit|shit|stuff)|printing you|printing money)\b/.test(t)) return TEMPLATES.find((x) => x.id === "absurd_niche_brainrot");
  // bulleted growth hack: "my app crossed $X" + "All I did was"
  if (/\b(my (app|product|tool|saas|business) (crossed|hit|reached|passed))\b/.test(t) && /\b(all i did was|here'?s what i did)\b/.test(t)) return TEMPLATES.find((x) => x.id === "bulleted_growth_hack");
  // i quit my job: "quit my job" / "last day at my 9-to-5"
  if (/\b(quit my job|last day at my|leaving my (job|9.to.5)|i quit|resigned)\b/.test(t)) return TEMPLATES.find((x) => x.id === "i_quit_my_job");
  // absurd juxtaposition: biological/scientific + business outcome
  if (/\b(embryo|nervous system|timelapse|evolution|dna|organism)\b/.test(t) && /\b(saas|b2b|sales|business)\b/.test(t)) return TEMPLATES.find((x) => x.id === "absurd_juxtaposition");
  // ai product launch: trending AI tool + product launch
  if (/\b(claude|gpt.?5|copilot|cursor|codex|gemini)\b/.test(t) && /\b(just launched|launching|introducing|big news|huge upgrade|2\.0)\b/.test(t)) return TEMPLATES.find((x) => x.id === "ai_product_launch");
  // ai killed my startup: "killed our startup" + AI mention
  if (/\b(killed (our|my) startup|killed my business|destroyed (our|my) startup)\b/.test(t)) return TEMPLATES.find((x) => x.id === "ai_killed_my_startup");
  // 24h free giveaway: "24 hours" + "free" + "like, repost" — check BEFORE DM bait
  if (/\b(24 hours?|next 24)\b/.test(t) && /\bfree\b/.test(t) && /\b(like|repost|comment)\b/.test(t)) return TEMPLATES.find((x) => x.id === "free_giveaway_24h");
  // lead-gen DM bait: "like + reply" + "DM it to you" — requires BOTH conditions
  if (/\b(like \+ reply|reply with)\b/.test(t) && /\b(dm (it|you)|send it|free)\b/.test(t)) return TEMPLATES.find((x) => x.id === "lead_gen_dm_bait");

  // if it has revenue/MRR → milestone or zero_to_x
  if (hasMRR(t) || (hasMoney(t) && hasBeforeAfter(t))) {
    if (/\$0|0 to|from 0/.test(t)) return TEMPLATES.find((x) => x.id === "zero_to_x");
    return TEMPLATES.find((x) => x.id === "mrr_milestone");
  }
  // if it's about building something
  if (hasBuilt(t)) {
    if (hasDemo(t) || /\bworkflow|absurd|insane\b/.test(t)) {
      // demo + launch → anti_pattern_launch scores higher than demo_absurd
      if (/\b(launch|live|ship|buy|try|check)\b/.test(t)) return TEMPLATES.find((x) => x.id === "anti_pattern_launch");
      return TEMPLATES.find((x) => x.id === "demo_absurd");
    }
    return TEMPLATES.find((x) => x.id === "demo_absurd");
  }
  // "I fixed a problem" + product demo → demo_absurd (product demo/launch)
  // URL may have been stripped already, so don't require it if other signals are strong
  if (/\b(fixed it|i fixed|figured out|solved|finally cracked)\b/.test(t) && /\b(video|minute|hour|tool|app|edited|workflow)\b/.test(t)) {
    return TEMPLATES.find((x) => x.id === "demo_absurd");
  }
  // if it's about failure
  if (hasFailure(t)) return TEMPLATES.find((x) => x.id === "failure_list");

  // 2026 additions — check new viral patterns BEFORE contrarian (they're more specific)
  // micro-storytelling: grounded setting + short fragments
  if (/\b(waiting room|plastic chairs|bad coffee|3am|midnight|coffee shop|airport|car service)\b/.test(t)) return TEMPLATES.find((x) => x.id === "micro_storytelling");
  // accidental discovery: "found a guy" + "zero/none" + ACTUAL money ($)
  if (/\b(found|discovered|stumbled|came across)\b/.test(t) && /\b(zero|no|without)\b/.test(t) && hasMoney(t)) return TEMPLATES.find((x) => x.id === "accidental_discovery");
  // niche shock: absurd business + ACTUAL money ($ prefix) + "not joking"
  if (hasMoney(t) && /\b(absurd|insane|not joking|not kidding|seriously)\b/.test(t) && /\b(makes|earning|clearing|pulling|generating|revenue)\b/.test(t)) return TEMPLATES.find((x) => x.id === "niche_shock");
  // relatable tech humor: coding/AI frustration
  if (/\b(codex|claude|gpt|copilot|cursor|ai agent|debug|css|regex|npm)\b/.test(t) && text.length < 300) return TEMPLATES.find((x) => x.id === "relatable_tech_humor");
  // meta timeline ride: trending topic + "everyone's arguing"
  if (/\b(everyone'?s arguing|everyone'?s talking|hot take|the discourse)\b/.test(t)) return TEMPLATES.find((x) => x.id === "meta_timeline_ride");

  // if it's contrarian (checked after specific patterns)
  if (hasContrarian(t)) return TEMPLATES.find((x) => x.id === "contrarian_take");
  // if it's a daily update
  if (hasLowercase(text) && /\b(shipped|built|fixed|pushed)\b/.test(t)) return TEMPLATES.find((x) => x.id === "build_in_public_daily");
  // if it has data/metrics
  if (hasData(t) && hasBeforeAfter(t)) return TEMPLATES.find((x) => x.id === "data_drop");
  // if it's a breakdown
  if (hasBreakdown(t)) return TEMPLATES.find((x) => x.id === "exact_breakdown");
  // if it's a list
  if (hasList(t)) return TEMPLATES.find((x) => x.id === "listicle_thread");
  // if it's a personal story
  if (/^i (quit|left|started|built|failed|lost)/.test(t)) return TEMPLATES.find((x) => x.id === "personal_story_hook");
  // if it has raw numbers and is short — but NOT version numbers like v2.0
  if (hasSpecificNumber(t) && text.length < 150 && !/\bv\d+\.\d+/.test(t)) return TEMPLATES.find((x) => x.id === "raw_data_drop");

  // default: contrarian take (most engagement)
  return TEMPLATES.find((x) => x.id === "contrarian_take");
}

module.exports = {
  TEMPLATES,
  detectFormat,
  getAllFormats,
  transformToFormat,
  recommendFormat,
};
