"""Formatter nodes for the OmniForm AI graph.

Milestone 1 ships deterministic placeholder renderers so routing and the API
contract can be exercised end to end. Milestone 2 swaps the body of each
renderer for Groq/Ollama-backed LangChain prompts without changing the node
interface.
"""

from collections.abc import Awaitable, Callable
from typing import Any

from app.graph.state import OmniFormState
from app.outputs import (
    OUTPUT_SPECS,
    OutputType,
    formatter_node_name,
)

_TITLE_LIMIT = 70


def _title(state: OmniFormState) -> str:
    for line in (state.get("source_text") or "").splitlines():
        cleaned = line.strip().lstrip("#").strip()
        if cleaned:
            return cleaned[:_TITLE_LIMIT]
    return "Untitled source"


def _excerpt(state: OmniFormState, limit: int = 320) -> str:
    collapsed = " ".join((state.get("source_text") or "").split())
    if len(collapsed) <= limit:
        return collapsed
    return f"{collapsed[:limit].rstrip()}..."


def _quote(value: str) -> str:
    return value.replace('"', "'")


def _presentation_stub(title: str, excerpt: str) -> str:
    return "\n".join(
        [
            "---",
            "marp: true",
            "theme: default",
            "paginate: true",
            f'title: "{_quote(title)}"',
            "---",
            "",
            "<!-- _class: lead -->",
            "",
            f"# {title}",
            "",
            "Source-faithful overview of the submitted content.",
            "",
            "---",
            "",
            "## Signal",
            "",
            f"- {excerpt}",
            "",
            "---",
            "",
            "## Implications",
            "",
            "- Placeholder bullet pending the Milestone 2 presentation agent.",
            "- Each slide will be grounded in a cited source span.",
            "",
            "---",
            "",
            "## Next steps",
            "",
            "- Replace placeholders with LLM-authored slide copy.",
            "- Compile to .pptx through the Milestone 3 marp-cli bridge.",
            "",
        ]
    )


def _advisory_stub(title: str, excerpt: str) -> str:
    return "\n".join(
        [
            "#set page(margin: 2.2cm, numbering: \"1\")",
            "#set text(size: 10.5pt)",
            "#align(center)[#text(size: 17pt, weight: \"bold\")["
            + title
            + "]]",
            "#v(0.4em)",
            "#align(center)[#text(size: 10pt, style: \"italic\")["
            "Advisory draft - pending Milestone 2 Typst agent]]",
            "#line(length: 100%)",
            "",
            "= Background",
            "",
            excerpt,
            "",
            "= Assessment",
            "",
            "- Placeholder assessment pending the Milestone 2 advisory agent.",
            "- Every claim will carry a source span for operator review.",
            "",
            "= Recommendations",
            "",
            "+ Confirm the audience, tone and classification before release.",
            "+ Compile to .pdf through the Milestone 3 typst bridge.",
            "",
        ]
    )


def _video_stub(title: str, excerpt: str) -> str:
    return "\n".join(
        [
            f"# Video package - {title}",
            "",
            "## Narration script",
            "",
            excerpt,
            "",
            "Placeholder narration pending the Milestone 2 video agent.",
            "",
            "## Timestamped visual cues",
            "",
            "| Time | Visual cue |",
            "| --- | --- |",
            f"| 00:00-00:05 | Title card: {title} |",
            "| 00:05-00:15 | Key statement on screen |",
            "| 00:15-00:25 | Supporting detail |",
            "| 00:25-00:30 | Closing call to action |",
            "",
            "## Voice direction",
            "",
            "Neutral, authoritative delivery. 30 seconds at standard pace.",
            "",
        ]
    )


def _infographic_stub(title: str, excerpt: str) -> str:
    return "\n".join(
        [
            "flowchart LR",
            f'  A["{_quote(title)}"] --> B["Key signal"]',
            f'  B --> C["{_quote(excerpt[:90])}"]',
            '  C --> D["Implication"]',
            '  D --> E["Recommended action"]',
            "",
        ]
    )


def _twitter_stub(title: str, excerpt: str) -> str:
    return "\n".join(
        [
            f"1/ {title}",
            "",
            f"2/ {excerpt}",
            "",
            "3/ Placeholder thread pending the Milestone 2 twitter agent.",
            "",
            "4/ Sources will be linked for every factual claim.",
            "",
        ]
    )


_RENDERERS: dict[OutputType, Callable[[str, str], str]] = {
    OutputType.PRESENTATION: _presentation_stub,
    OutputType.ADVISORY: _advisory_stub,
    OutputType.VIDEO: _video_stub,
    OutputType.INFOGRAPHIC: _infographic_stub,
    OutputType.TWITTER: _twitter_stub,
}


def make_formatter_node(
    output: OutputType,
) -> Callable[[OmniFormState], Awaitable[dict[str, Any]]]:
    async def format_output(state: OmniFormState) -> dict[str, Any]:
        spec = OUTPUT_SPECS[output]
        try:
            text = _RENDERERS[output](_title(state), _excerpt(state))
        except Exception as error:  # keep other outputs alive on partial failure
            return {
                "errors": {output.value: f"{spec.label} generation failed: {error}"},
                "warnings": [f"{spec.label} could not be generated."],
            }
        return {"results": {output.value: text}}

    format_output.__name__ = formatter_node_name(output)
    return format_output


async def collect_node(state: OmniFormState) -> dict[str, Any]:
    requested: list[OutputType] = []
    for raw in state.get("output_types") or []:
        try:
            requested.append(OutputType(raw))
        except ValueError:
            continue
    results = state.get("results") or {}
    missing = [output for output in requested if output not in results]
    warnings = [
        f"{OUTPUT_SPECS[output].label} could not be generated." for output in missing
    ]
    if missing and len(missing) == len(requested):
        status = "failed"
    elif missing:
        status = "partial"
    else:
        status = "completed"
    return {"status": status, "warnings": warnings}
