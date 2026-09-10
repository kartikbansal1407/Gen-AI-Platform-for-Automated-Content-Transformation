"""Canonical output catalog for OmniForm AI.

Every formatter, router branch and (later) compiler bridge is keyed off this
catalog so the API surface, graph nodes and compilation targets stay in sync.
"""

from dataclasses import dataclass
from enum import StrEnum


class OutputType(StrEnum):
    PRESENTATION = "presentation"
    ADVISORY = "advisory"
    VIDEO = "video"
    INFOGRAPHIC = "infographic"
    TWITTER = "twitter"


@dataclass(frozen=True)
class OutputSpec:
    label: str
    output_format: str
    compiler: str | None
    extension: str | None


OUTPUT_SPECS: dict[OutputType, OutputSpec] = {
    OutputType.PRESENTATION: OutputSpec(
        label="Presentation",
        output_format="Marp Markdown",
        compiler="marp",
        extension=".pptx",
    ),
    OutputType.ADVISORY: OutputSpec(
        label="Advisory",
        output_format="Typst source",
        compiler="typst",
        extension=".pdf",
    ),
    OutputType.VIDEO: OutputSpec(
        label="Video / Audio",
        output_format="Narration script with timestamped visual cues",
        compiler="edge-tts + ffmpeg",
        extension=".mp4",
    ),
    OutputType.INFOGRAPHIC: OutputSpec(
        label="Infographic",
        output_format="Mermaid diagram",
        compiler="mermaid",
        extension=".svg",
    ),
    OutputType.TWITTER: OutputSpec(
        label="Twitter Thread",
        output_format="Thread copy",
        compiler=None,
        extension=".txt",
    ),
}

OUTPUT_ORDER: tuple[OutputType, ...] = tuple(OUTPUT_SPECS)

GRAPH_NODE_PREFIX = "format_"
COLLECT_NODE = "collect"
ROUTER_NODE = "router"


def formatter_node_name(output: OutputType) -> str:
    return f"{GRAPH_NODE_PREFIX}{output.value}"
