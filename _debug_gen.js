const { generate } = require("./contentEngine");

// Generate with count=1 to see just the user's idea candidate
const posts = generate("i think the problem with most startups is they dont talk to users enough", { count: 1 });
for (const p of posts) {
  console.log("[" + p.grade + "] quality:" + p.qualityScore);
  console.log(JSON.stringify(p.post));
  console.log("---");
  console.log(p.post);
}
