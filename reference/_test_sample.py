"""Quick smoke test against the user's real sample post."""
from engagement_algo import score_post, compare_posts
from improver import improve_post
import json

SAMPLE = """the new year is almost here

2026 has been one of my most productive years

now I'm planning for the next few months

using 1plann I'm keeping track of each task I complete

https://1plann.space"""

print("=" * 70)
print("ORIGINAL POST")
print("=" * 70)
print(SAMPLE)
print()

r = score_post(SAMPLE)
print(f"SCORE: {r.score}  GRADE: {r.grade}")
print(f"VERDICT: {r.verdict}")
print()
print("BREAKDOWN:")
for b in r.breakdown:
    print(f"  {b.dimension:16s} {b.score:5.1f}  (w={b.weight:.2f})  {b.note}")
print()
print("PROBLEMS:")
for p in r.problems:
    print(f"  - {p}")
print()
print("SIGNALS TO ADD:")
for s in r.signals_to_add:
    print(f"  + {s}")
print()

print("=" * 70)
print("IMPROVING...")
print("=" * 70)
res = improve_post(SAMPLE)
print(f"\nFINAL SCORE: {res.final_score}  GRADE: {res.final_grade}  (converged={res.converged})")
print()
print("ITERATIONS:")
for step in res.iterations:
    print(f"  iter {step.iteration}: score={step.score} grade={step.grade} changes={step.changes}")
print()
print("FINAL POST:")
print("-" * 70)
print(res.final)
print("-" * 70)
if res.link_reply:
    print("\nSUGGESTED FIRST REPLY:")
    print(res.link_reply)
print("\nTIMING:", res.timing_advice)
