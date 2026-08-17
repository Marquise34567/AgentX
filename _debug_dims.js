const { scorePost } = require("./engagementAlgo");

const casual = "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time";
const formulaic = "nobody wants to hear this.\ni KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time\nHere's why 👇\nscreenshot this in 30 days and tell me I was right.";

const s1 = scorePost(casual);
const s2 = scorePost(formulaic);

console.log("=== CASUAL ===");
console.log("Score:", s1.score, "Grade:", s1.grade);
for (const b of s1.breakdown) {
  console.log(`  ${b.dimension}: ${b.score} (weight ${b.weight}) — ${b.note}`);
}

console.log("\n=== FORMULAIC ===");
console.log("Score:", s2.score, "Grade:", s2.grade);
for (const b of s2.breakdown) {
  console.log(`  ${b.dimension}: ${b.score} (weight ${b.weight}) — ${b.note}`);
}
