const { getInstance } = require("./mlGenerator");

const ml = getInstance();
ml.train();

// Test pronoun fixing
const tests = [
  "i built a platform after their startup failed. quit their jobs in 60 days.",
  "i built an ai code review platform living in their parents' basement.",
  "i built a form builder with $0 in the bank. 4.3m arr. got accepted into yc.",
  "2 unemployed friends built an app with $0 in the bank. $100k mrr in 3 months.",
];

for (const t of tests) {
  const fixed = ml.fixPronouns(t);
  console.log("BEFORE:", t);
  console.log("AFTER: ", fixed);
  console.log();
}
