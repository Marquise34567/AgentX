const { generateCasual } = require("./casualGenerator");
const { scorePost } = require("./engagementAlgo");

// Check what's generated for SaaS
const candidates = generateCasual("SaaS", "saas");
console.log(`=== SaaS: ${candidates.length} candidates ===\n`);

// Find the Jake-style and George Pu-style ones
const jakeStyle = candidates.filter(c => /used to/i.test(c));
const georgeStyle = candidates.filter(c => /^Founder:/i.test(c));

console.log("JAKE-STYLE (absurd contrast):");
for (const c of jakeStyle) {
  const s = scorePost(c);
  console.log(`  [${s.grade}] ${s.score}: ${c}`);
}

console.log("\nGEORGE PU-STYLE (dialogue):");
for (const c of georgeStyle) {
  const s = scorePost(c);
  console.log(`  [${s.grade}] ${s.score}: ${c}`);
}

console.log("\nARRA-STYLE (i KNOW...but):");
const arraStyle = candidates.filter(c => /^i KNOW/i.test(c));
for (const c of arraStyle.slice(0, 3)) {
  const s = scorePost(c);
  console.log(`  [${s.grade}] ${s.score}: ${c}`);
}

console.log("\nLEVELSIO-STYLE (annoying part):");
const levelsStyle = candidates.filter(c => /most annoying part/i.test(c));
for (const c of levelsStyle) {
  const s = scorePost(c);
  console.log(`  [${s.grade}] ${s.score}: ${c}`);
}
