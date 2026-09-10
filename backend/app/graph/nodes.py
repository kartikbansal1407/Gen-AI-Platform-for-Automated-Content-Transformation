"""Parallel LLM formatter nodes and final graph collector."""

from collections.abc import Awaitable, Callable
from typing import Any

from app.graph.llm import generate_output
from app.graph.state import OmniFormState
from app.outputs import OUTPUT_SPECS, OutputType, formatter_node_name


def make_formatter_node(
    output: OutputType,
) -> Callable[[OmniFormState], Awaitable[dict[str, Any]]]:
    async def format_output(state: OmniFormState) -> dict[str, Any]:
        spec = OUTPUT_SPECS[output]
        try:
            text = await generate_output(
                output, state.get("source_text") or "", state.get("controls") or {}
            )
            return {"results": {output.value: text}}
        except Exception as error:  # noqa: BLE001 - isolate parallel agent failures
            return {
                "errors": {output.value: f"{spec.label} generation failed: {error}"},
                "warnings": [f"{spec.label} could not be generated."],
            }

    format_output.__name__ = formatter_node_name(output)
    return format_output


async def collect_node(state: OmniFormState) -> dict[str, Any]:
    requested = [OutputType(raw) for raw in state.get("output_types") or []]
    results = state.get("results") or {}
    missing = [output for output in requested if output.value not in results]
    if missing and len(missing) == len(requested):
        status = "failed"
    elif missing:
        status = "partial"
    else:
        status = "completed"
    return {"status": status}
