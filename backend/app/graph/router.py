"""Router agent.

Reads the requested output types, validates/deduplicates them and fans the
source out to the matching formatter nodes with ``Send``. Each formatter runs
in parallel; the collect node joins the branches.
"""

from typing import Any

from langgraph.types import Send

from app.graph.state import OmniFormState
from app.outputs import OutputType, formatter_node_name


async def router_node(state: OmniFormState) -> dict[str, Any]:
    requested: list[OutputType] = []
    warnings: list[str] = []
    for raw in state.get("output_types") or []:
        try:
            output = OutputType(raw)
        except ValueError:
            warnings.append(f"Unknown output type '{raw}' was ignored.")
            continue
        if output not in requested:
            requested.append(output)
    if not requested:
        warnings.append("No valid output types were requested.")
    return {
        "pending": requested,
        "status": "routing",
        "results": {},
        "errors": {},
        "warnings": warnings,
    }


def route_to_formatters(state: OmniFormState) -> list[Send]:
    pending = list(state.get("pending") or [])
    if not pending:
        return [Send("collect", state)]
    return [Send(formatter_node_name(output), state) for output in pending]
