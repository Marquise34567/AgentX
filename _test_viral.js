const { scorePost } = require("./engagementAlgo");
const { detectFormat, recommendFormat } = require("./viralTemplates");
const { improvePost } = require("./improver");

// Real viral tweets from the research
const REAL_VIRAL = [
  {
    name: "Nevo - MRR milestone",
    text: "Postiz just reached $120k MRR!\nI would never have imagined that my app in February ($21k MRR) would go up to $120k MRR in 4 months.",
    expect: "mrr_milestone",
  },
  {
    name: "RalphBlaster - demo absurd",
    text: "I just built RalphBlaster™ 😋 and it's absurd\n\nMy entire workflow is now:\n- create ticket\n- click to generate PRD\n- approve it\n- Ralph does the rest\n\nIt's a new world",
    expect: "demo_absurd",
  },
  {
    name: "Fieldy - anti-pattern launch",
    text: "Everyone's posting demos — f** it. Buy this and I'll ship next week.",
    expect: "anti_pattern_launch",
  },
  {
    name: "Rob Hallam - failure list",
    text: "I built 5 products that made $0\n\nI built Indiedex. Made no money.\nI built Brandcast. Made no money.\nI built TechServia. Didn't even launch.\n\n5 products. $0.",
    expect: "failure_list",
  },
  {
    name: "Kalash - raw data drop",
    text: "it took me 12 million tokens to build programmatic seo for my startup. result? 100k pages ranking on google.",
    expect: "raw_data_drop",
  },
  {
    name: "Nevo - contrarian",
    text: "There's a claim that SaaS is dead. Obviously, if that were true, Postiz would die and not have month-over-month growth.",
    expect: "contrarian_take",
  },
  {
    name: "Leo - exact breakdown",
    text: "Many people liked our last video for Pear So here's the exact Breakdown on how we made it🧵",
    expect: "exact_breakdown",
  },
  {
    name: "Chatbase - I built in time",
    text: "6 weeks ago I started building Chatbase.co. It lets you create a ChatGPT-like chatbot from any PDF document. Couldn't get access to OpenAI Code interpreter, so built it myself.",
    expect: "i_built_in_time",
  },
  {
    name: "Nevo - humble confusion",
    text: "I don't know why, but Postiz is trending in the main GitHub feed! :)",
    expect: "humble_confusion",
  },
  {
    name: "Nevo - career timeline",
    text: "> Age 21, released from the army, got a job building WordPress websites at $2,025 per month.\n> Age 35, Bringing Postiz to $132,527 MRR.\n\nYour life can flip in a second.",
    expect: "career_timeline",
  },
];

console.log("=".repeat(70));
console.log("TEST 1: Real viral tweet format detection");
console.log("=".repeat(70));
let correct = 0;
for (const { name, text, expect } of REAL_VIRAL) {
  const match = detectFormat(text);
  const r = scorePost(text);
  const detected = match ? match.template.id : "none";
  const ok = detected === expect;
  if (ok) correct++;
  console.log(`\n${ok ? "✅" : "❌"} ${name}`);
  console.log(`  expected: ${expect} | detected: ${detected} (${match ? Math.round(match.confidence * 100) + "%" : "0%"})`);
  console.log(`  score: ${r.score} ${r.grade}`);
}
console.log(`\n${correct}/${REAL_VIRAL.length} formats correctly detected`);

// Test improver on the 1plann post
console.log("\n" + "=".repeat(70));
console.log("TEST 2: Improve the 1plann post with viral format transforms");
console.log("=".repeat(70));
const SAMPLE = `the new year is almost here

2026 has been one of my most productive years

now I'm planning for the next few months

using 1plann I'm keeping track of each task I complete

https://1plann.space`;

const rec = recommendFormat(SAMPLE);
console.log(`\nRecommended format: ${rec ? rec.name : "none"}`);
console.log(`Why: ${rec ? rec.why : ""}`);

const res = improvePost(SAMPLE);
console.log(`\nOriginal: ${res.originalScore} ${res.originalGrade}`);
console.log(`Final: ${res.finalScore} ${res.finalGrade} (converged: ${res.converged})`);
console.log(`\nIterations:`);
for (const s of res.iterations) {
  console.log(`  iter ${s.iteration}: ${s.grade} ${s.score} — ${s.changes.join(", ")}`);
}
console.log(`\nFinal post:`);
console.log("-".repeat(50));
console.log(res.final);
console.log("-".repeat(50));
if (res.linkReply) console.log(`\nReply: ${res.linkReply}`);

// Test improver on a generic bad post
console.log("\n" + "=".repeat(70));
console.log("TEST 3: Improve a generic bad post");
console.log("=".repeat(70));
const BAD = "Excited to share that I just launched my new productivity app. It helps you manage tasks and stay organized. Check it out at myapp.com";
const rec2 = recommendFormat(BAD);
console.log(`\nRecommended format: ${rec2 ? rec2.name : "none"}`);
const res2 = improvePost(BAD);
console.log(`Original: ${res2.originalScore} ${res2.originalGrade}`);
console.log(`Final: ${res2.finalScore} ${res2.finalGrade} (converged: ${res2.converged})`);
console.log(`\nIterations:`);
for (const s of res2.iterations) {
  console.log(`  iter ${s.iteration}: ${s.grade} ${s.score} — ${s.changes.join(", ")}`);
}
console.log(`\nFinal post:`);
console.log("-".repeat(50));
console.log(res2.final);
console.log("-".repeat(50));
