"""
Post improver / iteration engine.

Takes a draft X post and rewrites it by applying the signals & cues the
scoring engine flagged, generating multiple candidate variants per round,
scoring each, and keeping the best. Iterates until the post reaches an A
grade (>= 85) or hits a max iteration cap.

This is rule-based (no external LLM dependency) so it runs anywhere and is
deterministic — which also makes it testable. The transformations are
grounded in the 2026 research: kill the link, cut the hook to 4-6 words,
add a specific number, break into short lines, end on a reply trigger, etc.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Tuple

from engagement_algo import score_post, GradeResult, URL_RE, WEAK_OPENERS, _word_count


TARGET_SCORE = 85.0   # A grade
MAX_ITERATIONS = 6


@dataclass
class IterationStep:
    iteration: int
    candidate: str
    score: float
    grade: str
    changes: List[str]


@dataclass
class ImproveResult:
    original: str
    original_score: float
    original_grade: str
    final: str
    final_score: float
    final_grade: str
    iterations: List[IterationStep]
    link_reply: str           # suggested first reply containing the link
    timing_advice: str
    converged: bool

    def to_dict(self) -> dict:
        return {
            "original": self.original,
            "original_score": self.original_score,
            "original_grade": self.original_grade,
            "final": self.final,
            "final_score": self.final_score,
            "final_grade": self.final_grade,
            "iterations": [
                {
                    "iteration": s.iteration,
                    "candidate": s.candidate,
                    "score": s.score,
                    "grade": s.grade,
                    "changes": s.changes,
                }
                for s in self.iterations
            ],
            "link_reply": self.link_reply,
            "timing_advice": self.timing_advice,
            "converged": self.converged,
        }


# ---------------------------------------------------------------------------
# Transformations
# ---------------------------------------------------------------------------
def _strip_links(text: str) -> Tuple[str, List[str]]:
    links = URL_RE.findall(text)
    cleaned = URL_RE.sub("", text)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+\.|\.\s+\s+", ". ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    # tidy dangling punctuation left behind
    cleaned = re.sub(r"\s+([,.;:!?)])", r"\1", cleaned)
    return cleaned.strip(), links


def _kill_weak_opener(text: str) -> Tuple[str, bool]:
    first_line = text.split("\n", 1)[0]
    low = first_line.lower().strip()
    for w in WEAK_OPENERS:
        if low.startswith(w):
            # drop the opener clause up to the first comma or end of first line
            rest = first_line[len(w):]
            rest = re.sub(r"^[,:\-\s]+", "", rest).strip()
            if not rest:
                rest = text.split("\n", 1)[1] if "\n" in text else text
            if "\n" in text:
                tail = text.split("\n", 1)[1]
                new = rest + "\n" + tail
            else:
                new = rest
            return new.strip(), True
    return text, False


def _shorten_first_line(text: str) -> Tuple[str, bool]:
    """If first line > 6 words, try to compress to a punchy 4-6 word hook."""
    lines = text.split("\n")
    first = lines[0].strip()
    wc = _word_count(first)
    if wc <= 6:
        return text, False
    # try splitting on a colon / dash / comma — keep the part after as the body
    for sep in [":", "—", "-", ",", ";"]:
        if sep in first:
            head, _, tail = first.partition(sep)
            head = head.strip()
            if 3 <= _word_count(head) <= 6:
                new_first = head
                rest = tail.strip()
                body = "\n".join([rest] + lines[1:]) if (rest or len(lines) > 1) else "\n".join(lines[1:])
                return (new_first + "\n" + body).strip(), True
    # fall back: take first 4-6 words
    words = re.findall(r"\b[\w’']+\b", first)
    if len(words) > 6:
        head = " ".join(words[:5])
        rest = " ".join(words[5:])
        body = "\n".join([rest] + lines[1:])
        return (head + "\n" + body).strip(), True
    return text, False


def _add_line_breaks(text: str) -> Tuple[str, bool]:
    if "\n\n" in text:
        return text, False
    # break on sentence boundaries into short stanzas
    sentences = re.split(r"(?<=[.!?])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    if len(sentences) <= 1:
        return text, False
    # group 1-2 sentences per line
    out = []
    buf = []
    for s in sentences:
        buf.append(s)
        if len(" ".join(buf)) >= 60 or len(buf) >= 2:
            out.append(" ".join(buf))
            buf = []
    if buf:
        out.append(" ".join(buf))
    return "\n\n".join(out), True


def _add_reply_trigger(text: str) -> Tuple[str, bool]:
    if text.rstrip().endswith("?"):
        return text, False
    triggers = [
        "\n\nAgree or disagree?",
        "\n\nWhat's your take?",
        "\n\nReply with yours.",
        "\n\nCurious if you'd go further.",
    ]
    # pick based on length so we don't blow past sweet spot too far
    best = text
    best_score = -1
    chosen = False
    for t in triggers:
        cand = text + t
        r = score_post(cand)
        if r.score > best_score:
            best_score = r.score
            best = cand
            chosen = True
    return best, chosen


def _add_specificity(text: str, hint: str = "") -> Tuple[str, bool]:
    """If no number, try to inject a plausible specific figure from context."""
    if re.search(r"\b\d[\d,\.]*\b", text):
        return text, False
    # heuristics: look for vague quantifiers and make them specific
    swaps = [
        (r"\ba few\b", "3"),
        (r"\bseveral\b", "5"),
        (r"\bmany\b", "7"),
        (r"\ba lot of\b", "a lot of (be specific: a number)"),
        (r"\bsome\b", "4"),
        (r"\bmonths?\b", "90 days"),
        (r"\bweeks?\b", "14 days"),
        (r"\byears?\b", "12 months"),
    ]
    out = text
    changed = False
    for pat, rep in swaps:
        new, n = re.subn(pat, rep, out, count=1, flags=re.I)
        if n:
            out = new
            changed = True
            break
    return out, changed


def _strip_trailing_url_only(text: str) -> str:
    """If the post is just text + a lone URL on its own line, drop the URL line."""
    lines = [l for l in text.split("\n") if l.strip() and not URL_RE.fullmatch(l.strip())]
    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# Candidate generation
# ---------------------------------------------------------------------------
def _generate_candidates(text: str, link_already_stripped: bool) -> List[Tuple[str, List[str]]]:
    """Produce several transformed variants; each tagged with the changes applied."""
    candidates: List[Tuple[str, List[str]]] = []

    base, links = (text, []) if link_already_stripped else _strip_links(text)
    if not link_already_stripped and links:
        # also a version where we just drop the bare-url line
        stripped_line = _strip_trailing_url_only(text)
        candidates.append((stripped_line, ["removed external link from body"]))

    # Variant 1: kill weak opener + shorten first line
    v, changes = base, []
    v, c = _kill_weak_opener(v); changes += c and ["removed self-promotional opener"] or []
    v, c = _shorten_first_line(v); changes += c and ["cut first line to 4-6 words"] or []
    v, c = _add_line_breaks(v); changes += c and ["added line breaks"] or []
    candidates.append((v, changes))

    # Variant 2: add specificity + reply trigger
    v, changes = base, []
    v, c = _add_specificity(v); changes += c and ["made a vague quantifier specific"] or []
    v, c = _shorten_first_line(v); changes += c and ["cut first line to 4-6 words"] or []
    v, c = _add_line_breaks(v); changes += c and ["added line breaks"] or []
    v, c = _add_reply_trigger(v); changes += c and ["added a reply trigger"] or []
    candidates.append((v, changes))

    # Variant 3: full stack
    v, changes = base, []
    v, c = _kill_weak_opener(v); changes += c and ["removed self-promotional opener"] or []
    v, c = _shorten_first_line(v); changes += c and ["cut first line to 4-6 words"] or []
    v, c = _add_specificity(v); changes += c and ["made a vague quantifier specific"] or []
    v, c = _add_line_breaks(v); changes += c and ["added line breaks"] or []
    v, c = _add_reply_trigger(v); changes += c and ["added a reply trigger"] or []
    candidates.append((v, changes))

    # Variant 4: hook-first rewrite — force a contrarian/specific opener if none detected
    v, changes = base, []
    v, c = _kill_weak_opener(v); changes += c and ["removed self-promotional opener"] or []
    v, c = _shorten_first_line(v); changes += c and ["cut first line to 4-6 words"] or []
    v, c = _add_specificity(v); changes += c and ["made a vague quantifier specific"] or []
    v, c = _add_line_breaks(v); changes += c and ["added line breaks"] or []
    candidates.append((v, changes))

    # de-dup
    seen = set()
    unique = []
    for cand, ch in candidates:
        key = cand.strip()
        if key and key not in seen:
            seen.add(key)
            unique.append((cand, ch))
    return unique, (links if not link_already_stripped else [])


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def improve_post(text: str, target: float = TARGET_SCORE, max_iter: int = MAX_ITERATIONS) -> ImproveResult:
    original = text.strip()
    orig_result = score_post(original)

    current = original
    current_score = orig_result.score
    current_grade = orig_result.grade
    iterations: List[IterationStep] = []
    link_reply = ""
    stripped_links: List[str] = []
    converged = False

    # record iteration 0 (the original)
    iterations.append(IterationStep(0, original, round(orig_result.score, 1), orig_result.grade, ["original draft"]))

    link_stripped = False
    for i in range(1, max_iter + 1):
        if current_score >= target:
            converged = True
            break

        candidates, links = _generate_candidates(current, link_stripped)
        if links and not stripped_links:
            stripped_links = links
            link_stripped = True

        if not candidates:
            break

        # score every candidate, keep the best
        best_cand, best_changes, best_score, best_grade = current, [], current_score, current_grade
        for cand, changes in candidates:
            r = score_post(cand)
            if r.score > best_score:
                best_cand, best_changes, best_score, best_grade = cand, changes, r.score, r.grade

        if best_cand == current and best_score <= current_score:
            # no improvement this round — stop to avoid looping
            break

        current, current_score, current_grade = best_cand, best_score, best_grade
        iterations.append(IterationStep(i, current, round(current_score, 1), current_grade, best_changes))

    if stripped_links:
        link_reply = "Link for the first reply 👇\n" + "\n".join(stripped_links)

    timing = (
        "Post Tue–Thu 8–11am ET (Wed 9am ET is the single best slot). "
        "The first 30–60 min of replies/reposts decide whether the algo pushes you to a broader audience."
    )

    return ImproveResult(
        original=original,
        original_score=round(orig_result.score, 1),
        original_grade=orig_result.grade,
        final=current,
        final_score=round(current_score, 1),
        final_grade=current_grade,
        iterations=iterations,
        link_reply=link_reply,
        timing_advice=timing,
        converged=converged or current_score >= target,
    )
