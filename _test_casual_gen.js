const { generateCasual } = require("./casualGenerator");
const { scorePost } = require("./engagementAlgo");

const domains = ["saas", "notion", "ai", "coding", "productivity", "fitness", "money", "content", "career", "design"];

for (const domain of domains) {
  const candidates = generateCasual(domain, domain);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`DOMAIN: ${domain} (${candidates.length} candidates)`);
  
  // Score each and show top 3
  const scored = candidates.map(c => ({ post: c, score: scorePost(c).score, grade: scorePost(c).grade }));
  scored.sort((a, b) => b.score - a.score);
  
  for (let i = 0; i < Math.min(3, scored.length); i++) {
    const s = scored[i];
    console.log(`\n  #${i+1} [${s.grade}] Score: ${s.score}`);
    console.log(`  ${s.post}`);
  }
}
