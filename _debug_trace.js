// Debug: trace where the split happens by using buildPost directly
const { parse } = require("./ideaParser");
const { generate } = require("./contentEngine");

const topic = "i think the problem with most startups is they dont talk to users enough";

// Generate with count=1 — this calls buildPost then iterate
const posts = generate(topic, { count: 1 });
console.log("FINAL POST:");
console.log(JSON.stringify(posts[0].post));
console.log();
console.log("ORIGINAL GRADE:", posts[0].originalGrade, "SCORE:", posts[0].originalScore);
console.log("FINAL GRADE:", posts[0].grade, "SCORE:", posts[0].score);
console.log("ITERS:", posts[0].iterationCount);
console.log();

// Now let's check — is the split in buildPost or in iterate?
// Let's call buildPost directly by constructing the angle
const { buildPost } = require("./contentEngine");
const parsed = parse(topic);
const angle = { insight: parsed.insight, type: "contrarian", specificity: 5, domain: "saas", reasoning: "user's own idea" };
const draft = buildPost(angle, topic);
console.log("DRAFT (before iteration):");
console.log(JSON.stringify(draft));
