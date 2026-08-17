"""
X / Twitter Engagement Algorithm — 2026 edition.

Pure-Python scoring engine built from published X ranking weights + 2026
engagement research. No external dependencies so it runs anywhere and is
trivially testable.

Core idea: the X For-You algorithm is a weighted sum of predicted engagement
probabilities. The single strongest signal by far is a *reply that the author
replies back to* (+75, i.e. 150x a like). So an "engaging" post is one that
maximizes the probability of a reply chain, while avoiding the negative
signals (external links, all-caps, self-promotional openers) that get a post
demoted before it ever gets a chance.

This module scores a draft post 0-100 across the dimensions that actually
move the 2026 algorithm, returns a letter grade, a breakdown, a list of
problems, and a set of "signals & cues" the improver can inject.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Tuple


# ---------------------------------------------------------------------------
# Reference constants (sourced from X's open-sourced ranking weights + 2026
# engagement studies — see RESEARCH.md for citations).
# ---------------------------------------------------------------------------
ALGO_WEIGHTS: Dict[str, float] = {
    "reply_author_reply_back": 75.0,   # 150x a like — the dominant signal
    "reply": 13.5,                     # 27x a like
    "profile_visit_engaged": 12.0,
    "conversation_click_engaged": 11.0,
    "dwell_2min_in_thread": 10.0,
    "repost": 1.0,
    "like": 0.5,
    # negative
    "report": -74.0,
    "block": -174.0,
    "unfollow_after_view": -288.0,
}

# Tweet length bands (chars). 71-100 is the engagement sweet spot.
LENGTH_SWEET = (71, 100)
LENGTH_STRONG = (100, 200)
LENGTH_OK = (200, 280)
LENGTH_LONG = (280, 4000)  # Premium long posts

# First-line targets.
FIRST_LINE_WORD_SWEET = (4, 6)
FIRST_LINE_CHAR_BONUS_UNDER = 40

# Self-promotional / weak openers that consistently underperform.
WEAK_OPENERS = [
    "excited to share", "thrilled to announce", "we just launched",
    "happy to share", "proud to announce", "i am excited", "i'm excited",
    "delighted to share", "pleased to announce", "just shipped",
    "big news", "here is my", "here's my", "wanted to share",
    "i wanted to share", "thought i'd share", "thought i would share",
    "a quick thread", "let me share", "let's talk about",
]

# Hook formula patterns. Each is (name, regex, base_score).
# Statements beat questions ~7x, so question-only hooks are downweighted.
HOOK_FORMULAS: List[Tuple[str, str, float]] = [
    ("contrarian", r"\b(most people|everyone|they say|conventional|nobody|you've been told|you have been told)\b", 95),
    ("specific_number", r"\b\d[\d,\.]*\s?(%|k|m|x|hours?|days?|weeks?|months?|years?|minutes?|times?|people|users?|customers?|dollars?|\$|€|£)\b", 90),
    ("confession", r"\b(i (almost|used to|was wrong|failed|hate|regret|wish i|mistake)|i was completely wrong|i was wrong)\b", 92),
    ("i_did_x_without_y", r"\bwithout (a|any|the|writing|spending|raising|hiring|paying)\b", 88),
    ("you_dont_need", r"\byou don't need|you do not need\b", 86),
    ("if_i_had_to_start_over", r"\bif i had to (start|grow|do|build) (over|again|from zero)\b", 87),
    ("n_things_i_learned", r"\b\d+ (things|lessons|ways|tips|mistakes) i\b", 84),
    ("cost_reveal", r"\$[\d,]+", 85),
    ("bold_prediction", r"\b(in \d{4}|by next|will (be|replace|kill|die|win)|the end of|within \d)\b", 83),
    ("before_after", r"\b(before|after|i used to|now i|then i|used to|now)\b", 78),
    ("open_loop", r"\b(nobody told me|the one thing|the truth about|what nobody|here's what|here is what|this changed)\b", 88),
]


@dataclass
class ScoreBreakdown:
    dimension: str
    score: float          # 0-100
    weight: float         # relative weight in the composite
    note: str

    def weighted(self) -> float:
        return self.score * self.weight


@dataclass
class Analysis:
    text: str
    char_count: int
    word_count: int
    first_line: str
    first_line_words: int
    first_line_chars: int
    has_external_link: bool
    links: List[str]
    all_caps_ratio: float
    has_line_breaks: bool
    ends_with_question: bool
    opener: str
    detected_hooks: List[str]
    has_media_mention: bool
    is_thread: bool
    has_number: bool
    has_reply_invite: bool


@dataclass
class GradeResult:
    score: float                       # 0-100 composite
    grade: str                         # A+ ... F
    breakdown: List[ScoreBreakdown]
    problems: List[str]
    strengths: List[str]
    signals_to_add: List[str]          # cues the improver can inject
    analysis: Analysis
    verdict: str                       # one-line human verdict

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


# ---------------------------------------------------------------------------
# Text analysis
# ---------------------------------------------------------------------------
URL_RE = re.compile(r"https?://\S+|www\.\S+|\S+\.(com|net|org|io|co|app|space|xyz|ai|dev)\b", re.I)
X_HANDLE_RE = re.compile(r"@\w+")
SENTENCE_END_RE = re.compile(r"[.!?]\s|$")


def _split_first_line(text: str) -> str:
    """First line = up to first newline, or first sentence, whichever is shorter."""
    by_newline = text.split("\n", 1)[0].strip()
    # also consider first sentence boundary
    m = re.search(r"[.!?](\s|$)", by_newline)
    if m and m.start() > 0:
        candidate = by_newline[: m.start()].strip()
        if len(candidate) >= 3:
            return candidate
    return by_newline


def _word_count(s: str) -> int:
    return len([w for w in re.findall(r"\b[\w’']+\b", s)])


def _has_external_link(text: str) -> Tuple[bool, List[str]]:
    links = URL_RE.findall(text)
    # X-internal handles / status links are fine; treat x.com twitter.com as links too (still a penalty per research)
    return (len(links) > 0, links)


def _all_caps_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    upper = sum(1 for c in letters if c.isupper())
    # ignore single-letter caps and acronyms <=3 chars
    return upper / len(letters)


def _detect_hooks(first_line: str) -> List[str]:
    found = []
    low = first_line.lower()
    for name, pattern, _ in HOOK_FORMULAS:
        if re.search(pattern, low, re.I):
            found.append(name)
    return found


def analyze(text: str) -> Analysis:
    text = text.strip()
    first_line = _split_first_line(text)
    has_link, links = _has_external_link(text)
    caps = _all_caps_ratio(text)
    has_breaks = "\n" in text.strip()
    ends_q = text.rstrip().endswith("?")
    opener = first_line.lower()[:40]
    hooks = _detect_hooks(first_line) or _detect_hooks(text[:120])
    has_media = bool(re.search(r"\b(video|image|gif|clip|watch this|screenshot)\b", text, re.I))
    is_thread = bool(re.search(r"\b(\d+/\d+|thread|🧵|a thread)\b", text, re.I)) or text.count("\n\n") >= 3
    has_number = bool(re.search(r"\b\d[\d,\.]*\b", text))
    has_reply_invite = bool(re.search(r"\b(what('?s| do you|do you|what do you|agree|disagree|tell me|reply with|drop your|what('?s) your|your turn|thoughts\?)\b", text, re.I))
    return Analysis(
        text=text,
        char_count=len(text),
        word_count=_word_count(text),
        first_line=first_line,
        first_line_words=_word_count(first_line),
        first_line_chars=len(first_line),
        has_external_link=has_link,
        links=links,
        all_caps_ratio=caps,
        has_line_breaks=has_breaks,
        ends_with_question=ends_q,
        opener=opener,
        detected_hooks=hooks,
        has_media_mention=has_media,
        is_thread=is_thread,
        has_number=has_number,
        has_reply_invite=has_reply_invite,
    )


# ---------------------------------------------------------------------------
# Scoring dimensions
# ---------------------------------------------------------------------------
def _score_hook(a: Analysis) -> Tuple[float, str]:
    """First-line hook strength. The single highest-leverage dimension."""
    s = 30.0
    note = ""
    # word count sweet spot 4-6
    if FIRST_LINE_WORD_SWEET[0] <= a.first_line_words <= FIRST_LINE_WORD_SWEET[1]:
        s += 35
        note = f"first line {a.first_line_words} words (sweet spot 4-6)"
    elif a.first_line_words <= 10:
        s += 18
        note = f"first line {a.first_line_words} words (ok, aim 4-6)"
    else:
        s += 0
        note = f"first line {a.first_line_words} words (too long — cut to 4-6)"
    # under 40 chars bonus
    if a.first_line_chars <= FIRST_LINE_CHAR_BONUS_UNDER:
        s += 15
    elif a.first_line_chars <= 60:
        s += 6
    # hook formula detected
    if a.detected_hooks:
        s += 20
        note += f"; hook: {', '.join(a.detected_hooks)}"
    else:
        note += "; no recognized hook formula"
    # questions underperform statements 7x — only credit if there's also a statement hook
    if a.ends_with_question and not a.detected_hooks:
        s -= 10
        note += "; ends on a question (statements outperform 7x)"
    return min(100, max(0, s)), note


def _score_length(a: Analysis) -> Tuple[float, str]:
    n = a.char_count
    if LENGTH_SWEET[0] <= n <= LENGTH_SWEET[1]:
        return 100, f"{n} chars (sweet spot 71-100)"
    if LENGTH_STRONG[0] < n <= LENGTH_STRONG[1]:
        return 88, f"{n} chars (strong 100-200)"
    if n < LENGTH_SWEET[0]:
        if n < 50:
            return 45, f"{n} chars (too thin — add a specific detail)"
        return 70, f"{n} chars (a bit short — aim 71-100)"
    if LENGTH_OK[0] < n <= LENGTH_OK[1]:
        return 60, f"{n} chars (dense — can you cut the first sentence?)"
    if LENGTH_LONG[0] < n <= 1000:
        return 55, f"{n} chars (long post — only works if every word earns space)"
    return 40, f"{n} chars (very long — consider a thread)"


def _score_reply_potential(a: Analysis) -> Tuple[float, str]:
    """Likelihood of triggering a reply chain — the +75 signal."""
    s = 40.0
    notes = []
    # opinions / takes invite argument → replies
    if a.detected_hooks and any(h in ("contrarian", "confession", "bold_prediction", "you_dont_need") for h in a.detected_hooks):
        s += 30
        notes.append("opinionated take invites replies")
    # explicit reply invite
    if a.has_reply_invite:
        s += 15
        notes.append("explicit reply invitation")
    # open loop / curiosity gap
    if any(h in ("open_loop",) for h in a.detected_hooks):
        s += 10
        notes.append("open loop drives conversation clicks")
    # specificity → credibility → replies
    if a.has_number:
        s += 5
    # single clear idea focus (shorter posts focus better)
    if a.char_count <= 200:
        s += 5
    if not notes:
        notes.append("neutral — nothing provokes a reply")
    return min(100, s), "; ".join(notes)


def _score_link_penalty(a: Analysis) -> Tuple[float, str]:
    if a.has_external_link:
        return 25, f"external link detected {a.links[:2]} — X demotes link posts; put link in reply"
    return 100, "no external link in post body"


def _score_formatting(a: Analysis) -> Tuple[float, str]:
    s = 70.0
    notes = []
    if a.all_caps_ratio > 0.45:
        s -= 35
        notes.append("too much ALL-CAPS — algorithm pushes down")
    elif a.all_caps_ratio > 0.3:
        s -= 15
        notes.append("moderate caps — tone it down")
    if a.has_line_breaks:
        s += 20
        notes.append("line breaks improve scanability")
    else:
        notes.append("no line breaks — break into 2-3 short lines")
    return min(100, max(0, s)), "; ".join(notes)


def _score_specificity(a: Analysis) -> Tuple[float, str]:
    if a.has_number:
        return 90, "contains a number — specific beats clever"
    return 55, "no numbers — add a specific figure (time, %, $, count)"


def _score_opener(a: Analysis) -> Tuple[float, str]:
    for w in WEAK_OPENERS:
        if a.opener.startswith(w) or a.opener == w:
            return 20, f"weak opener '{w}' — leads with you, not the reader; rewrite the first line"
    return 90, "opener is not a known weak/self-promotional pattern"


def _score_focus(a: Analysis) -> Tuple[float, str]:
    """Single clear idea vs. trying to do too much."""
    sentences = [s for s in re.split(r"[.!?]+", a.text) if s.strip()]
    if len(sentences) <= 3 and a.char_count <= 280:
        return 90, "tight, single idea"
    if a.char_count <= 400:
        return 70, "mostly focused"
    return 50, "risks doing too much — one idea per post"


def _score_media(a: Analysis) -> Tuple[float, str]:
    if a.has_media_mention:
        return 85, "media referenced — video watched >50% gets a boost"
    if a.is_thread:
        return 80, "thread format — drives saves & follows"
    return 65, "text-only — consider native video or image (media converts harder)"


# dimension weights (sum to 1.0) — reflect 2026 algorithm leverage
DIMENSION_WEIGHTS: List[Tuple[str, float]] = [
    ("hook",            0.22),
    ("reply_potential", 0.20),
    ("length",          0.12),
    ("link_penalty",    0.12),
    ("opener",          0.10),
    ("formatting",      0.08),
    ("specificity",     0.07),
    ("focus",           0.05),
    ("media",           0.04),
]


def _grade_from_score(score: float) -> str:
    if score >= 92:
        return "A+"
    if score >= 85:
        return "A"
    if score >= 78:
        return "B+"
    if score >= 70:
        return "B"
    if score >= 62:
        return "C+"
    if score >= 55:
        return "C"
    if score >= 45:
        return "D"
    return "F"


def score_post(text: str) -> GradeResult:
    a = analyze(text)
    scorers = {
        "hook": _score_hook,
        "reply_potential": _score_reply_potential,
        "length": _score_length,
        "link_penalty": _score_link_penalty,
        "opener": _score_opener,
        "formatting": _score_formatting,
        "specificity": _score_specificity,
        "focus": _score_focus,
        "media": _score_media,
    }
    breakdown: List[ScoreBreakdown] = []
    problems: List[str] = []
    strengths: List[str] = []
    signals: List[str] = []

    for dim, weight in DIMENSION_WEIGHTS:
        s, note = scorers[dim](a)
        breakdown.append(ScoreBreakdown(dim, round(s, 1), weight, note))
        if s < 50:
            problems.append(f"[{dim}] {note}")
        elif s >= 85:
            strengths.append(f"[{dim}] {note}")

    composite = sum(b.weighted() for b in breakdown)

    # signals & cues to inject
    if a.has_external_link:
        signals.append("move the link to the first reply — keep the post body link-free")
    if not a.detected_hooks:
        signals.append("rewrite line 1 as a contrarian claim or a specific number (4-6 words)")
    if a.first_line_words > 6:
        signals.append("cut the first line to 4-6 words")
    if not a.has_number:
        signals.append("add one oddly-specific number (%, $, count, or time)")
    if not a.has_line_breaks and a.char_count > 80:
        signals.append("break into 2-3 short lines with blank lines between")
    if not a.has_reply_invite and a.char_count < 280:
        signals.append("end with a reply trigger ('agree or disagree?', 'what's your take?')")
    if any(w in a.opener for w in WEAK_OPENERS):
        signals.append("kill the self-promotional opener — lead with the reader's tension")
    if a.all_caps_ratio > 0.3:
        signals.append("drop the all-caps — algorithm penalizes it")
    if not a.has_media_mention and not a.is_thread:
        signals.append("attach native video or image — media converts harder")
    if not a.is_thread and a.char_count > 280:
        signals.append("split into a thread — long single posts stall")

    verdict = _verdict(composite, a)
    return GradeResult(
        score=round(composite, 1),
        grade=_grade_from_score(composite),
        breakdown=breakdown,
        problems=problems,
        strengths=strengths,
        signals_to_add=signals,
        analysis=a,
        verdict=verdict,
    )


def _verdict(score: float, a: Analysis) -> str:
    if a.has_external_link:
        return "Link in the body is killing this before it starts — move it to a reply."
    if score >= 85:
        return "This is built to be replied to. Post it Tue-Thu 8-11am ET."
    if score >= 70:
        return "Solid bones. Tighten the hook and it competes."
    if score >= 55:
        return "Readable but scroll-pastable. The first line isn't earning line two."
    return "The algorithm will read this as 'no one cares' within an hour. Rewrite the hook."


# ---------------------------------------------------------------------------
# A/B comparator
# ---------------------------------------------------------------------------
def compare_posts(a: str, b: str) -> Dict:
    ra, rb = score_post(a), score_post(b)
    if ra.score > rb.score:
        winner, loser, margin = "A", "B", round(ra.score - rb.score, 1)
    elif rb.score > ra.score:
        winner, loser, margin = "B", "A", round(rb.score - ra.score, 1)
    else:
        winner, loser, margin = "tie", "tie", 0.0
    return {
        "a": ra.to_dict(),
        "b": rb.to_dict(),
        "winner": winner,
        "margin": margin,
        "summary": f"Post {winner} wins by {margin} pts" if winner != "tie" else "Dead tie — both need work.",
    }
