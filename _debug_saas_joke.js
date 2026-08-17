const { sprint } = require("./sprinter");
const { scorePost } = require("./engagementAlgo");

const input = "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time";

// Test the casual version directly
const casualVersion = "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time";
const score1 = scorePost(casualVersion);
console.log("CASUAL VERSION (no additions):");
console.log(`  Grade: ${score1.grade}, Score: ${score1.score}`);
console.log(`  Post: "${casualVersion}"`);
console.log(`  Dimensions:`, JSON.stringify(score1.dimensions, null, 2));
console.log();

// Test with "nobody wants to hear this" prepended
const withHook = `nobody wants to hear this.\ni KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time\nHere's why 👇\nscreenshot this in 30 days and tell me I was right.`;
const score2 = scorePost(withHook);
console.log("WITH HOOK + CTA:");
console.log(`  Grade: ${score2.grade}, Score: ${score2.score}`);
console.log(`  Post: "${withHook}"`);
console.log(`  Dimensions:`, JSON.stringify(score2.dimensions, null, 2));
