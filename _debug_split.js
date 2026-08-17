const { check, fixSlop } = require("./qualityChecker");

const text = "the problem with most startups is they dont talk to users enough";

// Step 1: check slop
console.log("1. original:", JSON.stringify(text));
console.log("   slop:", check(text).isSlop);
console.log("   issues:", check(text).issues);

// Step 2: fixSlop
const afterFix = fixSlop(text);
console.log("2. fixSlop:", JSON.stringify(afterFix));

// Step 3: Check if fixSlop introduced a line break
console.log("3. has linebreak?", afterFix.includes("\n"));

// Step 4: Check SLOP_FIXES for anything that could split this
const { SLOP_FIXES } = require("./qualityChecker");
for (const [slop, fix] of Object.entries(SLOP_FIXES)) {
  if (new RegExp(slop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi").test(text)) {
    console.log("   SLOP FIX matched:", JSON.stringify(slop), "->", JSON.stringify(fix));
  }
}
