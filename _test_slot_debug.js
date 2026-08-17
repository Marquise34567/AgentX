const { getInstance } = require("./slotGenerator");

const ml = getInstance();
ml.train();

// Check what struggles are stored
console.log("=== STORED STRUGGLES (first 10) ===");
const struggles = Array.from(ml.slots.struggle.entries()).slice(0, 10);
for (const [s, w] of struggles) {
  console.log(`  [${w}] "${s}"`);
}

// Test pronoun fix on a specific struggle
console.log("\n=== PRONOUN FIX TEST ===");
const test = "For 8 months they were copying competitors and getting nowhere";
const fixed = test
  .replace(/\bthey were\b/gi, "I was")
  .replace(/\bthey had\b/gi, "I had")
  .replace(/\bthey got\b/gi, "I got")
  .replace(/\bthey\b/gi, "I")
  .replace(/\btheir\b/gi, "my")
  .replace(/\bthem\b/gi, "me");
console.log("BEFORE:", test);
console.log("AFTER: ", fixed);

// Generate one story and trace it
console.log("\n=== TRACE ONE STORY ===");
const { fullStory } = ml.generateStory("saas", true, 1.0);
console.log(fullStory);
