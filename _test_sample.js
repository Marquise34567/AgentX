const { scorePost, comparePosts } = require("./engagementAlgo");
const { improvePost } = require("./improver");

const SAMPLE = `the new year is almost here

2026 has been one of my most productive years

now I'm planning for the next few months

using 1plann I'm keeping track of each task I complete

https://1plann.space`;

const sep = "=".repeat(70);
console.log(sep);
console.log("ORIGINAL POST");
console.log(sep);
console.log(SAMPLE);
console.log();

const r = scorePost(SAMPLE);
console.log(`SCORE: ${r.score}  GRADE: ${r.grade}`);
console.log(`VERDICT: ${r.verdict}`);
console.log();
console.log("BREAKDOWN:");
for (const b of r.breakdown) {
  console.log(`  ${b.dimension.padEnd(16)} ${b.score.toFixed(1).padStart(5)}  (w=${b.weight.toFixed(2)})  ${b.note}`);
}
console.log();
console.log("PROBLEMS:");
for (const p of r.problems) console.log(`  - ${p}`);
console.log();
console.log("SIGNALS TO ADD:");
for (const s of r.signalsToAdd) console.log(`  + ${s}`);
console.log();

console.log(sep);
console.log("IMPROVING...");
console.log(sep);
const res = improvePost(SAMPLE);
console.log(`\nFINAL SCORE: ${res.finalScore}  GRADE: ${res.finalGrade}  (converged=${res.converged})`);
console.log();
console.log("ITERATIONS:");
for (const step of res.iterations) {
  console.log(`  iter ${step.iteration}: score=${step.score} grade=${step.grade} changes=${JSON.stringify(step.changes)}`);
}
console.log();
console.log("FINAL POST:");
console.log("-".repeat(70));
console.log(res.final);
console.log("-".repeat(70));
if (res.linkReply) {
  console.log("\nSUGGESTED FIRST REPLY:");
  console.log(res.linkReply);
}
console.log("\nTIMING:", res.timingAdvice);

// A/B demo
console.log("\n" + sep);
console.log("A/B COMPARISON: original vs final");
console.log(sep);
const cmp = comparePosts(SAMPLE, res.final);
console.log(cmp.summary);
console.log(`  A (original): ${cmp.a.score} ${cmp.a.grade}`);
console.log(`  B (final):    ${cmp.b.score} ${cmp.b.grade}`);
